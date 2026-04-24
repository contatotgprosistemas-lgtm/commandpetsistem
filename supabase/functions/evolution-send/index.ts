import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const EVOLUTION_URL = Deno.env.get("EVOLUTION_API_URL")!;
const EVOLUTION_KEY = Deno.env.get("EVOLUTION_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: auth } } });
    const { data: claims } = await userClient.auth.getClaims(auth.replace("Bearer ", ""));
    if (!claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = claims.claims.sub;

    const { conversa_id, conteudo, midia_url, midia_mimetype, midia_filename } = await req.json();
    if (!conversa_id || (!conteudo && !midia_url)) {
      return new Response(JSON.stringify({ error: "conversa_id e conteudo/midia obrigatórios" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: profile } = await admin.from("profiles").select("empresa_id, nome").eq("user_id", userId).maybeSingle();
    const empresaId = profile?.empresa_id;

    const { data: conv } = await admin.from("crm_conversas").select("*, canal:crm_canais(*), contato:crm_contatos(*)").eq("id", conversa_id).eq("empresa_id", empresaId).maybeSingle();
    if (!conv) return new Response(JSON.stringify({ error: "Conversa não encontrada" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const canal: any = conv.canal;
    const contato: any = conv.contato;
    const numero = (contato.whatsapp ?? contato.telefone ?? "").replace(/\D/g, "");
    if (!numero) return new Response(JSON.stringify({ error: "Contato sem WhatsApp" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const evoBase = EVOLUTION_URL.replace(/\/$/, "");
    let evoRes: Response;
    let tipo: "texto" | "imagem" | "video" | "audio" | "documento" = "texto";

    if (midia_url) {
      const mt = (midia_mimetype || "").toLowerCase();
      const mediatype = mt.startsWith("image/") ? "image"
        : mt.startsWith("video/") ? "video"
        : mt.startsWith("audio/") ? "audio"
        : "document";
      tipo = mediatype === "image" ? "imagem" : mediatype === "video" ? "video" : mediatype === "audio" ? "audio" : "documento";
      evoRes = await fetch(`${evoBase}/message/sendMedia/${canal.identificador}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: EVOLUTION_KEY },
        body: JSON.stringify({
          number: numero,
          mediatype,
          mimetype: midia_mimetype,
          media: midia_url,
          fileName: midia_filename ?? "arquivo",
          caption: conteudo ?? "",
        }),
      });
    } else {
      evoRes = await fetch(`${evoBase}/message/sendText/${canal.identificador}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: EVOLUTION_KEY },
        body: JSON.stringify({ number: numero, text: conteudo }),
      });
    }
    const evoData = await evoRes.json();
    if (!evoRes.ok) {
      return new Response(JSON.stringify({ error: "Falha ao enviar", details: evoData }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const externalId = evoData?.key?.id ?? evoData?.messageId ?? null;
    const now = new Date().toISOString();

    const { error: messageInsertError } = await admin.from("crm_mensagens").insert({
      empresa_id: empresaId,
      conversa_id,
      tipo,
      direcao: "saida",
      conteudo: conteudo ?? null,
      midia_url: midia_url ?? null,
      midia_mimetype: midia_mimetype ?? null,
      midia_filename: midia_filename ?? null,
      status: "enviado",
      remetente_id: userId,
      remetente_nome: profile?.nome,
      identificador_externo: externalId,
      enviada_em: now,
    });
    if (messageInsertError) {
      throw new Error(`Falha ao salvar mensagem no CRM: ${messageInsertError.message}`);
    }

    await admin.from("crm_conversas").update({
      ultima_mensagem: conteudo || `[${tipo}]`,
      ultima_mensagem_em: now,
      status: "em_atendimento",
      atendente_id: conv.atendente_id ?? userId,
    }).eq("id", conversa_id);

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("evolution-send error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});