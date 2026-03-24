import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Car, Clock, CheckCircle, MapPin, User, ArrowRight, CalendarDays, Phone } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const TRANSPORT_FILTER = "tipo_servico.ilike.%taxi%,tipo_servico.ilike.%transport%,tipo_servico.ilike.%leva%";

const statusFlow = [
  "agendada", "aguardando_saida", "em_rota_coleta", "pet_coletado",
  "em_deslocamento", "entregue", "finalizada",
];

const agendamentoStatusFlow = [
  "agendado", "confirmado", "em_atendimento", "concluido",
];

const statusLabels: Record<string, string> = {
  agendada: "Agendada", aguardando_saida: "Aguardando Saída", em_rota_coleta: "Em Rota p/ Coleta",
  pet_coletado: "Pet Coletado", em_deslocamento: "Em Deslocamento", entregue: "Entregue",
  retorno: "Retorno", finalizada: "Finalizada", cancelada: "Cancelada", nao_realizada: "Não Realizada",
  agendado: "Agendado", confirmado: "Confirmado", em_atendimento: "Em Atendimento", concluido: "Concluído",
  cancelado: "Cancelado",
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
  agendado: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  confirmado: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
  em_atendimento: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  concluido: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  cancelado: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

type UnifiedBooking = {
  id: string; status: string; scheduled_date: string; scheduled_pickup_time: string | null;
  trip_type: string; notes: string | null; special_instructions: string | null;
  driver_id: string | null; final_price: number;
  cliente_nome: string; cliente_whatsapp: string | null; cliente_endereco: string | null;
  pet_nome: string;
  driver_nome: string | null; type_nome: string | null;
  source: "transport" | "agendamento";
  hora_prevista_buscar: string | null;
  hora_prevista_levar: string | null;
};

export default function TaxiPetOperational() {
  const { profile } = useAuth();
  const [bookings, setBookings] = useState<UnifiedBooking[]>([]);
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [driverFilter, setDriverFilter] = useState("");
  const [drivers, setDrivers] = useState<{ id: string; name: string }[]>([]);

  const load = async () => {
    if (!profile?.empresa_id) return;
    const eid = profile.empresa_id;

    const [{ data: b }, { data: d }, { data: ag }] = await Promise.all([
      supabase.from("transport_bookings")
        .select("*, clientes(nome, whatsapp, endereco), pets(nome), drivers(name), transport_types(name)")
        .eq("empresa_id", eid).eq("scheduled_date", date)
        .order("scheduled_pickup_time"),
      supabase.from("drivers").select("id, name").eq("empresa_id", eid).eq("status", "ativo"),
      supabase.from("agendamentos")
        .select("id, data_hora, tipo_servico, status, notas, valor, cliente_id, pet_id, hora_prevista_buscar, hora_prevista_levar, clientes:cliente_id(nome, whatsapp, endereco), pets:pet_id(nome)")
        .eq("empresa_id", eid)
        .gte("data_hora", `${date}T00:00:00`)
        .lt("data_hora", `${date}T23:59:59`)
        .or(TRANSPORT_FILTER),
    ]);

    const transportBookings: UnifiedBooking[] = (b || []).map((item: any) => ({
      id: item.id, status: item.status, scheduled_date: item.scheduled_date,
      scheduled_pickup_time: item.scheduled_pickup_time, trip_type: item.trip_type,
      notes: item.notes, special_instructions: item.special_instructions,
      driver_id: item.driver_id, final_price: Number(item.final_price || 0),
      cliente_nome: item.clientes?.nome || "—",
      cliente_whatsapp: item.clientes?.whatsapp || null,
      cliente_endereco: item.clientes?.endereco || null,
      pet_nome: item.pets?.nome || "Pet",
      driver_nome: item.drivers?.name || null, type_nome: item.transport_types?.name || null,
      source: "transport",
      hora_prevista_buscar: null, hora_prevista_levar: null,
    }));

    const agendamentoBookings: UnifiedBooking[] = (ag || []).map((item: any) => ({
      id: item.id, status: item.status, scheduled_date: date,
      scheduled_pickup_time: format(new Date(item.data_hora), "HH:mm:ss"),
      trip_type: item.tipo_servico, notes: item.notas, special_instructions: null,
      driver_id: null, final_price: Number(item.valor || 0),
      cliente_nome: item.clientes?.nome || "—",
      cliente_whatsapp: item.clientes?.whatsapp || null,
      cliente_endereco: item.clientes?.endereco || null,
      pet_nome: item.pets?.nome || "Pet",
      driver_nome: null, type_nome: item.tipo_servico, source: "agendamento",
      hora_prevista_buscar: item.hora_prevista_buscar || null,
      hora_prevista_levar: item.hora_prevista_levar || null,
    }));

    const agendamentoBookings: UnifiedBooking[] = (ag || []).map((item: any) => ({
      id: item.id,
      status: item.status,
      scheduled_date: date,
      scheduled_pickup_time: format(new Date(item.data_hora), "HH:mm:ss"),
      trip_type: item.tipo_servico,
      notes: item.notas,
      special_instructions: null,
      driver_id: null,
      final_price: Number(item.valor || 0),
      cliente_nome: item.clientes?.nome || "—",
      cliente_whatsapp: item.clientes?.whatsapp || null,
      cliente_endereco: item.clientes?.endereco || null,
      pet_nome: item.pets?.nome || "Pet",
      driver_nome: null,
      type_nome: item.tipo_servico,
      source: "agendamento",
    }));

    setBookings([...transportBookings, ...agendamentoBookings]);
    setDrivers((d as any) || []);
  };

  useEffect(() => { load(); }, [profile?.empresa_id, date]);

  const advanceStatus = async (booking: UnifiedBooking) => {
    if (booking.source === "agendamento") {
      const flow = agendamentoStatusFlow;
      const idx = flow.indexOf(booking.status);
      if (idx < 0 || idx >= flow.length - 1) return;
      const next = flow[idx + 1];
      await supabase.from("agendamentos").update({ status: next }).eq("id", booking.id);
      toast.success(`Status: ${statusLabels[next]}`);
      load();
      return;
    }
    const idx = statusFlow.indexOf(booking.status);
    if (idx < 0 || idx >= statusFlow.length - 1) return;
    const next = statusFlow[idx + 1];
    await supabase.from("transport_bookings").update({ status: next }).eq("id", booking.id);
    await supabase.from("transport_events").insert({
      empresa_id: profile!.empresa_id!, booking_id: booking.id,
      event_type: next, description: `Status alterado para: ${statusLabels[next]}`,
    });
    toast.success(`Status: ${statusLabels[next]}`);
    load();
  };

  const filtered = bookings.filter((b) => !driverFilter || driverFilter === "__all__" || b.driver_id === driverFilter);

  const isTerminal = (s: string) => ["finalizada", "cancelada", "nao_realizada", "concluido", "cancelado"].includes(s);

  const isActive = (s: string) => !["agendada", "finalizada", "cancelada", "nao_realizada", "concluido", "cancelado"].includes(s);

  const formatWhatsAppLink = (phone: string) => {
    const clean = phone.replace(/\D/g, "");
    const num = clean.startsWith("55") ? clean : `55${clean}`;
    return `https://wa.me/${num}`;
  };

  const formatMapsLink = (address: string) => {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
  };

  const summary = {
    total: filtered.length,
    coleta: filtered.filter((b) => ["agendada", "aguardando_saida", "em_rota_coleta", "agendado", "confirmado"].includes(b.status)).length,
    entrega: filtered.filter((b) => ["em_deslocamento", "entregue"].includes(b.status)).length,
    andamento: filtered.filter((b) => isActive(b.status)).length,
    finalizadas: filtered.filter((b) => ["finalizada", "concluido"].includes(b.status)).length,
    canceladas: filtered.filter((b) => ["cancelada", "cancelado"].includes(b.status)).length,
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

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((b) => (
          <Card key={`${b.source}-${b.id}`} className="relative">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <CardTitle className="text-sm">{b.pet_nome}</CardTitle>
                  {b.source === "agendamento" && (
                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 gap-0.5">
                      <CalendarDays className="h-2.5 w-2.5" /> Agenda
                    </Badge>
                  )}
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColors[b.status] || ""}`}>
                  {statusLabels[b.status] || b.status}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-1 text-xs">
              <div className="flex items-center gap-1 text-muted-foreground">
                <User className="h-3 w-3" /> {b.cliente_nome}
              </div>
              {b.cliente_whatsapp && (
                <a
                  href={formatWhatsAppLink(b.cliente_whatsapp)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-green-600 hover:text-green-700 hover:underline"
                >
                  <Phone className="h-3 w-3" /> {b.cliente_whatsapp}
                </a>
              )}
              {b.cliente_endereco && (
                <a
                  href={formatMapsLink(b.cliente_endereco)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:underline"
                >
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span className="truncate">{b.cliente_endereco}</span>
                </a>
              )}
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-3 w-3" /> {b.scheduled_pickup_time?.slice(0, 5) || "—"}
              </div>
              {b.driver_nome && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Car className="h-3 w-3" /> {b.driver_nome}
                </div>
              )}
              {b.type_nome && (
                <div className="text-muted-foreground text-[11px]">🚗 {b.type_nome}</div>
              )}
              {b.special_instructions && (
                <p className="text-amber-600 dark:text-amber-400 text-[11px] mt-1">⚠ {b.special_instructions}</p>
              )}
              <div className="flex items-center justify-between pt-2 border-t mt-2">
                <span className="font-medium">R$ {b.final_price.toFixed(2)}</span>
                {!isTerminal(b.status) && (
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
