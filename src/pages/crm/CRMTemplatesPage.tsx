import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentEmpresa } from "@/lib/useCurrentEmpresa";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { FileText, Plus, Loader2, Trash2, Edit, Search } from "lucide-react";
import { toast } from "sonner";

type Template = {
  id: string; nome: string; atalho: string | null; categoria: string | null;
  conteudo: string; updated_at: string;
};

export default function CRMTemplatesPage() {
  const qc = useQueryClient();
  const { data: empresaId } = useCurrentEmpresa();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [form, setForm] = useState({ nome: "", atalho: "", categoria: "", conteudo: "" });

  const reset = () => { setForm({ nome: "", atalho: "", categoria: "", conteudo: "" }); setEditing(null); };

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["crm-templates", empresaId],
    enabled: !!empresaId,
    queryFn: async () => {
      const { data, error } = await supabase.from("crm_templates").select("*")
        .eq("empresa_id", empresaId!).order("nome");
      if (error) throw error;
      return (data ?? []) as Template[];
    },
  });

  const filtered = templates.filter((t) =>
    !search || t.nome.toLowerCase().includes(search.toLowerCase()) ||
    t.atalho?.toLowerCase().includes(search.toLowerCase()) ||
    t.conteudo.toLowerCase().includes(search.toLowerCase())
  );

  const save = useMutation({
    mutationFn: async () => {
      if (!form.nome || !form.conteudo) throw new Error("Nome e conteúdo obrigatórios");
      const payload: any = {
        empresa_id: empresaId,
        nome: form.nome.trim(),
        atalho: form.atalho.trim() || null,
        categoria: form.categoria.trim() || null,
        conteudo: form.conteudo,
      };
      if (editing) {
        const { error } = await supabase.from("crm_templates").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("crm_templates").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Modelo atualizado" : "Modelo criado");
      qc.invalidateQueries({ queryKey: ["crm-templates"] });
      setOpen(false); reset();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("crm_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["crm-templates"] }); toast.success("Removido"); },
  });

  const startEdit = (t: Template) => {
    setEditing(t);
    setForm({ nome: t.nome, atalho: t.atalho ?? "", categoria: t.categoria ?? "", conteudo: t.conteudo });
    setOpen(true);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="px-6 py-4 border-b flex items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-xl font-semibold">Modelos de mensagem</h1>
          <p className="text-xs text-muted-foreground">{templates.length} modelo(s) · use atalhos como /saudacao no chat</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." className="pl-8 w-64 h-9" />
          </div>
          <Button size="sm" onClick={() => { reset(); setOpen(true); }} className="gap-1.5">
            <Plus className="h-4 w-4" /> Novo modelo
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="border border-dashed rounded-xl p-12 text-center max-w-lg mx-auto">
            <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-4">Nenhum modelo ainda. Crie respostas prontas para acelerar o atendimento.</p>
            <Button variant="outline" onClick={() => { reset(); setOpen(true); }}>Criar primeiro modelo</Button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-6xl mx-auto">
            {filtered.map((t) => (
              <Card key={t.id} className="p-4 group hover:shadow-card-hover transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm truncate">{t.nome}</span>
                      {t.atalho && <code className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">/{t.atalho.replace(/^\//, "")}</code>}
                    </div>
                    {t.categoria && <Badge variant="secondary" className="mt-1 text-[10px]">{t.categoria}</Badge>}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(t)}>
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                      onClick={() => { if (confirm("Remover modelo?")) remove.mutate(t.id); }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-4">{t.conteudo}</p>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar modelo" : "Novo modelo"}</DialogTitle>
            <DialogDescription>
              Use <code className="text-xs">{"{{nome}}"}</code> e <code className="text-xs">{"{{primeiro_nome}}"}</code> para personalizar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Nome *</Label>
                <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Saudação inicial" />
              </div>
              <div className="space-y-1.5">
                <Label>Atalho</Label>
                <Input value={form.atalho} onChange={(e) => setForm({ ...form, atalho: e.target.value })} placeholder="saudacao" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Input value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} placeholder="Boas-vindas, Vendas..." />
            </div>
            <div className="space-y-1.5">
              <Label>Conteúdo *</Label>
              <Textarea rows={6} value={form.conteudo} onChange={(e) => setForm({ ...form, conteudo: e.target.value })}
                placeholder="Olá {{primeiro_nome}}, tudo bem?" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}