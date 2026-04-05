import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CreditCard, Bell, PawPrint, Calendar, Navigation } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { usePortalCliente } from "@/hooks/usePortalCliente";

export default function PortalDashboard() {
  const { cliente, loading: clienteLoading } = usePortalCliente();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    pendingPayments: 0,
    unreadNotifications: 0,
    openRequests: 0,
    totalPets: 0,
    nextAppointment: null as { data_hora: string; tipo_servico: string; pet_nome: string } | null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!cliente) return;
    const fetchStats = async () => {
      const [payments, notifications, requests, pets, appointments] = await Promise.all([
        supabase.from("contas_receber").select("id", { count: "exact", head: true }).eq("cliente_id", cliente.id).eq("status", "pendente"),
        supabase.from("customer_notifications").select("id", { count: "exact", head: true }).eq("cliente_id", cliente.id).eq("is_read", false),
        supabase.from("customer_requests").select("id", { count: "exact", head: true }).eq("cliente_id", cliente.id).in("status", ["aberto", "em_analise", "em_andamento"]),
        supabase.from("pets").select("id", { count: "exact", head: true }).eq("cliente_id", cliente.id),
        supabase.from("agendamentos").select("data_hora, tipo_servico, pets(nome)").eq("cliente_id", cliente.id).gte("data_hora", new Date().toISOString()).order("data_hora", { ascending: true }).limit(1),
      ]);

      setStats({
        pendingPayments: payments.count ?? 0,
        unreadNotifications: notifications.count ?? 0,
        openRequests: requests.count ?? 0,
        totalPets: pets.count ?? 0,
        nextAppointment: appointments.data?.[0] ? {
          data_hora: appointments.data[0].data_hora,
          tipo_servico: appointments.data[0].tipo_servico,
          pet_nome: (appointments.data[0] as any).pets?.nome ?? "",
        } : null,
      });
      setLoading(false);
    };
    fetchStats();
  }, [cliente]);

  if (clienteLoading || loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const cards = [
    { label: "Meus Pets", value: stats.totalPets, icon: PawPrint, color: "text-primary", path: "/portal/pets" },
    { label: "Pagamentos Pendentes", value: stats.pendingPayments, icon: CreditCard, color: "text-warning", path: "/portal/pagamentos" },
    { label: "Notificações", value: stats.unreadNotifications, icon: Bell, color: "text-destructive", path: "/portal/notificacoes" },
    { label: "Estou Chegando", value: null, icon: Navigation, color: "text-emerald-500", path: "/portal/estou-chegando" },
  ];

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div>
        <h1 className="text-xl font-bold text-foreground">
          Olá, {cliente?.nome?.split(" ")[0] ?? "Cliente"}! 👋
        </h1>
        <p className="text-sm text-muted-foreground">Aqui está um resumo da sua conta.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Card
            key={card.label}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate(card.path)}
          >
            <CardContent className="p-4 flex flex-col items-center text-center gap-2">
              <card.icon className={`h-8 w-8 ${card.color}`} />
              {card.value !== null ? (
                <span className="text-2xl font-bold text-foreground">{card.value}</span>
              ) : (
                <span className="text-sm font-semibold text-foreground">Avisar</span>
              )}
              <span className="text-xs text-muted-foreground">{card.label}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {stats.nextAppointment && (
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Calendar className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">Próximo Agendamento</p>
              <p className="text-xs text-muted-foreground">
                {stats.nextAppointment.tipo_servico}
                {stats.nextAppointment.pet_nome ? ` • ${stats.nextAppointment.pet_nome}` : ""}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(stats.nextAppointment.data_hora).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
