import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useConversations } from "@/hooks/useConversations";
import { ConversationList } from "@/components/chat/ConversationList";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { CRMPanel } from "@/components/chat/CRMPanel";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

export default function CRMInbox() {
  const { profile } = useAuth();
  const { data: conversas, isLoading } = useConversations();
  const [selectedConversaId, setSelectedConversaId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [showCRM, setShowCRM] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    const phone = searchParams.get("phone");
    if (phone && conversas?.length) {
      const match = conversas.find(c => c.contato_telefone === phone);
      if (match) {
        setSelectedConversaId(match.id);
        setSearchParams({}, { replace: true });
        return;
      }
    }
    if (conversas?.length && !selectedConversaId) {
      setSelectedConversaId(conversas[0].id);
    }
  }, [conversas, selectedConversaId, searchParams]);

  const selectedConversa = conversas?.find(c => c.id === selectedConversaId) ?? null;
  const clienteId = selectedConversa?.cliente_id || null;

  const crmPanel = <CRMPanel clienteId={clienteId} telefone={selectedConversa?.contato_telefone} />;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] relative overflow-hidden">
      <ConversationList
        conversas={conversas}
        selectedId={selectedConversaId}
        onSelect={setSelectedConversaId}
        profileId={profile?.id}
        isLoading={isLoading}
      />
      <ChatWindow conversa={selectedConversa} onToggleCRM={() => setShowCRM(v => !v)} showCRM={showCRM} />
      {isMobile ? (
        <Sheet open={showCRM} onOpenChange={setShowCRM}>
          <SheetContent side="right" className="w-80 p-0">
            <SheetTitle className="sr-only">Detalhes do contato</SheetTitle>
            {crmPanel}
          </SheetContent>
        </Sheet>
      ) : (
        showCRM && crmPanel
      )}
    </div>
  );
}
