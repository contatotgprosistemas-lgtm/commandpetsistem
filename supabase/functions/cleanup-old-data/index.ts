import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const CHAT_BUCKET = "chat-media";
const CHAT_PUBLIC_MARKER = `/storage/v1/object/public/${CHAT_BUCKET}/`;
const CHAT_SIGN_MARKER = `/storage/v1/object/sign/${CHAT_BUCKET}/`;

function extractStoragePath(url: string | null): string | null {
  if (!url) return null;
  const idx = url.indexOf(CHAT_PUBLIC_MARKER);
  if (idx !== -1) return decodeURIComponent(url.substring(idx + CHAT_PUBLIC_MARKER.length).split("?")[0]);
  const idx2 = url.indexOf(CHAT_SIGN_MARKER);
  if (idx2 !== -1) return decodeURIComponent(url.substring(idx2 + CHAT_SIGN_MARKER.length).split("?")[0]);
  return null;
}

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

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const summary: any = { empresas: [], started_at: new Date().toISOString() };

  try {
    // Body may include empresa_id to scope a single tenant; otherwise process all enabled configs
    let empresaIdFilter: string | null = null;
    try {
      if (req.headers.get("content-type")?.includes("json")) {
        const body = await req.json();
        empresaIdFilter = body?.empresa_id ?? null;
      }
    } catch (_) { /* no body */ }

    let query = admin.from("data_retention_config").select("*").eq("enabled", true);
    if (empresaIdFilter) query = query.eq("empresa_id", empresaIdFilter);
    const { data: configs, error: cfgErr } = await query;
    if (cfgErr) throw cfgErr;

    for (const cfg of configs ?? []) {
      const empresaId = cfg.empresa_id as string;
      const stats = {
        empresa_id: empresaId,
        errors: [] as string[],
      };
      // CRM module removed — nothing to clean up here.
      void CHAT_BUCKET; void extractStoragePath;

      await admin.from("data_retention_config").update({
        last_run_at: new Date().toISOString(),
        last_run_summary: stats,
      }).eq("empresa_id", empresaId);

      summary.empresas.push(stats);
    }

    summary.finished_at = new Date().toISOString();
    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("cleanup-old-data error:", e);
    return new Response(JSON.stringify({ error: e.message, summary }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});