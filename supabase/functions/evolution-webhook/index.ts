import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function onlyDigits(s: string) { return (s ?? "").replace(/\D/g, ""); }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const event: string = body.event ?? body.type ?? "";
    const instance: string = body.instance ?? body.instanceName ?? body?.data?.instance ?? "";
    const data: any = body.data ?? body;

    console.log("webhook:", event, "instance:", instance);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: canal } = await admin.from("crm_canais").select("*").eq("identificador", instance).maybeSingle();
    if (!canal) {
      console.warn("canal não encontrado:", instance);
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    if (event === "connection.update" || event === "CONNECTION_UPDATE") {
      const state = data?.state ?? data?.connection;
      const novoStatus = state === "open" ? "conectado" : state === "close" ? "desconectado" : "conectando";
      await admin.from("crm_canais").update({
        status: novoStatus,
        ultima_conexao: novoStatus === "conectado" ? new Date().toISOString() : canal.ultima_conexao,
      }).eq("id", canal.id);
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    if (event === "qrcode.updated" || event === "QRCODE_UPDATED") {
      const qr = data?.qrcode?.base64 ?? data?.base64 ?? data?.code ?? null;
      await admin.from("crm_canais").update({
        config: { ...(canal.config as any), qr, instance },
        status: "conectando",
      }).eq("id", canal.id);
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    if (event === "messages.upsert" || event === "MESSAGES_UPSERT") {
      const msg = Array.isArray(data?.messages) ? data.messages[0] : (data?.key ? data : data?.message);
      if (!msg) return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });

      const fromMe = !!msg?.key?.fromMe;
      const remoteJid: string = msg?.key?.remoteJid ?? "";
      if (remoteJid.includes("@g.us")) return new Response(JSON.stringify({ ok: true, skip: "group" }), { headers: corsHeaders }); // ignora grupo
      const numero = onlyDigits(remoteJid.split("@")[0]);
      if (!numero) return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });

      const pushName: string = msg?.pushName ?? numero;
      const text: string =
        msg?.message?.conversation ??
        msg?.message?.extendedTextMessage?.text ??
        msg?.message?.imageMessage?.caption ??
        msg?.message?.videoMessage?.caption ??
        "[mídia]";
      const externalId: string = msg?.key?.id ?? crypto.randomUUID();
      const ts = msg?.messageTimestamp ? new Date(Number(msg.messageTimestamp) * 1000).toISOString() : new Date().toISOString();

      // contato (upsert por whatsapp)
      let { data: contato } = await admin.from("crm_contatos")
        .select("id, nome").eq("empresa_id", canal.empresa_id).eq("whatsapp", numero).maybeSingle();
      if (!contato) {
        const ins = await admin.from("crm_contatos").insert({
          empresa_id: canal.empresa_id,
          nome: pushName,
          whatsapp: numero,
          telefone: numero,
          origem: "whatsapp",
        }).select("id, nome").single();
        contato = ins.data!;
      }

      // conversa
      let { data: conv } = await admin.from("crm_conversas")
        .select("id, nao_lidas, status")
        .eq("empresa_id", canal.empresa_id)
        .eq("canal_id", canal.id)
        .eq("contato_id", contato.id)
        .maybeSingle();
      if (!conv) {
        const ins = await admin.from("crm_conversas").insert({
          empresa_id: canal.empresa_id,
          canal_id: canal.id,
          contato_id: contato.id,
          status: "aberta",
          identificador_externo: remoteJid,
        }).select("id, nao_lidas, status").single();
        conv = ins.data!;
      }

      // dedupe por externalId
      const { data: existing } = await admin.from("crm_mensagens")
        .select("id").eq("identificador_externo", externalId).maybeSingle();
      if (existing) return new Response(JSON.stringify({ ok: true, dedupe: true }), { headers: corsHeaders });

      await admin.from("crm_mensagens").insert({
        empresa_id: canal.empresa_id,
        conversa_id: conv.id,
        tipo: "texto",
        direcao: fromMe ? "saida" : "entrada",
        conteudo: text,
        status: "entregue",
        identificador_externo: externalId,
        enviada_em: ts,
        remetente_nome: fromMe ? null : pushName,
      });

      await admin.from("crm_conversas").update({
        ultima_mensagem: text,
        ultima_mensagem_em: ts,
        nao_lidas: fromMe ? (conv.nao_lidas ?? 0) : (conv.nao_lidas ?? 0) + 1,
        status: conv.status === "fechada" ? "aberta" : conv.status,
      }).eq("id", conv.id);

      await admin.from("crm_contatos").update({ ultima_interacao: ts }).eq("id", contato.id);
    }

    return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
  } catch (e) {
    console.error("webhook error", e);
    return new Response(JSON.stringify({ ok: true, error: (e as Error).message }), { headers: corsHeaders });
  }
});