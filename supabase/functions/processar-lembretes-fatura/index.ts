import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function todayBR(): string {
  // BRT (UTC-3) — derive yyyy-mm-dd in São Paulo
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60_000;
  const brt = new Date(utc - 3 * 60 * 60_000);
  const y = brt.getFullYear();
  const m = String(brt.getMonth() + 1).padStart(2, "0");
  const d = String(brt.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(yyyyMmDd: string, days: number): string {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const today = todayBR();
  const summary: Record<string, number> = { processed: 0, sent: 0, skipped: 0, failed: 0 };

  try {
    // Load all empresa configs that have anything enabled
    const { data: configs } = await admin
      .from("invoice_notification_config")
      .select("empresa_id, enabled, enabled_pre_vencimento, enabled_vencimento, enabled_atraso, dias_antes, dias_apos, intervalo_entre_envios_seg, max_envios_por_minuto");

    const list = configs ?? [];
    if (list.length === 0) {
      return new Response(JSON.stringify({ ok: true, summary, msg: "no_configs" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    for (const cfg of list) {
      if (cfg.enabled === false) continue;

      const intervalo = Math.max(1, Number(cfg.intervalo_entre_envios_seg ?? 8));
      const maxPerMin = Math.max(1, Number(cfg.max_envios_por_minuto ?? 6));
      const minSpacingMs = Math.max(intervalo * 1000, Math.ceil(60000 / maxPerMin));

      const buckets: Array<{ tipo: "pre_vencimento" | "vencimento" | "atraso"; targetDate: string; enabled: boolean; extra: Record<string, number> }> = [
        {
          tipo: "pre_vencimento",
          targetDate: addDays(today, Number(cfg.dias_antes ?? 3)),
          enabled: cfg.enabled_pre_vencimento !== false,
          extra: { dias_restantes: Number(cfg.dias_antes ?? 3) },
        },
        {
          tipo: "vencimento",
          targetDate: today,
          enabled: cfg.enabled_vencimento !== false,
          extra: { dias_restantes: 0 },
        },
        {
          tipo: "atraso",
          targetDate: addDays(today, -Number(cfg.dias_apos ?? 2)),
          enabled: cfg.enabled_atraso !== false,
          extra: { dias_atraso: Number(cfg.dias_apos ?? 2) },
        },
      ];

      for (const b of buckets) {
        if (!b.enabled) continue;

        const { data: faturas } = await admin
          .from("contas_receber")
          .select("id, cliente_id, descricao, valor, vencimento, status")
          .eq("empresa_id", cfg.empresa_id)
          .eq("status", "pendente")
          .eq("vencimento", b.targetDate);

        for (const f of faturas ?? []) {
          summary.processed++;

          // skip duplicates
          const { data: dup } = await admin
            .from("invoice_notification_log")
            .select("id")
            .eq("empresa_id", cfg.empresa_id)
            .eq("conta_receber_id", f.id)
            .eq("tipo", b.tipo)
            .eq("status", "enviado")
            .limit(1);
          if (dup && dup.length > 0) { summary.skipped++; continue; }

          const { data: cli } = await admin
            .from("clientes")
            .select("id, nome, whatsapp, telefone")
            .eq("id", f.cliente_id)
            .maybeSingle();
          if (!cli) { summary.skipped++; continue; }

          // call the existing send function with tipo
          try {
            const res = await fetch(`${SUPABASE_URL}/functions/v1/notificar-fatura-whatsapp`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${SERVICE_ROLE}`,
                apikey: SERVICE_ROLE,
              },
              body: JSON.stringify({
                empresa_id: cfg.empresa_id,
                cliente: cli,
                fatura: { id: f.id, descricao: f.descricao, valor: f.valor, vencimento: f.vencimento },
                tipo: b.tipo,
                ...b.extra,
              }),
            });
            if (res.ok) {
              const j = await res.json().catch(() => ({}));
              if ((j as any)?.success) summary.sent++; else summary.skipped++;
            } else {
              summary.failed++;
            }
          } catch (e) {
            console.error("[lembretes] erro fatura", f.id, e);
            summary.failed++;
          }

          // cadência: aguarda entre disparos
          await sleep(minSpacingMs);
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, summary, today }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("processar-lembretes-fatura error", err);
    return new Response(JSON.stringify({ error: String((err as Error).message ?? err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
