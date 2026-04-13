import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOperationalAuth } from "@/hooks/useOperationalAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogIn, XCircle } from "lucide-react";
import { format, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { FaltaDialog } from "@/components/FaltaDialog";
import { NovoAgendamentoDialog } from "@/components/NovoAgendamentoDialog";
import { addToEsteiraIfApplicable } from "@/lib/esteira";

export default function OperacionalAgendaPage() {
  const { user } = useOperationalAuth();
  const [agendamentos, setAgendamentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [faltaOpen, setFaltaOpen] = useState<any>(null);

  const fetchAgendamentos = async () => {
    if (!user) return;
    setLoading(true);

    const today = startOfDay(new Date());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data } = await supabase
      .from("agendamentos")
      .select("id, data_hora, tipo_servico, status, pet:pets(id, nome, foto_url, especie), cliente:clientes(id, nome)")
      .eq("empresa_id", user.empresa_id)
      .gte("data_hora", today.toISOString())
      .lt("data_hora", tomorrow.toISOString())
      .neq("status", "cancelado")
      .order("data_hora", { ascending: true });

    const sorted = [...(data ?? [])].sort((a: any, b: any) => (a.pet?.nome ?? "").localeCompare(b.pet?.nome ?? ""));
    setAgendamentos(sorted);
    setLoading(false);
  };

  useEffect(() => { fetchAgendamentos(); }, [user]);

  const handleCheckin = async (item: any) => {
    const now = new Date();
    const { error } = await supabase.from("agendamentos").update({
      status: "na_empresa",
      data_entrada: now.toISOString(),
      hora_entrada: format(now, "HH:mm"),
    }).eq("id", item.id);
    if (error) { toast.error("Erro: " + error.message); return; }
    await addToEsteiraIfApplicable({ empresaId: item.empresa_id, agendamentoId: item.id, tipoServico: item.tipo_servico });
    toast.success("Check-in realizado!");
    fetchAgendamentos();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[400px] rounded-xl" />
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    pendente: "bg-yellow-100 text-yellow-800",
    confirmado: "bg-blue-100 text-blue-800",
    agendado: "bg-blue-100 text-blue-800",
    na_empresa: "bg-emerald-100 text-emerald-800",
    concluido: "bg-muted text-muted-foreground",
    falta: "bg-red-100 text-red-800",
  };

  const statusLabels: Record<string, string> = {
    pendente: "Pendente",
    confirmado: "Confirmado",
    agendado: "Agendado",
    na_empresa: "Na Empresa",
    concluido: "Concluído",
    falta: "Falta",
  };

  const canCheckin = (status: string) => ["pendente", "confirmado", "agendado"].includes(status);

  return (
    <div className="space-y-6 pb-24 md:pb-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Agenda do Dia</h1>
          <p className="text-sm text-muted-foreground capitalize">
            {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
        <NovoAgendamentoDialog onSuccess={fetchAgendamentos} />
      </div>

      {agendamentos.length === 0 ? (
        <Card className="rounded-xl">
          <CardContent className="p-6 text-center text-muted-foreground">
            Nenhum agendamento para hoje.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {agendamentos.map((item) => (
            <Card key={item.id} className="rounded-xl">
              <CardContent className="p-4 flex items-center gap-4">
                <Avatar className="h-12 w-12">
                  {item.pet?.foto_url && <AvatarImage src={item.pet.foto_url} />}
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
                    {(item.pet?.nome ?? "P").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-base">{item.pet?.nome ?? "Pet"}</p>
                  <p className="text-xs text-muted-foreground">{item.cliente?.nome ?? "—"}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-[10px]">{item.tipo_servico}</Badge>
                    <Badge className={`text-[10px] border-0 ${statusColors[item.status] ?? "bg-muted text-muted-foreground"}`}>
                      {statusLabels[item.status] ?? item.status}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">{format(new Date(item.data_hora), "HH:mm")}</span>
                  </div>
                </div>
                {canCheckin(item.status) && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleCheckin(item)} className="gap-1.5 h-10 px-3">
                      <LogIn className="h-4 w-4" /> Entrada
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setFaltaOpen(item)} className="gap-1.5 h-10 px-3 text-destructive hover:text-destructive">
                      <XCircle className="h-4 w-4" /> Falta
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {faltaOpen && (
        <FaltaDialog
          open={!!faltaOpen}
          onOpenChange={(o) => { if (!o) setFaltaOpen(null); }}
          agendamento={faltaOpen}
          empresaId={user?.empresa_id ?? ""}
          allowsReplacement={true}
          onSuccess={fetchAgendamentos}
        />
      )}
    </div>
  );
}
