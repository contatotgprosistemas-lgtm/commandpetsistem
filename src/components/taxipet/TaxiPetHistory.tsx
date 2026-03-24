import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, CalendarDays } from "lucide-react";
import { format } from "date-fns";

const TRANSPORT_FILTER = "tipo_servico.ilike.%taxi%,tipo_servico.ilike.%transport%,tipo_servico.ilike.%leva%";

const statusLabels: Record<string, string> = {
  agendada: "Agendada", finalizada: "Finalizada", cancelada: "Cancelada", nao_realizada: "Não Realizada",
  em_rota_coleta: "Em Rota", pet_coletado: "Coletado", em_deslocamento: "Deslocamento", entregue: "Entregue",
  aguardando_saida: "Aguardando", retorno: "Retorno",
  agendado: "Agendado", confirmado: "Confirmado", em_atendimento: "Em Atendimento",
  concluido: "Concluído", cancelado: "Cancelado",
};

type UnifiedBooking = {
  id: string; scheduled_date: string; scheduled_pickup_time: string | null; trip_type: string;
  status: string; final_price: number; payment_status: string; notes: string | null;
  cliente_nome: string; pet_nome: string; driver_nome: string | null; type_nome: string | null;
  source: "transport" | "agendamento";
  hora_prevista_buscar: string | null; hora_prevista_levar: string | null;
};

export default function TaxiPetHistory() {
  const { profile } = useAuth();
  const [bookings, setBookings] = useState<UnifiedBooking[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    if (!profile?.empresa_id) return;
    const load = async () => {
      let q = supabase.from("transport_bookings")
        .select("*, clientes(nome), pets(nome), drivers(name), transport_types(name)")
        .eq("empresa_id", profile.empresa_id!)
        .order("scheduled_date", { ascending: false }).limit(500);
      if (startDate) q = q.gte("scheduled_date", startDate);
      if (endDate) q = q.lte("scheduled_date", endDate);
      if (statusFilter && statusFilter !== "__all__") q = q.eq("status", statusFilter);

      let qAg = supabase.from("agendamentos")
        .select("id, data_hora, tipo_servico, status, notas, valor, cliente_id, pet_id, hora_prevista_buscar, hora_prevista_levar, clientes:cliente_id(nome), pets:pet_id(nome)")
        .eq("empresa_id", profile.empresa_id!)
        .or(TRANSPORT_FILTER)
        .order("data_hora", { ascending: false }).limit(500);
      if (startDate) qAg = qAg.gte("data_hora", `${startDate}T00:00:00`);
      if (endDate) qAg = qAg.lte("data_hora", `${endDate}T23:59:59`);
      if (statusFilter && statusFilter !== "__all__") qAg = qAg.eq("status", statusFilter);

      const [{ data }, { data: ag }] = await Promise.all([q, qAg]);

      const transportItems: UnifiedBooking[] = (data || []).map((b: any) => ({
        id: b.id, scheduled_date: b.scheduled_date,
        scheduled_pickup_time: b.scheduled_pickup_time, trip_type: b.trip_type,
        status: b.status, final_price: Number(b.final_price || 0),
        payment_status: b.payment_status, notes: b.notes,
        cliente_nome: b.clientes?.nome || "—", pet_nome: b.pets?.nome || "—",
        driver_nome: b.drivers?.name || null, type_nome: b.transport_types?.name || b.trip_type,
        source: "transport", hora_prevista_buscar: null, hora_prevista_levar: null,
      }));

      const agItems: UnifiedBooking[] = (ag || []).map((a: any) => ({
        id: a.id, scheduled_date: format(new Date(a.data_hora), "yyyy-MM-dd"),
        scheduled_pickup_time: format(new Date(a.data_hora), "HH:mm:ss"),
        trip_type: a.tipo_servico, status: a.status,
        final_price: Number(a.valor || 0), payment_status: "pendente",
        notes: a.notas, cliente_nome: a.clientes?.nome || "—",
        pet_nome: a.pets?.nome || "—", driver_nome: null,
        type_nome: a.tipo_servico, source: "agendamento",
        hora_prevista_buscar: a.hora_prevista_buscar || null,
        hora_prevista_levar: a.hora_prevista_levar || null,
      }));

      setBookings([...transportItems, ...agItems].sort((a, b) =>
        b.scheduled_date.localeCompare(a.scheduled_date)
      ));
    };
    load();
  }, [profile?.empresa_id, startDate, endDate, statusFilter]);

  const filtered = bookings.filter((b) =>
    `${b.cliente_nome} ${b.pet_nome} ${b.driver_nome}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 w-48" />
        </div>
        <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-36" />
        <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-36" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos</SelectItem>
            {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Origem</TableHead><TableHead>Data</TableHead><TableHead>Tutor</TableHead><TableHead>Pet</TableHead>
            <TableHead>Motorista</TableHead><TableHead>Tipo</TableHead><TableHead>Buscar</TableHead><TableHead>Levar</TableHead>
            <TableHead>Status</TableHead><TableHead>Valor</TableHead><TableHead>Pgto</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.map((b) => (
              <TableRow key={`${b.source}-${b.id}`}>
                <TableCell>
                  {b.source === "agendamento" ? (
                    <Badge variant="outline" className="text-[10px] gap-0.5"><CalendarDays className="h-3 w-3" /> Agenda</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px]">TaxiPet</Badge>
                  )}
                </TableCell>
                <TableCell className="whitespace-nowrap">{b.scheduled_date} {b.scheduled_pickup_time?.slice(0, 5) || ""}</TableCell>
                <TableCell>{b.cliente_nome}</TableCell>
                <TableCell>{b.pet_nome}</TableCell>
                <TableCell>{b.driver_nome || "—"}</TableCell>
                <TableCell>{b.type_nome}</TableCell>
                <TableCell><Badge variant={b.status === "finalizada" || b.status === "concluido" ? "default" : b.status === "cancelada" || b.status === "cancelado" ? "destructive" : "secondary"}>{statusLabels[b.status] || b.status}</Badge></TableCell>
                <TableCell>R$ {b.final_price.toFixed(2)}</TableCell>
                <TableCell><Badge variant="outline">{b.payment_status}</Badge></TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Sem registros</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
