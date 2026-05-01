import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MetricCard } from "@/components/MetricCard";
import {
  Car, Clock, CheckCircle, MapPin, User, ArrowRight, Phone, GripVertical,
  Sun, Moon, Bath, Navigation2, Home, Hash, Pencil, Check, X,
} from "lucide-react";
import { format } from "date-fns";
import { extractTimeBR } from "@/lib/utils";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy, arrayMove, useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const TRANSPORT_FILTER = "tipo_servico.ilike.%taxi%,tipo_servico.ilike.%transport%,tipo_servico.ilike.%leva%";

const statusFlow = [
  "agendada", "aguardando_saida", "em_rota_coleta", "pet_coletado",
  "em_deslocamento", "entregue", "finalizada",
];
const agendamentoStatusFlow = ["agendado", "confirmado", "em_atendimento", "concluido"];

const statusLabels: Record<string, string> = {
  agendada: "Agendada", aguardando_saida: "Aguardando Saída", em_rota_coleta: "Em Rota p/ Coleta",
  pet_coletado: "Pet Coletado", em_deslocamento: "Em Deslocamento", entregue: "Entregue",
  finalizada: "Finalizada", cancelada: "Cancelada", nao_realizada: "Não Realizada",
  agendado: "Agendado", confirmado: "Confirmado", em_atendimento: "Em Atendimento",
  concluido: "Concluído", cancelado: "Cancelado",
};

const statusVariant = (s: string): { className: string } => {
  if (["finalizada", "concluido", "entregue"].includes(s))
    return { className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20" };
  if (["cancelada", "cancelado", "nao_realizada"].includes(s))
    return { className: "bg-destructive/10 text-destructive border-destructive/20" };
  if (["em_rota_coleta", "pet_coletado", "em_deslocamento", "em_atendimento"].includes(s))
    return { className: "bg-primary/10 text-primary border-primary/20" };
  return { className: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20" };
};

type Source = "transport" | "agendamento";
type PeriodKey = "manha_buscar" | "tarde_levar" | "banho_buscar" | "banho_levar";
type Leg = "buscar" | "levar" | "outro";

type UnifiedBooking = {
  id: string; status: string; scheduled_date: string; scheduled_pickup_time: string | null;
  scheduled_dropoff_time: string | null;
  trip_type: string; notes: string | null; special_instructions: string | null;
  driver_id: string | null; final_price: number;
  cliente_nome: string; cliente_whatsapp: string | null; cliente_telefone: string | null; cliente_endereco: string | null;
  pet_nome: string;
  driver_nome: string | null; type_nome: string | null;
  source: Source;
  hora_prevista_buscar: string | null;
  hora_prevista_levar: string | null;
  is_escola: boolean;
  is_banho: boolean;
  leg?: Leg;
};

const onlyDigits = (s: string) => (s || "").replace(/\D/g, "");
const waLink = (phone: string) => {
  const c = onlyDigits(phone); const num = c.startsWith("55") ? c : `55${c}`;
  return `https://wa.me/${num}`;
};
const telLink = (phone: string) => `tel:+${onlyDigits(phone).startsWith("55") ? "" : "55"}${onlyDigits(phone)}`;
const mapsLink = (addr: string) => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addr)}`;
const wazeLink = (addr: string) => `https://waze.com/ul?q=${encodeURIComponent(addr)}&navigate=yes`;

const normalizeTime = (v: string | null | undefined): string => {
  if (!v) return "";
  if (/^\d{2}:\d{2}/.test(v)) return v.slice(0, 5);
  if (v.includes("T") || v.includes(" ")) return extractTimeBR(v);
  return v.slice(0, 5);
};

const getBookingDisplayTime = (
  booking: UnifiedBooking,
  preferred?: "hora_prevista_buscar" | "hora_prevista_levar",
): string => {
  if (preferred === "hora_prevista_buscar") {
    return normalizeTime(booking.hora_prevista_buscar) || normalizeTime(booking.scheduled_pickup_time);
  }

  if (preferred === "hora_prevista_levar") {
    return (
      normalizeTime(booking.hora_prevista_levar) ||
      normalizeTime(booking.scheduled_dropoff_time) ||
      normalizeTime(booking.scheduled_pickup_time)
    );
  }

  const trip = (booking.trip_type || "").toLowerCase();
  const preferLevar = /volta|leva|entreg/.test(trip);

  if (preferLevar) {
    return (
      normalizeTime(booking.hora_prevista_levar) ||
      normalizeTime(booking.scheduled_dropoff_time) ||
      normalizeTime(booking.hora_prevista_buscar) ||
      normalizeTime(booking.scheduled_pickup_time)
    );
  }

  return (
    normalizeTime(booking.hora_prevista_buscar) ||
    normalizeTime(booking.hora_prevista_levar) ||
    normalizeTime(booking.scheduled_pickup_time) ||
    normalizeTime(booking.scheduled_dropoff_time)
  );
};

function isEscola(t: string) {
  const v = (t || "").toLowerCase();
  return /(escola|creche|daycare|day\s*care|hot[eé]l\s*dia)/.test(v);
}
function isBanho(t: string) {
  const v = (t || "").toLowerCase();
  return /(banho|tosa|bath|grooming)/.test(v);
}

export default function TaxiPetOperational() {
  const { profile } = useAuth();
  const [bookings, setBookings] = useState<UnifiedBooking[]>([]);
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [driverFilter, setDriverFilter] = useState("");
  const [drivers, setDrivers] = useState<{ id: string; name: string }[]>([]);
  const [orderMap, setOrderMap] = useState<Record<PeriodKey, string[]>>({
    manha_buscar: [], tarde_levar: [], banho_buscar: [], banho_levar: [],
  });

  const load = async () => {
    if (!profile?.empresa_id) return;
    const eid = profile.empresa_id;

    const [{ data: b }, { data: d }, { data: ag }, { data: rota }] = await Promise.all([
      supabase.from("transport_bookings")
        .select("*, clientes(nome, whatsapp, telefone, endereco), pets(nome), drivers(name), transport_types(name)")
        .eq("empresa_id", eid).eq("scheduled_date", date)
        .order("scheduled_pickup_time"),
      supabase.from("drivers").select("id, name").eq("empresa_id", eid).eq("status", "ativo"),
      supabase.from("agendamentos")
        .select("id, data_hora, tipo_servico, status, notas, valor, cliente_id, pet_id, hora_prevista_buscar, hora_prevista_levar, clientes:cliente_id(nome, whatsapp, telefone, endereco), pets:pet_id(nome)")
        .eq("empresa_id", eid)
        .gte("data_hora", `${date}T00:00:00`)
        .lt("data_hora", `${date}T23:59:59`)
        .or(TRANSPORT_FILTER),
      supabase.from("taxipet_rota_ordem")
        .select("periodo, booking_id, ordem")
        .eq("empresa_id", eid).eq("data", date)
        .order("ordem"),
    ]);

    const transportBookings: UnifiedBooking[] = (b || []).map((item: any) => {
      const tn = item.transport_types?.name || item.trip_type || "";
      return {
        id: item.id, status: item.status, scheduled_date: item.scheduled_date,
        scheduled_pickup_time: item.scheduled_pickup_time, scheduled_dropoff_time: item.scheduled_dropoff_time || null, trip_type: item.trip_type,
        notes: item.notes, special_instructions: item.special_instructions,
        driver_id: item.driver_id, final_price: Number(item.final_price || 0),
        cliente_nome: item.clientes?.nome || "—",
        cliente_whatsapp: item.clientes?.whatsapp || null,
        cliente_telefone: item.clientes?.telefone || null,
        cliente_endereco: item.clientes?.endereco || null,
        pet_nome: item.pets?.nome || "Pet",
        driver_nome: item.drivers?.name || null, type_nome: tn, source: "transport",
        hora_prevista_buscar: null, hora_prevista_levar: null,
        is_escola: isEscola(tn), is_banho: isBanho(tn),
      };
    });

    const agendamentoBookings: UnifiedBooking[] = (ag || []).map((item: any) => ({
      id: item.id, status: item.status, scheduled_date: date,
      scheduled_pickup_time: extractTimeBR(item.data_hora),
      scheduled_dropoff_time: null,
      trip_type: item.tipo_servico, notes: item.notas, special_instructions: null,
      driver_id: null, final_price: Number(item.valor || 0),
      cliente_nome: item.clientes?.nome || "—",
      cliente_whatsapp: item.clientes?.whatsapp || null,
      cliente_telefone: item.clientes?.telefone || null,
      cliente_endereco: item.clientes?.endereco || null,
      pet_nome: item.pets?.nome || "Pet",
      driver_nome: null, type_nome: item.tipo_servico, source: "agendamento",
      hora_prevista_buscar: item.hora_prevista_buscar || null,
      hora_prevista_levar: item.hora_prevista_levar || null,
      is_escola: isEscola(item.tipo_servico),
      is_banho: isBanho(item.tipo_servico),
    }));

    setBookings([...transportBookings, ...agendamentoBookings]);
    setDrivers((d as any) || []);

    const map: Record<PeriodKey, string[]> = { manha_buscar: [], tarde_levar: [], banho_buscar: [], banho_levar: [] };
    (rota || []).forEach((r: any) => {
      if (map[r.periodo as PeriodKey]) map[r.periodo as PeriodKey].push(r.booking_id);
    });
    setOrderMap(map);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [profile?.empresa_id, date]);

  const advanceStatus = async (booking: UnifiedBooking) => {
    if (booking.source === "agendamento") {
      const flow = agendamentoStatusFlow;
      const idx = flow.indexOf(booking.status);
      if (idx < 0 || idx >= flow.length - 1) return;
      const next = flow[idx + 1];
      await supabase.from("agendamentos").update({ status: next }).eq("id", booking.id);
      toast.success(`Status: ${statusLabels[next]}`);
      load(); return;
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

  const filtered = useMemo(
    () => bookings.filter((b) => !driverFilter || driverFilter === "__all__" || b.driver_id === driverFilter),
    [bookings, driverFilter]
  );

  const isTerminal = (s: string) => ["finalizada", "cancelada", "nao_realizada", "concluido", "cancelado"].includes(s);

  // Group bookings by period
  const grouped = useMemo(() => {
    const escola = filtered.filter((b) => b.is_escola);
    const banho = filtered.filter((b) => b.is_banho && !b.is_escola);
    const outrasRaw = filtered.filter((b) => !b.is_escola && !b.is_banho);

    // Expande cada booking em legs (buscar/levar) — espelha a lógica do Dashboard,
    // garantindo a mesma contagem de corridas.
    const outras: UnifiedBooking[] = [];
    outrasRaw.forEach((b) => {
      const trip = (b.trip_type || "").toLowerCase();
      const buscar = normalizeTime(b.hora_prevista_buscar);
      const levar = normalizeTime(b.hora_prevista_levar) || normalizeTime(b.scheduled_dropoff_time);
      const isIdaVolta =
        trip === "ida_volta" || (!!buscar && !!levar);

      if (isIdaVolta) {
        outras.push({ ...b, id: `${b.id}:buscar`, leg: "buscar" });
        outras.push({ ...b, id: `${b.id}:levar`, leg: "levar" });
      } else if (buscar) {
        outras.push({ ...b, leg: "buscar" });
      } else if (levar) {
        outras.push({ ...b, leg: "levar" });
      } else {
        const baseLeg: Leg =
          trip === "ida" || trip.includes("busca") || trip.includes("coleta")
            ? "buscar"
            : trip === "volta" || trip.includes("leva") || trip.includes("entreg")
            ? "levar"
            : "outro";
        outras.push({ ...b, leg: baseLeg });
      }
    });
    outras.sort((a, b) => {
      const ta =
        a.leg === "levar"
          ? getBookingDisplayTime(a, "hora_prevista_levar")
          : getBookingDisplayTime(a, "hora_prevista_buscar");
      const tb =
        b.leg === "levar"
          ? getBookingDisplayTime(b, "hora_prevista_levar")
          : getBookingDisplayTime(b, "hora_prevista_buscar");
      if (ta && tb) return ta.localeCompare(tb);
      if (ta) return -1;
      if (tb) return 1;
      return 0;
    });

    // Escola: divide manhã / tarde com base nos horários previstos do agendamento (se houver),
    // senão usa o scheduled_pickup_time.
    const manhaBuscar: UnifiedBooking[] = [];
    const tardeLevar: UnifiedBooking[] = [];
    escola.forEach((b) => {
      // Sempre vai pra "Manhã - Buscar" (entrada na escola/creche)
      manhaBuscar.push(b);
      // E também pra "Tarde - Levar" (volta pra casa)
      tardeLevar.push(b);
    });

    const banhoBuscar = banho;
    const banhoLevar = banho;

    const sortByOrder = (arr: UnifiedBooking[], period: PeriodKey) => {
      const ord = orderMap[period];
      return [...arr].sort((a, b) => {
        const ia = ord.indexOf(a.id); const ib = ord.indexOf(b.id);
        if (ia !== -1 && ib !== -1) return ia - ib;
        if (ia !== -1) return -1;
        if (ib !== -1) return 1;
        const ha = (period === "manha_buscar" || period === "banho_buscar")
          ? getBookingDisplayTime(a, "hora_prevista_buscar")
          : getBookingDisplayTime(a, "hora_prevista_levar");
        const hb = (period === "manha_buscar" || period === "banho_buscar")
          ? getBookingDisplayTime(b, "hora_prevista_buscar")
          : getBookingDisplayTime(b, "hora_prevista_levar");
        return ha.localeCompare(hb);
      });
    };

    return {
      manha_buscar: sortByOrder(manhaBuscar, "manha_buscar"),
      tarde_levar: sortByOrder(tardeLevar, "tarde_levar"),
      banho_buscar: sortByOrder(banhoBuscar, "banho_buscar"),
      banho_levar: sortByOrder(banhoLevar, "banho_levar"),
      outras,
    };
  }, [filtered, orderMap]);

  const operationalItems = useMemo(
    () => [
      ...grouped.manha_buscar,
      ...grouped.tarde_levar,
      ...grouped.banho_buscar,
      ...grouped.banho_levar,
      ...grouped.outras,
    ],
    [grouped],
  );

  const summary = useMemo(() => ({
    total: operationalItems.length,
    coleta: operationalItems.filter((b) => ["agendada", "aguardando_saida", "em_rota_coleta", "agendado", "confirmado"].includes(b.status)).length,
    andamento: operationalItems.filter((b) => ["em_rota_coleta", "pet_coletado", "em_deslocamento", "em_atendimento"].includes(b.status)).length,
    finalizadas: operationalItems.filter((b) => ["finalizada", "concluido", "entregue"].includes(b.status)).length,
    canceladas: operationalItems.filter((b) => ["cancelada", "cancelado", "nao_realizada"].includes(b.status)).length,
  }), [operationalItems]);

  const persistOrder = async (period: PeriodKey, ids: { id: string; source: Source }[]) => {
    if (!profile?.empresa_id) return;
    const eid = profile.empresa_id;
    // Limpa e reinsere
    await supabase.from("taxipet_rota_ordem").delete()
      .eq("empresa_id", eid).eq("data", date).eq("periodo", period);
    if (ids.length > 0) {
      const rows = ids.map((it, idx) => ({
        empresa_id: eid, data: date, periodo: period,
        booking_id: it.id, source: it.source, ordem: idx,
      }));
      await supabase.from("taxipet_rota_ordem").insert(rows);
    }
  };

  const handleReorder = async (period: PeriodKey, items: UnifiedBooking[], from: number, to: number) => {
    const newArr = arrayMove(items, from, to);
    setOrderMap((prev) => ({ ...prev, [period]: newArr.map((x) => x.id) }));
    await persistOrder(period, newArr.map((x) => ({ id: x.id, source: x.source })));
    toast.success("Ordem atualizada");
  };

  // Atualiza o horário de um booking (respeitando a leg/origem) e recarrega.
  const updateBookingTime = async (
    booking: UnifiedBooking,
    leg: Leg | undefined,
    newTime: string,
  ) => {
    if (!newTime || !/^\d{2}:\d{2}$/.test(newTime)) {
      toast.error("Horário inválido");
      return;
    }
    // O id pode estar prefixado por leg expandida (":buscar" / ":levar"); usar o id original.
    const realId = booking.id.includes(":") ? booking.id.split(":")[0] : booking.id;
    const timeWithSec = `${newTime}:00`;

    try {
      if (booking.source === "agendamento") {
        const { error } = await supabase
          .from("agendamentos")
          .update(
            leg === "levar"
              ? { hora_prevista_levar: timeWithSec }
              : { hora_prevista_buscar: timeWithSec },
          )
          .eq("id", realId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("transport_bookings")
          .update(
            leg === "levar"
              ? { scheduled_dropoff_time: timeWithSec }
              : { scheduled_pickup_time: timeWithSec },
          )
          .eq("id", realId);
        if (error) throw error;
      }
      toast.success("Horário atualizado");
      load();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao atualizar horário");
    }
  };

  return (
    <div className="space-y-5">
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

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <MetricCard title="Total" value={String(summary.total)} icon={<Car className="h-5 w-5" />} accent="blue" />
        <MetricCard title="P/ Coleta" value={String(summary.coleta)} icon={<MapPin className="h-5 w-5" />} accent="amber" />
        <MetricCard title="Em Andamento" value={String(summary.andamento)} icon={<Clock className="h-5 w-5" />} accent="violet" />
        <MetricCard title="Finalizadas" value={String(summary.finalizadas)} icon={<CheckCircle className="h-5 w-5" />} accent="emerald" />
        <MetricCard title="Canceladas" value={String(summary.canceladas)} icon={<ArrowRight className="h-5 w-5" />} accent="amber" />
      </div>

      <RouteSection
        title="Manhã — Buscar (Escola/Creche)"
        icon={<Sun className="h-4 w-4" />}
        accent="amber"
        items={grouped.manha_buscar}
        period="manha_buscar"
        onReorder={handleReorder}
        onAdvance={advanceStatus}
        onEditTime={updateBookingTime}
        isTerminal={isTerminal}
        timeKey="hora_prevista_buscar"
      />

      <RouteSection
        title="Tarde — Levar (Escola/Creche)"
        icon={<Moon className="h-4 w-4" />}
        accent="violet"
        items={grouped.tarde_levar}
        period="tarde_levar"
        onReorder={handleReorder}
        onAdvance={advanceStatus}
        onEditTime={updateBookingTime}
        isTerminal={isTerminal}
        timeKey="hora_prevista_levar"
      />

      <RouteSection
        title="Banho/Tosa — Buscar"
        icon={<Bath className="h-4 w-4" />}
        accent="blue"
        items={grouped.banho_buscar}
        period="banho_buscar"
        onReorder={handleReorder}
        onAdvance={advanceStatus}
        onEditTime={updateBookingTime}
        isTerminal={isTerminal}
        timeKey="hora_prevista_buscar"
      />

      <RouteSection
        title="Banho/Tosa — Levar"
        icon={<Home className="h-4 w-4" />}
        accent="emerald"
        items={grouped.banho_levar}
        period="banho_levar"
        onReorder={handleReorder}
        onAdvance={advanceStatus}
        onEditTime={updateBookingTime}
        isTerminal={isTerminal}
        timeKey="hora_prevista_levar"
      />

      {grouped.outras.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Car className="h-4 w-4 text-muted-foreground" /> Outras corridas
            <Badge variant="outline" className="text-[10px] ml-1">{grouped.outras.length}</Badge>
          </h3>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {grouped.outras.map((b) => (
              <BookingCard key={`${b.source}-${b.id}`} b={b} onAdvance={advanceStatus} onEditTime={updateBookingTime} isTerminal={isTerminal} />
            ))}
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhuma corrida para esta data
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ============================================================== */
/* Componentes auxiliares                                         */
/* ============================================================== */

function RouteSection({
  title, icon, accent, items, period, onReorder, onAdvance, onEditTime, isTerminal, timeKey,
}: {
  title: string;
  icon: JSX.Element;
  accent: "blue" | "emerald" | "violet" | "amber";
  items: UnifiedBooking[];
  period: PeriodKey;
  onReorder: (p: PeriodKey, items: UnifiedBooking[], from: number, to: number) => void;
  onAdvance: (b: UnifiedBooking) => void;
  onEditTime: (b: UnifiedBooking, leg: Leg | undefined, newTime: string) => void;
  isTerminal: (s: string) => boolean;
  timeKey: "hora_prevista_buscar" | "hora_prevista_levar";
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  if (items.length === 0) return null;

  const accentRing = {
    blue: "ring-sky-500/30 bg-sky-500/5",
    emerald: "ring-emerald-500/30 bg-emerald-500/5",
    violet: "ring-violet-500/30 bg-violet-500/5",
    amber: "ring-amber-500/30 bg-amber-500/5",
  }[accent];

  const accentText = {
    blue: "text-sky-600", emerald: "text-emerald-600",
    violet: "text-violet-600", amber: "text-amber-600",
  }[accent];

  const handleEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const from = items.findIndex((i) => i.id === e.active.id);
    const to = items.findIndex((i) => i.id === e.over!.id);
    if (from < 0 || to < 0) return;
    onReorder(period, items, from, to);
  };

  return (
    <div className={`rounded-xl ring-1 ${accentRing} p-4 space-y-3`}>
      <div className="flex items-center justify-between">
        <h3 className={`text-sm font-semibold flex items-center gap-2 ${accentText}`}>
          <span className="h-7 w-7 rounded-md bg-background flex items-center justify-center">{icon}</span>
          {title}
          <Badge variant="outline" className="text-[10px] ml-1">{items.length}</Badge>
        </h3>
        <span className="text-[11px] text-muted-foreground hidden sm:inline">Arraste para reordenar</span>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleEnd}>
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {items.map((b, idx) => (
              <SortableRouteItem
                key={b.id} b={b} index={idx + 1}
                onAdvance={onAdvance} onEditTime={onEditTime} isTerminal={isTerminal} timeKey={timeKey}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function SortableRouteItem({
  b, index, onAdvance, onEditTime, isTerminal, timeKey,
}: {
  b: UnifiedBooking; index: number;
  onAdvance: (b: UnifiedBooking) => void;
  onEditTime: (b: UnifiedBooking, leg: Leg | undefined, newTime: string) => void;
  isTerminal: (s: string) => boolean;
  timeKey: "hora_prevista_buscar" | "hora_prevista_levar";
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: b.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 };
  const sv = statusVariant(b.status);
  const phone = b.cliente_whatsapp || b.cliente_telefone;
  const time = getBookingDisplayTime(b, timeKey) || "—";
  const editLeg: Leg = timeKey === "hora_prevista_levar" ? "levar" : "buscar";

  return (
    <div
      ref={setNodeRef} style={style}
      className="bg-card rounded-lg border border-border/60 p-3 shadow-sm hover:shadow-card-hover transition-all flex flex-col sm:flex-row sm:items-center gap-3"
    >
      <button
        {...attributes} {...listeners}
        className="self-start sm:self-center cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
        aria-label="Reordenar"
      >
        <GripVertical className="h-5 w-5" />
      </button>

      <div className="flex items-center gap-2 min-w-[2rem]">
        <div className="h-7 w-7 rounded-md bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
          <Hash className="h-3 w-3" />{index}
        </div>
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm text-foreground">{b.pet_nome}</span>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <User className="h-3 w-3" /> {b.cliente_nome}
          </span>
          <Badge variant="outline" className={`text-[10px] ${sv.className}`}>
            {statusLabels[b.status] || b.status}
          </Badge>
        </div>
        {b.cliente_endereco && (
          <p className="text-xs text-muted-foreground flex items-start gap-1">
            <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
            <span className="truncate">{b.cliente_endereco}</span>
          </p>
        )}
        {b.special_instructions && (
          <p className="text-[11px] text-amber-600 dark:text-amber-400">⚠ {b.special_instructions}</p>
        )}
      </div>

      <div className="flex flex-col items-end gap-1 shrink-0">
        <TimeEditor
          time={time}
          onSave={(t) => onEditTime(b, editLeg, t)}
        />
        <div className="flex items-center gap-1">
          {phone && (
            <>
              <Button asChild size="icon" variant="ghost" className="h-7 w-7" title="WhatsApp">
                <a href={waLink(phone)} target="_blank" rel="noopener noreferrer">
                  <Phone className="h-3.5 w-3.5 text-emerald-600" />
                </a>
              </Button>
              <Button asChild size="icon" variant="ghost" className="h-7 w-7" title="Ligar">
                <a href={telLink(phone)}>
                  <Phone className="h-3.5 w-3.5 text-primary" />
                </a>
              </Button>
            </>
          )}
          {b.cliente_endereco && (
            <>
              <Button asChild size="icon" variant="ghost" className="h-7 w-7" title="Google Maps">
                <a href={mapsLink(b.cliente_endereco)} target="_blank" rel="noopener noreferrer">
                  <MapPin className="h-3.5 w-3.5 text-sky-600" />
                </a>
              </Button>
              <Button asChild size="icon" variant="ghost" className="h-7 w-7" title="Waze">
                <a href={wazeLink(b.cliente_endereco)} target="_blank" rel="noopener noreferrer">
                  <Navigation2 className="h-3.5 w-3.5 text-violet-600" />
                </a>
              </Button>
            </>
          )}
          {!isTerminal(b.status) && (
            <Button size="sm" variant="outline" className="h-7 text-xs ml-1" onClick={() => onAdvance(b)}>
              Avançar <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function BookingCard({
  b,
  onAdvance,
  onEditTime,
  isTerminal,
}: {
  b: UnifiedBooking;
  onAdvance: (b: UnifiedBooking) => void;
  onEditTime: (b: UnifiedBooking, leg: Leg | undefined, newTime: string) => void;
  isTerminal: (s: string) => boolean;
}) {
  const sv = statusVariant(b.status);
  const phone = b.cliente_whatsapp || b.cliente_telefone;
  const preferred =
    b.leg === "buscar"
      ? "hora_prevista_buscar"
      : b.leg === "levar"
      ? "hora_prevista_levar"
      : undefined;
  const time = getBookingDisplayTime(b, preferred) || "—";
  const legLabel =
    b.leg === "buscar" ? "Buscar" : b.leg === "levar" ? "Levar" : null;
  return (
    <Card>
      <CardContent className="p-4 space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-sm">{b.pet_nome}</span>
            {legLabel && (
              <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                {legLabel}
              </Badge>
            )}
          </div>
          <Badge variant="outline" className={`text-[10px] ${sv.className}`}>{statusLabels[b.status] || b.status}</Badge>
        </div>
        <div className="flex items-center gap-1 text-muted-foreground"><User className="h-3 w-3" /> {b.cliente_nome}</div>
        {phone && (
          <a href={waLink(phone)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-emerald-600 hover:underline">
            <Phone className="h-3 w-3" /> {phone}
          </a>
        )}
        {b.cliente_endereco && (
          <a href={mapsLink(b.cliente_endereco)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sky-600 hover:underline">
            <MapPin className="h-3 w-3 shrink-0" /><span className="truncate">{b.cliente_endereco}</span>
          </a>
        )}
        <TimeEditor
          time={time}
          onSave={(t) => onEditTime(b, b.leg, t)}
          compact
        />
        {b.type_nome && <div className="text-muted-foreground">🚗 {b.type_nome}</div>}
        <div className="flex items-center justify-between pt-2 border-t">
          <span className="font-medium">R$ {b.final_price.toFixed(2)}</span>
          {!isTerminal(b.status) && (
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onAdvance(b)}>
              Avançar <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/* --- Editor inline de horário --- */
function TimeEditor({
  time,
  onSave,
  compact = false,
}: {
  time: string;
  onSave: (t: string) => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const initial = /^\d{2}:\d{2}$/.test(time) ? time : "";
  const [value, setValue] = useState(initial);

  useEffect(() => {
    setValue(initial);
  }, [initial]);

  const handleSave = () => {
    if (!/^\d{2}:\d{2}$/.test(value)) return;
    onSave(value);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className={`flex items-center gap-1 ${compact ? "text-muted-foreground" : "text-xs text-muted-foreground"}`}>
        <Clock className="h-3 w-3" />
        <span className={compact ? "" : "font-medium text-foreground"}>{time}</span>
        <PopoverTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 ml-0.5"
            title="Editar horário"
            onClick={(e) => e.stopPropagation()}
          >
            <Pencil className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
      </div>
      <PopoverContent className="w-56 p-3" align="end">
        <div className="space-y-2">
          <p className="text-xs font-medium text-foreground">Ajustar horário</p>
          <Input
            type="time"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="h-8 text-sm"
            autoFocus
          />
          <div className="flex justify-end gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => setOpen(false)}
            >
              <X className="h-3 w-3 mr-1" /> Cancelar
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={handleSave}
              disabled={!/^\d{2}:\d{2}$/.test(value)}
            >
              <Check className="h-3 w-3 mr-1" /> Salvar
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}