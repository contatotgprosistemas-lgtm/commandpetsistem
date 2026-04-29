import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Default 2h. Allow override via JSON body { hours: number } (1..24).
    let hours = 2;
    if (req.method === "POST") {
      try {
        const body = await req.json();
        if (typeof body?.hours === "number" && body.hours >= 1 && body.hours <= 24) {
          hours = Math.floor(body.hours);
        }
      } catch (_) {
        // ignore — body is optional
      }
    }

    const { data, error } = await supabase.rpc("cleanup_estou_chegando_stale", {
      p_hours: hours,
    });

    if (error) throw error;

    console.log(`[estou-chegando-cleanup] disabled ${data ?? 0} stale session(s) older than ${hours}h`);

    return new Response(
      JSON.stringify({ ok: true, disabled: data ?? 0, hours }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[estou-chegando-cleanup] error:", err?.message ?? err);
    return new Response(
      JSON.stringify({ ok: false, error: err?.message ?? String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});