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

type Driver = {
  id: string;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  document: string | null;
  driver_license: string | null;
  driver_license_expiration: string | null;
  status: string;
  notes: string | null;
};

const emptyDriver = { name: "", whatsapp: "", email: "", document: "", driver_license: "", driver_license_expiration: "", status: "ativo", notes: "" };

export default function TaxiPetDrivers() {
  const { profile } = useAuth();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Driver | null>(null);
  const [form, setForm] = useState(emptyDriver);

  const load = async () => {
    if (!profile?.empresa_id) return;
    const { data } = await supabase.from("drivers").select("*").eq("empresa_id", profile.empresa_id).order("name");
    setDrivers((data as Driver[]) || []);
  };

  useEffect(() => { load(); }, [profile?.empresa_id]);

  const handleSave = async () => {
    if (!profile?.empresa_id || !form.name.trim()) { toast.error("Nome é obrigatório"); return; }
    const payload = { ...form, empresa_id: profile.empresa_id, driver_license_expiration: form.driver_license_expiration || null };

    if (editing) {
      await supabase.from("drivers").update(payload).eq("id", editing.id);
      toast.success("Motorista atualizado");
    } else {
      await supabase.from("drivers").insert(payload);
      toast.success("Motorista cadastrado");
    }
    setOpen(false); setEditing(null); setForm(emptyDriver); load();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("drivers").delete().eq("id", id);
    toast.success("Motorista excluído"); load();
  };

  const openEdit = (d: Driver) => {
    setEditing(d);
    setForm({ name: d.name, whatsapp: d.whatsapp || "", email: d.email || "", document: d.document || "", driver_license: d.driver_license || "", driver_license_expiration: d.driver_license_expiration || "", status: d.status, notes: d.notes || "" });
    setOpen(true);
  };

  const filtered = drivers.filter((d) => d.name.toLowerCase().includes(search.toLowerCase()));
  const statusColor = (s: string) => s === "ativo" ? "default" : s === "afastado" ? "secondary" : "outline";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar motorista..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
        </div>
        <Button size="sm" onClick={() => { setEditing(null); setForm(emptyDriver); setOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Novo Motorista
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Telefone</TableHead>
            <TableHead>CNH</TableHead>
            <TableHead>Validade CNH</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-20" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((d) => (
            <TableRow key={d.id}>
              <TableCell className="font-medium">{d.name}</TableCell>
              <TableCell>{d.phone || d.whatsapp || "—"}</TableCell>
              <TableCell>{d.driver_license || "—"}</TableCell>
              <TableCell>{d.driver_license_expiration || "—"}</TableCell>
              <TableCell><Badge variant={statusColor(d.status)}>{d.status}</Badge></TableCell>
              <TableCell className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => openEdit(d)}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button size="icon" variant="ghost" onClick={() => handleDelete(d.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
              </TableCell>
            </TableRow>
          ))}
          {filtered.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum motorista cadastrado</TableCell></TableRow>}
        </TableBody>
      </Table>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Editar Motorista" : "Novo Motorista"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Nome *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Telefone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><Label>WhatsApp</Label><Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} /></div>
            <div className="col-span-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label>Documento (CPF/RG)</Label><Input value={form.document} onChange={(e) => setForm({ ...form, document: e.target.value })} /></div>
            <div><Label>Nº CNH</Label><Input value={form.driver_license} onChange={(e) => setForm({ ...form, driver_license: e.target.value })} /></div>
            <div><Label>Validade CNH</Label><Input type="date" value={form.driver_license_expiration} onChange={(e) => setForm({ ...form, driver_license_expiration: e.target.value })} /></div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                  <SelectItem value="afastado">Afastado</SelectItem>
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
