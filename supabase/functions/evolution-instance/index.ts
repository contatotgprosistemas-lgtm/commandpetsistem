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

function evoFetch(path: string, init: RequestInit = {}, baseUrl?: string, apiKey?: string) {
  let url = (baseUrl || EVOLUTION_URL || "").trim();
  // Remove trailing slash and common UI suffixes (Evolution Manager URL pasted by mistake)
  url = url.replace(/\/+$/, "");
  url = url.replace(/\/manager(\/login)?$/i, "");
  url = url.replace(/\/+$/, "");
  const key = apiKey || EVOLUTION_KEY;
  return fetch(`${url}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      apikey: key,
      ...(init.headers || {}),
    },
  });
}

async function safeJson(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    // Evolution may return HTML on auth errors / wrong URL
    return { _nonJson: true, raw: text.slice(0, 300) };
  }
}

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
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: profile } = await admin.from("profiles").select("empresa_id").eq("user_id", userId).maybeSingle();
    const empresaId = profile?.empresa_id;
    if (!empresaId) {
      return new Response(JSON.stringify({ error: "Empresa não encontrada" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const action = body.action as string;

    if (action === "create") {
      const nome = (body.nome as string)?.trim();
      const setor = (body.setor as string) ?? null;
      const serverUrl = (body.server_url as string)?.trim();
      const apiKey = (body.api_key as string)?.trim();
      const customInstance = (body.instance_name as string)?.trim();
      if (!nome) {
        return new Response(JSON.stringify({ error: "Nome obrigatório" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (!serverUrl) {
        return new Response(JSON.stringify({ error: "URL do servidor Evolution obrigatória" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (!apiKey) {
        return new Response(JSON.stringify({ error: "API Key obrigatória" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const instanceName = customInstance && customInstance.length > 0
        ? customInstance.toLowerCase().replace(/[^a-z0-9_-]/g, "_")
        : `crm_${empresaId.slice(0, 8)}_${crypto.randomUUID().slice(0, 8)}`;
      const webhookUrl = `${SUPABASE_URL}/functions/v1/evolution-webhook`;
      const webhookSecret = Deno.env.get("EVOLUTION_WEBHOOK_SECRET") ?? "";

      let evoRes: Response;
      try {
        evoRes = await evoFetch("/instance/create", {
        method: "POST",
        body: JSON.stringify({
          instanceName,
          qrcode: true,
          integration: "WHATSAPP-BAILEYS",
          webhook: {
            url: webhookUrl,
            byEvents: false,
            base64: true,
            events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE", "QRCODE_UPDATED"],
            headers: webhookSecret ? { apikey: webhookSecret } : undefined,
          },
        }),
        }, serverUrl, apiKey);
      } catch (netErr) {
        return new Response(JSON.stringify({ error: "Não foi possível acessar o servidor Evolution. Verifique a URL.", details: (netErr as Error).message }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const evoData = await safeJson(evoRes);
      if (!evoRes.ok || evoData?._nonJson) {
        const msg = evoData?._nonJson
          ? `Resposta inválida da Evolution (HTTP ${evoRes.status}). Verifique URL e API Key.`
          : (evoData?.message || evoData?.error || `Evolution retornou HTTP ${evoRes.status}`);
        return new Response(JSON.stringify({ error: msg, details: evoData }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const qr = evoData?.qrcode?.base64 ?? evoData?.qrcode?.code ?? null;

      const { data: canal, error } = await admin.from("crm_canais").insert({
        empresa_id: empresaId,
        nome,
        setor,
        tipo: "whatsapp",
        provedor: "evolution",
        identificador: instanceName,
        status: "conectando",
        config: { qr, instance: instanceName, server_url: serverUrl, api_key: apiKey },
      }).select().single();
      if (error) throw error;

      return new Response(JSON.stringify({ canal, qr }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "qr" || action === "status") {
      const canalId = body.canal_id as string;
      const { data: canal } = await admin.from("crm_canais").select("*").eq("id", canalId).eq("empresa_id", empresaId).maybeSingle();
      if (!canal) {
        return new Response(JSON.stringify({ error: "Canal não encontrado" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const inst = canal.identificador;
      const cfg = (canal.config as any) || {};
      const baseUrl = cfg.server_url as string | undefined;
      const apiKey = cfg.api_key as string | undefined;

      let stateRes: Response;
      try {
        stateRes = await evoFetch(`/instance/connectionState/${inst}`, {}, baseUrl, apiKey);
      } catch (netErr) {
        return new Response(JSON.stringify({ error: "Não foi possível acessar o servidor Evolution.", details: (netErr as Error).message }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const stateData = await safeJson(stateRes);
      if (!stateRes.ok || stateData?._nonJson) {
        const msg = stateData?._nonJson
          ? `Resposta inválida da Evolution (HTTP ${stateRes.status}). Verifique URL e API Key do canal.`
          : (stateData?.message || stateData?.error || `Evolution retornou HTTP ${stateRes.status}`);
        return new Response(JSON.stringify({ error: msg, details: stateData }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const state = stateData?.instance?.state ?? stateData?.state;

      let qr: string | null = null;
      let numero: string | null = canal.numero_telefone;
      let novoStatus = canal.status;

      if (state === "open") {
        novoStatus = "conectado";
        const infoRes = await evoFetch(`/instance/fetchInstances?instanceName=${inst}`, {}, baseUrl, apiKey);
        const infoData = await infoRes.json();
        const info = Array.isArray(infoData) ? infoData[0] : infoData;
        numero = info?.instance?.owner?.split("@")[0] ?? info?.owner?.split("@")[0] ?? numero;
      } else if (state === "connecting" || state === "close") {
        novoStatus = "conectando";
        const qrRes = await evoFetch(`/instance/connect/${inst}`, {}, baseUrl, apiKey);
        const qrData = await safeJson(qrRes);
        qr = qrData?.base64 ?? qrData?.qrcode?.base64 ?? qrData?.code ?? null;
      }

      await admin.from("crm_canais").update({
        status: novoStatus,
        numero_telefone: numero,
        config: { ...cfg, qr, instance: inst },
        ultima_conexao: novoStatus === "conectado" ? new Date().toISOString() : canal.ultima_conexao,
      }).eq("id", canalId);

      return new Response(JSON.stringify({ status: novoStatus, qr, numero }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "disconnect") {
      const canalId = body.canal_id as string;
      const { data: canal } = await admin.from("crm_canais").select("identificador, config").eq("id", canalId).eq("empresa_id", empresaId).maybeSingle();
      if (canal) {
        const cfg = (canal.config as any) || {};
        await evoFetch(`/instance/logout/${canal.identificador}`, { method: "DELETE" }, cfg.server_url, cfg.api_key);
        await admin.from("crm_canais").update({ status: "desconectado" }).eq("id", canalId);
      }
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "delete") {
      const canalId = body.canal_id as string;
      const { data: canal } = await admin.from("crm_canais").select("identificador, config").eq("id", canalId).eq("empresa_id", empresaId).maybeSingle();
      if (canal) {
        const cfg = (canal.config as any) || {};
        await evoFetch(`/instance/delete/${canal.identificador}`, { method: "DELETE" }, cfg.server_url, cfg.api_key);
        await admin.from("crm_canais").delete().eq("id", canalId);
      }
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Ação inválida" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("evolution-instance error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});