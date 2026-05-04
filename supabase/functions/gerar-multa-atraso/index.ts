import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function todayBR(): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date()); // yyyy-mm-dd
}

function addDays(yyyyMmDd: string, days: number): string {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

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
  const today = todayBR();
  const yesterday = addDays(today, -1);
  const summary = { processed: 0, created: 0, skipped: 0, failed: 0 };

  try {
    const { data: configs } = await admin
      .from("invoice_notification_config")
      .select("empresa_id, multa_atraso_enabled, multa_atraso_valor, multa_atraso_descricao");

    for (const cfg of configs ?? []) {
      if (!cfg.multa_atraso_enabled) continue;

      const valorMulta = Number(cfg.multa_atraso_valor ?? 30);
      const descMulta = cfg.multa_atraso_descricao ?? "Multa por atraso no pagamento";

      // faturas vencidas ontem, ainda pendentes, do tipo normal (sem multa filha)
      const { data: faturas } = await admin
        .from("contas_receber")
        .select("id, cliente_id, descricao, valor, vencimento, status, tipo_fatura")
        .eq("empresa_id", cfg.empresa_id)
        .eq("status", "pendente")
        .eq("vencimento", yesterday)
        .or("tipo_fatura.eq.normal,tipo_fatura.is.null");

      for (const f of faturas ?? []) {
        summary.processed++;

        // já tem multa gerada?
        const { data: existing } = await admin
          .from("contas_receber")
          .select("id")
          .eq("parent_conta_id", f.id)
          .eq("tipo_fatura", "multa_atraso")
          .limit(1);
        if (existing && existing.length > 0) { summary.skipped++; continue; }

        // cria a fatura de multa (vencimento = hoje)
        const { error: insErr } = await admin
          .from("contas_receber")
          .insert({
            empresa_id: cfg.empresa_id,
            cliente_id: f.cliente_id,
            descricao: `${descMulta} - ${f.descricao}`,
            valor: valorMulta,
            vencimento: today,
            categoria: "Multa por atraso",
            status: "pendente",
            parent_conta_id: f.id,
            tipo_fatura: "multa_atraso",
          });

        if (insErr) { console.error("multa insert err", insErr); summary.failed++; continue; }
        summary.created++;
      }
    }

    return new Response(JSON.stringify({ ok: true, summary, today, yesterday }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("gerar-multa-atraso error", err);
    return new Response(JSON.stringify({ error: String((err as Error).message ?? err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});