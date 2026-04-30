import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EVOLUTION_URL = Deno.env.get("EVOLUTION_API_URL") ?? "";
const EVOLUTION_KEY = Deno.env.get("EVOLUTION_API_KEY") ?? "";

function normalizeWhatsappNumber(raw?: string | null) {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (!digits) return { primary: "", variants: [] as string[] };
  const primary = digits.startsWith("55")
    ? digits
    : digits.length >= 10 && digits.length <= 11
      ? `55${digits}`
      : digits;
  const local = primary.startsWith("55") ? primary.slice(2) : primary;
  const variants = Array.from(new Set([primary, local, digits]));
  return { primary, variants };
}

function formatDuracao(seg: number): string {
  if (!seg || seg < 0) return "";
  const h = Math.floor(seg / 3600);
  const m = Math.floor((seg % 3600) / 60);
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if ((claimsError || !claimsData?.claims?.sub) && token !== Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const { empresa_id, esteira_id, agendamento_id, cliente, pet, servico, duracao_segundos } = body as {
      empresa_id: string;
      esteira_id?: string | null;
      agendamento_id?: string | null;
      cliente: { id: string; nome: string; whatsapp?: string | null; telefone?: string | null };
      pet: { nome: string };
      servico: string;
      duracao_segundos?: number | null;
    };

    if (!empresa_id || !cliente?.id || !pet?.nome) {
      return new Response(JSON.stringify({ error: "empresa_id, cliente.id e pet.nome são obrigatórios" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Already sent for this esteira entry?
    if (esteira_id) {
      const { data: existsLog } = await supabase
        .from("esteira_notification_log")
        .select("id").eq("esteira_id", esteira_id).eq("status", "enviado").limit(1);
      if (existsLog && existsLog.length > 0) {
        return new Response(JSON.stringify({ skipped: "already_sent" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    const { data: cfg } = await supabase
      .from("esteira_notification_config")
      .select("enabled, mensagem")
      .eq("empresa_id", empresa_id)
      .maybeSingle();
    if (cfg && cfg.enabled === false) {
      return new Response(JSON.stringify({ skipped: "disabled" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { primary: numero, variants: numeroVariants } = normalizeWhatsappNumber(cliente.whatsapp ?? cliente.telefone ?? "");
    if (!numero) {
      await supabase.from("esteira_notification_log").insert({
        empresa_id, cliente_id: cliente.id, esteira_id: esteira_id ?? null, agendamento_id: agendamento_id ?? null,
        status: "falha", erro: "Cliente sem WhatsApp",
      });
      return new Response(JSON.stringify({ skipped: "no_whatsapp" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: canais } = await supabase
      .from("crm_canais")
      .select("id, identificador, status")
      .eq("empresa_id", empresa_id).eq("tipo", "whatsapp").eq("ativo", true)
      .order("updated_at", { ascending: false });
    const canal = (canais ?? []).find((c: any) => c.status === "conectado") ?? (canais ?? [])[0];
    if (!canal?.identificador) {
      return new Response(JSON.stringify({ skipped: "no_channel" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!EVOLUTION_URL || !EVOLUTION_KEY) {
      return new Response(JSON.stringify({ skipped: "no_evolution_config" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const template = (cfg?.mensagem ?? "🐾 Olá {primeiro_nome}! O *{servico}* do(a) *{pet}* foi finalizado! Pode vir buscar. 💙") as string;
    const conteudo = template
      .replace(/\{nome\}/g, cliente.nome ?? "")
      .replace(/\{primeiro_nome\}/g, (cliente.nome ?? "").split(" ")[0])
      .replace(/\{pet\}/g, pet.nome)
      .replace(/\{servico\}/g, servico ?? "serviço")
      .replace(/\{duracao\}/g, formatDuracao(duracao_segundos ?? 0));

    const evoRes = await fetch(`${EVOLUTION_URL.replace(/\/$/, "")}/message/sendText/${canal.identificador}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: EVOLUTION_KEY },
      body: JSON.stringify({ number: numero, text: conteudo }),
    });
    if (!evoRes.ok) {
      const txt = await evoRes.text();
      await supabase.from("esteira_notification_log").insert({
        empresa_id, cliente_id: cliente.id, esteira_id: esteira_id ?? null, agendamento_id: agendamento_id ?? null,
        status: "falha", erro: `Evolution ${evoRes.status}: ${txt.slice(0, 300)}`,
      });
      return new Response(JSON.stringify({ error: "evolution_failed" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const evoData = await evoRes.json().catch(() => ({}));
    const externalId = evoData?.key?.id ?? evoData?.messageId ?? null;
    const now = new Date().toISOString();

    let { data: contato } = await supabase
      .from("crm_contatos").select("id")
      .eq("empresa_id", empresa_id)
      .or(numeroVariants.map((value) => `whatsapp.eq.${value},telefone.eq.${value}`).join(","))
      .limit(1).maybeSingle();
    if (!contato) {
      const { data: novo } = await supabase
        .from("crm_contatos")
        .insert({ empresa_id, nome: cliente.nome, whatsapp: numero, telefone: numero, origem: "esteira" })
        .select("id").single();
      contato = novo;
    }

    let { data: conversa } = await supabase
      .from("crm_conversas").select("id")
      .eq("empresa_id", empresa_id).eq("contato_id", contato!.id).eq("canal_id", canal.id)
      .order("updated_at", { ascending: false }).limit(1).maybeSingle();
    if (!conversa) {
      const { data: nova } = await supabase
        .from("crm_conversas")
        .insert({ empresa_id, contato_id: contato!.id, canal_id: canal.id, status: "aberta", ultima_mensagem: conteudo, ultima_mensagem_em: now })
        .select("id").single();
      conversa = nova;
    }

    await supabase.from("crm_mensagens").insert({
      empresa_id, conversa_id: conversa!.id, tipo: "texto", direcao: "saida",
      conteudo, status: "enviado", remetente_nome: "🐾 Esteira de Banho",
      identificador_externo: externalId, enviada_em: now,
    });
    await supabase.from("crm_conversas").update({
      ultima_mensagem: conteudo, ultima_mensagem_em: now,
    }).eq("id", conversa!.id);

    await supabase.from("esteira_notification_log").insert({
      empresa_id, cliente_id: cliente.id, esteira_id: esteira_id ?? null, agendamento_id: agendamento_id ?? null,
      conversa_id: conversa!.id, status: "enviado",
    });

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("notificar-esteira-whatsapp error", err);
    return new Response(JSON.stringify({ error: String((err as Error).message ?? err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});