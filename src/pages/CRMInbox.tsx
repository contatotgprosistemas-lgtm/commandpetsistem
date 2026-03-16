import { useState } from "react";
import { ChatStatusTag } from "@/components/ChatStatusTag";
import { Search, Send, Paperclip, Smile, Phone, MoreVertical, PawPrint, DollarSign, CheckCheck } from "lucide-react";

interface Conversation {
  id: number;
  name: string;
  phone: string;
  lastMessage: string;
  time: string;
  unread: number;
  status: "novo" | "em_atendimento" | "aguardando" | "finalizado";
  avatar: string;
}

const conversations: Conversation[] = [
  { id: 1, name: "Maria Silva", phone: "+55 11 99999-1234", lastMessage: "Oi, o Rex já está pronto?", time: "14:32", unread: 2, status: "em_atendimento", avatar: "MS" },
  { id: 2, name: "João Santos", phone: "+55 11 99999-5678", lastMessage: "Quero agendar banho pro Thor", time: "14:15", unread: 1, status: "novo", avatar: "JS" },
  { id: 3, name: "Ana Paula", phone: "+55 11 99999-9012", lastMessage: "Obrigada!", time: "13:50", unread: 0, status: "finalizado", avatar: "AP" },
  { id: 4, name: "Carlos Lima", phone: "+55 11 99999-3456", lastMessage: "Como está o Bob hoje?", time: "13:22", unread: 1, status: "aguardando", avatar: "CL" },
  { id: 5, name: "Fernanda Costa", phone: "+55 11 99999-7890", lastMessage: "Vocês tem hotel para gatos?", time: "12:45", unread: 3, status: "novo", avatar: "FC" },
];

const messages = [
  { id: 1, from: "client", text: "Oi, bom dia! O Rex já está pronto?", time: "14:28" },
  { id: 2, from: "agent", text: "Bom dia, Maria! O Rex está finalizando a tosa agora. Falta uns 15 minutinhos 🐕", time: "14:30" },
  { id: 3, from: "client", text: "Ótimo! Vou indo pra aí então", time: "14:31" },
  { id: 4, from: "agent", text: "Perfeito! Ele vai ficar lindo 😊", time: "14:32" },
  { id: 5, from: "client", text: "Oi, o Rex já está pronto?", time: "14:32" },
];

const petInfo = {
  name: "Rex",
  breed: "Golden Retriever",
  weight: "32kg",
  age: "4 anos",
  lastService: "Banho e Tosa — 15/02/2026",
  vaccines: "Em dia",
  notes: "Não gosta de secador quente",
};

export default function CRMInbox() {
  const [selectedConversation, setSelectedConversation] = useState<number>(1);
  const [messageInput, setMessageInput] = useState("");

  const selected = conversations.find(c => c.id === selectedConversation);

  return (
    <div className="flex h-screen">
      {/* Left - Conversation List */}
      <div className="w-80 border-r border-border flex flex-col bg-card shrink-0">
        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
            <input
              placeholder="Buscar conversas..."
              className="w-full h-9 pl-9 pr-3 text-sm bg-muted rounded-md border-0 outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.map(conv => (
            <button
              key={conv.id}
              onClick={() => setSelectedConversation(conv.id)}
              className={`w-full p-3 flex items-start gap-3 text-left transition-colors border-b border-border/50 ${
                selectedConversation === conv.id ? "bg-primary/5" : "hover:bg-muted/50"
              }`}
            >
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary shrink-0">
                {conv.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground truncate">{conv.name}</span>
                  <span className="font-mono-tabular text-xs text-muted-foreground">{conv.time}</span>
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{conv.lastMessage}</p>
                <div className="flex items-center justify-between mt-1">
                  <ChatStatusTag status={conv.status} />
                  {conv.unread > 0 && (
                    <span className="h-5 min-w-5 px-1.5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium">
                      {conv.unread}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Center - Chat */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat Header */}
        {selected && (
          <div className="h-14 px-4 flex items-center justify-between border-b border-border bg-card">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                {selected.avatar}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{selected.name}</p>
                <p className="font-mono-tabular text-xs text-muted-foreground">{selected.phone}</p>
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
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-background">
          <div className="max-w-3xl mx-auto space-y-3">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.from === "agent" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[70%] px-3 py-2 rounded-lg text-sm ${
                  msg.from === "agent"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-foreground shadow-card"
                }`}>
                  <p>{msg.text}</p>
                  <div className={`flex items-center gap-1 justify-end mt-1 ${msg.from === "agent" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    <span className="font-mono-tabular text-[10px]">{msg.time}</span>
                    {msg.from === "agent" && <CheckCheck className="h-3 w-3" />}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Input */}
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
              placeholder="Digite uma mensagem..."
              className="flex-1 h-9 px-3 text-sm bg-muted rounded-md border-0 outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
            />
            <button className="h-9 w-9 rounded-md bg-primary hover:bg-primary/90 flex items-center justify-center text-primary-foreground shrink-0 transition-colors">
              <Send className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>

      {/* Right - Pet Context */}
      <div className="w-72 border-l border-border bg-card p-4 space-y-4 shrink-0 hidden xl:block">
        <div className="text-center">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <PawPrint className="h-7 w-7 text-primary" strokeWidth={1.5} />
          </div>
          <h3 className="text-sm font-semibold text-foreground">{petInfo.name}</h3>
          <p className="text-xs text-muted-foreground">{petInfo.breed}</p>
        </div>

        <div className="space-y-2">
          {[
            ["Peso", petInfo.weight],
            ["Idade", petInfo.age],
            ["Vacinas", petInfo.vaccines],
            ["Último serviço", petInfo.lastService],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between text-xs py-1.5 border-b border-border/50">
              <span className="text-muted-foreground">{label}</span>
              <span className="text-foreground font-medium">{value}</span>
            </div>
          ))}
        </div>

        <div className="bg-warning/5 rounded-md p-3">
          <p className="text-xs text-warning font-medium mb-1">⚠ Observação</p>
          <p className="text-xs text-muted-foreground">{petInfo.notes}</p>
        </div>

        <button className="w-full h-9 rounded-md bg-success text-success-foreground text-sm font-medium hover:bg-success/90 transition-colors flex items-center justify-center gap-2">
          <DollarSign className="h-4 w-4" strokeWidth={1.5} />
          Cobrança Rápida
        </button>
      </div>
    </div>
  );
}
