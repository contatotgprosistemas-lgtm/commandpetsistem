import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Database } from "@/integrations/supabase/types";

export type ComercialContato = Database["public"]["Tables"]["comercial_contatos"]["Row"];
export type ComercialContatoInsert = Omit<
  Database["public"]["Tables"]["comercial_contatos"]["Insert"],
  "empresa_id"
>;

export function useComercialContacts() {
  const { profile } = useAuth();
  const empresaId = profile?.empresa_id;
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ["comercial_contatos", empresaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comercial_contatos")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ComercialContato[];
    },
    enabled: !!empresaId,
  });

  const create = useMutation({
    mutationFn: async (input: ComercialContatoInsert) => {
      if (!empresaId) throw new Error("Empresa não encontrada");
      const { data, error } = await supabase
        .from("comercial_contatos")
        .insert({ ...input, empresa_id: empresaId, created_by: profile?.user_id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["comercial_contatos", empresaId] }),
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<ComercialContatoInsert> }) => {
      const { data, error } = await supabase
        .from("comercial_contatos")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["comercial_contatos", empresaId] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("comercial_contatos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["comercial_contatos", empresaId] }),
  });

  return {
    contacts: list.data ?? [],
    loading: list.isLoading,
    create: (i: ComercialContatoInsert) => create.mutateAsync(i),
    update: (id: string, patch: Partial<ComercialContatoInsert>) => update.mutateAsync({ id, patch }),
    remove: (id: string) => remove.mutateAsync(id),
  };
}