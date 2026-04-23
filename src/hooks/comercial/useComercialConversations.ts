import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Database } from "@/integrations/supabase/types";

export type ComercialConversation = Database["public"]["Tables"]["comercial_conversations"]["Row"] & {
  contato?: Database["public"]["Tables"]["comercial_contatos"]["Row"] | null;
};
export type ComercialMessage = Database["public"]["Tables"]["comercial_messages"]["Row"];

export function useComercialConversations() {
  const { profile } = useAuth();
  const empresaId = profile?.empresa_id;
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["comercial_conversations", empresaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comercial_conversations")
        .select("*, contato:contato_id(*)")
        .order("fixada", { ascending: false })
        .order("last_message_at", { ascending: false });
      if (error) throw error;
      return data as unknown as ComercialConversation[];
    },
    enabled: !!empresaId,
  });

  useEffect(() => {
    if (!empresaId) return;
    const ch = supabase
      .channel("comercial_conversations_rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "comercial_conversations" }, () => {
        qc.invalidateQueries({ queryKey: ["comercial_conversations", empresaId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [empresaId, qc]);

  return { conversations: query.data ?? [], loading: query.isLoading };
}

export function useComercialMessages(conversationId: string | null) {
  const { profile } = useAuth();
  const empresaId = profile?.empresa_id;
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["comercial_messages", conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      const { data, error } = await supabase
        .from("comercial_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as ComercialMessage[];
    },
    enabled: !!conversationId,
  });

  useEffect(() => {
    if (!conversationId) return;
    const ch = supabase
      .channel(`comercial_msg_${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "comercial_messages", filter: `conversation_id=eq.${conversationId}` },
        () => qc.invalidateQueries({ queryKey: ["comercial_messages", conversationId] }),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [conversationId, qc]);

  const send = useMutation({
    mutationFn: async (body: string) => {
      if (!conversationId || !body.trim() || !empresaId) return;
      const { error } = await supabase.from("comercial_messages").insert({
        conversation_id: conversationId,
        empresa_id: empresaId,
        sent_by: profile?.user_id,
        direction: "me",
        body: body.trim(),
        type: "text",
        status: "sent",
      });
      if (error) throw error;
      await supabase
        .from("comercial_conversations")
        .update({ last_message_text: body.trim(), last_message_at: new Date().toISOString() })
        .eq("id", conversationId);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["comercial_messages", conversationId] }),
  });

  return {
    messages: query.data ?? [],
    loading: query.isLoading,
    send: (body: string) => send.mutateAsync(body),
  };
}

export function useCreateComercialConversation() {
  const { profile } = useAuth();
  const empresaId = profile?.empresa_id;
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: { contato_id?: string | null; canal?: string; numero_label?: string | null }) => {
      if (!empresaId) throw new Error("Empresa não encontrada");
      const { data, error } = await supabase
        .from("comercial_conversations")
        .insert({
          empresa_id: empresaId,
          contato_id: input.contato_id ?? null,
          canal: input.canal ?? "whatsapp",
          numero_label: input.numero_label ?? null,
          status: "open",
          last_message_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["comercial_conversations", empresaId] }),
  });
}