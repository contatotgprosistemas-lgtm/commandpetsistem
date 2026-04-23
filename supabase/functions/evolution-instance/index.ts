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

function evoFetch(path: string, init: RequestInit = {}) {
  return fetch(`${EVOLUTION_URL.replace(/\/$/, "")}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      apikey: EVOLUTION_KEY,
      ...(init.headers || {}),
    },
  });
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
      if (!nome) {
        return new Response(JSON.stringify({ error: "Nome obrigatório" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const instanceName = `crm_${empresaId.slice(0, 8)}_${crypto.randomUUID().slice(0, 8)}`;
      const webhookUrl = `${SUPABASE_URL}/functions/v1/evolution-webhook`;

      const evoRes = await evoFetch("/instance/create", {
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
          },
        }),
      });
      const evoData = await evoRes.json();
      if (!evoRes.ok) {
        return new Response(JSON.stringify({ error: "Evolution falhou", details: evoData }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
        config: { qr, instance: instanceName },
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

      const stateRes = await evoFetch(`/instance/connectionState/${inst}`);
      const stateData = await stateRes.json();
      const state = stateData?.instance?.state ?? stateData?.state;

      let qr: string | null = null;
      let numero: string | null = canal.numero_telefone;
      let novoStatus = canal.status;

      if (state === "open") {
        novoStatus = "conectado";
        const infoRes = await evoFetch(`/instance/fetchInstances?instanceName=${inst}`);
        const infoData = await infoRes.json();
        const info = Array.isArray(infoData) ? infoData[0] : infoData;
        numero = info?.instance?.owner?.split("@")[0] ?? info?.owner?.split("@")[0] ?? numero;
      } else if (state === "connecting" || state === "close") {
        novoStatus = "conectando";
        const qrRes = await evoFetch(`/instance/connect/${inst}`);
        const qrData = await qrRes.json();
        qr = qrData?.base64 ?? qrData?.qrcode?.base64 ?? qrData?.code ?? null;
      }

      await admin.from("crm_canais").update({
        status: novoStatus,
        numero_telefone: numero,
        config: { ...(canal.config as any), qr, instance: inst },
        ultima_conexao: novoStatus === "conectado" ? new Date().toISOString() : canal.ultima_conexao,
      }).eq("id", canalId);

      return new Response(JSON.stringify({ status: novoStatus, qr, numero }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "disconnect") {
      const canalId = body.canal_id as string;
      const { data: canal } = await admin.from("crm_canais").select("identificador").eq("id", canalId).eq("empresa_id", empresaId).maybeSingle();
      if (canal) {
        await evoFetch(`/instance/logout/${canal.identificador}`, { method: "DELETE" });
        await admin.from("crm_canais").update({ status: "desconectado" }).eq("id", canalId);
      }
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "delete") {
      const canalId = body.canal_id as string;
      const { data: canal } = await admin.from("crm_canais").select("identificador").eq("id", canalId).eq("empresa_id", empresaId).maybeSingle();
      if (canal) {
        await evoFetch(`/instance/delete/${canal.identificador}`, { method: "DELETE" });
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