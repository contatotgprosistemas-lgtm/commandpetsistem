import { useState } from "react";
import { Search, MessageSquare, Inbox, UserCheck, Clock, Users, Star, Archive, Filter } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { ChatStatusTag } from "@/components/ChatStatusTag";
import { WhatsAppStatusIndicator } from "@/components/chat/WhatsAppStatusIndicator";
import { Skeleton } from "@/components/ui/skeleton";
import { useConversaTags } from "@/hooks/useConversationTags";
import type { ConversaWithRelations } from "@/hooks/useConversations";

type QueueFilter = "todas" | "nao_lidas" | "minhas" | "aguardando" | "finalizadas";

const QUEUE_TABS: { key: QueueFilter; label: string; icon: any }[] = [
  { key: "todas", label: "Todas", icon: Inbox },
  { key: "nao_lidas", label: "Não lidas", icon: MessageSquare },
  { key: "minhas", label: "Minhas", icon: UserCheck },
  { key: "aguardando", label: "Aguardando", icon: Clock },
  { key: "finalizadas", label: "Finalizadas", icon: Archive },
];

interface ConversationListProps {
  conversas: ConversaWithRelations[] | undefined;
  selectedId: string | null;
  onSelect: (id: string) => void;
  profileId: string | undefined;
  isLoading: boolean;
}

export function ConversationList({ conversas, selectedId, onSelect, profileId, isLoading }: ConversationListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [queueFilter, setQueueFilter] = useState<QueueFilter>("todas");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const { data: allConversaTags } = useConversaTags();

  const getInitials = (name: string) =>
    name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  const formatMessageTime = (date: string) => {
    const d = new Date(date);
    if (isToday(d)) return format(d, "HH:mm");
    if (isYesterday(d)) return "Ontem";
    return format(d, "dd/MM");
  };

  const filtered = conversas?.filter(c => {
    if (c.is_archived && queueFilter !== "finalizadas") return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!c.contato_nome.toLowerCase().includes(q) && !c.contato_telefone.includes(q)) return false;
    }
    if (statusFilter !== "todos" && c.status !== statusFilter) return false;
    if (queueFilter === "nao_lidas" && (c.unread_count ?? 0) === 0) return false;
    if (queueFilter === "minhas" && c.atendente_id !== profileId) return false;
    if (queueFilter === "aguardando" && c.status !== "aguardando") return false;
    if (queueFilter === "finalizadas" && c.status !== "finalizado") return false;
    return true;
  });

  const getCounts = () => ({
    todas: conversas?.filter(c => !c.is_archived).length ?? 0,
    nao_lidas: conversas?.filter(c => (c.unread_count ?? 0) > 0).length ?? 0,
    minhas: conversas?.filter(c => c.atendente_id === profileId).length ?? 0,
    aguardando: conversas?.filter(c => c.status === "aguardando").length ?? 0,
    finalizadas: conversas?.filter(c => c.status === "finalizado").length ?? 0,
  });

  const counts = getCounts();

  return (
    <div className="w-[340px] border-r border-border flex flex-col bg-card shrink-0">
      {/* Header */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">Conversas</h2>
        <WhatsAppStatusIndicator />
      </div>

      {/* Quick filter tabs */}
      <div className="px-2 pt-2 flex gap-1 flex-wrap">
        {QUEUE_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setQueueFilter(tab.key)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
              queueFilter === tab.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            }`}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
            {counts[tab.key] > 0 && (
              <span className={`ml-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold ${
                queueFilter === tab.key ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted-foreground/20 text-muted-foreground"
              }`}>
                {counts[tab.key]}
              </span>
            )}
          </button>
        ))}
      </div>


      {/* Search */}
      <div className="p-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar por nome ou telefone..."
            className="w-full h-9 pl-9 pr-3 text-sm bg-muted rounded-lg border-0 outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-1 p-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-center gap-3 px-3 py-3">
                <Skeleton className="h-12 w-12 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-40" />
                </div>
              </div>
            ))}
          </div>
        ) : !filtered?.length ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <MessageSquare className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground text-center">Nenhuma conversa encontrada</p>
          </div>
        ) : (
          filtered.map(conv => (
            <button
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className={`w-full px-3 py-3 flex items-center gap-3 text-left transition-colors hover:bg-muted/50 ${
                selectedId === conv.id ? "bg-muted" : ""
              }`}
            >
              {/* Avatar */}
              <div className="relative">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary shrink-0">
                  {getInitials(conv.contato_nome)}
                </div>
                {conv.is_favorited && (
                  <Star className="absolute -top-1 -right-1 h-3.5 w-3.5 text-warning fill-warning" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                {/* Name + time */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground truncate">{conv.contato_nome}</span>
                  {conv.ultima_mensagem_at && (
                    <span className={`font-mono text-[11px] ml-2 shrink-0 ${
                      (conv.unread_count ?? 0) > 0 ? "text-primary font-semibold" : "text-muted-foreground"
                    }`}>
                      {formatMessageTime(conv.ultima_mensagem_at)}
                    </span>
                  )}
                </div>

                {/* Preview + unread */}
                <div className="flex items-center justify-between mt-0.5">
                  <p className="text-xs text-muted-foreground truncate flex-1">
                    {conv.last_message_preview || conv.contato_telefone}
                  </p>
                  <div className="flex items-center gap-1 ml-2 shrink-0">
                    {(conv.unread_count ?? 0) > 0 && (
                      <span className="min-w-[20px] h-5 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-1.5">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                </div>

                {/* Status + atendente */}
                <div className="flex items-center gap-2 mt-0.5">
                  <ChatStatusTag status={conv.status as any} />
                  {conv.atendente?.nome && (
                    <span className="text-[10px] text-muted-foreground/60 truncate flex items-center gap-1">
                      <UserCheck className="h-3 w-3" />
                      {conv.atendente.id === profileId ? "Você" : conv.atendente.nome}
                    </span>
                  )}
                </div>
                {/* Tags */}
                {(() => {
                  const tags = allConversaTags?.filter(ct => ct.conversa_id === conv.id) ?? [];
                  if (!tags.length) return null;
                  return (
                    <div className="flex gap-0.5 mt-0.5 flex-wrap">
                      {tags.slice(0, 3).map(ct => (
                        <span
                          key={ct.id}
                          className="inline-block px-1.5 py-px rounded-full text-[9px] font-medium text-white"
                          style={{ backgroundColor: ct.tag?.color || '#6b7280' }}
                        >
                          {ct.tag?.name}
                        </span>
                      ))}
                      {tags.length > 3 && (
                        <span className="text-[9px] text-muted-foreground">+{tags.length - 3}</span>
                      )}
                    </div>
                  );
                })()}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
