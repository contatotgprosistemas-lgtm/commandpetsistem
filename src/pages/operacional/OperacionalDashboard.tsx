import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, PawPrint, LogIn, LogOut as LogOutIcon, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useOperationalAuth } from "@/hooks/useOperationalAuth";
import { format, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { FaltaDialog } from "@/components/FaltaDialog";

export default function OperacionalDashboard() {
  const { user } = useOperationalAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ agendamentosHoje: 0, petsHospedados: 0, checkinsHoje: 0, checkoutsHoje: 0, petsDaycare: 0 });
  const [petsNaEmpresa, setPetsNaEmpresa] = useState<any[]>([]);
  const [faltaOpen, setFaltaOpen] = useState<any>(null);
  const [pendingCheckins, setPendingCheckins] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const today = startOfDay(new Date());
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data: agendamentos } = await supabase
        .from("agendamentos")
        .select("id, data_hora, tipo_servico, status, pet:pets(id, nome, foto_url, especie), cliente:clientes(id, nome)")
        .eq("empresa_id", user.empresa_id)
        .order("data_hora", { ascending: true });

      const all = agendamentos ?? [];
      const agHoje = all.filter(a => {
        const d = startOfDay(new Date(a.data_hora));
        return d >= today && d < tomorrow && a.status !== "cancelado";
      });
      const naEmpresa = all.filter(a => a.status === "na_empresa");
      const hospedados = naEmpresa.filter(a => ["hotel", "hospedagem", "hotel_e_creche"].includes(a.tipo_servico.toLowerCase()));
      const daycare = naEmpresa.filter(a => ["daycare", "creche", "day_care"].includes(a.tipo_servico.toLowerCase()));
      const checkinsHoje = agHoje.filter(a => a.status === "pendente" || a.status === "confirmado");
      const checkoutsHoje = naEmpresa.length;

      setStats({
        agendamentosHoje: agHoje.length,
        petsHospedados: hospedados.length,
        checkinsHoje: checkinsHoje.length,
        checkoutsHoje,
        petsDaycare: daycare.length,
      });
      setPetsNaEmpresa(naEmpresa);
      setPendingCheckins(checkinsHoje);
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const handleCheckin = async (item: any) => {
    const now = new Date();
    const { error } = await supabase.from("agendamentos").update({
      status: "na_empresa",
      data_entrada: now.toISOString(),
      hora_entrada: format(now, "HH:mm"),
    }).eq("id", item.id);
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success("Check-in realizado!");
    window.location.reload();
  };

  const handleCheckout = async (item: any) => {
    const now = new Date();
    const { error } = await supabase.from("agendamentos").update({
      status: "concluido",
      data_saida: now.toISOString(),
      hora_saida: format(now, "HH:mm"),
    }).eq("id", item.id);
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success("Check-out realizado!");
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  const cards = [
    { label: "Agendamentos Hoje", value: stats.agendamentosHoje, icon: CalendarDays, color: "text-primary", bg: "bg-primary/10" },
    { label: "Pets Hospedados", value: stats.petsHospedados, icon: PawPrint, color: "text-orange-500", bg: "bg-orange-500/10" },
    { label: "Check-ins Pendentes", value: stats.checkinsHoje, icon: LogIn, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "Pets em Daycare", value: stats.petsDaycare, icon: PawPrint, color: "text-violet-500", bg: "bg-violet-500/10" },
  ];

  return (
    <div className="space-y-6 pb-24 md:pb-0">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Olá, {user?.nome?.split(" ")[0]}! 👋
        </h1>
        <p className="text-sm text-muted-foreground capitalize">
          {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
        </p>
      </div>

      {/* Stats cards - large and touch-friendly */}
      <div className="grid grid-cols-2 gap-4">
        {cards.map((card) => (
          <Card key={card.label} className="rounded-2xl border-border/50 shadow-sm">
            <CardContent className="p-5 flex flex-col items-center text-center gap-3">
              <div className={`h-14 w-14 rounded-xl ${card.bg} flex items-center justify-center`}>
                <card.icon className={`h-7 w-7 ${card.color}`} />
              </div>
              <span className="text-3xl font-bold text-foreground">{card.value}</span>
              <span className="text-xs text-muted-foreground font-medium">{card.label}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pets na empresa */}
      {petsNaEmpresa.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Pets na Empresa</h2>
          <div className="space-y-2">
            {petsNaEmpresa.map((item) => (
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
                    <Badge variant="outline" className="mt-1 text-[10px]">{item.tipo_servico}</Badge>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => handleCheckout(item)} className="gap-1.5 h-10 px-4">
                    <LogOutIcon className="h-4 w-4" /> Saída
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
