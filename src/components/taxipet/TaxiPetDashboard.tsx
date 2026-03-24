import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Car, CheckCircle, Clock, XCircle, Users, DollarSign, TrendingUp, MapPin } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

const TRANSPORT_FILTER = "tipo_servico.ilike.%taxi%,tipo_servico.ilike.%transport%,tipo_servico.ilike.%leva%";

export default function TaxiPetDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({
    totalMonth: 0, completed: 0, cancelled: 0, inProgress: 0,
    scheduled: 0, activeDrivers: 0, revenueMonth: 0, avgPerDay: 0,
  });

  useEffect(() => {
    if (!profile?.empresa_id) return;
    const now = new Date();
    const start = format(startOfMonth(now), "yyyy-MM-dd");
    const end = format(endOfMonth(now), "yyyy-MM-dd");

    const load = async () => {
      const [{ data: bookings }, { data: drivers }, { data: agendamentos }] = await Promise.all([
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
      ]);

      const b = bookings || [];
      const ag = agendamentos || [];

      // Map agendamento statuses to unified ones
      const agMapped = ag.map((a) => ({
        status: a.status === "concluido" ? "finalizada" : a.status === "cancelado" ? "cancelada" : a.status === "agendado" ? "agendada" : a.status,
        final_price: Number(a.valor || 0),
      }));

      const all = [
        ...b.map((x) => ({ status: x.status, final_price: Number(x.final_price || 0) })),
        ...agMapped,
      ];

      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

      setStats({
        totalMonth: all.length,
        completed: all.filter((x) => x.status === "finalizada").length,
        cancelled: all.filter((x) => x.status === "cancelada").length,
        inProgress: all.filter((x) => ["em_rota_coleta", "pet_coletado", "em_deslocamento", "em_atendimento"].includes(x.status)).length,
        scheduled: all.filter((x) => ["agendada", "agendado", "confirmado"].includes(x.status)).length,
        activeDrivers: drivers?.length || 0,
        revenueMonth: all.filter((x) => x.status === "finalizada").reduce((s, x) => s + x.final_price, 0),
        avgPerDay: Math.round(all.length / daysInMonth),
      });
    };
    load();
  }, [profile?.empresa_id]);

  const cards = [
    { label: "Corridas no Mês", value: stats.totalMonth, icon: Car, color: "text-primary" },
    { label: "Finalizadas", value: stats.completed, icon: CheckCircle, color: "text-emerald-500" },
    { label: "Em Andamento", value: stats.inProgress, icon: Clock, color: "text-amber-500" },
    { label: "Agendadas", value: stats.scheduled, icon: MapPin, color: "text-blue-500" },
    { label: "Canceladas", value: stats.cancelled, icon: XCircle, color: "text-destructive" },
    { label: "Motoristas Ativos", value: stats.activeDrivers, icon: Users, color: "text-violet-500" },
    { label: "Receita do Mês", value: stats.revenueMonth.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }), icon: DollarSign, color: "text-emerald-500" },
    { label: "Média/Dia", value: stats.avgPerDay, icon: TrendingUp, color: "text-primary" },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Dashboard Gerencial — {format(new Date(), "MMMM yyyy", { locale: ptBR })}</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">{c.label}</CardTitle>
              <c.icon className={`h-4 w-4 ${c.color}`} />
            </CardHeader>
            <CardContent><div className="text-xl font-bold">{c.value}</div></CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
