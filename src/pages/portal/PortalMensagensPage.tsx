import { useEffect, useState, useRef } from "react";
import { MessageCircle, Send } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { usePortalCliente } from "@/hooks/usePortalCliente";
import { toast } from "sonner";

interface Mensagem {
  id: string;
  conteudo: string;
  remetente: string;
  created_at: string;
}

interface Conversa {
  id: string;
  contato_nome: string;
  ultima_mensagem_at: string | null;
  status: string;
}

export default function PortalMensagensPage() {
  const { cliente, loading: clienteLoading } = usePortalCliente();
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [selectedConversa, setSelectedConversa] = useState<string | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!cliente) return;
    const fetchConversas = async () => {
      const { data } = await supabase
        .from("conversas")
        .select("id, contato_nome, ultima_mensagem_at, status")
        .eq("cliente_id", cliente.id)
        .order("ultima_mensagem_at", { ascending: false });
      setConversas((data as Conversa[]) ?? []);
      setLoading(false);
    };
    fetchConversas();
  }, [cliente]);

  useEffect(() => {
    if (!selectedConversa) return;
    const fetchMensagens = async () => {
      const { data } = await supabase
        .from("mensagens")
        .select("id, conteudo, remetente, created_at")
        .eq("conversa_id", selectedConversa)
        .order("created_at", { ascending: true });
      setMensagens((data as Mensagem[]) ?? []);
    };
    fetchMensagens();

    // Poll every 10 seconds
    const interval = setInterval(fetchMensagens, 10000);
    return () => clearInterval(interval);
  }, [selectedConversa]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens]);

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedConversa || !cliente) return;
    setSending(true);
    const { error } = await supabase.from("mensagens").insert({
      conversa_id: selectedConversa,
      empresa_id: cliente.empresa_id,
      conteudo: newMessage.trim(),
      remetente: "cliente",
      tipo: "texto",
    });
    if (error) { toast.error("Erro ao enviar."); }
    else {
      setNewMessage("");
      // Refresh
      const { data } = await supabase
        .from("mensagens")
        .select("id, conteudo, remetente, created_at")
        .eq("conversa_id", selectedConversa)
        .order("created_at", { ascending: true });
      setMensagens((data as Mensagem[]) ?? []);
    }
    setSending(false);
  };

  if (clienteLoading || loading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-32" /><Skeleton className="h-64 rounded-xl" /></div>;
  }

  if (!selectedConversa) {
    return (
      <div className="space-y-4 pb-20 md:pb-0">
        <h1 className="text-xl font-bold text-foreground">Mensagens</h1>
        {conversas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <MessageCircle className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">Nenhuma conversa encontrada.</p>
          </div>
        ) : (
          conversas.map((c) => (
            <Card key={c.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedConversa(c.id)}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <MessageCircle className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{c.contato_nome}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.ultima_mensagem_at ? new Date(c.ultima_mensagem_at).toLocaleDateString("pt-BR") : ""}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] pb-20 md:pb-0">
      <div className="flex items-center gap-2 mb-3">
        <Button variant="ghost" size="sm" onClick={() => setSelectedConversa(null)}>← Voltar</Button>
        <h2 className="text-sm font-semibold text-foreground">
          {conversas.find((c) => c.id === selectedConversa)?.contato_nome}
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 bg-muted/30 rounded-lg p-3">
        {mensagens.map((m) => (
          <div key={m.id} className={cn("flex", m.remetente === "cliente" ? "justify-end" : "justify-start")}>
            <div className={cn(
              "max-w-[80%] rounded-xl px-3 py-2 text-sm",
              m.remetente === "cliente"
                ? "bg-primary text-primary-foreground"
                : "bg-card text-foreground border border-border"
            )}>
              <p>{m.conteudo}</p>
              <p className={cn("text-[10px] mt-1", m.remetente === "cliente" ? "text-primary-foreground/70" : "text-muted-foreground")}>
                {new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex gap-2 mt-3">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Digite sua mensagem..."
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
        />
        <Button onClick={handleSend} disabled={sending || !newMessage.trim()} size="icon">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
