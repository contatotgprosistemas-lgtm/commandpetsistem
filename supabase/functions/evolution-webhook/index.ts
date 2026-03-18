import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const payload = await req.json();
    console.log("Webhook received:", JSON.stringify(payload).slice(0, 500));

    const event = payload.event;
    const instance = payload.instance;
    const data = payload.data;

    if (!instance || !data) {
      return new Response(JSON.stringify({ ok: true, skipped: "no instance or data" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find empresa by instanceName
    const { data: conn } = await supabase
      .from("conexoes_whatsapp")
      .select("empresa_id")
      .filter("session_data->>instanceName", "eq", instance)
      .single();

    if (!conn) {
      console.warn("No empresa found for instance:", instance);
      return new Response(JSON.stringify({ ok: true, skipped: "unknown instance" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const empresaId = conn.empresa_id;

    // ─── Handle incoming messages ──────────────────────────
    if (event === "messages.upsert") {
      const messages = Array.isArray(data) ? data : [data];

      for (const msg of messages) {
        const key = msg.key;
        if (!key || key.fromMe) continue; // Skip outgoing messages

        const remoteJid = key.remoteJid || "";
        const phone = remoteJid.replace("@s.whatsapp.net", "").replace("@g.us", "");
        const pushName = msg.pushName || phone;
        const content = msg.message?.conversation
          || msg.message?.extendedTextMessage?.text
          || msg.message?.imageMessage?.caption
          || "[mídia]";
        const messageType = msg.message?.conversation || msg.message?.extendedTextMessage
          ? "texto"
          : "midia";

        // Find or create conversation
        let { data: conversa } = await supabase
          .from("conversas")
          .select("id")
          .eq("empresa_id", empresaId)
          .eq("contato_telefone", phone)
          .single();

        if (!conversa) {
          // Try to find a matching client
          const { data: cliente } = await supabase
            .from("clientes")
            .select("id, nome")
            .eq("empresa_id", empresaId)
            .or(`whatsapp.eq.${phone},telefone.eq.${phone}`)
            .limit(1)
            .single();

          const { data: newConversa } = await supabase
            .from("conversas")
            .insert({
              empresa_id: empresaId,
              contato_nome: cliente?.nome || pushName,
              contato_telefone: phone,
              cliente_id: cliente?.id || null,
              status: "novo",
              ultima_mensagem_at: new Date().toISOString(),
            })
            .select("id")
            .single();

          conversa = newConversa;
        }

        if (!conversa) {
          console.error("Failed to create/find conversa for phone:", phone);
          continue;
        }

        // Insert message
        await supabase.from("mensagens").insert({
          conversa_id: conversa.id,
          empresa_id: empresaId,
          conteudo: content,
          remetente: "cliente",
          tipo: messageType,
        });

        // Update conversation timestamp
        await supabase
          .from("conversas")
          .update({
            ultima_mensagem_at: new Date().toISOString(),
            status: "novo",
          })
          .eq("id", conversa.id);
      }
    }

    // ─── Handle connection status updates ──────────────────
    if (event === "connection.update") {
      const state = data.state || data.status;
      if (state) {
        const dbStatus = state === "open" ? "conectado"
          : state === "close" ? "desconectado"
          : "aguardando_qr";

        const updateData: Record<string, unknown> = {
          status: dbStatus,
          ultima_atividade: new Date().toISOString(),
        };

        if (state === "open") {
          updateData.data_conexao = new Date().toISOString();
          // Try to get the connected number
          if (data.wid || data.me) {
            const wid = data.wid || data.me;
            const numero = typeof wid === "string"
              ? wid.replace("@s.whatsapp.net", "")
              : wid?.user || null;
            if (numero) updateData.numero = numero;
          }
        }

        await supabase
          .from("conexoes_whatsapp")
          .update(updateData)
          .eq("empresa_id", empresaId);
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 200, // Return 200 to avoid retries
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
