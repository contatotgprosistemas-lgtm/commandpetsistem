import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ChatStatusTag } from "@/components/ChatStatusTag";
import { CRMSidebarPanel } from "@/components/CRMSidebarPanel";
import { Search, Send, Paperclip, Smile, Phone, MoreVertical, CheckCheck, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";

export default function CRMInbox() {
  const { profile } = useAuth();
  const empresaId = profile?.empresa_id;
  const queryClient = useQueryClient();
  const [selectedConversaId, setSelectedConversaId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens]);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedConversa || !empresaId || sending) return;
    const text = messageInput.trim();
    setMessageInput("");
    setSending(true);

    try {
      // 1. Send via Evolution API (WhatsApp)
      const phone = selectedConversa.contato_telefone.replace(/\D/g, "");
      const { data: evoRes, error: evoError } = await supabase.functions.invoke("evolution-api", {
        body: { action: "send_message", number: phone, text },
      });

      if (evoError) {
        console.warn("Evolution API send failed, saving locally only:", evoError);
      }

      // 2. Save message to DB regardless
      const { error: dbError } = await supabase.from("mensagens").insert({
        conversa_id: selectedConversaId!,
        empresa_id: empresaId,
        conteudo: text,
        remetente: "agente",
        tipo: "texto",
      });
      if (dbError) throw dbError;

      // 3. Update conversation timestamp
      await supabase
        .from("conversas")
        .update({ ultima_mensagem_at: new Date().toISOString() })
        .eq("id", selectedConversaId!);

      // 4. Refresh queries
      queryClient.invalidateQueries({ queryKey: ["mensagens", selectedConversaId] });
      queryClient.invalidateQueries({ queryKey: ["conversas", empresaId] });
    } catch (err: any) {
      toast({ title: "Erro ao enviar mensagem", description: err.message, variant: "destructive" });
      setMessageInput(text); // restore input on error
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

  return (
    <div className="flex h-screen">
      {/* Left - Conversation List */}
      <div className="w-80 border-r border-border flex flex-col bg-card shrink-0">
        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar conversas..."
              className="w-full h-9 pl-9 pr-3 text-sm bg-muted rounded-md border-0 outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {!filteredConversas?.length ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma conversa</p>
          ) : (
            filteredConversas.map(conv => (
              <button
                key={conv.id}
                onClick={() => setSelectedConversaId(conv.id)}
                className={`w-full p-3 flex items-start gap-3 text-left transition-colors border-b border-border/50 ${
                  selectedConversaId === conv.id ? "bg-primary/5" : "hover:bg-muted/50"
                }`}
              >
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary shrink-0">
                  {getInitials(conv.contato_nome)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground truncate">{conv.contato_nome}</span>
                    {conv.ultima_mensagem_at && (
                      <span className="font-mono-tabular text-xs text-muted-foreground">
                        {formatTime(conv.ultima_mensagem_at)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{conv.contato_telefone}</p>
                  <div className="mt-1">
                    <ChatStatusTag status={conv.status as any} />
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Center - Chat */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedConversa ? (
          <>
            <div className="h-14 px-4 flex items-center justify-between border-b border-border bg-card">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                  {getInitials(selectedConversa.contato_nome)}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{selectedConversa.contato_nome}</p>
                  <p className="font-mono-tabular text-xs text-muted-foreground">{selectedConversa.contato_telefone}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button className="h-9 w-9 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground">
                  <Phone className="h-4 w-4" strokeWidth={1.5} />
                </button>
                <button className="h-9 w-9 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground">
                  <MoreVertical className="h-4 w-4" strokeWidth={1.5} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-background">
              <div className="max-w-3xl mx-auto space-y-3">
                {!mensagens?.length ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhuma mensagem ainda</p>
                ) : (
                  mensagens.map(msg => (
                    <div key={msg.id} className={`flex ${msg.remetente === "agente" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[70%] px-3 py-2 rounded-lg text-sm ${
                        msg.remetente === "agente"
                          ? "bg-primary text-primary-foreground"
                          : "bg-card text-foreground shadow-card"
                      }`}>
                        <p>{msg.conteudo}</p>
                        <div className={`flex items-center gap-1 justify-end mt-1 ${
                          msg.remetente === "agente" ? "text-primary-foreground/70" : "text-muted-foreground"
                        }`}>
                          <span className="font-mono-tabular text-[10px]">{formatTime(msg.created_at)}</span>
                          {msg.remetente === "agente" && <CheckCheck className="h-3 w-3" />}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            <div className="p-3 border-t border-border bg-card">
              <div className="max-w-3xl mx-auto flex items-center gap-2">
                <button className="h-9 w-9 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                  <Paperclip className="h-4 w-4" strokeWidth={1.5} />
                </button>
                <button className="h-9 w-9 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                  <Smile className="h-4 w-4" strokeWidth={1.5} />
                </button>
                <input
                  value={messageInput}
                  onChange={e => setMessageInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Digite uma mensagem..."
                  className="flex-1 h-9 px-3 text-sm bg-muted rounded-md border-0 outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                  disabled={sending}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={sending || !messageInput.trim()}
                  className="h-9 w-9 rounded-md bg-primary hover:bg-primary/90 flex items-center justify-center text-primary-foreground shrink-0 transition-colors disabled:opacity-50"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" strokeWidth={1.5} />}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Selecione uma conversa</p>
          </div>
        )}
      </div>

      {/* Right - CRM Panel */}
      <CRMSidebarPanel
        clienteId={clienteId}
        telefone={selectedConversa?.contato_telefone}
      />
    </div>
  );
}
