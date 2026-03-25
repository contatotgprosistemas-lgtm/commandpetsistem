import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOperationalAuth } from "@/hooks/useOperationalAuth";
import { AgendaCalendar } from "@/components/agenda/AgendaCalendar";
import { NovoAgendamentoDialog } from "@/components/NovoAgendamentoDialog";
import { EditarAgendamentoDialog } from "@/components/EditarAgendamentoDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { format, startOfDay, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { LogIn, Pencil } from "lucide-react";
import { toast } from "sonner";

export default function OperacionalAgendaPage() {
  const { user } = useOperationalAuth();
  const [agendamentos, setAgendamentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [editingAgendamento, setEditingAgendamento] = useState<any>(null);
  const [filterServico, setFilterServico] = useState("");

  const fetchAgendamentos = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("agendamentos")
      .select("id, data_hora, tipo_servico, status, notas, valor, empresa_id, cliente_id, pet_id, data_entrada, hora_entrada, data_saida_provavel, hora_saida_provavel, baia, forma_pagamento, duracao_min, subscription_id, pet:pets(id, nome, raca, especie, foto_url), cliente:clientes(id, nome, whatsapp, foto_url)")
      .eq("empresa_id", user.empresa_id)
      .order("data_hora", { ascending: true });
    setAgendamentos(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchAgendamentos(); }, [user]);

  const dayAgendamentos = agendamentos.filter(a => {
    const match = isSameDay(new Date(a.data_hora), selectedDate) && a.status !== "cancelado";
    if (filterServico) return match && a.tipo_servico === filterServico;
    return match;
  });

  const servicoTypes = [...new Set(agendamentos.map(a => a.tipo_servico))];

  const handleCheckin = async (item: any) => {
    const now = new Date();
    const { error } = await supabase.from("agendamentos").update({
      status: "na_empresa", data_entrada: now.toISOString(), hora_entrada: format(now, "HH:mm"),
    }).eq("id", item.id);
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success("Check-in realizado!");
    fetchAgendamentos();
  };

  return (
    <div className="space-y-6 pb-24 md:pb-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Agenda</h1>
        <NovoAgendamentoDialog onSuccess={fetchAgendamentos} />
      </div>

      <AgendaCalendar
        agendamentos={agendamentos}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        filterServico={filterServico}
        onFilterServico={setFilterServico}
        servicoTypes={servicoTypes}
      />

      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">
          {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })} — {dayAgendamentos.length} agendamento(s)
        </h2>

        {loading ? (
          <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
        ) : dayAgendamentos.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">Nenhum agendamento nesta data.</p>
        ) : (
          <div className="space-y-2">
            {dayAgendamentos.map(item => (
              <Card key={item.id} className="rounded-xl">
                <CardContent className="p-4 flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    {item.pet?.foto_url && <AvatarImage src={item.pet.foto_url} />}
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
                      {(item.pet?.nome ?? "P").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">{item.pet?.nome}</span>
                      <span className="text-xs text-muted-foreground">({item.cliente?.nome})</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-[10px]">{item.tipo_servico}</Badge>
                      <span className="text-xs text-muted-foreground">{format(new Date(item.data_hora), "HH:mm")}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {(item.status === "pendente" || item.status === "confirmado") && (
                      <Button size="sm" variant="default" onClick={() => handleCheckin(item)} className="gap-1 h-10 px-3">
                        <LogIn className="h-4 w-4" /> Entrada
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => setEditingAgendamento(item)} className="h-10 w-10 p-0">
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <EditarAgendamentoDialog
        agendamento={editingAgendamento}
        open={!!editingAgendamento}
        onOpenChange={(o) => { if (!o) setEditingAgendamento(null); }}
        onSuccess={() => { setEditingAgendamento(null); fetchAgendamentos(); }}
      />
    </div>
  );
}
