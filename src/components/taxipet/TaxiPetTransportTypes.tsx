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
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

type TransportType = {
  id: string; name: string; description: string | null; base_price: number; color: string; status: string;
};

const empty = { name: "", description: "", base_price: "0", color: "#3b82f6", status: "ativo" };

export default function TaxiPetTransportTypes() {
  const { profile } = useAuth();
  const [types, setTypes] = useState<TransportType[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TransportType | null>(null);
  const [form, setForm] = useState(empty);

  const load = async () => {
    if (!profile?.empresa_id) return;
    const { data } = await supabase.from("transport_types").select("*").eq("empresa_id", profile.empresa_id).order("name");
    setTypes((data as TransportType[]) || []);
  };

  useEffect(() => { load(); }, [profile?.empresa_id]);

  const handleSave = async () => {
    if (!profile?.empresa_id || !form.name.trim()) { toast.error("Nome é obrigatório"); return; }
    const payload = { empresa_id: profile.empresa_id, name: form.name, description: form.description || null, base_price: Number(form.base_price), color: form.color, status: form.status };
    if (editing) {
      await supabase.from("transport_types").update(payload).eq("id", editing.id);
      toast.success("Tipo atualizado");
    } else {
      await supabase.from("transport_types").insert(payload);
      toast.success("Tipo criado");
    }
    setOpen(false); setEditing(null); setForm(empty); load();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("transport_types").delete().eq("id", id);
    toast.success("Tipo excluído"); load();
  };

  const openEdit = (t: TransportType) => {
    setEditing(t);
    setForm({ name: t.name, description: t.description || "", base_price: t.base_price.toString(), color: t.color, status: t.status });
    setOpen(true);
  };

  const loadDefaults = async () => {
    if (!profile?.empresa_id) return;
    const defaults = [
      { name: "Banho e Tosa", base_price: 25, color: "#3b82f6" },
      { name: "Daycare", base_price: 20, color: "#10b981" },
      { name: "Hotel Pet", base_price: 30, color: "#8b5cf6" },
      { name: "Consulta Veterinária", base_price: 35, color: "#ef4444" },
      { name: "Adestramento", base_price: 25, color: "#f59e0b" },
      { name: "Avulso", base_price: 30, color: "#6b7280" },
      { name: "Retorno Especial", base_price: 40, color: "#ec4899" },
    ];
    for (const d of defaults) {
      await supabase.from("transport_types").insert({ empresa_id: profile.empresa_id, name: d.name, base_price: d.base_price, color: d.color, status: "ativo" });
    }
    toast.success("Tipos padrão carregados"); load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">Configure os tipos de corrida disponíveis para sua empresa.</p>
        <div className="flex gap-2">
          {types.length === 0 && <Button variant="outline" size="sm" onClick={loadDefaults}>Carregar Padrão</Button>}
          <Button size="sm" onClick={() => { setEditing(null); setForm(empty); setOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Novo Tipo
          </Button>
        </div>
      </div>

      <Table>
        <TableHeader><TableRow>
          <TableHead>Cor</TableHead><TableHead>Nome</TableHead><TableHead>Valor Base</TableHead>
          <TableHead>Status</TableHead><TableHead className="w-20" />
        </TableRow></TableHeader>
        <TableBody>
          {types.map((t) => (
            <TableRow key={t.id}>
              <TableCell><div className="h-5 w-5 rounded-full" style={{ backgroundColor: t.color }} /></TableCell>
              <TableCell className="font-medium">{t.name}</TableCell>
              <TableCell>R$ {Number(t.base_price).toFixed(2)}</TableCell>
              <TableCell><Badge variant={t.status === "ativo" ? "default" : "outline"}>{t.status}</Badge></TableCell>
              <TableCell className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => openEdit(t)}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button size="icon" variant="ghost" onClick={() => handleDelete(t.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
              </TableCell>
            </TableRow>
          ))}
          {types.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum tipo cadastrado</TableCell></TableRow>}
        </TableBody>
      </Table>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Editar Tipo" : "Novo Tipo de Corrida"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Descrição</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Valor Base (R$)</Label><Input type="number" step="0.01" value={form.base_price} onChange={(e) => setForm({ ...form, base_price: e.target.value })} /></div>
              <div><Label>Cor</Label><Input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="h-10" /></div>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><Button onClick={handleSave}>{editing ? "Salvar" : "Criar"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
