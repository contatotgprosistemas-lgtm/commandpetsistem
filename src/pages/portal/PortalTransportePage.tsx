import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePortalCliente } from "@/hooks/usePortalCliente";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Car, Clock, MapPin, CheckCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { extractTimeBR } from "@/lib/utils";

const statusLabels: Record<string, string> = {
  agendada: "Agendada",
  aguardando_saida: "Aguardando Saída",
  em_rota_coleta: "Motorista a caminho",
  pet_coletado: "Pet coletado",
  em_deslocamento: "Em deslocamento",
  entregue: "Entregue",
  finalizada: "Finalizada",
  cancelada: "Cancelada",
  nao_realizada: "Não Realizada",
  agendado: "Agendado",
  confirmado: "Confirmado",
  em_atendimento: "Em Atendimento",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

const statusIcons: Record<string, typeof Car> = {
  agendada: Clock,
  aguardando_saida: Clock,
  em_rota_coleta: Car,
  pet_coletado: CheckCircle,
  em_deslocamento: Car,
  entregue: CheckCircle,
  finalizada: CheckCircle,
  cancelada: AlertCircle,
  agendado: Clock,
  confirmado: CheckCircle,
  em_atendimento: Car,
  concluido: CheckCircle,
};

const statusColors: Record<string, string> = {
  agendada: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  aguardando_saida: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  em_rota_coleta: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  pet_coletado: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  em_deslocamento: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  entregue: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  finalizada: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  cancelada: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  agendado: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  confirmado: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
  em_atendimento: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  concluido: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

const TRANSPORT_FILTER = "tipo_servico.ilike.%taxi%,tipo_servico.ilike.%transport%,tipo_servico.ilike.%leva%";

type Booking = {
  id: string;
  status: string;
  scheduled_date: string;
  scheduled_pickup_time: string | null;
  pet_nome: string;
  trip_type: string;
  source: "transport" | "agendamento";
};

export default function PortalTransportePage() {
  const { cliente, loading: clienteLoading } = usePortalCliente();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const loadBookings = async () => {
    if (!cliente) return;
    const [{ data: tb }, { data: ag }] = await Promise.all([
      supabase
        .from("transport_bookings")
        .select("id, status, scheduled_date, scheduled_pickup_time, trip_type, pets(nome)")
        .eq("cliente_id", cliente.id)
        .order("scheduled_date", { ascending: false })
        .limit(50),
      supabase
        .from("agendamentos")
        .select("id, status, data_hora, tipo_servico, pets:pet_id(nome)")
        .eq("cliente_id", cliente.id)
        .or(TRANSPORT_FILTER)
        .order("data_hora", { ascending: false })
        .limit(50),
    ]);

    const items: Booking[] = [
      ...(tb || []).map((b: any) => ({
        id: b.id,
        status: b.status,
        scheduled_date: b.scheduled_date,
        scheduled_pickup_time: b.scheduled_pickup_time,
        pet_nome: b.pets?.nome || "Pet",
        trip_type: b.trip_type,
        source: "transport" as const,
      })),
      ...(ag || []).map((a: any) => ({
        id: a.id,
        status: a.status,
        scheduled_date: (a.data_hora as string).split("T")[0].split(" ")[0],
        scheduled_pickup_time: extractTimeBR(a.data_hora),
        pet_nome: a.pets?.nome || "Pet",
        trip_type: a.tipo_servico,
        source: "agendamento" as const,
      })),
    ].sort((a, b) => b.scheduled_date.localeCompare(a.scheduled_date));

    setBookings(items);
    setLoading(false);
  };

  useEffect(() => {
    if (cliente) loadBookings();
  }, [cliente]);

  if (clienteLoading || loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
    );
  }

  const active = bookings.filter(b => !["finalizada", "cancelada", "nao_realizada", "concluido", "cancelado"].includes(b.status));
  const past = bookings.filter(b => ["finalizada", "cancelada", "nao_realizada", "concluido", "cancelado"].includes(b.status));

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Car className="h-5 w-5 text-primary" /> Acompanhar Transporte
        </h1>
        <p className="text-sm text-muted-foreground">Acompanhe o status das viagens do seu pet em tempo real.</p>
      </div>

      {active.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Viagens Ativas</h2>
          {active.map(b => {
            const Icon = statusIcons[b.status] || Clock;
            return (
              <Card key={`${b.source}-${b.id}`} className="border-primary/30">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm text-foreground">{b.pet_nome}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColors[b.status] || ""}`}>
                        {statusLabels[b.status] || b.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {b.scheduled_date} • {b.scheduled_pickup_time?.slice(0, 5) || "—"} • {b.trip_type}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {active.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Car className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Nenhuma viagem ativa no momento</p>
          </CardContent>
        </Card>
      )}

      {past.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Histórico</h2>
          {past.slice(0, 20).map(b => (
            <Card key={`${b.source}-${b.id}`}>
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-foreground">{b.pet_nome}</span>
                  <p className="text-xs text-muted-foreground">{b.scheduled_date} • {b.trip_type}</p>
                </div>
                <Badge variant={b.status === "finalizada" || b.status === "concluido" ? "default" : "destructive"}>
                  {statusLabels[b.status] || b.status}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
