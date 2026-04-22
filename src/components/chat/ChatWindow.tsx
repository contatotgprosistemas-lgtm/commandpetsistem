import { useState, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useMessages } from "@/hooks/useConversations";
import { whatsappService } from "@/services/whatsapp";
import { ChatBubble } from "@/components/chat/ChatBubble";
import { DateSeparator } from "@/components/chat/DateSeparator";
import { AudioRecorder } from "@/components/chat/AudioRecorder";
import { MediaUploadMenu } from "@/components/chat/MediaUploadMenu";
import { EmojiPicker } from "@/components/chat/EmojiPicker";
import { QuickRepliesMenu } from "@/components/chat/QuickRepliesMenu";
import { ConversationActions } from "@/components/chat/ConversationActions";
import { ConversationTagManager } from "@/components/chat/ConversationTagManager";
import { ChatStatusTag } from "@/components/ChatStatusTag";
import { useConversaTags } from "@/hooks/useConversationTags";
import { Skeleton } from "@/components/ui/skeleton";
import { Send, Smile, Phone, Loader2, MessageSquare, PanelRightClose, PanelRightOpen } from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import type { ConversaWithRelations } from "@/hooks/useConversations";

interface ChatWindowProps {
  conversa: ConversaWithRelations | null;
  onToggleCRM?: () => void;
  showCRM?: boolean;
}

export function ChatWindow({ conversa, onToggleCRM, showCRM }: ChatWindowProps) {
  const { profile } = useAuth();
  const empresaId = profile?.empresa_id;
  const queryClient = useQueryClient();
  const [messageInput, setMessageInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: mensagens, isLoading: loadingMessages } = useMessages(conversa?.id ?? null);
  const { data: allConversaTags } = useConversaTags();
  const currentTags = allConversaTags?.filter(ct => ct.conversa_id === conversa?.id) ?? [];

  // Reset unread count when conversation is opened
  useEffect(() => {
    if (conversa?.id && (conversa.unread_count ?? 0) > 0) {
      supabase
        .from("conversas")
        .update({ unread_count: 0 } as any)
        .eq("id", conversa.id)
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ["conversas", empresaId] });
        });
    }
  }, [conversa?.id, empresaId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens]);

  const formatTime = (date: string) => {
    try { return format(new Date(date), "HH:mm"); } catch { return ""; }
  };

  const getMessagesWithSeparators = () => {
    if (!mensagens?.length) return [];
    const items: { type: "separator" | "message"; date?: string; message?: any }[] = [];
    let lastDate = "";

    for (const msg of mensagens) {
      const msgDate = format(new Date(msg.created_at), "yyyy-MM-dd");
      if (msgDate !== lastDate) {
        items.push({ type: "separator", date: msg.created_at });
        lastDate = msgDate;
      }
      items.push({ type: "message", message: msg });
    }
    return items;
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !conversa || !empresaId || sending) return;
    const text = messageInput.trim();
    setMessageInput("");
    setSending(true);
    setShowEmoji(false);

    try {
      const prefix = profile?.nome ? `*${profile.nome}:*\n` : "";
      const textWithSignature = prefix + text;

      const phone = conversa.contato_telefone.replace(/\D/g, "");
      if (phone.length >= 10) {
        await whatsappService.sendMessage({ phone, content: textWithSignature }).catch(() => {});
      }

      await supabase.from("mensagens").insert({
        conversa_id: conversa.id, empresa_id: empresaId, conteudo: textWithSignature, remetente: "agente", tipo: "texto",
      });

      const updates: Record<string, unknown> = {
        ultima_mensagem_at: new Date().toISOString(),
      };
      if (!conversa.atendente_id && profile?.id) {
        updates.atendente_id = profile.id;
        updates.status = "em_atendimento";
      }
      await supabase.from("conversas").update(updates as any).eq("id", conversa.id);

      queryClient.invalidateQueries({ queryKey: ["mensagens", conversa.id] });
      queryClient.invalidateQueries({ queryKey: ["conversas", empresaId] });
    } catch (err: any) {
      toast({ title: "Erro ao enviar", description: err.message, variant: "destructive" });
      setMessageInput(text);
    } finally {
      setSending(false);
    }
  };

  const handleSendMedia = async (url: string, type: "image" | "document" | "audio", fileName?: string) => {
    if (!conversa || !empresaId) return;
    setSending(true);

    try {
      const phone = conversa.contato_telefone.replace(/\D/g, "");
      if (phone.length >= 10) {
        await whatsappService.sendMessage({ phone, content: url, messageType: type, mediaUrl: url, fileName }).catch(() => {});
      }

      const tipoDb = type === "image" ? "imagem" : type === "audio" ? "audio" : "documento";
      await supabase.from("mensagens").insert({
        conversa_id: conversa.id, empresa_id: empresaId, conteudo: url, remetente: "agente", tipo: tipoDb,
      });

      await supabase.from("conversas").update({
        ultima_mensagem_at: new Date().toISOString(),
      } as any).eq("id", conversa.id);

      queryClient.invalidateQueries({ queryKey: ["mensagens", conversa.id] });
      queryClient.invalidateQueries({ queryKey: ["conversas", empresaId] });
    } catch (err: any) {
      toast({ title: "Erro ao enviar mídia", description: err.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!conversa) return;
    await (supabase as any).from("conversas").update({ is_favorited: !conversa.is_favorited }).eq("id", conversa.id);
    queryClient.invalidateQueries({ queryKey: ["conversas", empresaId] });
  };

  const handleArchive = async () => {
    if (!conversa) return;
    await (supabase as any).from("conversas").update({ is_archived: !conversa.is_archived }).eq("id", conversa.id);
    queryClient.invalidateQueries({ queryKey: ["conversas", empresaId] });
    toast({ title: conversa.is_archived ? "Conversa desarquivada" : "Conversa arquivada" });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessageInput(prev => prev + emoji);
    inputRef.current?.focus();
  };

  if (!conversa) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-muted/20">
        <div className="h-20 w-20 rounded-full bg-muted/50 flex items-center justify-center mb-4">
          <MessageSquare className="h-10 w-10 text-muted-foreground/30" />
        </div>
        <p className="text-lg font-medium text-muted-foreground">CRM WhatsApp</p>
        <p className="text-sm text-muted-foreground/60 mt-1">Selecione uma conversa para começar</p>
      </div>
    );
  }

  const getInitials = (name: string) =>
    name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  const items = getMessagesWithSeparators();

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Chat header */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
            {getInitials(conversa.contato_nome)}
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{conversa.contato_nome}</p>
            <div className="flex items-center gap-2">
              <p className="font-mono text-xs text-muted-foreground">{conversa.contato_telefone}</p>
              {conversa.atendente?.nome && (
                <span className="text-[10px] text-muted-foreground/60">
                  • {conversa.atendente.id === profile?.id ? "Você" : conversa.atendente.nome}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <ChatStatusTag status={conversa.status as any} />
          <button className="h-9 w-9 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground">
            <Phone className="h-[18px] w-[18px]" strokeWidth={1.5} />
          </button>
          <ConversationTagManager conversaId={conversa.id} />
          <ConversationActions conversaId={conversa.id} currentAtendenteId={conversa.atendente_id} currentStatus={conversa.status} />
          {onToggleCRM && (
            <button
              onClick={onToggleCRM}
              className="h-9 w-9 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground transition-colors"
              title={showCRM ? "Recolher detalhes" : "Expandir detalhes"}
            >
              {showCRM ? <PanelRightClose className="h-[18px] w-[18px]" strokeWidth={1.5} /> : <PanelRightOpen className="h-[18px] w-[18px]" strokeWidth={1.5} />}
            </button>
          )}
        </div>
      </div>

      {/* Tags bar */}
      {currentTags.length > 0 && (
        <div className="px-4 py-1.5 border-b border-border bg-card flex items-center gap-1 flex-wrap">
          {currentTags.map(ct => (
            <span
              key={ct.id}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium text-white"
              style={{ backgroundColor: ct.tag?.color || '#6b7280' }}
            >
              {ct.tag?.name}
            </span>
          ))}
        </div>
      )}

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto px-4 py-3"
        style={{
          backgroundColor: "hsl(var(--chat-bg))",
          backgroundImage: "radial-gradient(circle at 25px 25px, hsl(var(--muted-foreground) / 0.08) 1px, transparent 0)",
          backgroundSize: "50px 50px",
        }}
      >
        <div className="max-w-3xl mx-auto">
          {loadingMessages ? (
            <div className="space-y-3 py-8">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}>
                  <Skeleton className={`h-12 rounded-lg ${i % 2 === 0 ? "w-48" : "w-56"}`} />
                </div>
              ))}
            </div>
          ) : !items.length ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                <MessageSquare className="h-8 w-8 text-muted-foreground/40" />
              </div>
              <p className="text-sm text-muted-foreground">Nenhuma mensagem ainda</p>
            </div>
          ) : (
            <div className="space-y-1">
              {items.map((item, idx) => {
                if (item.type === "separator") return <DateSeparator key={`sep-${idx}`} date={item.date!} />;
                const msg = item.message;
                return <ChatBubble key={msg.id} conteudo={msg.conteudo} remetente={msg.remetente} tipo={msg.tipo} created_at={msg.created_at} formatTime={formatTime} />;
              })}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="px-3 py-2 border-t border-border bg-card">
        <div className="max-w-3xl mx-auto flex items-end gap-1.5">
          <div className="relative">
            <button onClick={() => setShowEmoji(!showEmoji)} className="h-10 w-10 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground shrink-0 transition-colors">
              <Smile className="h-5 w-5" />
            </button>
            {showEmoji && <EmojiPicker onSelect={handleEmojiSelect} onClose={() => setShowEmoji(false)} />}
          </div>
          <MediaUploadMenu onMediaUploaded={(url, type, fileName) => handleSendMedia(url, type, fileName)} disabled={sending} />
          <QuickRepliesMenu onSelect={(content) => setMessageInput(content)} />
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
          {messageInput.trim() ? (
            <button onClick={handleSendMessage} disabled={sending} className="h-10 w-10 rounded-full bg-primary hover:bg-primary/90 flex items-center justify-center text-primary-foreground shrink-0 transition-colors disabled:opacity-50">
              {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5 ml-0.5" strokeWidth={1.5} />}
            </button>
          ) : (
            <AudioRecorder onSend={(url) => handleSendMedia(url, "audio")} disabled={sending} />
          )}
        </div>
      </div>
    </div>
  );
}
