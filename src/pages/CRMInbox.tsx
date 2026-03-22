import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useConversations } from "@/hooks/useConversations";
import { ConversationList } from "@/components/chat/ConversationList";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { CRMPanel } from "@/components/chat/CRMPanel";

export default function CRMInbox() {
  const { profile } = useAuth();
  const { data: conversas, isLoading } = useConversations();
  const [selectedConversaId, setSelectedConversaId] = useState<string | null>(null);

  useEffect(() => {
    if (conversas?.length && !selectedConversaId) {
      setSelectedConversaId(conversas[0].id);
    }
  }, [conversas, selectedConversaId]);

  const selectedConversa = conversas?.find(c => c.id === selectedConversaId) ?? null;
  const clienteId = selectedConversa?.cliente_id || null;

  return (
    <div className="flex h-screen">
      <ConversationList
        conversas={conversas}
        selectedId={selectedConversaId}
        onSelect={setSelectedConversaId}
        profileId={profile?.id}
        isLoading={isLoading}
      />
      <ChatWindow conversa={selectedConversa} />
      <CRMPanel clienteId={clienteId} telefone={selectedConversa?.contato_telefone} />
    </div>
  );
}
