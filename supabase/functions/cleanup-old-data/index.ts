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
        crm_media_files_deleted: 0,
        crm_messages_deleted: 0,
        errors: [] as string[],
      };

      const mediaCutoff = new Date(Date.now() - cfg.crm_media_retention_days * 86400000).toISOString();
      const msgCutoff = new Date(Date.now() - cfg.crm_message_retention_days * 86400000).toISOString();

      // 1) Delete chat-media files older than mediaCutoff
      try {
        const { data: oldMedia, error } = await admin
          .from("crm_mensagens")
          .select("id, midia_url")
          .eq("empresa_id", empresaId)
          .not("midia_url", "is", null)
          .lt("created_at", mediaCutoff)
          .limit(2000);
        if (error) throw error;

        const paths: string[] = [];
        for (const m of oldMedia ?? []) {
          const p = extractStoragePath(m.midia_url);
          if (p) paths.push(p);
        }
        if (paths.length > 0) {
          // delete in batches of 100
          for (let i = 0; i < paths.length; i += 100) {
            const slice = paths.slice(i, i + 100);
            const { error: rmErr } = await admin.storage.from(CHAT_BUCKET).remove(slice);
            if (rmErr) stats.errors.push(`storage.remove: ${rmErr.message}`);
            else stats.crm_media_files_deleted += slice.length;
          }
          // Null out midia_url so we don't try to re-delete next run
          const ids = (oldMedia ?? []).map((m: any) => m.id);
          if (ids.length > 0) {
            await admin
              .from("crm_mensagens")
              .update({ midia_url: null, midia_filename: null, midia_mimetype: null, midia_tamanho: null })
              .in("id", ids);
          }
        }
      } catch (e: any) {
        stats.errors.push(`media: ${e.message}`);
      }

      // 2) Delete CRM messages older than msgCutoff (DB rows only — storage already cleaned above for older media)
      try {
        // First clean any leftover storage for messages in this older window too
        const { data: leftoverMedia } = await admin
          .from("crm_mensagens")
          .select("id, midia_url")
          .eq("empresa_id", empresaId)
          .not("midia_url", "is", null)
          .lt("created_at", msgCutoff)
          .limit(2000);
        const leftoverPaths: string[] = [];
        for (const m of leftoverMedia ?? []) {
          const p = extractStoragePath(m.midia_url);
          if (p) leftoverPaths.push(p);
        }
        for (let i = 0; i < leftoverPaths.length; i += 100) {
          const slice = leftoverPaths.slice(i, i + 100);
          const { error: rmErr } = await admin.storage.from(CHAT_BUCKET).remove(slice);
          if (rmErr) stats.errors.push(`storage.remove(msg): ${rmErr.message}`);
          else stats.crm_media_files_deleted += slice.length;
        }

        const { data: deleted, error } = await admin
          .from("crm_mensagens")
          .delete()
          .eq("empresa_id", empresaId)
          .lt("created_at", msgCutoff)
          .select("id");
        if (error) throw error;
        stats.crm_messages_deleted = deleted?.length ?? 0;
      } catch (e: any) {
        stats.errors.push(`messages: ${e.message}`);
      }

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