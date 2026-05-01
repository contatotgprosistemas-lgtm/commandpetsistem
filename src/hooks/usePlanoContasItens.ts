import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PlanoContasItem = { nome: string; tipo: "receita" | "despesa" };

/**
 * Carrega itens ativos do plano de contas da empresa.
 * Filtre por tipo ("receita" ou "despesa") quando precisar.
 */
export function usePlanoContasItens(empresaId: string | undefined, enabled: boolean = true) {
  const [items, setItems] = useState<PlanoContasItem[]>([]);

  useEffect(() => {
    if (!enabled || !empresaId) return;
    supabase
      .from("plano_contas_items")
      .select("nome, ativo, plano_contas_categorias!inner(tipo, empresa_id)")
      .eq("plano_contas_categorias.empresa_id", empresaId)
      .eq("ativo", true)
      .order("nome")
      .then(({ data }) => {
        if (!data) return;
        setItems(
          (data as any[]).map((d) => ({
            nome: d.nome,
            tipo: d.plano_contas_categorias?.tipo,
          })),
        );
      });
  }, [empresaId, enabled]);

  return items;
}