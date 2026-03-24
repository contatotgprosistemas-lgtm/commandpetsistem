import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";

const statusLabels: Record<string, string> = {
  agendada: "Agendada", finalizada: "Finalizada", cancelada: "Cancelada", nao_realizada: "Não Realizada",
  em_rota_coleta: "Em Rota", pet_coletado: "Coletado", em_deslocamento: "Deslocamento", entregue: "Entregue",
  aguardando_saida: "Aguardando", retorno: "Retorno",
};

type Booking = {
  id: string; scheduled_date: string; scheduled_pickup_time: string | null; trip_type: string;
  status: string; final_price: number; payment_status: string; notes: string | null;
  clientes?: { nome: string }; pets?: { nome: string }; drivers?: { name: string } | null;
  transport_types?: { name: string } | null;
};

export default function TaxiPetHistory() {
  const { profile } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
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
      if (statusFilter) q = q.eq("status", statusFilter);
      const { data } = await q;
      setBookings((data as Booking[]) || []);
    };
    load();
  }, [profile?.empresa_id, startDate, endDate, statusFilter]);

  const filtered = bookings.filter((b) =>
    `${b.clientes?.nome} ${b.pets?.nome} ${b.drivers?.name}`.toLowerCase().includes(search.toLowerCase())
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
            <TableHead>Data</TableHead><TableHead>Tutor</TableHead><TableHead>Pet</TableHead>
            <TableHead>Motorista</TableHead><TableHead>Tipo</TableHead><TableHead>Status</TableHead>
            <TableHead>Valor</TableHead><TableHead>Pgto</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.map((b) => (
              <TableRow key={b.id}>
                <TableCell className="whitespace-nowrap">{b.scheduled_date} {b.scheduled_pickup_time?.slice(0, 5) || ""}</TableCell>
                <TableCell>{b.clientes?.nome || "—"}</TableCell>
                <TableCell>{b.pets?.nome || "—"}</TableCell>
                <TableCell>{b.drivers?.name || "—"}</TableCell>
                <TableCell>{b.transport_types?.name || b.trip_type}</TableCell>
                <TableCell><Badge variant={b.status === "finalizada" ? "default" : b.status === "cancelada" ? "destructive" : "secondary"}>{statusLabels[b.status] || b.status}</Badge></TableCell>
                <TableCell>R$ {Number(b.final_price).toFixed(2)}</TableCell>
                <TableCell><Badge variant="outline">{b.payment_status}</Badge></TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Sem registros</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
