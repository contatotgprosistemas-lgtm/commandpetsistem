import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Database } from "@/integrations/supabase/types";

export type ComercialStage = Database["public"]["Tables"]["comercial_pipeline_stages"]["Row"];
export type ComercialDeal = Database["public"]["Tables"]["comercial_deals"]["Row"];
export type ComercialDealInsert = Omit<
  Database["public"]["Tables"]["comercial_deals"]["Insert"],
  "empresa_id"
>;

export function useComercialPipeline() {
  const { profile } = useAuth();
  const empresaId = profile?.empresa_id;
  const qc = useQueryClient();

  const stagesQ = useQuery({
    queryKey: ["comercial_stages", empresaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comercial_pipeline_stages")
        .select("*")
        .order("posicao", { ascending: true });
      if (error) throw error;
      return data as ComercialStage[];
    },
    enabled: !!empresaId,
  });

  const dealsQ = useQuery({
    queryKey: ["comercial_deals", empresaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comercial_deals")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ComercialDeal[];
    },
    enabled: !!empresaId,
  });

  const moveDeal = useMutation({
    mutationFn: async ({ dealId, newStageId }: { dealId: string; newStageId: string }) => {
      const { error } = await supabase
        .from("comercial_deals")
        .update({ stage_id: newStageId })
        .eq("id", dealId);
      if (error) throw error;
    },
    onMutate: async ({ dealId, newStageId }) => {
      await qc.cancelQueries({ queryKey: ["comercial_deals", empresaId] });
      const prev = qc.getQueryData<ComercialDeal[]>(["comercial_deals", empresaId]);
      qc.setQueryData<ComercialDeal[]>(["comercial_deals", empresaId], (old) =>
        (old ?? []).map((d) => (d.id === dealId ? { ...d, stage_id: newStageId } : d)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["comercial_deals", empresaId], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["comercial_deals", empresaId] }),
  });

  const createDeal = useMutation({
    mutationFn: async (input: ComercialDealInsert) => {
      if (!empresaId) throw new Error("Empresa não encontrada");
      const { data, error } = await supabase
        .from("comercial_deals")
        .insert({ ...input, empresa_id: empresaId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["comercial_deals", empresaId] }),
  });

  return {
    stages: stagesQ.data ?? [],
    deals: dealsQ.data ?? [],
    loading: stagesQ.isLoading || dealsQ.isLoading,
    moveDeal: (dealId: string, newStageId: string) => moveDeal.mutateAsync({ dealId, newStageId }),
    createDeal: (i: ComercialDealInsert) => createDeal.mutateAsync(i),
  };
}