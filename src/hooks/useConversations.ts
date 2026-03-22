import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";

export type ConversaWithRelations = {
  id: string;
  empresa_id: string;
  cliente_id: string | null;
  atendente_id: string | null;
  contato_nome: string;
  contato_telefone: string;
  status: string;
  ultima_mensagem_at: string | null;
  unread_count: number;
  last_message_preview: string | null;
  is_archived: boolean;
  is_favorited: boolean;
  created_at: string;
  updated_at: string;
  clientes: { id: string; nome: string; telefone: string | null; whatsapp: string | null } | null;
  atendente: { id: string; nome: string } | null;
};

export function useConversations() {
  const { profile } = useAuth();
  const empresaId = profile?.empresa_id;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["conversas", empresaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversas")
        .select("*, clientes:cliente_id(id, nome, telefone, whatsapp), atendente:atendente_id(id, nome)")
        .order("ultima_mensagem_at", { ascending: false });
      if (error) throw error;
      return data as unknown as ConversaWithRelations[];
    },
    enabled: !!empresaId,
  });

  useEffect(() => {
    if (!empresaId) return;
    const channel = supabase
      .channel("conversas-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "conversas" }, () => {
        queryClient.invalidateQueries({ queryKey: ["conversas", empresaId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [empresaId, queryClient]);

  return query;
}

export function useMessages(conversaId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["mensagens", conversaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mensagens")
        .select("*")
        .eq("conversa_id", conversaId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!conversaId,
  });

  useEffect(() => {
    if (!conversaId) return;
    const channel = supabase
      .channel(`messages-${conversaId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "mensagens", filter: `conversa_id=eq.${conversaId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["mensagens", conversaId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversaId, queryClient]);

  return query;
}
