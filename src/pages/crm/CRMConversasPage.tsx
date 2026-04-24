import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentEmpresa } from "@/lib/useCurrentEmpresa";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Search, Send, Sparkles, FileText, User, Phone, Mail, Loader2, MessageSquare,
  ArrowLeft, Paperclip, FileText as FileIcon, Download, Clock, StickyNote,
  UserCheck, UserPlus, Timer, Filter, Smile, Mic, MoreVertical, Video, Phone as PhoneIcon,
  Building2, MapPin, Tag, ChevronDown, Star, PanelRightOpen, Zap, X,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type FilterTab = "todas" | "nao_lidas" | "atribuidas" | "aguardando";

function timeShort(d: string | null) {
  if (!d) return "";
  const date = new Date(d);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return format(date, "HH:mm");
  const diffDays = Math.floor((today.getTime() - date.getTime()) / 86400000);
  if (diffDays < 7) return format(date, "EEE", { locale: ptBR });
  return format(date, "dd/MM");
}

export default function CRMConversasPage() {
  const qc = useQueryClient();
  const { data: empresaId } = useCurrentEmpresa();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<FilterTab>("todas");
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
  const [meId, setMeId] = useState<string | null>(null);
  const [composerMode, setComposerMode] = useState<"mensagem" | "nota">("mensagem");
  const [setorFiltro, setSetorFiltro] = useState<string>("todos");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMeId(data.user?.id ?? null));
  }, []);

  // Setores da empresa
  const { data: setores = [] } = useQuery({
    queryKey: ["crm-setores", empresaId],
    enabled: !!empresaId,
    queryFn: async () => {
      const { data, error } = await supabase.from("crm_setores")
        .select("id, nome, cor").eq("empresa_id", empresaId!).order("ordem").order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });

  // Membros da empresa para transferir conversas
  const { data: membros = [] } = useQuery({
    queryKey: ["crm-membros", empresaId],
    enabled: !!empresaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, nome, email, cargo")
        .eq("empresa_id", empresaId!)
        .order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });

  const atribuir = async (conversaId: string, userId: string | null) => {
    const patch: any = { atendente_id: userId };
    if (userId) patch.assumida_em = new Date().toISOString();
    const { error } = await supabase.from("crm_conversas").update(patch).eq("id", conversaId);
    if (error) { toast.error(error.message); return; }
    toast.success(userId ? "Conversa atribuída" : "Conversa liberada");
    qc.invalidateQueries({ queryKey: ["crm-conversas"] });
  };

  // Conversas list
  const { data: conversas = [], isLoading: loadingConversas } = useQuery({
    queryKey: ["crm-conversas", empresaId],
    enabled: !!empresaId,
    queryFn: async () => {
      const { data, error } = await supabase.from("crm_conversas")
        .select("*, contato:crm_contatos(*), canal:crm_canais(nome, cor), setor:crm_setores(id, nome, cor)")
        .eq("empresa_id", empresaId!)
        .eq("arquivada", false)
        .order("ultima_mensagem_em", { ascending: false, nullsFirst: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Tags do contato selecionado
  const selected = conversas.find((c: any) => c.id === selectedId);
  const { data: contatoTags = [] } = useQuery({
    queryKey: ["crm-contato-tags-links", selected?.contato?.id],
    enabled: !!selected?.contato?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("crm_contato_tag_links")
        .select("tag:crm_contato_tags(id, nome, cor)")
        .eq("contato_id", selected!.contato!.id);
      if (error) throw error;
      return (data ?? []).map((r: any) => r.tag).filter(Boolean);
    },
  });

  // Pipeline / etapa do contato
  const { data: leadInfo } = useQuery({
    queryKey: ["crm-lead", selected?.contato?.id],
    enabled: !!selected?.contato?.id,
    queryFn: async () => {
      const { data } = await supabase.from("crm_leads")
        .select("id, valor, etapa:crm_pipeline_etapas(id, nome, cor)")
        .eq("contato_id", selected!.contato!.id)
        .order("created_at", { ascending: false })
        .limit(1).maybeSingle();
      return data;
    },
  });

  const counts = useMemo(() => {
    const naoLidas = conversas.filter((c: any) => (c.nao_lidas ?? 0) > 0).length;
    const atribuidas = conversas.filter((c: any) => !!c.atendente_id).length;
    const aguardando = conversas.filter((c: any) => !c.atendente_id).length;
    return { todas: conversas.length, naoLidas, atribuidas, aguardando };
  }, [conversas]);

  const filteredConversas = useMemo(() => {
    let arr = conversas;
    if (filterTab === "nao_lidas") arr = arr.filter((c: any) => (c.nao_lidas ?? 0) > 0);
    else if (filterTab === "atribuidas") arr = arr.filter((c: any) => !!c.atendente_id);
    else if (filterTab === "aguardando") arr = arr.filter((c: any) => !c.atendente_id);
    if (setorFiltro !== "todos") {
      arr = arr.filter((c: any) => (setorFiltro === "sem" ? !c.setor_id : c.setor_id === setorFiltro));
    }
    const s = search.trim().toLowerCase();
    if (!s) return arr;
    return arr.filter((c: any) =>
      c.contato?.nome?.toLowerCase().includes(s) ||
      c.contato?.whatsapp?.includes(s) ||
      c.ultima_mensagem?.toLowerCase().includes(s)
    );
  }, [conversas, search, filterTab, setorFiltro]);

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

  // Realtime
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

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [mensagens.length, selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    supabase.from("crm_conversas").update({ nao_lidas: 0 }).eq("id", selectedId).then(() => {
      qc.invalidateQueries({ queryKey: ["crm-conversas"] });
    });
  }, [selectedId, qc]);

  const send = async () => {
    if (!selectedId || !draft.trim() || sending) return;
    if (composerMode === "nota") {
      // Salvar como nota interna
      if (!empresaId) return;
      const { data: { user } } = await supabase.auth.getUser();
      const { data: prof } = await supabase.from("profiles").select("nome").eq("user_id", user!.id).maybeSingle();
      const { error } = await supabase.from("crm_notas_conversa").insert({
        empresa_id: empresaId, conversa_id: selectedId,
        autor_id: user?.id, autor_nome: prof?.nome ?? "—",
        conteudo: draft.trim(),
      });
      if (error) { toast.error(error.message); return; }
      setDraft("");
      qc.invalidateQueries({ queryKey: ["crm-notas", selectedId] });
      toast.success("Nota interna adicionada");
      return;
    }
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

  const agendar = async () => {
    if (!selectedId || !empresaId || !scheduleDraft.trim() || !scheduleAt) return;
    const dt = new Date(scheduleAt);
    if (isNaN(dt.getTime()) || dt.getTime() < Date.now()) {
      toast.error("Escolha uma data/hora futura");
      return;
    }
    const { error } = await supabase.from("crm_mensagens_agendadas").insert({
      empresa_id: empresaId,
      conversa_id: selectedId,
      conteudo: scheduleDraft.trim(),
      agendada_para: dt.toISOString(),
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Mensagem agendada");
    setScheduleOpen(false); setScheduleDraft(""); setScheduleAt("");
    qc.invalidateQueries({ queryKey: ["crm-agendadas", selectedId] });
  };

  const cancelarAgendada = async (id: string) => {
    const { error } = await supabase.from("crm_mensagens_agendadas").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["crm-agendadas", selectedId] });
    toast.success("Agendamento cancelado");
  };

  const addNota = async () => {
    if (!selectedId || !empresaId || !notaDraft.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { data: prof } = await supabase.from("profiles").select("nome").eq("user_id", user!.id).maybeSingle();
    const { error } = await supabase.from("crm_notas_conversa").insert({
      empresa_id: empresaId, conversa_id: selectedId,
      autor_id: user?.id, autor_nome: prof?.nome ?? "—",
      conteudo: notaDraft.trim(),
    });
    if (error) { toast.error(error.message); return; }
    setNotaDraft("");
    qc.invalidateQueries({ queryKey: ["crm-notas", selectedId] });
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

  const initial = (s?: string | null) => (s ?? "?").charAt(0).toUpperCase();
  const responsavelNome = selected?.atendente_id
    ? membros.find((m: any) => m.user_id === selected.atendente_id)?.nome
    : null;

  return (
    <div className="h-full flex bg-muted/20">
      {/* ===== Coluna 1: Lista de conversas ===== */}
      <aside className={`${selectedId ? "hidden md:flex" : "flex"} w-full md:w-[320px] shrink-0 border-r bg-card flex-col`}>
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Conversas</h2>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" title="Filtros">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9 h-10 rounded-full bg-muted/60 border-0 focus-visible:ring-1 focus-visible:ring-primary/40"
              placeholder="Buscar ou começar nova conversa"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Filtros (pills) */}
        <div className="px-3 pb-2 flex gap-1.5 overflow-x-auto scrollbar-hide">
          {[
            { id: "todas" as FilterTab, label: "Todas", count: counts.todas },
            { id: "nao_lidas" as FilterTab, label: "Não lidas", count: counts.naoLidas },
            { id: "atribuidas" as FilterTab, label: "Atribuídas", count: counts.atribuidas },
            { id: "aguardando" as FilterTab, label: "Aguardando", count: counts.aguardando },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilterTab(f.id)}
              className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                filterTab === f.id
                  ? "bg-primary/10 text-primary"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {setores.length > 0 && (
          <div className="px-3 pb-2 flex gap-1.5 overflow-x-auto scrollbar-hide border-b">
            {[{ id: "todos", nome: "Todos setores", cor: "" }, { id: "sem", nome: "Sem setor", cor: "" }, ...setores].map((s: any) => (
              <button key={s.id} onClick={() => setSetorFiltro(s.id)}
                className={`shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-full transition-colors flex items-center gap-1.5 ${
                  setorFiltro === s.id ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted"
                }`}>
                {s.cor && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.cor }} />}
                {s.nome}
              </button>
            ))}
          </div>
        )}

        <ScrollArea className="flex-1">
          {loadingConversas ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : filteredConversas.length === 0 ? (
            <div className="text-center py-12 px-4">
              <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Nenhuma conversa.</p>
              <p className="text-xs text-muted-foreground mt-1">Conecte um canal para começar.</p>
            </div>
          ) : (
            <div className="px-2 space-y-0.5">
              {filteredConversas.map((c: any) => {
                const ativo = selectedId === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    className={`w-full text-left p-2.5 rounded-lg flex gap-3 transition-colors ${
                      ativo ? "bg-primary/10" : "hover:bg-muted/60"
                    }`}
                  >
                    <div className="relative shrink-0">
                      <div className="h-11 w-11 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
                        {initial(c.contato?.nome)}
                      </div>
                      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-success ring-2 ring-card" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-[13px] text-foreground truncate">
                          {c.contato?.nome ?? "Sem nome"}
                        </span>
                        {c.ultima_mensagem_em && (
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {timeShort(c.ultima_mensagem_em)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground truncate">{c.ultima_mensagem ?? "—"}</span>
                        {c.nao_lidas > 0 && (
                          <Badge className="h-5 min-w-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] hover:bg-primary">
                            {c.nao_lidas}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                        {c.canal?.nome && (
                          <span className="text-[9px] uppercase tracking-wide text-muted-foreground/70">
                            {c.canal.nome}
                          </span>
                        )}
                        {c.setor && (
                          <Badge variant="outline" className="text-[9px] py-0 px-1.5 h-4 gap-1"
                            style={{ borderColor: c.setor.cor, color: c.setor.cor }}>
                            <Building2 className="h-2.5 w-2.5" />
                            {c.setor.nome}
                          </Badge>
                        )}
                        {c.atendente_id ? (
                          <Badge variant="outline" className="text-[9px] py-0 px-1.5 h-4 gap-1 border-success/30 text-success">
                            <UserCheck className="h-2.5 w-2.5" />
                            {membros.find((m: any) => m.user_id === c.atendente_id)?.nome?.split(" ")[0] ?? "Atribuída"}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[9px] py-0 px-1.5 h-4 bg-amber-500/10 text-amber-700 dark:text-amber-400">
                            Aguardando
                          </Badge>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </aside>

      {/* ===== Coluna 2: Chat ===== */}
      <section className={`${selectedId ? "flex" : "hidden md:flex"} flex-1 flex-col min-w-0 bg-background`}>
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
            <div className="h-16 border-b flex items-center px-4 gap-3 shrink-0 bg-card">
              <Button variant="ghost" size="icon" className="md:hidden h-8 w-8" onClick={() => setSelectedId(null)}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold shrink-0">
                {initial(selected.contato?.nome)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold truncate">{selected.contato?.nome}</div>
                <div className="text-xs text-muted-foreground truncate flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" />
                  online · {selected.canal?.nome ?? "—"}
                </div>
              </div>

              {/* Botão IA destacado */}
              <Button
                size="sm"
                onClick={() => aiAction("suggest")}
                disabled={aiLoading === "suggest"}
                className="gap-1.5 bg-primary/10 text-primary hover:bg-primary/20 border-0"
                variant="outline"
                title="Sugerir resposta com IA"
              >
                {aiLoading === "suggest" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                IA
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground" title="Vídeo">
                <Video className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground" title="Ligar">
                <PhoneIcon className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground" title="Buscar">
                <Search className="h-4 w-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="text-xs">Responsável pela conversa</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {meId && selected.atendente_id !== meId && (
                    <DropdownMenuItem onClick={() => atribuir(selected.id, meId)} className="gap-2 text-sm">
                      <UserCheck className="h-3.5 w-3.5" /> Assumir para mim
                    </DropdownMenuItem>
                  )}
                  {selected.atendente_id && (
                    <DropdownMenuItem onClick={() => atribuir(selected.id, null)} className="gap-2 text-sm text-destructive">
                      Liberar (sem responsável)
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-[10px] text-muted-foreground">Transferir para…</DropdownMenuLabel>
                  <div className="max-h-48 overflow-y-auto">
                    {membros.length === 0 && <div className="px-2 py-1.5 text-xs text-muted-foreground">Nenhum membro</div>}
                    {membros.map((m: any) => (
                      <DropdownMenuItem key={m.user_id} onClick={() => atribuir(selected.id, m.user_id)} className="gap-2 text-sm">
                        <span className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-semibold shrink-0">
                          {initial(m.nome)}
                        </span>
                        <span className="truncate">{m.nome}</span>
                        {selected.atendente_id === m.user_id && <UserCheck className="h-3 w-3 ml-auto text-success" />}
                      </DropdownMenuItem>
                    ))}
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => aiAction("summary")} className="gap-2 text-sm">
                    <FileText className="h-3.5 w-3.5" /> Gerar resumo IA
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setContactOpen(true)} className="gap-2 text-sm lg:hidden">
                    <PanelRightOpen className="h-3.5 w-3.5" /> Painel do contato
                  </DropdownMenuItem>
                  {setores.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel className="text-[10px] text-muted-foreground">Mover para setor</DropdownMenuLabel>
                      <div className="max-h-40 overflow-y-auto">
                        <DropdownMenuItem
                          onClick={async () => {
                            const { error } = await supabase.from("crm_conversas")
                              .update({ setor_id: null, atendente_id: null }).eq("id", selected.id);
                            if (error) toast.error(error.message);
                            else { toast.success("Sem setor"); qc.invalidateQueries({ queryKey: ["crm-conversas"] }); }
                          }}
                          className="gap-2 text-sm">
                          <X className="h-3.5 w-3.5" /> Sem setor
                        </DropdownMenuItem>
                        {setores.map((s: any) => (
                          <DropdownMenuItem key={s.id} onClick={async () => {
                            const { error } = await supabase.from("crm_conversas")
                              .update({ setor_id: s.id, atendente_id: null }).eq("id", selected.id);
                            if (error) toast.error(error.message);
                            else { toast.success(`Movida para ${s.nome}`); qc.invalidateQueries({ queryKey: ["crm-conversas"] }); }
                          }} className="gap-2 text-sm">
                            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: s.cor }} />
                            <span className="truncate">{s.nome}</span>
                            {selected.setor_id === s.id && <UserCheck className="h-3 w-3 ml-auto text-success" />}
                          </DropdownMenuItem>
                        ))}
                      </div>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-2 bg-[hsl(var(--muted)/0.2)]">
              {loadingMsgs ? (
                <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : mensagens.length === 0 ? (
                <div className="text-center py-12 text-sm text-muted-foreground">Sem mensagens ainda.</div>
              ) : (
                <>
                  {/* Pílula "Hoje" */}
                  <div className="flex justify-center py-1">
                    <span className="text-[10px] uppercase tracking-wider px-3 py-1 rounded-full bg-muted text-muted-foreground">
                      Hoje
                    </span>
                  </div>
                  {mensagens.map((m: any) => {
                    const out = m.direcao === "saida";
                    const isImg = m.midia_url && (m.midia_mimetype ?? "").startsWith("image/");
                    const isVideo = m.midia_url && (m.midia_mimetype ?? "").startsWith("video/");
                    const isAudio = m.midia_url && (m.midia_mimetype ?? "").startsWith("audio/");
                    const isFile = m.midia_url && !isImg && !isVideo && !isAudio;
                    return (
                      <div key={m.id} className={`flex ${out ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[70%] rounded-2xl px-3.5 py-2 text-sm shadow-sm ${
                            out
                              ? "bg-primary text-primary-foreground rounded-br-md"
                              : "bg-card border rounded-bl-md"
                          }`}
                        >
                          {isImg && (
                            <a href={m.midia_url} target="_blank" rel="noreferrer">
                              <img src={m.midia_url} alt="" className="rounded-lg max-h-64 mb-1" />
                            </a>
                          )}
                          {isVideo && <video src={m.midia_url} controls className="rounded-lg max-h-64 mb-1" />}
                          {isAudio && <audio src={m.midia_url} controls className="mb-1 max-w-full" />}
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
                </>
              )}
            </div>

            {/* Composer */}
            <div className="border-t shrink-0 bg-card">
              {/* Barra de ações IA / atalhos */}
              <div className="px-3 pt-2.5 pb-1.5 flex items-center gap-2 flex-wrap">
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="text-xs px-2.5 py-1.5 rounded-md border bg-background hover:bg-muted/60 inline-flex items-center gap-1.5 text-foreground">
                      <Zap className="h-3.5 w-3.5 text-amber-500" /> Resposta rápida
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0" align="start">
                    <div className="p-2 border-b text-xs font-medium text-muted-foreground">Modelos de mensagem</div>
                    <div className="max-h-64 overflow-y-auto">
                      {templates.length === 0 ? (
                        <div className="p-4 text-center text-xs text-muted-foreground">Nenhum modelo. Crie em Modelos.</div>
                      ) : (templates as any[]).map((t: any) => (
                        <button key={t.id} onClick={() => applyTemplate(t)}
                          className="w-full text-left px-3 py-2 hover:bg-muted/60 border-b last:border-b-0">
                          <div className="flex items-center gap-2 text-xs font-medium">
                            {t.nome}
                            {t.atalho && <code className="px-1 py-0.5 rounded bg-primary/10 text-primary text-[10px]">/{t.atalho}</code>}
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate">{t.conteudo}</div>
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>

                <button
                  onClick={() => aiAction("suggest")}
                  disabled={aiLoading === "suggest"}
                  className="text-xs px-2.5 py-1.5 rounded-md inline-flex items-center gap-1.5 bg-primary/10 text-primary hover:bg-primary/15"
                >
                  {aiLoading === "suggest" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  Sugestão IA
                </button>

                <button
                  onClick={() => aiAction("summary")}
                  disabled={aiLoading === "summary"}
                  className="text-xs px-2.5 py-1.5 rounded-md border bg-background hover:bg-muted/60 inline-flex items-center gap-1.5 text-foreground"
                >
                  {aiLoading === "summary" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 text-primary" />}
                  Painel IA
                </button>

                <button
                  onClick={() => setComposerMode((m) => (m === "nota" ? "mensagem" : "nota"))}
                  className={`text-xs px-2.5 py-1.5 rounded-md inline-flex items-center gap-1.5 border ${
                    composerMode === "nota"
                      ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30"
                      : "bg-background hover:bg-muted/60"
                  }`}
                >
                  <StickyNote className="h-3.5 w-3.5" /> Nota interna
                </button>

                <div className="flex-1" />

                <button
                  onClick={() => { setScheduleDraft(draft); setScheduleOpen(true); }}
                  className="text-xs px-2.5 py-1.5 rounded-md border bg-background hover:bg-muted/60 inline-flex items-center gap-1.5 text-muted-foreground"
                  title="Agendar mensagem"
                >
                  <Clock className="h-3.5 w-3.5" /> Agendar
                </button>
              </div>

              {slashSuggestions.length > 0 && (
                <div className="mx-3 mb-2 rounded-lg border bg-popover shadow-md max-h-48 overflow-y-auto">
                  {slashSuggestions.map((t: any) => (
                    <button key={t.id} onClick={() => applyTemplate(t)}
                      className="w-full text-left px-3 py-2 hover:bg-muted/60 border-b last:border-b-0">
                      <div className="flex items-center gap-2 text-xs">
                        <code className="px-1.5 py-0.5 rounded bg-primary/10 text-primary">/{t.atalho}</code>
                        <span className="font-medium">{t.nome}</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate mt-0.5">{t.conteudo}</div>
                    </button>
                  ))}
                </div>
              )}

              {agendadas.filter((a: any) => a.status === "pendente").length > 0 && (
                <div className="mx-3 mb-2 px-3 py-1.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[11px] flex items-center gap-1.5">
                  <Clock className="h-3 w-3" />
                  {agendadas.filter((a: any) => a.status === "pendente").length} mensagem(ns) agendada(s).
                </div>
              )}

              {/* Input principal */}
              <div className="px-3 pb-3 pt-1">
                <div className={`flex items-center gap-1.5 rounded-full border bg-background pr-1.5 pl-2 ${composerMode === "nota" ? "border-amber-500/40 bg-amber-500/5" : ""}`}>
                  <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-muted-foreground rounded-full" title="Emoji">
                    <Smile className="h-4 w-4" />
                  </Button>
                  <input
                    ref={fileRef}
                    type="file"
                    className="hidden"
                    accept="image/*,video/*,audio/*,application/pdf,.doc,.docx,.xls,.xlsx,.zip"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) sendFile(f); }}
                  />
                  <Button
                    variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-muted-foreground rounded-full"
                    onClick={() => fileRef.current?.click()} disabled={uploading} title="Anexar"
                  >
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                  </Button>
                  <Input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                    placeholder={composerMode === "nota" ? "Escreva uma nota interna (não é enviada ao cliente)..." : "Digite uma mensagem..."}
                    className="h-10 border-0 bg-transparent shadow-none focus-visible:ring-0 px-1"
                  />
                  {draft.trim() ? (
                    <Button onClick={send} disabled={sending} size="icon" className="h-9 w-9 shrink-0 rounded-full">
                      {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  ) : (
                    <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-muted-foreground rounded-full" title="Áudio">
                      <Mic className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </section>

      {/* ===== Coluna 3: Painel do contato (desktop) ===== */}
      {selected && (
        <aside className="hidden lg:flex w-[300px] shrink-0 border-l bg-card flex-col overflow-y-auto">
          {/* Avatar grande */}
          <div className="px-5 pt-6 pb-4 text-center">
            <div className="h-20 w-20 rounded-full bg-primary/10 text-primary flex items-center justify-center text-2xl font-semibold mx-auto mb-3">
              {initial(selected.contato?.nome)}
            </div>
            <div className="text-base font-semibold">{selected.contato?.nome ?? "—"}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{selected.contato?.whatsapp ?? "—"}</div>
            {contatoTags.length > 0 && (
              <div className="mt-2 flex justify-center">
                <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 hover:bg-amber-500/15 gap-1 text-[10px]">
                  <Star className="h-3 w-3" /> {contatoTags[0]?.nome}
                </Badge>
              </div>
            )}
          </div>

          {/* Pipeline */}
          <div className="px-5 py-3 border-t">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
              Pipeline
            </div>
            <div className="rounded-lg border bg-background px-3 py-2.5 flex items-center justify-between">
              <div className="min-w-0">
                <div className="text-[10px] text-muted-foreground">Etapa atual</div>
                <div className="text-sm font-semibold truncate">{leadInfo?.etapa?.nome ?? "—"}</div>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
            </div>
            {leadInfo?.valor != null && (
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Valor potencial</span>
                <span className="font-semibold text-success">
                  {Number(leadInfo.valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </span>
              </div>
            )}
          </div>

          {/* Informações */}
          <div className="px-5 py-3 border-t">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
              Informações
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2 text-foreground">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="truncate">{selected.contato?.email ?? "—"}</span>
              </div>
              <div className="flex items-center gap-2 text-foreground">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="truncate">{selected.contato?.empresa ?? "—"}</span>
              </div>
              <div className="flex items-center gap-2 text-foreground">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="truncate">{selected.contato?.cidade ?? "—"}</span>
              </div>
              <div className="flex items-center gap-2 text-foreground">
                <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="truncate">Origem: {selected.contato?.origem ?? "—"}</span>
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="px-5 py-3 border-t">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
              Tags
            </div>
            <div className="flex flex-wrap gap-1.5">
              {contatoTags.length === 0 ? (
                <span className="text-xs text-muted-foreground">Nenhuma tag</span>
              ) : contatoTags.map((t: any) => (
                <Badge
                  key={t.id}
                  variant="secondary"
                  className="text-[10px] font-medium"
                  style={{ backgroundColor: `${t.cor}20`, color: t.cor }}
                >
                  {t.nome}
                </Badge>
              ))}
            </div>
          </div>

          {/* Atendimento */}
          <div className="px-5 py-3 border-t">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
              Atendimento
            </div>
            <div className="text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Responsável</span>
                <span className="font-medium truncate ml-2">{responsavelNome ?? "Sem responsável"}</span>
              </div>
              {selected.tempo_primeira_resposta_seg != null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">1ª resposta</span>
                  <span className="font-medium">
                    {selected.tempo_primeira_resposta_seg < 60
                      ? `${selected.tempo_primeira_resposta_seg}s`
                      : selected.tempo_primeira_resposta_seg < 3600
                      ? `${Math.round(selected.tempo_primeira_resposta_seg / 60)} min`
                      : `${(selected.tempo_primeira_resposta_seg / 3600).toFixed(1)} h`}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Resumo IA */}
          {selected.resumo_ia && (
            <div className="px-5 py-3 border-t">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-primary" /> Resumo IA
              </div>
              <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">{selected.resumo_ia}</p>
            </div>
          )}

          {/* Notas */}
          <div className="px-5 py-3 border-t">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 flex items-center justify-between">
              <span>Notas internas {notas.length > 0 && <span className="text-muted-foreground">({notas.length})</span>}</span>
            </div>
            <Textarea rows={2} value={notaDraft} onChange={(e) => setNotaDraft(e.target.value)}
              placeholder="Anote algo (visível só pra equipe)..." className="text-xs mb-1.5" />
            <Button size="sm" variant="outline" onClick={addNota} disabled={!notaDraft.trim()} className="w-full gap-1.5 h-8">
              <StickyNote className="h-3 w-3" /> Adicionar
            </Button>
            <div className="space-y-1.5 mt-2">
              {notas.slice(0, 3).map((n: any) => (
                <div key={n.id} className="rounded-md border bg-amber-500/5 border-amber-500/30 p-2">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[10px] font-medium">{n.autor_nome ?? "—"}</span>
                    <span className="text-[9px] text-muted-foreground">{format(new Date(n.created_at), "dd/MM HH:mm")}</span>
                  </div>
                  <p className="text-[11px] whitespace-pre-wrap">{n.conteudo}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Agendadas */}
          {agendadas.length > 0 && (
            <div className="px-5 py-3 border-t">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 flex items-center gap-1.5">
                <Clock className="h-3 w-3" /> Agendadas ({agendadas.length})
              </div>
              <div className="space-y-1.5">
                {agendadas.slice(0, 3).map((a: any) => (
                  <div key={a.id} className="rounded-md border p-2">
                    <div className="flex items-center justify-between mb-0.5">
                      <Badge variant={a.status === "pendente" ? "secondary" : a.status === "enviada" ? "default" : "destructive"} className="text-[9px]">
                        {a.status}
                      </Badge>
                      <span className="text-[9px] text-muted-foreground">{format(new Date(a.agendada_para), "dd/MM HH:mm")}</span>
                    </div>
                    <p className="text-[11px] whitespace-pre-wrap line-clamp-2">{a.conteudo}</p>
                    {a.status === "pendente" && (
                      <Button size="sm" variant="ghost" className="h-6 text-[10px] text-destructive p-1 mt-1"
                        onClick={() => cancelarAgendada(a.id)}>Cancelar</Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      )}

      {/* ===== Drawer mobile do contato ===== */}
      <Sheet open={contactOpen} onOpenChange={setContactOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader><SheetTitle>Painel da conversa</SheetTitle></SheetHeader>
          {selected && (
            <Tabs defaultValue="contato" className="mt-4">
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="contato" className="gap-1.5"><User className="h-3.5 w-3.5" />Contato</TabsTrigger>
                <TabsTrigger value="notas" className="gap-1.5"><StickyNote className="h-3.5 w-3.5" />Notas {notas.length > 0 && <span className="text-[10px]">({notas.length})</span>}</TabsTrigger>
                <TabsTrigger value="agendadas" className="gap-1.5"><Clock className="h-3.5 w-3.5" />Agendadas {agendadas.length > 0 && <span className="text-[10px]">({agendadas.length})</span>}</TabsTrigger>
              </TabsList>

              <TabsContent value="contato" className="space-y-4 mt-4">
                <div className="flex items-center gap-3">
                  <div className="h-14 w-14 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xl font-semibold">
                    {initial(selected.contato?.nome)}
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
                <div className="rounded-lg border p-3 space-y-1.5">
                  <div className="text-xs font-semibold flex items-center gap-1.5">
                    <Timer className="h-3 w-3 text-primary" /> Atendimento
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Responsável: <span className="text-foreground font-medium">
                      {responsavelNome ?? "Sem responsável"}
                    </span>
                  </div>
                  {selected.assumida_em && (
                    <div className="text-xs text-muted-foreground">
                      Assumida em: <span className="text-foreground">{format(new Date(selected.assumida_em), "dd/MM HH:mm")}</span>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="notas" className="space-y-3 mt-4">
                <div className="space-y-1.5">
                  <Textarea rows={3} value={notaDraft} onChange={(e) => setNotaDraft(e.target.value)}
                    placeholder="Anote algo (visível só pra equipe)..." />
                  <Button size="sm" onClick={addNota} disabled={!notaDraft.trim()} className="w-full gap-1.5">
                    <StickyNote className="h-3.5 w-3.5" /> Adicionar nota
                  </Button>
                </div>
                <div className="space-y-2">
                  {notas.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-6">Nenhuma nota ainda.</p>
                  ) : notas.map((n: any) => (
                    <div key={n.id} className="rounded-lg border bg-amber-500/5 border-amber-500/30 p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium">{n.autor_nome ?? "—"}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {format(new Date(n.created_at), "dd/MM HH:mm")}
                        </span>
                      </div>
                      <p className="text-xs whitespace-pre-wrap">{n.conteudo}</p>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="agendadas" className="space-y-3 mt-4">
                <Button size="sm" className="w-full gap-1.5" onClick={() => { setScheduleDraft(""); setScheduleOpen(true); }}>
                  <Clock className="h-3.5 w-3.5" /> Nova mensagem agendada
                </Button>
                <div className="space-y-2">
                  {agendadas.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-6">Nenhuma agendada.</p>
                  ) : agendadas.map((a: any) => (
                    <div key={a.id} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant={a.status === "pendente" ? "secondary" : a.status === "enviada" ? "default" : "destructive"} className="text-[10px]">
                          {a.status}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {format(new Date(a.agendada_para), "dd/MM 'às' HH:mm")}
                        </span>
                      </div>
                      <p className="text-xs whitespace-pre-wrap mb-2">{a.conteudo}</p>
                      {a.erro && <p className="text-[10px] text-destructive mb-1">{a.erro}</p>}
                      {a.status === "pendente" && (
                        <Button size="sm" variant="ghost" className="h-7 text-[11px] text-destructive"
                          onClick={() => cancelarAgendada(a.id)}>Cancelar</Button>
                      )}
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </SheetContent>
      </Sheet>

      {/* Dialog Agendar mensagem */}
      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agendar mensagem</DialogTitle>
            <DialogDescription>A mensagem será enviada automaticamente no horário escolhido.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Mensagem</Label>
              <Textarea rows={4} value={scheduleDraft} onChange={(e) => setScheduleDraft(e.target.value)} placeholder="Olá {{primeiro_nome}}, ..." />
            </div>
            <div className="space-y-1.5">
              <Label>Enviar em</Label>
              <Input type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleOpen(false)}>Cancelar</Button>
            <Button onClick={agendar} disabled={!scheduleDraft.trim() || !scheduleAt}>
              <Clock className="h-4 w-4 mr-1.5" /> Agendar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
