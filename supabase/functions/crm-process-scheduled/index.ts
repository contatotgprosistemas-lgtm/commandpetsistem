import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const EVOLUTION_URL = Deno.env.get("EVOLUTION_API_URL")!;
const EVOLUTION_KEY = Deno.env.get("EVOLUTION_API_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const cronSecret = Deno.env.get("CRON_SECRET");
  if (!cronSecret) {
    return new Response(JSON.stringify({ error: "Service unavailable: CRON_SECRET not configured" }), {
      status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (req.headers.get("x-cron-secret") !== cronSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  try {
    const { data: pendentes } = await admin
      .from("crm_mensagens_agendadas")
      .select("*, conversa:crm_conversas(id, atendente_id, canal:crm_canais(identificador), contato:crm_contatos(whatsapp, telefone, nome), empresa_id)")
      .eq("status", "pendente")
      .lte("agendada_para", new Date().toISOString())
      .limit(50);

    let enviadas = 0, falhas = 0;

    for (const m of pendentes ?? []) {
      const conv: any = m.conversa;
      try {
        const numero = (conv?.contato?.whatsapp ?? conv?.contato?.telefone ?? "").replace(/\D/g, "");
        const instance = conv?.canal?.identificador;
        if (!numero || !instance) throw new Error("Sem WhatsApp ou canal");

        const conteudo = String(m.conteudo)
          .replace(/\{\{nome\}\}/g, conv?.contato?.nome ?? "")
          .replace(/\{\{primeiro_nome\}\}/g, (conv?.contato?.nome ?? "").split(" ")[0]);

        const evoRes = await fetch(`${EVOLUTION_URL.replace(/\/$/, "")}/message/sendText/${instance}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: EVOLUTION_KEY },
          body: JSON.stringify({ number: numero, text: conteudo }),
        });
        if (!evoRes.ok) throw new Error(`Evolution status ${evoRes.status}`);
        const evoData = await evoRes.json();
        const externalId = evoData?.key?.id ?? evoData?.messageId ?? null;
        const now = new Date().toISOString();

        const { error: scheduledMessageError } = await admin.from("crm_mensagens").insert({
          empresa_id: m.empresa_id,
          conversa_id: m.conversa_id,
          tipo: "texto",
          direcao: "saida",
          conteudo,
          status: "enviado",
          remetente_nome: "⏰ Agendada",
          identificador_externo: externalId,
          enviada_em: now,
        });
        if (scheduledMessageError) throw scheduledMessageError;
        await admin.from("crm_conversas").update({
          ultima_mensagem: conteudo,
          ultima_mensagem_em: now,
        }).eq("id", m.conversa_id);
        await admin.from("crm_mensagens_agendadas").update({
          status: "enviado", enviada_em: now,
        }).eq("id", m.id);
        enviadas++;
      } catch (err) {
        await admin.from("crm_mensagens_agendadas").update({
          status: "falha", erro: String(err),
        }).eq("id", m.id);
        falhas++;
      }
    }

    return new Response(JSON.stringify({ ok: true, enviadas, falhas, total: (pendentes ?? []).length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("crm-process-scheduled error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});