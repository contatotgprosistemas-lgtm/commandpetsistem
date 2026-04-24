import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentEmpresa } from "@/lib/useCurrentEmpresa";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Search, Send, Sparkles, FileText, User, Phone, Mail, Loader2, MessageSquare, ArrowLeft, Paperclip, FileText as FileIcon, Download, Clock, StickyNote, Zap } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function CRMConversasPage() {
  const qc = useQueryClient();
  const { data: empresaId } = useCurrentEmpresa();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [aiLoading, setAiLoading] = useState<"suggest" | "summary" | null>(null);
  const [contactOpen, setContactOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleDraft, setScheduleDraft] = useState("");
  const [scheduleAt, setScheduleAt] = useState("");
  const [notaDraft, setNotaDraft] = useState("");

  // Conversas list
  const { data: conversas = [], isLoading: loadingConversas } = useQuery({
    queryKey: ["crm-conversas", empresaId],
    enabled: !!empresaId,
    queryFn: async () => {
      const { data, error } = await supabase.from("crm_conversas")
        .select("*, contato:crm_contatos(*), canal:crm_canais(nome, cor)")
        .eq("empresa_id", empresaId!)
        .eq("arquivada", false)
        .order("ultima_mensagem_em", { ascending: false, nullsFirst: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const filteredConversas = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return conversas;
    return conversas.filter((c: any) =>
      c.contato?.nome?.toLowerCase().includes(s) ||
      c.contato?.whatsapp?.includes(s) ||
      c.ultima_mensagem?.toLowerCase().includes(s)
    );
  }, [conversas, search]);

  const selected = conversas.find((c: any) => c.id === selectedId);

  // Templates rápidos
  const { data: templates = [] } = useQuery({
    queryKey: ["crm-templates", empresaId],
    enabled: !!empresaId,
    queryFn: async () => {
      const { data, error } = await supabase.from("crm_templates").select("*").eq("empresa_id", empresaId!).order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });

  // Notas internas
  const { data: notas = [] } = useQuery({
    queryKey: ["crm-notas", selectedId],
    enabled: !!selectedId,
    queryFn: async () => {
      const { data, error } = await supabase.from("crm_notas_conversa").select("*")
        .eq("conversa_id", selectedId!).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Agendadas pendentes da conversa
  const { data: agendadas = [] } = useQuery({
    queryKey: ["crm-agendadas", selectedId],
    enabled: !!selectedId,
    queryFn: async () => {
      const { data, error } = await supabase.from("crm_mensagens_agendadas").select("*")
        .eq("conversa_id", selectedId!).order("agendada_para");
      if (error) throw error;
      return data ?? [];
    },
  });

  // Detecta atalho /xxx no draft
  const slashMatch = draft.match(/(?:^|\s)\/(\w*)$/);
  const slashSuggestions = slashMatch
    ? templates.filter((t: any) => !slashMatch[1] || t.atalho?.toLowerCase().startsWith(slashMatch[1].toLowerCase())).slice(0, 6)
    : [];

  const applyTemplate = (t: any) => {
    const nome = selected?.contato?.nome ?? "";
    let conteudo = String(t.conteudo)
      .replace(/\{\{nome\}\}/g, nome)
      .replace(/\{\{primeiro_nome\}\}/g, nome.split(" ")[0]);
    // remove o /atalho digitado
    setDraft(draft.replace(/(?:^|\s)\/\w*$/, (m) => (m.startsWith(" ") ? " " : "") + conteudo));
  };

  // Mensagens da conversa selecionada
  const { data: mensagens = [], isLoading: loadingMsgs } = useQuery({
    queryKey: ["crm-mensagens", selectedId],
    enabled: !!selectedId,
    queryFn: async () => {
      const { data, error } = await supabase.from("crm_mensagens")
        .select("*").eq("conversa_id", selectedId!)
        .order("enviada_em", { ascending: true }).limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Realtime: novas mensagens + mudanças em conversas
  useEffect(() => {
    if (!empresaId) return;
    const ch = supabase
      .channel("crm-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "crm_mensagens" }, (payload: any) => {
        const cid = payload.new?.conversa_id ?? payload.old?.conversa_id;
        if (cid) qc.invalidateQueries({ queryKey: ["crm-mensagens", cid] });
        qc.invalidateQueries({ queryKey: ["crm-conversas"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "crm_conversas" }, () => {
        qc.invalidateQueries({ queryKey: ["crm-conversas"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "crm_notas_conversa" }, (payload: any) => {
        const cid = payload.new?.conversa_id ?? payload.old?.conversa_id;
        if (cid) qc.invalidateQueries({ queryKey: ["crm-notas", cid] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "crm_mensagens_agendadas" }, (payload: any) => {
        const cid = payload.new?.conversa_id ?? payload.old?.conversa_id;
        if (cid) qc.invalidateQueries({ queryKey: ["crm-agendadas", cid] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [empresaId, qc]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [mensagens.length, selectedId]);

  // Marcar como lida ao abrir
  useEffect(() => {
    if (!selectedId) return;
    supabase.from("crm_conversas").update({ nao_lidas: 0 }).eq("id", selectedId).then(() => {
      qc.invalidateQueries({ queryKey: ["crm-conversas"] });
    });
  }, [selectedId, qc]);

  const send = async () => {
    if (!selectedId || !draft.trim() || sending) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("evolution-send", {
        body: { conversa_id: selectedId, conteudo: draft.trim() },
      });
      if (error || (data as any)?.error) throw new Error((data as any)?.error ?? error?.message);
      setDraft("");
      qc.invalidateQueries({ queryKey: ["crm-mensagens", selectedId] });
    } catch (e: any) {
      toast.error(e.message);
    } finally { setSending(false); }
  };

  const sendFile = async (file: File) => {
    if (!selectedId || !empresaId) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `${empresaId}/${selectedId}/${crypto.randomUUID()}.${ext}`;
      const up = await supabase.storage.from("chat-media").upload(path, file, {
        contentType: file.type, upsert: false,
      });
      if (up.error) throw up.error;
      const { data: signed } = await supabase.storage.from("chat-media").createSignedUrl(path, 60 * 60 * 24 * 365);
      const url = signed?.signedUrl;
      if (!url) throw new Error("Falha ao gerar URL");
      const { data, error } = await supabase.functions.invoke("evolution-send", {
        body: {
          conversa_id: selectedId,
          conteudo: draft.trim() || null,
          midia_url: url,
          midia_mimetype: file.type,
          midia_filename: file.name,
        },
      });
      if (error || (data as any)?.error) throw new Error((data as any)?.error ?? error?.message);
      setDraft("");
      qc.invalidateQueries({ queryKey: ["crm-mensagens", selectedId] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const aiAction = async (action: "suggest" | "summary") => {
    if (!selectedId) return;
    setAiLoading(action);
    try {
      const { data, error } = await supabase.functions.invoke("crm-ai", { body: { action, conversa_id: selectedId } });
      if (error || (data as any)?.error) throw new Error((data as any)?.error ?? error?.message);
      if (action === "suggest") setDraft((data as any).suggestion ?? "");
      else { toast.success("Resumo gerado"); qc.invalidateQueries({ queryKey: ["crm-conversas"] }); }
    } catch (e: any) { toast.error(e.message); }
    finally { setAiLoading(null); }
  };

  return (
    <div className="h-full flex bg-background">
      {/* Lista */}
      <div className={`${selectedId ? "hidden md:flex" : "flex"} w-full md:w-[340px] shrink-0 border-r flex-col`}>
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold mb-3">Conversas</h2>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8 h-9" placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        <ScrollArea className="flex-1">
          {loadingConversas ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : filteredConversas.length === 0 ? (
            <div className="text-center py-12 px-4">
              <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Nenhuma conversa ainda.</p>
              <p className="text-xs text-muted-foreground mt-1">Conecte um canal em Canais para começar a receber.</p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredConversas.map((c: any) => (
                <button key={c.id} onClick={() => setSelectedId(c.id)}
                  className={`w-full text-left p-3 hover:bg-muted/50 transition-colors flex gap-3 ${selectedId === c.id ? "bg-muted" : ""}`}>
                  <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold shrink-0">
                    {(c.contato?.nome ?? "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm truncate">{c.contato?.nome ?? "Sem nome"}</span>
                      {c.ultima_mensagem_em && (
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {formatDistanceToNow(new Date(c.ultima_mensagem_em), { locale: ptBR, addSuffix: false })}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground truncate">{c.ultima_mensagem ?? "—"}</span>
                      {c.nao_lidas > 0 && (
                        <Badge className="h-5 min-w-5 px-1.5 rounded-full bg-success text-success-foreground text-[10px]">{c.nao_lidas}</Badge>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Chat */}
      <div className={`${selectedId ? "flex" : "hidden md:flex"} flex-1 flex-col min-w-0`}>
        {!selected ? (
          <div className="flex-1 flex items-center justify-center text-center px-6">
            <div>
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">Selecione uma conversa à esquerda.</p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="h-14 border-b flex items-center px-4 gap-3 shrink-0">
              <Button variant="ghost" size="icon" className="md:hidden h-8 w-8" onClick={() => setSelectedId(null)}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <button onClick={() => setContactOpen(true)} className="flex items-center gap-3 flex-1 text-left">
                <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
                  {(selected.contato?.nome ?? "?").charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{selected.contato?.nome}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {selected.contato?.whatsapp} · {selected.canal?.nome}
                  </div>
                </div>
              </button>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => aiAction("summary")} disabled={aiLoading === "summary"}>
                {aiLoading === "summary" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">Resumir</span>
              </Button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2 bg-muted/30">
              {loadingMsgs ? (
                <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : mensagens.length === 0 ? (
                <div className="text-center py-12 text-sm text-muted-foreground">Sem mensagens ainda.</div>
              ) : mensagens.map((m: any) => {
                const out = m.direcao === "saida";
                const isImg = m.midia_url && (m.midia_mimetype ?? "").startsWith("image/");
                const isVideo = m.midia_url && (m.midia_mimetype ?? "").startsWith("video/");
                const isAudio = m.midia_url && (m.midia_mimetype ?? "").startsWith("audio/");
                const isFile = m.midia_url && !isImg && !isVideo && !isAudio;
                return (
                  <div key={m.id} className={`flex ${out ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm shadow-sm ${out ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-card border rounded-bl-sm"}`}>
                      {isImg && (
                        <a href={m.midia_url} target="_blank" rel="noreferrer">
                          <img src={m.midia_url} alt="" className="rounded-lg max-h-64 mb-1" />
                        </a>
                      )}
                      {isVideo && (
                        <video src={m.midia_url} controls className="rounded-lg max-h-64 mb-1" />
                      )}
                      {isAudio && (
                        <audio src={m.midia_url} controls className="mb-1 max-w-full" />
                      )}
                      {isFile && (
                        <a href={m.midia_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 mb-1 underline">
                          <FileIcon className="h-4 w-4" />
                          <span className="truncate">{m.midia_filename ?? "arquivo"}</span>
                          <Download className="h-3.5 w-3.5" />
                        </a>
                      )}
                      {m.conteudo && <div className="whitespace-pre-wrap break-words">{m.conteudo}</div>}
                      <div className={`text-[10px] mt-1 ${out ? "text-primary-foreground/70" : "text-muted-foreground"} text-right`}>
                        {m.remetente_nome?.startsWith("🤖") && <span className="mr-1">{m.remetente_nome}</span>}
                        {m.enviada_em && format(new Date(m.enviada_em), "HH:mm")}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Composer */}
            <div className="border-t p-3 shrink-0 bg-background">
              <div className="flex items-end gap-2">
                <Button variant="outline" size="icon" className="h-10 w-10 shrink-0" onClick={() => aiAction("suggest")} disabled={aiLoading === "suggest"} title="Sugerir resposta com IA">
                  {aiLoading === "suggest" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-primary" />}
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  accept="image/*,video/*,audio/*,application/pdf,.doc,.docx,.xls,.xlsx,.zip"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) sendFile(f); }}
                />
                <Button variant="outline" size="icon" className="h-10 w-10 shrink-0" onClick={() => fileRef.current?.click()} disabled={uploading} title="Anexar arquivo">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                </Button>
                <Input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                  placeholder="Escreva uma mensagem..."
                  className="h-10"
                />
                <Button onClick={send} disabled={!draft.trim() || sending} size="icon" className="h-10 w-10 shrink-0">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Drawer do contato */}
      <Sheet open={contactOpen} onOpenChange={setContactOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader><SheetTitle>Detalhes do contato</SheetTitle></SheetHeader>
          {selected && (
            <div className="mt-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xl font-semibold">
                  {(selected.contato?.nome ?? "?").charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold">{selected.contato?.nome}</div>
                  <div className="text-xs text-muted-foreground">Cliente · score {selected.contato?.score ?? 0}</div>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-muted-foreground" />{selected.contato?.whatsapp ?? "—"}</div>
                <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-muted-foreground" />{selected.contato?.email ?? "—"}</div>
                <div className="flex items-center gap-2"><User className="h-3.5 w-3.5 text-muted-foreground" />{selected.contato?.empresa ?? "—"}</div>
              </div>
              {selected.resumo_ia && (
                <div className="rounded-lg border bg-muted/30 p-3">
                  <div className="text-xs font-semibold flex items-center gap-1.5 mb-1.5">
                    <Sparkles className="h-3 w-3 text-primary" /> Resumo IA
                  </div>
                  <p className="text-xs whitespace-pre-wrap text-muted-foreground">{selected.resumo_ia}</p>
                </div>
              )}
              <div>
                <div className="text-xs font-semibold mb-1.5">Canal</div>
                <Badge variant="outline">{selected.canal?.nome}</Badge>
              </div>
              <div>
                <div className="text-xs font-semibold mb-1.5">Origem</div>
                <div className="text-sm text-muted-foreground">{selected.contato?.origem ?? "—"}</div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}