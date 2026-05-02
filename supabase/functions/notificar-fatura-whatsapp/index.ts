import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EVOLUTION_URL = Deno.env.get("EVOLUTION_API_URL") ?? "";
const EVOLUTION_KEY = Deno.env.get("EVOLUTION_API_KEY") ?? "";

function formatDateBR(dateStr: string): string {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("T")[0].split("-");
  return `${d}/${m}/${y}`;
}

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Validate caller (any authenticated user from the same empresa or service role)
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    const role = (claimsData?.claims as any)?.role;
    const isServiceRole = role === "service_role" || token === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    console.log("[auth] role=", role, "claimsErr=", claimsError?.message, "tokenMatch=", token === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"), "envLen=", (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"").length, "tokLen=", token.length);
    if (!isServiceRole && (claimsError || !claimsData?.claims?.sub)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const { empresa_id, cliente, fatura, tipo: tipoIn, mensagem_override, dias_atraso, dias_restantes, valor_multa } = body as {
      empresa_id: string;
      cliente: { id: string; nome: string; whatsapp?: string | null; telefone?: string | null };
      fatura: { id?: string | null; descricao: string; valor: number; vencimento: string };
      tipo?: "geracao" | "pre_vencimento" | "vencimento" | "atraso" | "multa_atraso";
      mensagem_override?: string;
      dias_atraso?: number;
      dias_restantes?: number;
      valor_multa?: number;
    };
    const tipo = tipoIn ?? "geracao";

    if (!empresa_id || !cliente?.id || !fatura?.descricao) {
      return new Response(JSON.stringify({ error: "empresa_id, cliente.id e fatura.descricao são obrigatórios" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Already sent for this invoice and this event type?
    if (fatura.id) {
      const { data: existsLog } = await supabase
        .from("invoice_notification_log")
        .select("id").eq("conta_receber_id", fatura.id).eq("status", "enviado").eq("tipo", tipo).limit(1);
      if (existsLog && existsLog.length > 0) {
        return new Response(JSON.stringify({ skipped: "already_sent" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Para lembretes de cobrança, só envia se a fatura ainda estiver em aberto (pendente).
    // Isso evita disparar pré-vencimento/vencimento/atraso/multa para faturas já pagas ou canceladas.
    if (fatura.id && tipo !== "geracao") {
      const { data: contaAtual } = await supabase
        .from("contas_receber")
        .select("status")
        .eq("id", fatura.id)
        .maybeSingle();
      if (!contaAtual) {
        return new Response(JSON.stringify({ skipped: "fatura_not_found" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (contaAtual.status !== "pendente") {
        return new Response(JSON.stringify({ skipped: `fatura_status_${contaAtual.status}` }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    const { data: cfg } = await supabase
      .from("invoice_notification_config")
      .select("enabled, mensagem, enabled_geracao, mensagem_geracao, enabled_pre_vencimento, mensagem_pre_vencimento, enabled_vencimento, mensagem_vencimento, enabled_atraso, mensagem_atraso, multa_atraso_enabled, multa_atraso_mensagem")
      .eq("empresa_id", empresa_id)
      .maybeSingle();
    // master switch
    if (cfg && cfg.enabled === false) {
      return new Response(JSON.stringify({ skipped: "disabled" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    // per-type switch
    const perTypeEnabled: Record<string, boolean | undefined> = {
      geracao: cfg?.enabled_geracao,
      pre_vencimento: cfg?.enabled_pre_vencimento,
      vencimento: cfg?.enabled_vencimento,
      atraso: cfg?.enabled_atraso,
      multa_atraso: cfg?.multa_atraso_enabled,
    };
    if (cfg && perTypeEnabled[tipo] === false) {
      return new Response(JSON.stringify({ skipped: "type_disabled" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { primary: numero, variants: numeroVariants } = normalizeWhatsappNumber(cliente.whatsapp ?? cliente.telefone ?? "");
    if (!numero) {
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

    const perTypeTemplate: Record<string, string | null | undefined> = {
      geracao: cfg?.mensagem_geracao ?? cfg?.mensagem,
      pre_vencimento: cfg?.mensagem_pre_vencimento,
      vencimento: cfg?.mensagem_vencimento,
      atraso: cfg?.mensagem_atraso,
      multa_atraso: cfg?.multa_atraso_mensagem,
    };
    const fallbackMulta = "Olá {primeiro_nome}! Sua fatura *{descricao}* venceu e foi gerada uma multa de *R$ {valor_multa}*. O pagamento deve ser feito junto com a fatura original. 🐾";
    const fallbackPadrao = "Olá {nome}! Sua fatura *{descricao}* no valor de *R$ {valor}* tem vencimento em *{vencimento}*.";
    const fallback = tipo === "multa_atraso" ? fallbackMulta : fallbackPadrao;
    const template = (mensagem_override ?? perTypeTemplate[tipo] ?? cfg?.mensagem ?? fallback) as string;
    const conteudo = template
      .replace(/\{nome\}/g, cliente.nome ?? "")
      .replace(/\{primeiro_nome\}/g, (cliente.nome ?? "").split(" ")[0])
      .replace(/\{descricao\}/g, fatura.descricao)
      .replace(/\{valor\}/g, Number(fatura.valor).toFixed(2).replace(".", ","))
      .replace(/\{vencimento\}/g, formatDateBR(fatura.vencimento))
      .replace(/\{dias_atraso\}/g, String(dias_atraso ?? ""))
      .replace(/\{dias_restantes\}/g, String(dias_restantes ?? ""))
      .replace(/\{valor_multa\}/g, valor_multa != null ? Number(valor_multa).toFixed(2).replace(".", ",") : "");

    const evoRes = await fetch(`${EVOLUTION_URL.replace(/\/$/, "")}/message/sendText/${canal.identificador}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: EVOLUTION_KEY },
      body: JSON.stringify({ number: numero, text: conteudo }),
    });
    if (!evoRes.ok) {
      const txt = await evoRes.text();
      await supabase.from("invoice_notification_log").insert({
        empresa_id, cliente_id: cliente.id, conta_receber_id: fatura.id ?? null,
        status: "falha", tipo, erro: `Evolution ${evoRes.status}: ${txt.slice(0, 300)}`,
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
        .insert({ empresa_id, nome: cliente.nome, whatsapp: numero, telefone: numero, origem: "faturamento" })
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
      conteudo, status: "enviado", remetente_nome: "💰 Faturamento",
      identificador_externo: externalId, enviada_em: now,
    });
    await supabase.from("crm_conversas").update({
      ultima_mensagem: conteudo, ultima_mensagem_em: now,
    }).eq("id", conversa!.id);

    await supabase.from("invoice_notification_log").insert({
      empresa_id, cliente_id: cliente.id, conta_receber_id: fatura.id ?? null,
      conversa_id: conversa!.id, status: "enviado", tipo,
    });

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("notificar-fatura-whatsapp error", err);
    return new Response(JSON.stringify({ error: String((err as Error).message ?? err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});