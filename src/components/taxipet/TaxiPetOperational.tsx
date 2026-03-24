import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Car, Clock, CheckCircle, MapPin, User, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const statusFlow = [
  "agendada", "aguardando_saida", "em_rota_coleta", "pet_coletado",
  "em_deslocamento", "entregue", "finalizada",
];

const statusLabels: Record<string, string> = {
  agendada: "Agendada", aguardando_saida: "Aguardando Saída", em_rota_coleta: "Em Rota p/ Coleta",
  pet_coletado: "Pet Coletado", em_deslocamento: "Em Deslocamento", entregue: "Entregue",
  retorno: "Retorno", finalizada: "Finalizada", cancelada: "Cancelada", nao_realizada: "Não Realizada",
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
  nao_realizada: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

type Booking = {
  id: string; status: string; scheduled_date: string; scheduled_pickup_time: string | null;
  trip_type: string; notes: string | null; special_instructions: string | null;
  driver_id: string | null; final_price: number;
  clientes?: { nome: string }; pets?: { nome: string };
  drivers?: { name: string } | null; transport_types?: { name: string } | null;
};

export default function TaxiPetOperational() {
  const { profile } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [driverFilter, setDriverFilter] = useState("");
  const [drivers, setDrivers] = useState<{ id: string; name: string }[]>([]);

  const load = async () => {
    if (!profile?.empresa_id) return;
    const eid = profile.empresa_id;
    const [{ data: b }, { data: d }] = await Promise.all([
      supabase.from("transport_bookings")
        .select("*, clientes(nome), pets(nome), drivers(name), transport_types(name)")
        .eq("empresa_id", eid).eq("scheduled_date", date)
        .order("scheduled_pickup_time"),
      supabase.from("drivers").select("id, name").eq("empresa_id", eid).eq("status", "ativo"),
    ]);
    setBookings((b as Booking[]) || []);
    setDrivers((d as any) || []);
  };

  useEffect(() => { load(); }, [profile?.empresa_id, date]);

  const advanceStatus = async (booking: Booking) => {
    const idx = statusFlow.indexOf(booking.status);
    if (idx < 0 || idx >= statusFlow.length - 1) return;
    const next = statusFlow[idx + 1];
    await supabase.from("transport_bookings").update({ status: next }).eq("id", booking.id);
    // Register event
    await supabase.from("transport_events").insert({
      empresa_id: profile!.empresa_id!, booking_id: booking.id,
      event_type: next, description: `Status alterado para: ${statusLabels[next]}`,
    });
    toast.success(`Status: ${statusLabels[next]}`);
    load();
  };

  const filtered = bookings.filter((b) => !driverFilter || driverFilter === "__all__" || b.driver_id === driverFilter);

  const summary = {
    total: filtered.length,
    coleta: filtered.filter((b) => ["agendada", "aguardando_saida", "em_rota_coleta"].includes(b.status)).length,
    entrega: filtered.filter((b) => ["em_deslocamento", "entregue"].includes(b.status)).length,
    andamento: filtered.filter((b) => !["agendada", "finalizada", "cancelada", "nao_realizada"].includes(b.status)).length,
    finalizadas: filtered.filter((b) => b.status === "finalizada").length,
    canceladas: filtered.filter((b) => b.status === "cancelada").length,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-40" />
        <Select value={driverFilter} onValueChange={setDriverFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Todos os motoristas" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos</SelectItem>
            {drivers.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {[
          { label: "Total", value: summary.total, icon: Car },
          { label: "P/ Coleta", value: summary.coleta, icon: MapPin },
          { label: "P/ Entrega", value: summary.entrega, icon: ArrowRight },
          { label: "Em Andamento", value: summary.andamento, icon: Clock },
          { label: "Finalizadas", value: summary.finalizadas, icon: CheckCircle },
          { label: "Canceladas", value: summary.canceladas, icon: Car },
        ].map((c) => (
          <Card key={c.label}>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className="text-xl font-bold">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Booking cards */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((b) => (
          <Card key={b.id} className="relative">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">{b.pets?.nome || "Pet"}</CardTitle>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColors[b.status] || ""}`}>
                  {statusLabels[b.status] || b.status}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-1 text-xs">
              <div className="flex items-center gap-1 text-muted-foreground">
                <User className="h-3 w-3" /> {b.clientes?.nome || "—"}
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-3 w-3" /> {b.scheduled_pickup_time?.slice(0, 5) || "—"}
              </div>
              {b.drivers?.name && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Car className="h-3 w-3" /> {b.drivers.name}
                </div>
              )}
              {b.special_instructions && (
                <p className="text-amber-600 dark:text-amber-400 text-[11px] mt-1">⚠ {b.special_instructions}</p>
              )}
              <div className="flex items-center justify-between pt-2 border-t mt-2">
                <span className="font-medium">R$ {Number(b.final_price).toFixed(2)}</span>
                {!["finalizada", "cancelada", "nao_realizada"].includes(b.status) && (
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => advanceStatus(b)}>
                    Avançar <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full text-center text-muted-foreground py-12">Nenhuma corrida para esta data</div>
        )}
      </div>
    </div>
  );
}
