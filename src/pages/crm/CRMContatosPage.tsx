import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentEmpresa } from "@/lib/useCurrentEmpresa";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus, Search, User, Phone, Mail, Tag, Loader2, Trash2, Edit, Filter, X,
} from "lucide-react";
import { toast } from "sonner";

type Contato = {
  id: string;
  nome: string;
  telefone: string | null;
  whatsapp: string | null;
  email: string | null;
  empresa: string | null;
  origem: string | null;
  score: number;
  valor_potencial: number | null;
  observacoes: string | null;
  cidade: string | null;
  estado: string | null;
  created_at: string;
};

type Tag = { id: string; nome: string; cor: string };

const TAG_COLORS = ["#8B5CF6", "#EC4899", "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#6366F1", "#14B8A6"];

export default function CRMContatosPage() {
  const qc = useQueryClient();
  const { data: empresaId } = useCurrentEmpresa();
  const [search, setSearch] = useState("");
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [openNovo, setOpenNovo] = useState(false);
  const [editing, setEditing] = useState<Contato | null>(null);
  const [openDetalhe, setOpenDetalhe] = useState<Contato | null>(null);
  const [openTags, setOpenTags] = useState(false);

  // Form
  const [form, setForm] = useState({
    nome: "", telefone: "", whatsapp: "", email: "", empresa: "",
    origem: "", cidade: "", estado: "", observacoes: "", valor_potencial: "",
  });

  const resetForm = () => setForm({
    nome: "", telefone: "", whatsapp: "", email: "", empresa: "",
    origem: "", cidade: "", estado: "", observacoes: "", valor_potencial: "",
  });

  const { data: contatos = [], isLoading } = useQuery({
    queryKey: ["crm-contatos", empresaId, search, filterTag],
    enabled: !!empresaId,
    queryFn: async () => {
      let q = supabase.from("crm_contatos").select("*").eq("empresa_id", empresaId!).order("created_at", { ascending: false });
      if (search) q = q.or(`nome.ilike.%${search}%,telefone.ilike.%${search}%,whatsapp.ilike.%${search}%,email.ilike.%${search}%`);
      const { data, error } = await q.limit(500);
      if (error) throw error;
      let result = (data ?? []) as Contato[];
      if (filterTag) {
        const { data: links } = await supabase.from("crm_contato_tag_links").select("contato_id").eq("tag_id", filterTag);
        const ids = new Set((links ?? []).map((l: any) => l.contato_id));
        result = result.filter((c) => ids.has(c.id));
      }
      return result;
    },
  });

  const { data: tags = [] } = useQuery({
    queryKey: ["crm-tags", empresaId],
    enabled: !!empresaId,
    queryFn: async () => {
      const { data, error } = await supabase.from("crm_contato_tags").select("*").eq("empresa_id", empresaId!).order("nome");
      if (error) throw error;
      return (data ?? []) as Tag[];
    },
  });

  const { data: contatoTags = [] } = useQuery({
    queryKey: ["crm-contato-tag-links", openDetalhe?.id],
    enabled: !!openDetalhe?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_contato_tag_links")
        .select("tag_id, crm_contato_tags(id, nome, cor)")
        .eq("contato_id", openDetalhe!.id);
      if (error) throw error;
      return (data ?? []).map((d: any) => d.crm_contato_tags) as Tag[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!form.nome) throw new Error("Nome é obrigatório");
      const payload: any = {
        empresa_id: empresaId,
        nome: form.nome,
        telefone: form.telefone || null,
        whatsapp: form.whatsapp || null,
        email: form.email || null,
        empresa: form.empresa || null,
        origem: form.origem || null,
        cidade: form.cidade || null,
        estado: form.estado || null,
        observacoes: form.observacoes || null,
        valor_potencial: form.valor_potencial ? parseFloat(form.valor_potencial) : 0,
      };
      if (editing) {
        const { error } = await supabase.from("crm_contatos").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("crm_contatos").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Contato atualizado" : "Contato criado");
      qc.invalidateQueries({ queryKey: ["crm-contatos"] });
      setOpenNovo(false); setEditing(null); resetForm();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("crm_contatos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Contato removido"); qc.invalidateQueries({ queryKey: ["crm-contatos"] }); setOpenDetalhe(null); },
  });

  const toggleTag = useMutation({
    mutationFn: async ({ contatoId, tagId, has }: { contatoId: string; tagId: string; has: boolean }) => {
      if (has) {
        const { error } = await supabase.from("crm_contato_tag_links").delete().eq("contato_id", contatoId).eq("tag_id", tagId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("crm_contato_tag_links").insert({ contato_id: contatoId, tag_id: tagId, empresa_id: empresaId! });
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["crm-contato-tag-links"] }); },
  });

  const startEdit = (c: Contato) => {
    setEditing(c);
    setForm({
      nome: c.nome, telefone: c.telefone ?? "", whatsapp: c.whatsapp ?? "", email: c.email ?? "",
      empresa: c.empresa ?? "", origem: c.origem ?? "", cidade: c.cidade ?? "", estado: c.estado ?? "",
      observacoes: c.observacoes ?? "", valor_potencial: c.valor_potencial?.toString() ?? "",
    });
    setOpenDetalhe(null);
    setOpenNovo(true);
  };

  const initials = (n: string) => n.split(" ").slice(0, 2).map((s) => s[0]).join("").toUpperCase();

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b flex items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-xl font-semibold">Contatos</h1>
          <p className="text-xs text-muted-foreground">{contatos.length} contato(s)</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." className="pl-8 w-64 h-9" />
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Filter className="h-3.5 w-3.5" />
                {filterTag ? tags.find((t) => t.id === filterTag)?.nome ?? "Tag" : "Tag"}
                {filterTag && <X className="h-3 w-3 ml-1" onClick={(e) => { e.stopPropagation(); setFilterTag(null); }} />}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2">
              <div className="space-y-1">
                <button onClick={() => setFilterTag(null)} className="w-full text-left text-sm px-2 py-1.5 rounded hover:bg-muted">Todas</button>
                {tags.map((t) => (
                  <button key={t.id} onClick={() => setFilterTag(t.id)} className="w-full text-left text-sm px-2 py-1.5 rounded hover:bg-muted flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: t.cor }} />
                    {t.nome}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          <Button variant="outline" size="sm" onClick={() => setOpenTags(true)} className="gap-1.5">
            <Tag className="h-3.5 w-3.5" /> Tags
          </Button>
          <Button size="sm" onClick={() => { resetForm(); setEditing(null); setOpenNovo(true); }} className="gap-1.5">
            <Plus className="h-4 w-4" /> Novo contato
          </Button>
        </div>
      </div>

      {/* Lista */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : contatos.length === 0 ? (
            <div className="border border-dashed rounded-xl p-12 text-center">
              <User className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground mb-4">Nenhum contato encontrado.</p>
              <Button variant="outline" onClick={() => { resetForm(); setEditing(null); setOpenNovo(true); }}>Adicionar primeiro contato</Button>
            </div>
          ) : (
            <div className="rounded-xl border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Contato</th>
                    <th className="text-left px-4 py-3 font-medium">WhatsApp / Telefone</th>
                    <th className="text-left px-4 py-3 font-medium">E-mail</th>
                    <th className="text-left px-4 py-3 font-medium">Origem</th>
                    <th className="text-right px-4 py-3 font-medium">Valor potencial</th>
                  </tr>
                </thead>
                <tbody>
                  {contatos.map((c) => (
                    <tr key={c.id} onClick={() => setOpenDetalhe(c)} className="border-t cursor-pointer hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">{initials(c.nome)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{c.nome}</div>
                            {c.empresa && <div className="text-xs text-muted-foreground">{c.empresa}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{c.whatsapp ?? c.telefone ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{c.email ?? "—"}</td>
                      <td className="px-4 py-3">{c.origem ? <Badge variant="secondary">{c.origem}</Badge> : <span className="text-muted-foreground">—</span>}</td>
                      <td className="px-4 py-3 text-right font-medium">
                        {c.valor_potencial ? `R$ ${Number(c.valor_potencial).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Dialog Novo/Editar */}
      <Dialog open={openNovo} onOpenChange={(o) => { setOpenNovo(o); if (!o) { setEditing(null); resetForm(); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar contato" : "Novo contato"}</DialogTitle>
            <DialogDescription>Cadastre informações principais do contato.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2 max-h-[60vh] overflow-y-auto pr-1">
            <div className="col-span-2 space-y-1.5">
              <Label>Nome *</Label>
              <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>WhatsApp</Label>
              <Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="5511999999999" />
            </div>
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Empresa</Label>
              <Input value={form.empresa} onChange={(e) => setForm({ ...form, empresa: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Origem</Label>
              <Input value={form.origem} onChange={(e) => setForm({ ...form, origem: e.target.value })} placeholder="Site, Indicação..." />
            </div>
            <div className="space-y-1.5">
              <Label>Valor potencial (R$)</Label>
              <Input type="number" step="0.01" value={form.valor_potencial} onChange={(e) => setForm({ ...form, valor_potencial: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Cidade</Label>
              <Input value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>UF</Label>
              <Input maxLength={2} value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value.toUpperCase() })} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Observações</Label>
              <Textarea rows={3} value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenNovo(false)}>Cancelar</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sheet Detalhe */}
      <Sheet open={!!openDetalhe} onOpenChange={(o) => !o && setOpenDetalhe(null)}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          {openDetalhe && (
            <>
              <SheetHeader>
                <SheetTitle>Contato</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-5">
                <div className="flex items-center gap-3">
                  <Avatar className="h-14 w-14">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">{initials(openDetalhe.nome)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-semibold">{openDetalhe.nome}</div>
                    {openDetalhe.empresa && <div className="text-sm text-muted-foreground">{openDetalhe.empresa}</div>}
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  {openDetalhe.whatsapp && <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /> {openDetalhe.whatsapp}</div>}
                  {openDetalhe.telefone && openDetalhe.telefone !== openDetalhe.whatsapp && <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /> {openDetalhe.telefone}</div>}
                  {openDetalhe.email && <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /> {openDetalhe.email}</div>}
                  {openDetalhe.origem && <div className="flex items-center gap-2"><Tag className="h-4 w-4 text-muted-foreground" /> {openDetalhe.origem}</div>}
                </div>

                {/* Tags */}
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Tags</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {tags.length === 0 ? (
                      <span className="text-xs text-muted-foreground">Crie tags clicando em "Tags" no topo.</span>
                    ) : tags.map((t) => {
                      const has = contatoTags.some((ct) => ct.id === t.id);
                      return (
                        <button key={t.id}
                          onClick={() => toggleTag.mutate({ contatoId: openDetalhe.id, tagId: t.id, has })}
                          className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${has ? "text-white" : "text-muted-foreground bg-transparent"}`}
                          style={has ? { background: t.cor, borderColor: t.cor } : { borderColor: t.cor + "60" }}>
                          {t.nome}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {openDetalhe.observacoes && (
                  <div className="space-y-1">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Observações</Label>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{openDetalhe.observacoes}</p>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" className="flex-1 gap-1.5" onClick={() => startEdit(openDetalhe)}>
                    <Edit className="h-3.5 w-3.5" /> Editar
                  </Button>
                  <Button variant="outline" className="gap-1.5" onClick={() => { if (confirm("Remover contato?")) remove.mutate(openDetalhe.id); }}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Tags manager */}
      <TagsManager open={openTags} onOpenChange={setOpenTags} empresaId={empresaId} tags={tags} />
    </div>
  );
}

function TagsManager({ open, onOpenChange, empresaId, tags }: { open: boolean; onOpenChange: (o: boolean) => void; empresaId: string | null | undefined; tags: Tag[] }) {
  const qc = useQueryClient();
  const [nome, setNome] = useState("");
  const [cor, setCor] = useState(TAG_COLORS[0]);

  const create = useMutation({
    mutationFn: async () => {
      if (!nome.trim()) throw new Error("Informe o nome");
      const { error } = await supabase.from("crm_contato_tags").insert({ empresa_id: empresaId, nome: nome.trim(), cor });
      if (error) throw error;
    },
    onSuccess: () => { setNome(""); qc.invalidateQueries({ queryKey: ["crm-tags"] }); toast.success("Tag criada"); },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("crm_contato_tags").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["crm-tags"] }); toast.success("Tag removida"); },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Gerenciar tags</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1.5">
              <Label>Nome</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: VIP, Quente..." onKeyDown={(e) => e.key === "Enter" && create.mutate()} />
            </div>
            <div className="space-y-1.5">
              <Label>Cor</Label>
              <div className="flex gap-1">
                {TAG_COLORS.map((c) => (
                  <button key={c} onClick={() => setCor(c)} className={`h-7 w-7 rounded-full border-2 transition-all ${cor === c ? "border-foreground scale-110" : "border-transparent"}`} style={{ background: c }} />
                ))}
              </div>
            </div>
            <Button onClick={() => create.mutate()} disabled={create.isPending}>Criar</Button>
          </div>

          <div className="space-y-1.5 max-h-72 overflow-y-auto">
            {tags.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma tag ainda.</p>
            ) : tags.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-2 rounded border">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ background: t.cor }} />
                  <span className="text-sm">{t.nome}</span>
                </div>
                <Button size="sm" variant="ghost" onClick={() => { if (confirm("Remover tag?")) remove.mutate(t.id); }}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
