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

type Vehicle = {
  id: string; brand: string | null; model: string; plate: string | null; color: string | null;
  year: number | null; capacity: number; vehicle_type: string; status: string; notes: string | null;
  driver_id: string | null;
};
type Driver = { id: string; name: string };

const empty = { brand: "", model: "", plate: "", color: "", year: "", capacity: "4", vehicle_type: "carro", status: "ativo", notes: "", driver_id: "" };

export default function TaxiPetVehicles() {
  const { profile } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [form, setForm] = useState(empty);

  const load = async () => {
    if (!profile?.empresa_id) return;
    const [{ data: v }, { data: d }] = await Promise.all([
      supabase.from("vehicles").select("*").eq("empresa_id", profile.empresa_id).order("model"),
      supabase.from("drivers").select("id, name").eq("empresa_id", profile.empresa_id).eq("status", "ativo"),
    ]);
    setVehicles((v as Vehicle[]) || []);
    setDrivers((d as Driver[]) || []);
  };

  useEffect(() => { load(); }, [profile?.empresa_id]);

  const handleSave = async () => {
    if (!profile?.empresa_id || !form.model.trim()) { toast.error("Modelo é obrigatório"); return; }
    const payload = {
      empresa_id: profile.empresa_id, brand: form.brand || null, model: form.model, plate: form.plate || null,
      color: form.color || null, year: form.year ? Number(form.year) : null, capacity: Number(form.capacity) || 4,
      vehicle_type: form.vehicle_type, status: form.status, notes: form.notes || null,
      driver_id: form.driver_id && form.driver_id !== "__none__" ? form.driver_id : null,
    };
    if (editing) {
      await supabase.from("vehicles").update(payload).eq("id", editing.id);
      toast.success("Veículo atualizado");
    } else {
      await supabase.from("vehicles").insert(payload);
      toast.success("Veículo cadastrado");
    }
    setOpen(false); setEditing(null); setForm(empty); load();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("vehicles").delete().eq("id", id);
    toast.success("Veículo excluído"); load();
  };

  const openEdit = (v: Vehicle) => {
    setEditing(v);
    setForm({ brand: v.brand || "", model: v.model, plate: v.plate || "", color: v.color || "", year: v.year?.toString() || "", capacity: v.capacity.toString(), vehicle_type: v.vehicle_type, status: v.status, notes: v.notes || "", driver_id: v.driver_id || "" });
    setOpen(true);
  };

  const filtered = vehicles.filter((v) => `${v.brand} ${v.model} ${v.plate}`.toLowerCase().includes(search.toLowerCase()));
  const statusColor = (s: string) => s === "ativo" ? "default" : s === "manutencao" ? "secondary" : "outline";
  const driverName = (id: string | null) => drivers.find((d) => d.id === id)?.name || "—";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar veículo..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
        </div>
        <Button size="sm" onClick={() => { setEditing(null); setForm(empty); setOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Novo Veículo
        </Button>
      </div>

      <Table>
        <TableHeader><TableRow>
          <TableHead>Modelo</TableHead><TableHead>Placa</TableHead><TableHead>Capacidade</TableHead>
          <TableHead>Motorista</TableHead><TableHead>Status</TableHead><TableHead className="w-20" />
        </TableRow></TableHeader>
        <TableBody>
          {filtered.map((v) => (
            <TableRow key={v.id}>
              <TableCell className="font-medium">{v.brand ? `${v.brand} ${v.model}` : v.model}</TableCell>
              <TableCell>{v.plate || "—"}</TableCell>
              <TableCell>{v.capacity} pets</TableCell>
              <TableCell>{driverName(v.driver_id)}</TableCell>
              <TableCell><Badge variant={statusColor(v.status)}>{v.status}</Badge></TableCell>
              <TableCell className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => openEdit(v)}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button size="icon" variant="ghost" onClick={() => handleDelete(v.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
              </TableCell>
            </TableRow>
          ))}
          {filtered.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum veículo cadastrado</TableCell></TableRow>}
        </TableBody>
      </Table>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Editar Veículo" : "Novo Veículo"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Marca</Label><Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} /></div>
            <div><Label>Modelo *</Label><Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} /></div>
            <div><Label>Placa</Label><Input value={form.plate} onChange={(e) => setForm({ ...form, plate: e.target.value })} /></div>
            <div><Label>Cor</Label><Input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} /></div>
            <div><Label>Ano</Label><Input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} /></div>
            <div><Label>Capacidade (pets)</Label><Input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} /></div>
            <div>
              <Label>Tipo</Label>
              <Select value={form.vehicle_type} onValueChange={(v) => setForm({ ...form, vehicle_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="carro">Carro</SelectItem>
                  <SelectItem value="van">Van</SelectItem>
                  <SelectItem value="moto">Moto</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Motorista Vinculado</Label>
              <Select value={form.driver_id} onValueChange={(v) => setForm({ ...form, driver_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nenhum</SelectItem>
                  {drivers.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="manutencao">Manutenção</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Observações</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
          </div>
          <DialogFooter><Button onClick={handleSave}>{editing ? "Salvar" : "Cadastrar"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
