import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const EVOLUTION_URL = (Deno.env.get("EVOLUTION_API_URL") || "").trim();
const EVOLUTION_KEY = (Deno.env.get("EVOLUTION_API_KEY") || "").trim();
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

function baseUrl() {
  let u = EVOLUTION_URL.replace(/\/+$/, "");
  u = u.replace(/\/manager(\/login)?$/i, "").replace(/\/+$/, "");
  return u;
}

function evoFetch(path: string, init: RequestInit = {}) {
  return fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      apikey: EVOLUTION_KEY,
      ...(init.headers || {}),
    },
  });
}

async function safeJson(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return { _nonJson: true, raw: text.slice(0, 300) }; }
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

    if (!EVOLUTION_URL || !EVOLUTION_KEY) {
      return new Response(JSON.stringify({ error: "Servidor Evolution não configurado (EVOLUTION_API_URL/EVOLUTION_API_KEY)." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    // Helper: load or create row
    async function loadRow() {
      const { data } = await admin.from("conexoes_whatsapp").select("*").eq("empresa_id", empresaId).maybeSingle();
      return data as any;
    }

    if (action === "connect") {
      // Always start clean: delete any existing instance for this empresa, then create fresh.
      let row = await loadRow();
      let instanceName: string = row?.instance_name || `petcontrol_${empresaId.slice(0, 8)}`;
      instanceName = instanceName.toLowerCase().replace(/[^a-z0-9_-]/g, "_");

      // Best-effort cleanup of previous instance (ignore errors)
      try { await evoFetch(`/instance/logout/${instanceName}`, { method: "DELETE" }); } catch {}
      try { await evoFetch(`/instance/delete/${instanceName}`, { method: "DELETE" }); } catch {}

      const createRes = await evoFetch("/instance/create", {
        method: "POST",
        body: JSON.stringify({
          instanceName,
          qrcode: true,
          integration: "WHATSAPP-BAILEYS",
        }),
      });
      const createData = await safeJson(createRes);
      if (!createRes.ok || createData?._nonJson) {
        const msg = createData?._nonJson
          ? `Resposta inválida do servidor WhatsApp (HTTP ${createRes.status}).`
          : (createData?.message || createData?.error || `HTTP ${createRes.status}`);
        return new Response(JSON.stringify({ error: msg, details: createData }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      let qr: string | null = createData?.qrcode?.base64 ?? createData?.qrcode?.code ?? null;

      // If create didn't return a QR, ask /connect for one
      if (!qr) {
        const qrRes = await evoFetch(`/instance/connect/${instanceName}`);
        const qrData = await safeJson(qrRes);
        qr = qrData?.base64 ?? qrData?.qrcode?.base64 ?? qrData?.code ?? null;
      }

      const payload: any = {
        empresa_id: empresaId,
        instance_name: instanceName,
        status: "conectando",
        session_data: { qr },
      };
      if (row) {
        await admin.from("conexoes_whatsapp").update(payload).eq("id", row.id);
      } else {
        await admin.from("conexoes_whatsapp").insert(payload);
      }
      return new Response(JSON.stringify({ ok: true, qr, instance_name: instanceName, status: "conectando" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "status") {
      const row = await loadRow();
      if (!row?.instance_name) {
        return new Response(JSON.stringify({ status: "desconectado", qr: null }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const inst = row.instance_name;
      const stateRes = await evoFetch(`/instance/connectionState/${inst}`);
      const stateData = await safeJson(stateRes);
      if (!stateRes.ok || stateData?._nonJson) {
        return new Response(JSON.stringify({ status: row.status, qr: row.session_data?.qr ?? null, error: stateData?._nonJson ? "Resposta inválida do servidor Evolution" : stateData?.message }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const state = stateData?.instance?.state ?? stateData?.state;
      let novoStatus = row.status;
      let qr: string | null = row.session_data?.qr ?? null;
      let numero = row.numero;

      if (state === "open") {
        novoStatus = "conectado";
        qr = null;
        const infoRes = await evoFetch(`/instance/fetchInstances?instanceName=${inst}`);
        const infoData = await safeJson(infoRes);
        const info = Array.isArray(infoData) ? infoData[0] : infoData;
        const owner = info?.instance?.owner ?? info?.owner;
        if (owner) numero = String(owner).split("@")[0];
      } else if (state === "connecting") {
        // Awaiting QR scan – keep current QR, do not regenerate (avoids loop)
        novoStatus = "conectando";
      } else if (state === "close") {
        // Instance exists but disconnected from WhatsApp – treat as desconectado
        novoStatus = "desconectado";
        qr = null;
        numero = null;
      }

      await admin.from("conexoes_whatsapp").update({
        status: novoStatus,
        numero,
        session_data: { qr },
        data_conexao: novoStatus === "conectado" && !row.data_conexao ? new Date().toISOString() : row.data_conexao,
      }).eq("id", row.id);

      return new Response(JSON.stringify({ status: novoStatus, qr, numero, instance_name: inst }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "disconnect") {
      const row = await loadRow();
      if (row?.instance_name) {
        // Logout AND delete the instance so a future connect starts fresh
        try { await evoFetch(`/instance/logout/${row.instance_name}`, { method: "DELETE" }); } catch {}
        try { await evoFetch(`/instance/delete/${row.instance_name}`, { method: "DELETE" }); } catch {}
        await admin.from("conexoes_whatsapp").update({
          status: "desconectado",
          session_data: { qr: null },
          numero: null,
          instance_name: null,
        }).eq("id", row.id);
      }
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "delete") {
      const row = await loadRow();
      if (row?.instance_name) {
        await evoFetch(`/instance/delete/${row.instance_name}`, { method: "DELETE" });
        await admin.from("conexoes_whatsapp").delete().eq("id", row.id);
      }
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Ação inválida" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("whatsapp-qr error", e);
    return new Response(JSON.stringify({ error: "Erro interno ao processar a solicitação." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});