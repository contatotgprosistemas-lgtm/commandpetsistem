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
import { Switch } from "@/components/ui/switch";
import { UserPlus, Pencil, Loader2, Search } from "lucide-react";

interface Props {
  employees: any[];
  empresaId: string;
  onRefresh: () => void;
}

export default function ColaboradoresTab({ employees, empresaId, onRefresh }: Props) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ nome: "", email: "", pin: "" });

  const filtered = employees.filter(e =>
    e.nome?.toLowerCase().includes(search.toLowerCase()) ||
    e.email?.toLowerCase().includes(search.toLowerCase())
  );

  const openNew = () => {
    setEditing(null);
    setForm({ nome: "", email: "", pin: "" });
    setOpen(true);
  };

  const openEdit = (emp: any) => {
    setEditing(emp);
    setForm({ nome: emp.nome, email: emp.email, pin: emp.pin || "" });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.nome.trim() || !form.email.trim()) {
      toast.error("Nome e e-mail são obrigatórios.");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const { error } = await supabase
          .from("operational_users")
          .update({ nome: form.nome.trim(), email: form.email.trim(), pin: form.pin || null })
          .eq("id", editing.id);
        if (error) throw error;
        toast.success("Colaborador atualizado!");
      } else {
        const { error } = await supabase
          .from("operational_users")
          .insert({ empresa_id: empresaId, nome: form.nome.trim(), email: form.email.trim(), pin: form.pin || null });
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
                <TableHead>PIN</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Nenhum colaborador encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell className="font-medium">{emp.nome}</TableCell>
                    <TableCell className="text-muted-foreground">{emp.email}</TableCell>
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
