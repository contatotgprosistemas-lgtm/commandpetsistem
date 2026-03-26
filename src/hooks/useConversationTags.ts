import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface ConversationTag {
  id: string;
  empresa_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface ConversaTagLink {
  id: string;
  conversa_id: string;
  tag_id: string;
  empresa_id: string;
}

export function useConversationTags() {
  const { profile } = useAuth();
  const empresaId = profile?.empresa_id;

  return useQuery({
    queryKey: ["conversation_tags", empresaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversation_tags" as any)
        .select("*")
        .order("name");
      if (error) throw error;
      return data as unknown as ConversationTag[];
    },
    enabled: !!empresaId,
  });
}

export function useConversaTags() {
  const { profile } = useAuth();
  const empresaId = profile?.empresa_id;

  return useQuery({
    queryKey: ["conversa_tags", empresaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversa_tags" as any)
        .select("*, tag:tag_id(id, name, color)");
      if (error) throw error;
      return data as unknown as (ConversaTagLink & { tag: ConversationTag })[];
    },
    enabled: !!empresaId,
  });
}

export function useTagMutations() {
  const { profile } = useAuth();
  const empresaId = profile?.empresa_id;
  const queryClient = useQueryClient();

  const createTag = useMutation({
    mutationFn: async ({ name, color }: { name: string; color: string }) => {
      const { error } = await supabase
        .from("conversation_tags" as any)
        .insert({ empresa_id: empresaId, name, color });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["conversation_tags"] }),
  });

  const deleteTag = useMutation({
    mutationFn: async (tagId: string) => {
      const { error } = await supabase
        .from("conversation_tags" as any)
        .delete()
        .eq("id", tagId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversation_tags"] });
      queryClient.invalidateQueries({ queryKey: ["conversa_tags"] });
    },
  });

  const assignTag = useMutation({
    mutationFn: async ({ conversaId, tagId }: { conversaId: string; tagId: string }) => {
      const { error } = await supabase
        .from("conversa_tags" as any)
        .insert({ conversa_id: conversaId, tag_id: tagId, empresa_id: empresaId });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["conversa_tags"] }),
  });

  const removeTag = useMutation({
    mutationFn: async ({ conversaId, tagId }: { conversaId: string; tagId: string }) => {
      const { error } = await supabase
        .from("conversa_tags" as any)
        .delete()
        .eq("conversa_id", conversaId)
        .eq("tag_id", tagId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["conversa_tags"] }),
  });

  return { createTag, deleteTag, assignTag, removeTag };
}
