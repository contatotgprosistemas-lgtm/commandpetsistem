import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AgendamentoExtraFlags {
  hasBanho: boolean;
  hasTaxiPet: boolean;
}

const BANHO_KEYWORDS = ["banho", "tosa", "grooming", "estética", "estetica"];
const TAXI_KEYWORDS = ["taxi", "táxi", "transporte", "leva", "busca", "translado"];

function detect(desc: string): { banho: boolean; taxi: boolean } {
  const t = (desc || "").toLowerCase();
  return {
    banho: BANHO_KEYWORDS.some((k) => t.includes(k)),
    taxi: TAXI_KEYWORDS.some((k) => t.includes(k)),
  };
}

/**
 * Para uma lista de agendamentos (com cliente_id, pet?.nome, tipo_servico, empresa_id),
 * detecta se possuem serviços extras de banho ou taxipet vinculados na fatura.
 * Retorna um Map por agendamento.id.
 */
export function useAgendamentoExtras(
  agendamentos: Array<{
    id: string;
    cliente_id: string;
    empresa_id?: string;
    tipo_servico: string;
    pet?: { nome?: string | null } | null;
  }>
) {
  const [flags, setFlags] = useState<Record<string, AgendamentoExtraFlags>>({});

  // Stable key to re-trigger when set of ids changes
  const idsKey = agendamentos.map((a) => a.id).sort().join(",");

  useEffect(() => {
    let cancelled = false;
    if (agendamentos.length === 0) {
      setFlags({});
      return;
    }

    (async () => {
      const clienteIds = [...new Set(agendamentos.map((a) => a.cliente_id).filter(Boolean))];
      if (clienteIds.length === 0) return;

      const { data: faturas } = await supabase
        .from("contas_receber")
        .select("id, descricao, cliente_id")
        .in("cliente_id", clienteIds)
        .in("status", ["pendente", "pago"]);

      if (cancelled || !faturas || faturas.length === 0) return;

      const faturaIds = faturas.map((f: any) => f.id);
      const { data: itens } = await supabase
        .from("contas_receber_itens" as any)
        .select("conta_receber_id, descricao, tipo")
        .in("conta_receber_id", faturaIds)
        .in("tipo", ["extra", "cortesia"]);

      if (cancelled) return;

      // Build map: faturaId -> {banho, taxi}
      const faturaFlags: Record<string, { banho: boolean; taxi: boolean }> = {};
      for (const it of (itens || []) as any[]) {
        const cur = faturaFlags[it.conta_receber_id] || { banho: false, taxi: false };
        const d = detect(it.descricao);
        faturaFlags[it.conta_receber_id] = { banho: cur.banho || d.banho, taxi: cur.taxi || d.taxi };
      }

      // Match each agendamento to its fatura by cliente+pet+tipo_servico
      const result: Record<string, AgendamentoExtraFlags> = {};
      for (const ag of agendamentos) {
        const petName = ag.pet?.nome || "";
        if (!petName) continue;
        const tipoFrag = (ag.tipo_servico || "").toLowerCase().substring(0, 10);
        const fatura = (faturas as any[]).find(
          (f) =>
            f.cliente_id === ag.cliente_id &&
            (f.descricao || "").includes(petName) &&
            (f.descricao || "").toLowerCase().includes(tipoFrag)
        );
        if (!fatura) continue;
        const f = faturaFlags[fatura.id];
        if (!f) continue;
        result[ag.id] = { hasBanho: f.banho, hasTaxiPet: f.taxi };
      }

      setFlags(result);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  return flags;
}
