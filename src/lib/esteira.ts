import { supabase } from "@/integrations/supabase/client";

const BANHO_TOSA_KEYWORDS = ["banho", "tosa", "hidratação", "hidratacao", "estética", "estetica", "grooming", "pelo"];

function isBanhoTosaService(tipoServico: string): boolean {
  const lower = tipoServico.toLowerCase();
  return BANHO_TOSA_KEYWORDS.some(kw => lower.includes(kw));
}

/**
 * After a check-in for banho/tosa services, auto-insert into esteira_banho
 * if the feature is enabled for the empresa.
 */
export async function addToEsteiraIfApplicable(params: {
  empresaId: string;
  agendamentoId: string;
  tipoServico: string;
}) {
  if (!isBanhoTosaService(params.tipoServico)) return;

  // Check if esteira is enabled
  const { data: empresa } = await supabase
    .from("empresas")
    .select("esteira_banho_ativa")
    .eq("id", params.empresaId)
    .single();

  if (!empresa?.esteira_banho_ativa) return;

  // Check if already in esteira
  const { data: existing } = await supabase
    .from("esteira_banho")
    .select("id")
    .eq("agendamento_id", params.agendamentoId)
    .maybeSingle();

  if (existing) return;

  await supabase.from("esteira_banho").insert({
    empresa_id: params.empresaId,
    agendamento_id: params.agendamentoId,
    status: "aguardando",
  } as any);
}

/**
 * Remove an agendamento from esteira_banho when it's checked out or cancelled.
 * Only removes entries that are not yet "finalizado".
 */
export async function removeFromEsteira(agendamentoId: string) {
  await supabase
    .from("esteira_banho")
    .delete()
    .eq("agendamento_id", agendamentoId)
    .neq("status", "finalizado");
}
