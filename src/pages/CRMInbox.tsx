import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ChatStatusTag } from "@/components/ChatStatusTag";
import { CRMSidebarPanel } from "@/components/CRMSidebarPanel";
import { ChatBubble } from "@/components/chat/ChatBubble";
import { AudioRecorder } from "@/components/chat/AudioRecorder";
import { MediaUploadMenu } from "@/components/chat/MediaUploadMenu";
import { EmojiPicker } from "@/components/chat/EmojiPicker";
import { WhatsAppStatusIndicator } from "@/components/chat/WhatsAppStatusIndicator";
import { ImportWhatsAppContatosDialog } from "@/components/ImportWhatsAppContatosDialog";
import { Search, Send, Smile, Phone, MoreVertical, Loader2, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";

export default function CRMInbox() {
  const { profile } = useAuth();
  const empresaId = profile?.empresa_id;
  const queryClient = useQueryClient();
  const [selectedConversaId, setSelectedConversaId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sending, setSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch conversations
  const { data: conversas } = useQuery({
    queryKey: ["conversas", empresaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversas")
        .select("*, clientes:cliente_id(id, nome, telefone, whatsapp)")
        .order("ultima_mensagem_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!empresaId,
  });

  // Auto-select first conversation
  useEffect(() => {
    if (conversas?.length && !selectedConversaId) {
      setSelectedConversaId(conversas[0].id);
    }
  }, [conversas, selectedConversaId]);

  const selectedConversa = conversas?.find(c => c.id === selectedConversaId);

  // Fetch messages for selected conversation
  const { data: mensagens } = useQuery({
    queryKey: ["mensagens", selectedConversaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mensagens")
        .select("*")
        .eq("conversa_id", selectedConversaId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedConversaId,
  });

  // Realtime subscription
  useEffect(() => {
    if (!empresaId) return;
    const channel = supabase
      .channel("crm-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "mensagens" }, () => {
        queryClient.invalidateQueries({ queryKey: ["mensagens", selectedConversaId] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "conversas" }, () => {
        queryClient.invalidateQueries({ queryKey: ["conversas", empresaId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [empresaId, selectedConversaId, queryClient]);

  const filteredConversas = conversas?.filter(c =>
    !searchQuery ||
    c.contato_nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.contato_telefone.includes(searchQuery)
  );

  const getInitials = (name: string) =>
    name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  const formatTime = (date: string) => {
    try { return format(new Date(date), "HH:mm"); } catch { return ""; }
  };

  const clienteId = selectedConversa?.cliente_id || null;

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens]);

  // ─── Send text message ────────────────────────────────
  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedConversa || !empresaId || sending) return;
    const text = messageInput.trim();
    setMessageInput("");
    setSending(true);
    setShowEmoji(false);

    try {
      const phone = selectedConversa.contato_telefone.replace(/\D/g, "");
      // Only send via WhatsApp if phone looks valid (10+ digits)
      if (phone.length >= 10) {
        await supabase.functions.invoke("evolution-api", {
          body: { action: "send_message", number: phone, text },
        }).catch(() => {});
      }

      await supabase.from("mensagens").insert({
        conversa_id: selectedConversaId!,
        empresa_id: empresaId,
        conteudo: text,
        remetente: "agente",
        tipo: "texto",
      });

      await supabase.from("conversas").update({ ultima_mensagem_at: new Date().toISOString() }).eq("id", selectedConversaId!);
      queryClient.invalidateQueries({ queryKey: ["mensagens", selectedConversaId] });
      queryClient.invalidateQueries({ queryKey: ["conversas", empresaId] });
    } catch (err: any) {
      toast({ title: "Erro ao enviar mensagem", description: err.message, variant: "destructive" });
      setMessageInput(text);
    } finally {
      setSending(false);
    }
  };

  // ─── Send media message ───────────────────────────────
  const handleSendMedia = async (url: string, type: "image" | "document" | "audio", fileName?: string) => {
    if (!selectedConversa || !empresaId) return;
    setSending(true);

    try {
      const phone = selectedConversa.contato_telefone.replace(/\D/g, "");
      if (phone.length >= 10) {
        await supabase.functions.invoke("evolution-api", {
          body: { action: "send_media", number: phone, mediaUrl: url, mediaType: type, fileName },
        }).catch(() => {});
      }

      const tipoDb = type === "image" ? "imagem" : type === "audio" ? "audio" : "documento";
      await supabase.from("mensagens").insert({
        conversa_id: selectedConversaId!,
        empresa_id: empresaId,
        conteudo: url,
        remetente: "agente",
        tipo: tipoDb,
      });

      await supabase.from("conversas").update({ ultima_mensagem_at: new Date().toISOString() }).eq("id", selectedConversaId!);
      queryClient.invalidateQueries({ queryKey: ["mensagens", selectedConversaId] });
      queryClient.invalidateQueries({ queryKey: ["conversas", empresaId] });
    } catch (err: any) {
      toast({ title: "Erro ao enviar mídia", description: err.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessageInput((prev) => prev + emoji);
    inputRef.current?.focus();
  };

  // ─── Get last message preview for conversation list ───
  const getLastMessagePreview = (conv: typeof conversas extends (infer T)[] | undefined ? T : never) => {
    // We don't have last message in the conv object, just show phone
    return conv.contato_telefone;
  };

  return (
    <div className="flex h-screen">
      {/* ─── Left - Conversation List ─────────────────────── */}
      <div className="w-[340px] border-r border-border flex flex-col bg-card shrink-0">
        {/* Header */}
        <div className="h-14 px-4 flex items-center justify-between border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Conversas</h2>
          <div className="flex items-center gap-2">
            <ImportWhatsAppContatosDialog onSuccess={() => queryClient.invalidateQueries({ queryKey: ["conversas", empresaId] })} />
            <WhatsAppStatusIndicator />
          </div>
        </div>

        {/* Search */}
        <div className="p-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar ou começar nova conversa"
              className="w-full h-9 pl-9 pr-3 text-sm bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {!filteredConversas?.length ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <MessageSquare className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground text-center">Nenhuma conversa encontrada</p>
            </div>
          ) : (
            filteredConversas.map(conv => (
              <button
                key={conv.id}
                onClick={() => setSelectedConversaId(conv.id)}
                className={`w-full px-3 py-3 flex items-center gap-3 text-left transition-colors hover:bg-muted/50 ${
                  selectedConversaId === conv.id ? "bg-muted" : ""
                }`}
              >
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary shrink-0">
                  {getInitials(conv.contato_nome)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground truncate">{conv.contato_nome}</span>
                    {conv.ultima_mensagem_at && (
                      <span className="font-mono text-[11px] text-muted-foreground ml-2 shrink-0">
                        {formatTime(conv.ultima_mensagem_at)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-xs text-muted-foreground truncate">{conv.contato_telefone}</p>
                    <ChatStatusTag status={conv.status as any} />
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ─── Center - Chat Area ───────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedConversa ? (
          <>
            {/* Chat header */}
            <div className="h-14 px-4 flex items-center justify-between border-b border-border bg-card">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                  {getInitials(selectedConversa.contato_nome)}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{selectedConversa.contato_nome}</p>
                  <p className="font-mono text-xs text-muted-foreground">{selectedConversa.contato_telefone}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button className="h-9 w-9 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground">
                  <Phone className="h-[18px] w-[18px]" strokeWidth={1.5} />
                </button>
                <button className="h-9 w-9 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground">
                  <MoreVertical className="h-[18px] w-[18px]" strokeWidth={1.5} />
                </button>
              </div>
            </div>

            {/* Messages area - WhatsApp style background */}
            <div
              className="flex-1 overflow-y-auto px-4 py-3"
              style={{
                backgroundColor: "hsl(var(--background))",
                backgroundImage: "radial-gradient(circle at 25px 25px, hsl(var(--muted) / 0.3) 1px, transparent 0)",
                backgroundSize: "50px 50px",
              }}
            >
              <div className="max-w-3xl mx-auto space-y-1">
                {!mensagens?.length ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                      <MessageSquare className="h-8 w-8 text-muted-foreground/40" />
                    </div>
                    <p className="text-sm text-muted-foreground">Nenhuma mensagem ainda</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Envie uma mensagem para iniciar a conversa</p>
                  </div>
                ) : (
                  mensagens.map(msg => (
                    <ChatBubble
                      key={msg.id}
                      conteudo={msg.conteudo}
                      remetente={msg.remetente}
                      tipo={msg.tipo}
                      created_at={msg.created_at}
                      formatTime={formatTime}
                    />
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* ─── Input bar - WhatsApp native style ──────── */}
            <div className="px-3 py-2 border-t border-border bg-card">
              <div className="max-w-3xl mx-auto flex items-end gap-1.5">
                {/* Emoji picker */}
                <div className="relative">
                  <button
                    onClick={() => setShowEmoji(!showEmoji)}
                    className="h-10 w-10 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground shrink-0 transition-colors"
                  >
                    <Smile className="h-5 w-5" />
                  </button>
                  {showEmoji && (
                    <EmojiPicker
                      onSelect={handleEmojiSelect}
                      onClose={() => setShowEmoji(false)}
                    />
                  )}
                </div>

                {/* Media upload */}
                <MediaUploadMenu
                  onMediaUploaded={(url, type, fileName) => handleSendMedia(url, type, fileName)}
                  disabled={sending}
                />

                {/* Text input */}
                <div className="flex-1 min-w-0">
                  <input
                    ref={inputRef}
                    value={messageInput}
                    onChange={e => setMessageInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setShowEmoji(false)}
                    placeholder="Mensagem"
                    className="w-full h-10 px-4 text-sm bg-muted rounded-full border-0 outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                    disabled={sending}
                  />
                </div>

                {/* Send or Audio */}
                {messageInput.trim() ? (
                  <button
                    onClick={handleSendMessage}
                    disabled={sending}
                    className="h-10 w-10 rounded-full bg-primary hover:bg-primary/90 flex items-center justify-center text-primary-foreground shrink-0 transition-colors disabled:opacity-50"
                  >
                    {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5 ml-0.5" strokeWidth={1.5} />}
                  </button>
                ) : (
                  <AudioRecorder
                    onSend={(url) => handleSendMedia(url, "audio")}
                    disabled={sending}
                  />
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-muted/20">
            <div className="h-20 w-20 rounded-full bg-muted/50 flex items-center justify-center mb-4">
              <MessageSquare className="h-10 w-10 text-muted-foreground/30" />
            </div>
            <p className="text-lg font-medium text-muted-foreground">PetCommand CRM</p>
            <p className="text-sm text-muted-foreground/60 mt-1">Selecione uma conversa para começar</p>
          </div>
        )}
      </div>

      {/* ─── Right - CRM Panel ────────────────────────────── */}
      <CRMSidebarPanel
        clienteId={clienteId}
        telefone={selectedConversa?.contato_telefone}
      />
    </div>
  );
}
