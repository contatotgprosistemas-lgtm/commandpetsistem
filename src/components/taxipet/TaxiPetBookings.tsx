import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

type Booking = {
  id: string; cliente_id: string; pet_id: string; transport_type_id: string | null;
  driver_id: string | null; vehicle_id: string | null; scheduled_date: string;
  scheduled_pickup_time: string | null; scheduled_dropoff_time: string | null;
  trip_type: string; status: string; notes: string | null; special_instructions: string | null;
  price: number; extra_fee: number; discount: number; final_price: number;
  payment_status: string; payment_method: string | null;
  clientes?: { nome: string }; pets?: { nome: string };
  drivers?: { name: string } | null; transport_types?: { name: string } | null;
};

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  agendada: { label: "Agendada", variant: "secondary" },
  aguardando_saida: { label: "Aguardando Saída", variant: "secondary" },
  em_rota_coleta: { label: "Em Rota p/ Coleta", variant: "default" },
  pet_coletado: { label: "Pet Coletado", variant: "default" },
  em_deslocamento: { label: "Em Deslocamento", variant: "default" },
  entregue: { label: "Entregue", variant: "outline" },
  retorno: { label: "Retorno", variant: "outline" },
  finalizada: { label: "Finalizada", variant: "outline" },
  cancelada: { label: "Cancelada", variant: "destructive" },
  nao_realizada: { label: "Não Realizada", variant: "destructive" },
};

const tripTypeLabels: Record<string, string> = {
  ida: "Ida", volta: "Volta", ida_volta: "Ida e Volta", avulso: "Avulso", recorrente: "Recorrente",
};

const payStatusLabels: Record<string, string> = {
  pendente: "Pendente", pago: "Pago", vencido: "Vencido", cortesia: "Cortesia", incluso_plano: "Incluso no Plano",
};

export default function TaxiPetBookings() {
  const { profile } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [clients, setClients] = useState<{ id: string; nome: string }[]>([]);
  const [pets, setPets] = useState<{ id: string; nome: string; cliente_id: string }[]>([]);
  const [drivers, setDrivers] = useState<{ id: string; name: string }[]>([]);
  const [vehicles, setVehicles] = useState<{ id: string; model: string; plate: string | null }[]>([]);
  const [types, setTypes] = useState<{ id: string; name: string; base_price: number }[]>([]);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState(format(new Date(), "yyyy-MM-dd"));
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Booking | null>(null);
  const [form, setForm] = useState({
    cliente_id: "", pet_id: "", transport_type_id: "", driver_id: "", vehicle_id: "",
    scheduled_date: format(new Date(), "yyyy-MM-dd"), scheduled_pickup_time: "08:00",
    scheduled_dropoff_time: "", trip_type: "ida_volta", status: "agendada",
    notes: "", special_instructions: "", price: "0", extra_fee: "0", discount: "0",
    payment_status: "pendente", payment_method: "",
  });

  const load = async () => {
    if (!profile?.empresa_id) return;
    const eid = profile.empresa_id;
    const [{ data: b }, { data: c }, { data: p }, { data: d }, { data: v }, { data: t }] = await Promise.all([
      supabase.from("transport_bookings").select("*, clientes(nome), pets(nome), drivers(name), transport_types(name)").eq("empresa_id", eid).order("scheduled_date", { ascending: false }).limit(200),
      supabase.from("clientes").select("id, nome").eq("empresa_id", eid).order("nome"),
      supabase.from("pets").select("id, nome, cliente_id").eq("empresa_id", eid),
      supabase.from("drivers").select("id, name").eq("empresa_id", eid).eq("status", "ativo"),
      supabase.from("vehicles").select("id, model, plate").eq("empresa_id", eid).eq("status", "ativo"),
      supabase.from("transport_types").select("id, name, base_price").eq("empresa_id", eid).eq("status", "ativo"),
    ]);
    setBookings((b as Booking[]) || []);
    setClients(c || []);
    setPets(p || []);
    setDrivers((d as any) || []);
    setVehicles((v as any) || []);
    setTypes((t as any) || []);
  };

  useEffect(() => { load(); }, [profile?.empresa_id]);

  const handleSave = async () => {
    if (!profile?.empresa_id || !form.cliente_id || !form.pet_id) { toast.error("Tutor e Pet são obrigatórios"); return; }
    const finalPrice = Number(form.price) + Number(form.extra_fee) - Number(form.discount);
    const payload = {
      empresa_id: profile.empresa_id, cliente_id: form.cliente_id, pet_id: form.pet_id,
      transport_type_id: form.transport_type_id || null, driver_id: form.driver_id || null,
      vehicle_id: form.vehicle_id || null, scheduled_date: form.scheduled_date,
      scheduled_pickup_time: form.scheduled_pickup_time || null,
      scheduled_dropoff_time: form.scheduled_dropoff_time || null,
      trip_type: form.trip_type, status: form.status, notes: form.notes || null,
      special_instructions: form.special_instructions || null,
      price: Number(form.price), extra_fee: Number(form.extra_fee), discount: Number(form.discount),
      final_price: finalPrice, payment_status: form.payment_status, payment_method: form.payment_method || null,
    };
    if (editing) {
      await supabase.from("transport_bookings").update(payload).eq("id", editing.id);
      toast.success("Corrida atualizada");
    } else {
      await supabase.from("transport_bookings").insert(payload);
      toast.success("Corrida agendada");
    }
    setOpen(false); setEditing(null); load();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("transport_bookings").delete().eq("id", id);
    toast.success("Corrida excluída"); load();
  };

  const openNew = () => {
    setEditing(null);
    setForm({ cliente_id: "", pet_id: "", transport_type_id: "", driver_id: "", vehicle_id: "", scheduled_date: format(new Date(), "yyyy-MM-dd"), scheduled_pickup_time: "08:00", scheduled_dropoff_time: "", trip_type: "ida_volta", status: "agendada", notes: "", special_instructions: "", price: "0", extra_fee: "0", discount: "0", payment_status: "pendente", payment_method: "" });
    setOpen(true);
  };

  const openEdit = (b: Booking) => {
    setEditing(b);
    setForm({
      cliente_id: b.cliente_id, pet_id: b.pet_id, transport_type_id: b.transport_type_id || "",
      driver_id: b.driver_id || "", vehicle_id: b.vehicle_id || "", scheduled_date: b.scheduled_date,
      scheduled_pickup_time: b.scheduled_pickup_time || "", scheduled_dropoff_time: b.scheduled_dropoff_time || "",
      trip_type: b.trip_type, status: b.status, notes: b.notes || "", special_instructions: b.special_instructions || "",
      price: b.price.toString(), extra_fee: b.extra_fee.toString(), discount: b.discount.toString(),
      payment_status: b.payment_status, payment_method: b.payment_method || "",
    });
    setOpen(true);
  };

  const filteredPets = pets.filter((p) => !form.cliente_id || p.cliente_id === form.cliente_id);
  const filtered = bookings.filter((b) => {
    const matchSearch = `${b.clientes?.nome} ${b.pets?.nome}`.toLowerCase().includes(search.toLowerCase());
    const matchDate = !dateFilter || b.scheduled_date === dateFilter;
    return matchSearch && matchDate;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 w-48" />
          </div>
          <Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="w-40" />
          <Button variant="outline" size="sm" onClick={() => setDateFilter("")}>Todos</Button>
        </div>
        <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Nova Corrida</Button>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Data</TableHead><TableHead>Tutor</TableHead><TableHead>Pet</TableHead>
            <TableHead>Tipo</TableHead><TableHead>Motorista</TableHead><TableHead>Status</TableHead>
            <TableHead>Valor</TableHead><TableHead>Pgto</TableHead><TableHead className="w-20" />
          </TableRow></TableHeader>
          <TableBody>
            {filtered.map((b) => {
              const st = statusMap[b.status] || { label: b.status, variant: "outline" as const };
              return (
                <TableRow key={b.id}>
                  <TableCell className="whitespace-nowrap">{b.scheduled_date}{b.scheduled_pickup_time ? ` ${b.scheduled_pickup_time.slice(0, 5)}` : ""}</TableCell>
                  <TableCell>{b.clientes?.nome || "—"}</TableCell>
                  <TableCell>{b.pets?.nome || "—"}</TableCell>
                  <TableCell>{tripTypeLabels[b.trip_type] || b.trip_type}</TableCell>
                  <TableCell>{b.drivers?.name || "—"}</TableCell>
                  <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                  <TableCell>R$ {Number(b.final_price).toFixed(2)}</TableCell>
                  <TableCell><Badge variant="outline">{payStatusLabels[b.payment_status] || b.payment_status}</Badge></TableCell>
                  <TableCell className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(b)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(b.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Nenhuma corrida encontrada</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Editar Corrida" : "Nova Corrida"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tutor *</Label>
              <Select value={form.cliente_id} onValueChange={(v) => setForm({ ...form, cliente_id: v, pet_id: "" })}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Pet *</Label>
              <Select value={form.pet_id} onValueChange={(v) => setForm({ ...form, pet_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>{filteredPets.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo de Corrida</Label>
              <Select value={form.transport_type_id} onValueChange={(v) => { setForm({ ...form, transport_type_id: v, price: types.find((t) => t.id === v)?.base_price.toString() || form.price }); }}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>{types.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo de Viagem</Label>
              <Select value={form.trip_type} onValueChange={(v) => setForm({ ...form, trip_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ida">Ida</SelectItem>
                  <SelectItem value="volta">Volta</SelectItem>
                  <SelectItem value="ida_volta">Ida e Volta</SelectItem>
                  <SelectItem value="avulso">Avulso</SelectItem>
                  <SelectItem value="recorrente">Recorrente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Data *</Label><Input type="date" value={form.scheduled_date} onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })} /></div>
            <div><Label>Horário Coleta</Label><Input type="time" value={form.scheduled_pickup_time} onChange={(e) => setForm({ ...form, scheduled_pickup_time: e.target.value })} /></div>
            <div><Label>Horário Entrega</Label><Input type="time" value={form.scheduled_dropoff_time} onChange={(e) => setForm({ ...form, scheduled_dropoff_time: e.target.value })} /></div>
            <div>
              <Label>Motorista</Label>
              <Select value={form.driver_id} onValueChange={(v) => setForm({ ...form, driver_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                   <SelectItem value="__none__">Nenhum</SelectItem>
                  {drivers.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Veículo</Label>
              <Select value={form.vehicle_id} onValueChange={(v) => setForm({ ...form, vehicle_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhum</SelectItem>
                  {vehicles.map((v) => <SelectItem key={v.id} value={v.id}>{v.model} {v.plate ? `(${v.plate})` : ""}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(statusMap).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2 border-t pt-3 mt-1">
              <p className="text-sm font-medium mb-2">Financeiro</p>
              <div className="grid grid-cols-4 gap-2">
                <div><Label>Valor Base</Label><Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
                <div><Label>Taxa Extra</Label><Input type="number" step="0.01" value={form.extra_fee} onChange={(e) => setForm({ ...form, extra_fee: e.target.value })} /></div>
                <div><Label>Desconto</Label><Input type="number" step="0.01" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} /></div>
                <div><Label>Final</Label><Input disabled value={(Number(form.price) + Number(form.extra_fee) - Number(form.discount)).toFixed(2)} /></div>
              </div>
            </div>
            <div>
              <Label>Status Pagamento</Label>
              <Select value={form.payment_status} onValueChange={(v) => setForm({ ...form, payment_status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                  <SelectItem value="vencido">Vencido</SelectItem>
                  <SelectItem value="cortesia">Cortesia</SelectItem>
                  <SelectItem value="incluso_plano">Incluso no Plano</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Forma de Pagamento</Label>
              <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">—</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="cartao">Cartão</SelectItem>
                  <SelectItem value="boleto">Boleto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Observações</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
            <div className="col-span-2"><Label>Instruções Especiais</Label><Textarea placeholder="Ex: não tocar campainha, pet ansioso..." value={form.special_instructions} onChange={(e) => setForm({ ...form, special_instructions: e.target.value })} rows={2} /></div>
          </div>
          <DialogFooter><Button onClick={handleSave}>{editing ? "Salvar" : "Agendar"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
