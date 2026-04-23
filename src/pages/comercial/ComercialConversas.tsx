import { useEffect, useMemo, useState } from "react";
import { ComercialLayout } from "@/components/comercial/ComercialLayout";
import { useComercialConversations, useComercialMessages, useCreateComercialConversation, type ComercialConversation } from "@/hooks/comercial/useComercialConversations";
import { useComercialContacts } from "@/hooks/comercial/useComercialContacts";
import { supabase } from "@/integrations/supabase/client";
import { Bot, Check, CheckCheck, Loader2, MessageCircle, Plus, Search, Send, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function initials(name: string) {
  return (name || "??").split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}

export default function ComercialConversas() {
  const { conversations, loading } = useComercialConversations();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [aiOpen, setAiOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);

  useEffect(() => {
    if (!selectedId && conversations.length > 0) setSelectedId(conversations[0].id);
  }, [conversations, selectedId]);

  const selected = conversations.find((c) => c.id === selectedId) ?? null;
  const { messages, send } = useComercialMessages(selected?.id ?? null);

  async function handleSend() {
    if (!draft.trim() || !selected) return;
    try { await send(draft); setDraft(""); }
    catch (e: any) { toast.error(e?.message ?? "Falha ao enviar"); }
  }

  if (loading) {
    return <ComercialLayout title="Conversas" noPadding><div className="flex h-full items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div></ComercialLayout>;
  }

  return (
    <ComercialLayout title="Conversas" subtitle="Atendimento omnichannel com IA" noPadding>
      <div className="flex h-full">
        {/* Lista */}
        <div className="flex w-80 flex-col border-r border-border bg-card">
          <div className="border-b border-border p-3">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Conversas</h2>
              <Button size="sm" variant="outline" onClick={() => setNewOpen(true)} className="h-7 gap-1 text-xs"><Plus className="h-3 w-3" />Nova</Button>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar..." className="h-8 pl-9 text-sm" />
            </div>
          </div>
          <ul className="flex-1 overflow-y-auto">
            {conversations.length === 0 && (
              <li className="p-6 text-center text-xs text-muted-foreground">Nenhuma conversa. Clique em "Nova".</li>
            )}
            {conversations.map((c) => {
              const name = c.contato?.nome ?? c.numero_label ?? "Contato";
              const isActive = c.id === selectedId;
              return (
                <li key={c.id}>
                  <button onClick={() => setSelectedId(c.id)} className={cn("flex w-full items-start gap-3 border-b border-border/60 px-3 py-2.5 text-left transition-colors", isActive ? "bg-accent" : "hover:bg-accent/40")}>
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">{initials(name)}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="truncate text-sm font-semibold">{name}</p>
                        <span className="shrink-0 text-[10px] text-muted-foreground">{c.last_message_at ? new Date(c.last_message_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : ""}</span>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">{c.last_message_text ?? "Sem mensagens ainda"}</p>
                      {(c.unread_count ?? 0) > 0 && <span className="mt-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">{c.unread_count}</span>}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Chat */}
        <div className="flex min-w-0 flex-1 flex-col bg-[hsl(var(--chat-bg))]">
          {selected ? (
            <>
              <div className="flex h-14 items-center gap-3 border-b border-border bg-card px-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">{initials(selected.contato?.nome ?? "??")}</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{selected.contato?.nome ?? selected.numero_label ?? "Contato"}</p>
                  <p className="truncate text-xs text-muted-foreground">{selected.canal} {selected.numero_label && `· ${selected.numero_label}`}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => setAiOpen((v) => !v)} className="gap-1.5 text-xs"><Sparkles className="h-3.5 w-3.5" /> IA</Button>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <div className="mx-auto flex max-w-3xl flex-col gap-2">
                  {messages.length === 0 && <p className="my-12 text-center text-xs text-muted-foreground">Sem mensagens. Envie a primeira.</p>}
                  {messages.map((m) => (
                    <div key={m.id} className={cn("flex", m.direction === "me" ? "justify-end" : "justify-start")}>
                      <div className={cn("max-w-[75%] rounded-2xl px-3.5 py-2 text-sm shadow-sm", m.direction === "me" ? "rounded-br-sm bg-[hsl(var(--chat-bubble-out))]" : "rounded-bl-sm bg-[hsl(var(--chat-bubble-in))]")}>
                        <p className="leading-relaxed">{m.body}</p>
                        <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
                          <span>{new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                          {m.direction === "me" && (m.status === "read" ? <CheckCheck className="h-3 w-3 text-info" /> : m.status === "delivered" ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="border-t border-border bg-card p-3">
                <div className="flex items-end gap-2">
                  <textarea rows={1} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }} placeholder="Digite uma mensagem..." className="max-h-32 min-h-[40px] flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
                  <Button onClick={handleSend} size="icon" disabled={!draft.trim()}><Send className="h-4 w-4" /></Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground"><MessageCircle className="mr-2 h-5 w-5" />Selecione uma conversa</div>
          )}
        </div>

        {aiOpen && selected && <AIPanel messages={messages.map((m) => ({ from: m.direction, text: m.body }))} onClose={() => setAiOpen(false)} onUse={(t) => setDraft(t)} />}
      </div>

      {newOpen && <NewConversation onClose={() => setNewOpen(false)} />}
    </ComercialLayout>
  );
}

function NewConversation({ onClose }: { onClose: () => void }) {
  const { contacts } = useComercialContacts();
  const create = useCreateComercialConversation();
  const [contatoId, setContatoId] = useState<string>("");
  const [canal, setCanal] = useState("whatsapp");

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nova conversa</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Contato</Label>
            <Select value={contatoId} onValueChange={setContatoId}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>{contacts.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Canal</Label>
            <Select value={canal} onValueChange={setCanal}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="messenger">Messenger</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button disabled={!contatoId} onClick={async () => {
              try { await create.mutateAsync({ contato_id: contatoId, canal }); toast.success("Conversa criada"); onClose(); }
              catch (e: any) { toast.error(e?.message ?? "Falha"); }
            }}>Criar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AIPanel({ messages, onClose, onUse }: { messages: { from: "me" | "them"; text: string }[]; onClose: () => void; onUse: (t: string) => void }) {
  const [tab, setTab] = useState<"suggest" | "summarize" | "sentiment">("suggest");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Record<string, any>>({});

  async function run(mode: typeof tab) {
    setTab(mode); setLoading(true);
    try {
      const { data: res, error } = await supabase.functions.invoke("comercial-chat-ai", { body: { mode, messages } });
      if (error) throw error;
      setData((d) => ({ ...d, [mode]: res?.result }));
    } catch (e: any) { toast.error(e?.message ?? "Falha na IA"); } finally { setLoading(false); }
  }

  return (
    <aside className="hidden w-80 shrink-0 flex-col border-l border-border bg-card xl:flex">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg shadow-[var(--shadow-glow)]" style={{ background: "var(--gradient-primary)" }}><Sparkles className="h-3.5 w-3.5 text-primary-foreground" /></div>
          <div>
            <p className="text-sm font-semibold">Assistente IA</p>
            <p className="text-[10px] text-muted-foreground">Lovable AI</p>
          </div>
        </div>
        <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-accent"><X className="h-4 w-4" /></button>
      </div>
      <div className="grid grid-cols-3 gap-1 border-b border-border p-2 text-xs">
        {(["suggest", "summarize", "sentiment"] as const).map((id) => (
          <button key={id} onClick={() => run(id)} className={cn("rounded-md px-2 py-2 font-medium", tab === id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent")}>
            {id === "suggest" ? "Sugerir" : id === "summarize" ? "Resumo" : "Sentimento"}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-4 text-sm">
        {loading ? (
          <div className="flex h-32 flex-col items-center justify-center gap-2 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /><p className="text-xs">Analisando...</p></div>
        ) : tab === "suggest" ? (
          <div className="space-y-2">
            {data.suggest?.suggestions?.length ? data.suggest.suggestions.map((s: any, i: number) => (
              <div key={i} className="rounded-lg border border-border bg-background p-3">
                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-primary">{s.tone}</span>
                <p className="my-2 text-xs leading-relaxed">{s.text}</p>
                <Button size="sm" className="w-full text-xs" onClick={() => { onUse(s.text); toast.success("Inserido"); }}>Usar</Button>
              </div>
            )) : <Empty label="Clique em Sugerir para gerar respostas." />}
          </div>
        ) : tab === "summarize" ? (
          data.summarize ? (
            <div className="space-y-3">
              <div><h5 className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Resumo</h5><p className="text-xs leading-relaxed">{data.summarize.summary}</p></div>
              <div><h5 className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Próximo passo</h5><p className="rounded-md border border-primary/20 bg-primary/5 p-2 text-xs">{data.summarize.next_step}</p></div>
            </div>
          ) : <Empty label="Clique em Resumo." />
        ) : data.sentiment ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-border p-3"><p className="text-[10px] font-semibold uppercase opacity-75">Sentimento</p><p className="mt-1 text-base font-bold capitalize">{data.sentiment.sentiment}</p></div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-border p-2"><p className="text-[10px] uppercase text-muted-foreground">Intenção</p><p className="text-xs font-semibold capitalize">{data.sentiment.intent}</p></div>
              <div className="rounded-lg border border-border p-2"><p className="text-[10px] uppercase text-muted-foreground">Urgência</p><p className="text-xs font-semibold capitalize">{data.sentiment.urgency}</p></div>
            </div>
            <p className="text-xs leading-relaxed">{data.sentiment.rationale}</p>
          </div>
        ) : <Empty label="Clique em Sentimento." />}
      </div>
    </aside>
  );
}

function Empty({ label }: { label: string }) {
  return <div className="flex h-32 flex-col items-center justify-center gap-2 text-center text-muted-foreground"><Sparkles className="h-5 w-5" /><p className="text-xs">{label}</p></div>;
}