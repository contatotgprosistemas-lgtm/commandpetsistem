import { useEffect, useState } from "react";
import { format, addDays, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Car, MapPin, MessageCircle, Phone, ChevronLeft, ChevronRight, Navigation } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOperationalAuth } from "@/hooks/useOperationalAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { extractTimeBR } from "@/lib/utils";

type TaxiItem = {
  id: string;
  source: "transport" | "agendamento";
  scheduled_pickup_time: string | null;
  trip_type: string;
  status: string;
  pet_nome: string;
  pet_foto: string | null;
  pet_raca: string | null;
  cliente_nome: string;
  cliente_whatsapp: string | null;
  cliente_telefone: string | null;
  cliente_endereco: string | null;
  driver_nome: string | null;
  type_nome: string;
  leg: "buscar" | "levar" | "outro";
};

const statusMap: Record<string, { label: string; color: string }> = {
  agendado: { label: "Agendado", color: "bg-amber-100 text-amber-800" },
  agendada: { label: "Agendado", color: "bg-amber-100 text-amber-800" },
  confirmado: { label: "Confirmado", color: "bg-emerald-100 text-emerald-800" },
  aguardando_saida: { label: "Aguardando Saída", color: "bg-amber-100 text-amber-800" },
  em_transito: { label: "Em Trânsito", color: "bg-sky-100 text-sky-800" },
  em_rota_coleta: { label: "Em Rota", color: "bg-sky-100 text-sky-800" },
  pet_coletado: { label: "Pet Coletado", color: "bg-purple-100 text-purple-800" },
  em_deslocamento: { label: "Em Deslocamento", color: "bg-cyan-100 text-cyan-800" },
  entregue: { label: "Entregue", color: "bg-emerald-100 text-emerald-800" },
  finalizada: { label: "Finalizada", color: "bg-primary/10 text-primary" },
  concluido: { label: "Concluído", color: "bg-primary/10 text-primary" },
  cancelado: { label: "Cancelado", color: "bg-red-100 text-red-800" },
  cancelada: { label: "Cancelado", color: "bg-red-100 text-red-800" },
};

const legBadge: Record<TaxiItem["leg"], { label: string; color: string }> = {
  buscar: { label: "Buscar", color: "bg-amber-100 text-amber-800 border-amber-200" },
  levar: { label: "Levar", color: "bg-violet-100 text-violet-800 border-violet-200" },
  outro: { label: "Transporte", color: "bg-sky-100 text-sky-800 border-sky-200" },
};

function tripToLeg(trip: string): TaxiItem["leg"] {
  const t = (trip || "").toLowerCase();
  if (t === "ida" || t.includes("busca") || t.includes("coleta")) return "buscar";
  if (t === "volta" || t.includes("leva") || t.includes("entreg")) return "levar";
  return "outro";
}

export default function OperacionalTaxiPetPage() {
  const { user } = useOperationalAuth();
  const [date, setDate] = useState<Date>(startOfDay(new Date()));
  const [items, setItems] = useState<TaxiItem[]>([]);
  const [loading, setLoading] = useState(true);

  const dateStr = format(date, "yyyy-MM-dd");

  useEffect(() => {
    if (!user?.empresa_id) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const start = `${dateStr}T00:00:00`;
      const endDate = format(addDays(date, 1), "yyyy-MM-dd");
      const end = `${endDate}T00:00:00`;

      const [{ data: bookings }, { data: ags }] = await Promise.all([
        supabase
          .from("transport_bookings")
          .select("id, status, scheduled_date, scheduled_pickup_time, trip_type, pet:pets(id, nome, raca, foto_url), cliente:clientes(id, nome, whatsapp, telefone, endereco), transport_type:transport_types(name), driver:drivers(name)")
          .eq("empresa_id", user.empresa_id)
          .eq("scheduled_date", dateStr)
          .order("scheduled_pickup_time", { ascending: true }),
        supabase
          .from("agendamentos")
          .select("id, data_hora, tipo_servico, status, hora_prevista_buscar, hora_prevista_levar, pet:pets(id, nome, raca, foto_url), cliente:clientes(id, nome, whatsapp, telefone, endereco)")
          .eq("empresa_id", user.empresa_id)
          .gte("data_hora", start)
          .lt("data_hora", end)
          .or("tipo_servico.ilike.%taxi%,tipo_servico.ilike.%transporte%,tipo_servico.ilike.%leva%,tipo_servico.ilike.%busca%"),
      ]);

      if (cancelled) return;

      const fromBookings: TaxiItem[] = [];
      (bookings || [])
        .filter((b: any) => b.status !== "cancelada" && b.status !== "cancelado")
        .forEach((b: any) => {
          const base = {
            id: b.id,
            source: "transport" as const,
            status: b.status,
            pet_nome: b.pet?.nome || "Pet",
            pet_foto: b.pet?.foto_url || null,
            pet_raca: b.pet?.raca || null,
            cliente_nome: b.cliente?.nome || "—",
            cliente_whatsapp: b.cliente?.whatsapp || null,
            cliente_telefone: b.cliente?.telefone || null,
            cliente_endereco: b.cliente?.endereco || null,
            driver_nome: b.driver?.name || null,
            type_nome: b.transport_type?.name || "Transporte",
            trip_type: b.trip_type || "",
          };
          const trip = (b.trip_type || "").toLowerCase();
          if (trip === "ida_volta") {
            fromBookings.push({ ...base, id: `${b.id}:buscar`, scheduled_pickup_time: b.scheduled_pickup_time, leg: "buscar" });
            fromBookings.push({ ...base, id: `${b.id}:levar`, scheduled_pickup_time: b.scheduled_pickup_time, leg: "levar" });
          } else {
            fromBookings.push({ ...base, scheduled_pickup_time: b.scheduled_pickup_time, leg: tripToLeg(trip) });
          }
        });

      const fromAgs: TaxiItem[] = [];
      (ags || [])
        .filter((a: any) => a.status !== "cancelado")
        .forEach((a: any) => {
          const base = {
            id: a.id,
            source: "agendamento" as const,
            status: a.status,
            pet_nome: a.pet?.nome || "Pet",
            pet_foto: a.pet?.foto_url || null,
            pet_raca: a.pet?.raca || null,
            cliente_nome: a.cliente?.nome || "—",
            cliente_whatsapp: a.cliente?.whatsapp || null,
            cliente_telefone: a.cliente?.telefone || null,
            cliente_endereco: a.cliente?.endereco || null,
            driver_nome: null,
            type_nome: a.tipo_servico,
            trip_type: a.tipo_servico || "",
          };
          const buscar = (a.hora_prevista_buscar || "").toString().slice(0, 5);
          const levar = (a.hora_prevista_levar || "").toString().slice(0, 5);
          const fallback = extractTimeBR(a.data_hora);

          if (buscar || levar) {
            if (buscar) fromAgs.push({ ...base, id: `${a.id}:buscar`, scheduled_pickup_time: buscar, leg: "buscar" });
            if (levar) fromAgs.push({ ...base, id: `${a.id}:levar`, scheduled_pickup_time: levar, leg: "levar" });
          } else {
            fromAgs.push({ ...base, scheduled_pickup_time: fallback, leg: tripToLeg(a.tipo_servico) });
          }
        });

      const merged = [...fromBookings, ...fromAgs].sort((x, y) => {
        const tx = (x.scheduled_pickup_time || "").toString().slice(0, 5);
        const ty = (y.scheduled_pickup_time || "").toString().slice(0, 5);
        if (tx && ty) return tx.localeCompare(ty);
        if (tx) return -1;
        if (ty) return 1;
        return 0;
      });

      setItems(merged);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.empresa_id, dateStr]);

  const dateLabel = format(date, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  return (
    <div className="space-y-5 pb-20 md:pb-0">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
          <Car className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">TaxiPet</h1>
          <p className="text-sm text-muted-foreground capitalize">{dateLabel}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={() => setDate((d) => addDays(d, -1))}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
        </Button>
        <Button variant="outline" size="sm" onClick={() => setDate(startOfDay(new Date()))}>
          Hoje
        </Button>
        <Button variant="outline" size="sm" onClick={() => setDate((d) => addDays(d, 1))}>
          Próximo <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
        <input
          type="date"
          className="h-9 px-3 rounded-md border border-input bg-background text-sm"
          value={dateStr}
          onChange={(e) => {
            const [y, m, d] = e.target.value.split("-").map(Number);
            if (y && m && d) setDate(new Date(y, m - 1, d));
          }}
        />
        <Badge variant="secondary" className="ml-auto">
          {items.length} corrida{items.length === 1 ? "" : "s"}
        </Badge>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-card rounded-xl border border-border/60 p-12 flex flex-col items-center justify-center text-center">
          <Car className="h-10 w-10 text-muted-foreground/30 mb-3" strokeWidth={1.5} />
          <p className="text-sm text-muted-foreground">Nenhuma corrida TaxiPet para este dia</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border/60 shadow-sm divide-y divide-border/60">
          {items.map((it) => {
            const initials = it.pet_nome.slice(0, 2).toUpperCase();
            const phone = (it.cliente_whatsapp || it.cliente_telefone || "").replace(/\D/g, "");
            const endereco = it.cliente_endereco || "";
            const enderecoEnc = encodeURIComponent(endereco);
            const mapsUrl = endereco ? `https://www.google.com/maps/search/?api=1&query=${enderecoEnc}` : null;
            const wazeUrl = endereco ? `https://www.waze.com/ul?q=${enderecoEnc}&navigate=yes` : null;
            const st = statusMap[it.status] || { label: it.status, color: "bg-muted text-muted-foreground" };
            const lg = legBadge[it.leg];

            return (
              <div key={`${it.source}-${it.id}`} className="p-4 md:px-5 md:py-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-start gap-3 md:gap-4">
                  <Avatar className="h-12 w-12 shrink-0">
                    {it.pet_foto && <AvatarImage src={it.pet_foto} alt={it.pet_nome} />}
                    <AvatarFallback className="bg-accent text-accent-foreground text-xs font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-base text-foreground">{it.pet_nome}</span>
                      {it.pet_raca && <span className="text-xs text-muted-foreground">({it.pet_raca})</span>}
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-sm text-foreground/80 truncate">{it.cliente_nome}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
                      <Car className="h-3.5 w-3.5 shrink-0" />
                      <span>{it.type_nome}</span>
                      {it.driver_nome && (
                        <>
                          <span>·</span>
                          <span>{it.driver_nome}</span>
                        </>
                      )}
                    </div>
                    {endereco && (
                      <p className="text-xs text-muted-foreground flex items-start gap-1">
                        <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                        <span className="break-words">{endereco}</span>
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-base font-semibold text-foreground tabular-nums">
                      {it.scheduled_pickup_time ? it.scheduled_pickup_time.slice(0, 5) : "—"}
                    </span>
                    <Badge variant="outline" className={`text-[10px] ${lg.color}`}>{lg.label}</Badge>
                    <Badge className={`text-[10px] ${st.color}`}>{st.label}</Badge>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  {mapsUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => window.open(mapsUrl, "_blank")}
                    >
                      <MapPin className="h-3.5 w-3.5 text-primary" /> Maps
                    </Button>
                  )}
                  {wazeUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => window.open(wazeUrl, "_blank")}
                    >
                      <Navigation className="h-3.5 w-3.5 text-sky-600" /> Waze
                    </Button>
                  )}
                  {phone && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => window.open(`https://wa.me/${phone}`, "_blank")}
                    >
                      <MessageCircle className="h-3.5 w-3.5 text-emerald-600" /> WhatsApp
                    </Button>
                  )}
                  {phone && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => (window.location.href = `tel:${phone}`)}
                    >
                      <Phone className="h-3.5 w-3.5" /> Ligar
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}