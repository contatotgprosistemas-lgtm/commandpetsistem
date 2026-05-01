import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { MetricCard } from "@/components/MetricCard";
import { Car, CheckCircle, Clock, XCircle, Users, DollarSign, TrendingUp, MapPin } from "lucide-react";
import { format, startOfMonth, endOfMonth, differenceInCalendarDays } from "date-fns";
import { ptBR } from "date-fns/locale";

const TRANSPORT_FILTER = "tipo_servico.ilike.%taxi%,tipo_servico.ilike.%transport%,tipo_servico.ilike.%leva%";

export default function TaxiPetDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({
    totalMonth: 0, completed: 0, cancelled: 0, inProgress: 0,
    scheduled: 0, activeDrivers: 0, revenueMonth: 0, avgPerWeek: 0,
  });

  useEffect(() => {
    if (!profile?.empresa_id) return;
    const now = new Date();
    const startDate = startOfMonth(now);
    const endDate = endOfMonth(now);
    const start = format(startDate, "yyyy-MM-dd");
    const end = format(endDate, "yyyy-MM-dd");

    const load = async () => {
      const [{ data: bookings }, { data: drivers }, { data: agendamentos }, { data: taxiPlans }] = await Promise.all([
        supabase.from("transport_bookings")
          .select("status, final_price, scheduled_date")
          .eq("empresa_id", profile.empresa_id!)
          .gte("scheduled_date", start).lte("scheduled_date", end),
        supabase.from("drivers").select("id")
          .eq("empresa_id", profile.empresa_id!).eq("status", "ativo"),
        supabase.from("agendamentos")
          .select("status, valor, data_hora")
          .eq("empresa_id", profile.empresa_id!)
          .gte("data_hora", `${start}T00:00:00`)
          .lte("data_hora", `${end}T23:59:59`)
          .or(TRANSPORT_FILTER),
        // Receita = soma de assinaturas ativas de planos TaxiPet vigentes neste mês
        supabase.from("customer_pet_subscriptions")
          .select("final_price, price_contracted, status, start_date, end_date, service_plans!inner(name)")
          .eq("empresa_id", profile.empresa_id!)
          .ilike("service_plans.name", "%taxi%")
          .lte("start_date", end)
          .or(`end_date.is.null,end_date.gte.${start}`),
      ]);

      const b = bookings || [];
      const ag = agendamentos || [];
      const plans = (taxiPlans as any[]) || [];

      const agMapped = ag.map((a) => ({
        status: a.status === "concluido" ? "finalizada" : a.status === "cancelado" ? "cancelada" : a.status === "agendado" ? "agendada" : a.status,
        final_price: Number(a.valor || 0),
      }));

      const all = [
        ...b.map((x) => ({ status: x.status, final_price: Number(x.final_price || 0) })),
        ...agMapped,
      ];

      // Receita do mês = soma dos planos TaxiPet contratados vigentes (exclui cancelados)
      const receitaPlanos = plans
        .filter((p) => p.status !== "cancelado" && p.status !== "cancelled")
        .reduce((sum, p) => sum + Number(p.final_price ?? p.price_contracted ?? 0), 0);

      // Média de viagens por semana no mês corrente
      const daysInMonth = differenceInCalendarDays(endDate, startDate) + 1;
      const weeksInMonth = daysInMonth / 7;
      const avgPerWeek = weeksInMonth > 0 ? Number((all.length / weeksInMonth).toFixed(1)) : 0;

      const finalizados = all.filter((x) => ["finalizada", "concluido", "entregue"].includes(x.status)).length;
      const cancelados = all.filter((x) => ["cancelada", "cancelado", "nao_realizada"].includes(x.status)).length;
      const emAndamento = all.filter((x) => ["em_rota_coleta", "pet_coletado", "em_deslocamento", "em_atendimento", "aguardando_saida"].includes(x.status)).length;
      const agendadas = all.filter((x) => ["agendada", "agendado", "confirmado"].includes(x.status)).length;

      setStats({
        totalMonth: all.length,
        completed: finalizados,
        cancelled: cancelados,
        inProgress: emAndamento,
        scheduled: agendadas,
        activeDrivers: drivers?.length || 0,
        revenueMonth: receitaPlanos,
        avgPerWeek,
      });
    };
    load();
  }, [profile?.empresa_id]);

  const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const cards: Array<{ title: string; value: string; icon: JSX.Element; accent: "blue"|"emerald"|"violet"|"amber" }> = [
    { title: "Corridas no Mês", value: String(stats.totalMonth), icon: <Car className="h-5 w-5" />, accent: "blue" },
    { title: "Receita do Mês", value: brl(stats.revenueMonth), icon: <DollarSign className="h-5 w-5" />, accent: "emerald" },
    { title: "Em Andamento", value: String(stats.inProgress), icon: <Clock className="h-5 w-5" />, accent: "amber" },
    { title: "Agendadas", value: String(stats.scheduled), icon: <MapPin className="h-5 w-5" />, accent: "blue" },
    { title: "Finalizadas", value: String(stats.completed), icon: <CheckCircle className="h-5 w-5" />, accent: "emerald" },
    { title: "Canceladas", value: String(stats.cancelled), icon: <XCircle className="h-5 w-5" />, accent: "amber" },
    { title: "Motoristas Ativos", value: String(stats.activeDrivers), icon: <Users className="h-5 w-5" />, accent: "violet" },
    { title: "Média / Semana", value: String(stats.avgPerWeek), icon: <TrendingUp className="h-5 w-5" />, accent: "violet" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-base font-semibold text-foreground">Dashboard Gerencial</h2>
        <span className="text-xs text-muted-foreground capitalize">{format(new Date(), "MMMM 'de' yyyy", { locale: ptBR })}</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((c) => (
          <MetricCard key={c.title} title={c.title} value={c.value} icon={c.icon} accent={c.accent} />
        ))}
      </div>
    </div>
  );
}
