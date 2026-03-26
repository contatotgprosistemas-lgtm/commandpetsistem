import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { UserPlus, Pencil, Loader2, Search } from "lucide-react";

interface Props {
  employees: any[];
  empresaId: string;
  onRefresh: () => void;
  configs: any[];
}

export default function ColaboradoresTab({ employees, empresaId, onRefresh, configs }: Props) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ nome: "", email: "", pin: "", jornada_id: "" });

  const filtered = employees.filter(e =>
    e.nome?.toLowerCase().includes(search.toLowerCase()) ||
    e.email?.toLowerCase().includes(search.toLowerCase())
  );

  const getJornadaNome = (jornadaId: string | null) => {
    if (!jornadaId) return "—";
    const c = configs.find((c: any) => c.id === jornadaId);
    return c?.nome || "—";
  };

  const openNew = () => {
    setEditing(null);
    setForm({ nome: "", email: "", pin: "", jornada_id: "" });
    setOpen(true);
  };

  const openEdit = (emp: any) => {
    setEditing(emp);
    setForm({ nome: emp.nome, email: emp.email, pin: emp.pin || "", jornada_id: emp.jornada_id || "" });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.nome.trim() || !form.email.trim()) {
      toast.error("Nome e e-mail são obrigatórios.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        nome: form.nome.trim(),
        email: form.email.trim(),
        pin: form.pin || null,
        jornada_id: form.jornada_id || null,
      };
      if (editing) {
        const { error } = await supabase
          .from("operational_users")
          .update(payload)
          .eq("id", editing.id);
        if (error) throw error;
        toast.success("Colaborador atualizado!");
      } else {
        const { error } = await supabase
          .from("operational_users")
          .insert({ ...payload, empresa_id: empresaId });
        if (error) throw error;
        toast.success("Colaborador cadastrado!");
      }
      setOpen(false);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar.");
    }
    setSaving(false);
  };

  const toggleAtivo = async (emp: any) => {
    const { error } = await supabase
      .from("operational_users")
      .update({ ativo: !emp.ativo })
      .eq("id", emp.id);
    if (error) {
      toast.error("Erro ao alterar status.");
    } else {
      toast.success(emp.ativo ? "Colaborador desativado." : "Colaborador ativado.");
      onRefresh();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar colaborador..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={openNew} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Novo Colaborador
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Colaboradores ({employees.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Jornada</TableHead>
                <TableHead>PIN</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Nenhum colaborador encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell className="font-medium">{emp.nome}</TableCell>
                    <TableCell className="text-muted-foreground">{emp.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{getJornadaNome(emp.jornada_id)}</Badge>
                    </TableCell>
                    <TableCell>{emp.pin || "—"}</TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={emp.ativo ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-500"}
                      >
                        {emp.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(emp)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Switch checked={emp.ativo} onCheckedChange={() => toggleAtivo(emp)} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Colaborador" : "Novo Colaborador"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
            </div>
            <div>
              <Label>E-mail *</Label>
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <Label>Jornada de Trabalho</Label>
              <Select value={form.jornada_id} onValueChange={v => setForm(f => ({ ...f, jornada_id: v === "none" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione uma jornada" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {configs.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>PIN (opcional)</Label>
              <Input value={form.pin} onChange={e => setForm(f => ({ ...f, pin: e.target.value }))} maxLength={6} placeholder="Ex: 1234" />
              <p className="text-xs text-muted-foreground mt-1">PIN numérico para acesso rápido no portal operacional.</p>
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? "Salvar Alterações" : "Cadastrar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
