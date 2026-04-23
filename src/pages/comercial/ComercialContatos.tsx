import { useMemo, useState } from "react";
import { ComercialLayout } from "@/components/comercial/ComercialLayout";
import { useComercialContacts } from "@/hooks/comercial/useComercialContacts";
import { Building2, Loader2, Mail, MessageCircle, Phone, Plus, Search, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const ORIGENS = ["WhatsApp", "Instagram", "Site", "Indicação", "Ads"];

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}

export default function ComercialContatos() {
  const { contacts, loading, create, remove } = useComercialContacts();
  const [q, setQ] = useState("");
  const [origem, setOrigem] = useState<string>("all");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(
    () =>
      contacts.filter((c) => {
        if (origem !== "all" && c.origem !== origem) return false;
        if (q.trim()) {
          const s = q.toLowerCase();
          if (!`${c.nome} ${c.email ?? ""} ${c.empresa_contato ?? ""} ${c.telefone ?? ""}`.toLowerCase().includes(s)) return false;
        }
        return true;
      }),
    [contacts, q, origem],
  );

  return (
    <ComercialLayout title="Contatos" subtitle={`${contacts.length} cadastrados`}>
      <div className="space-y-4">
        <Card className="flex flex-wrap items-center gap-2 p-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar nome, email, empresa, telefone..." className="pl-9" />
          </div>
          <Select value={origem} onValueChange={setOrigem}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas origens</SelectItem>
              {ORIGENS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={() => setOpen(true)} className="gap-1.5"><Plus className="h-4 w-4" /> Novo contato</Button>
        </Card>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-3 py-2.5">Contato</th>
                  <th className="px-3 py-2.5">Empresa</th>
                  <th className="px-3 py-2.5">Origem</th>
                  <th className="px-3 py-2.5">Telefone</th>
                  <th className="px-3 py-2.5">Criado</th>
                  <th className="px-3 py-2.5 w-32"></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="px-3 py-12 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} className="px-3 py-12 text-center text-sm text-muted-foreground">{contacts.length === 0 ? "Nenhum contato. Clique em 'Novo contato'." : "Sem resultados."}</td></tr>
                ) : (
                  filtered.map((c) => (
                    <tr key={c.id} className="border-b border-border/60 hover:bg-muted/30">
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary">{initials(c.nome)}</span>
                          <div className="min-w-0">
                            <div className="truncate font-medium">{c.nome}</div>
                            <div className="truncate text-xs text-muted-foreground">{c.email ?? "—"}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-xs">
                        <div className="flex items-center gap-1.5"><Building2 className="h-3 w-3 text-muted-foreground" />{c.empresa_contato ?? "—"}</div>
                      </td>
                      <td className="px-3 py-2.5">{c.origem ? <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold">{c.origem}</span> : "—"}</td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">{c.telefone ?? "—"}</td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString("pt-BR")}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1">
                          {c.telefone && (
                            <a href={`https://wa.me/55${c.telefone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"><MessageCircle className="h-3.5 w-3.5" /></a>
                          )}
                          {c.email && <a href={`mailto:${c.email}`} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent"><Mail className="h-3.5 w-3.5" /></a>}
                          <button onClick={async () => { try { await remove(c.id); toast.success("Removido"); } catch (e: any) { toast.error(e?.message ?? "Falha"); } }} className="rounded-md p-1.5 text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {open && <NewContact onClose={() => setOpen(false)} onCreate={create} />}
    </ComercialLayout>
  );
}

function NewContact({ onClose, onCreate }: { onClose: () => void; onCreate: (i: any) => Promise<any> }) {
  const [form, setForm] = useState({ nome: "", telefone: "", email: "", empresa_contato: "", origem: "WhatsApp", tags: "" });
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome.trim()) return toast.error("Nome obrigatório");
    setSaving(true);
    try {
      await onCreate({
        nome: form.nome.trim(),
        telefone: form.telefone.trim() || null,
        email: form.email.trim() || null,
        empresa_contato: form.empresa_contato.trim() || null,
        origem: form.origem || null,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      });
      toast.success("Contato criado");
      onClose();
    } catch (e: any) {
      toast.error(e?.message ?? "Falha");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo contato</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div><Label>Nome *</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Telefone</Label><Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></div>
            <div><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          </div>
          <div><Label>Empresa</Label><Input value={form.empresa_contato} onChange={(e) => setForm({ ...form, empresa_contato: e.target.value })} /></div>
          <div>
            <Label>Origem</Label>
            <Select value={form.origem} onValueChange={(v) => setForm({ ...form, origem: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ORIGENS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Tags (separadas por vírgula)</Label><Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="VIP, Quente" /></div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving} className="gap-1.5">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}Criar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}