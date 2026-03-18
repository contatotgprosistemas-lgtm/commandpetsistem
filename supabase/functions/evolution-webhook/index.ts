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

    const event = (payload.event || "").toLowerCase().replace(/_/g, ".");
    const instance = payload.instance || payload.instanceName || payload.instance_name;
    const data = payload.data;

    if (!instance || !data) {
      return new Response(JSON.stringify({ ok: true, skipped: "no instance or data" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find empresa by instanceName - try multiple JSON path approaches
    let conn = null;
    const { data: conn1 } = await supabase
      .from("conexoes_whatsapp")
      .select("empresa_id")
      .filter("session_data->>instanceName", "eq", instance)
      .single();
    conn = conn1;

    if (!conn) {
      // Fallback: check all connections
      const { data: allConns } = await supabase
        .from("conexoes_whatsapp")
        .select("empresa_id, session_data");
      if (allConns) {
        for (const c of allConns) {
          const sd = c.session_data as Record<string, unknown> | null;
          if (sd && (sd.instanceName === instance || sd.instance_name === instance)) {
            conn = { empresa_id: c.empresa_id };
            break;
          }
        }
      }
    }

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

        // Determine message type and content
        const message = msg.message || {};
        let content = "";
        let messageType = "texto";

        if (message.conversation) {
          content = message.conversation;
        } else if (message.extendedTextMessage?.text) {
          content = message.extendedTextMessage.text;
        } else if (message.imageMessage) {
          messageType = "imagem";
          // Use base64 if available, or directPath/url
          content = msg.mediaUrl || msg.media?.url || message.imageMessage.url || message.imageMessage.directPath || "";
          if (!content && message.imageMessage.caption) {
            content = message.imageMessage.caption;
          }
          if (!content) content = "[imagem]";
        } else if (message.videoMessage) {
          messageType = "midia";
          content = msg.mediaUrl || msg.media?.url || message.videoMessage.url || "[vídeo]";
        } else if (message.audioMessage || message.pttMessage) {
          messageType = "audio";
          const audioMsg = message.audioMessage || message.pttMessage;
          content = msg.mediaUrl || msg.media?.url || audioMsg?.url || "[áudio]";
        } else if (message.documentMessage) {
          messageType = "documento";
          content = msg.mediaUrl || msg.media?.url || message.documentMessage.url || "[documento]";
        } else if (message.stickerMessage) {
          messageType = "midia";
          content = msg.mediaUrl || msg.media?.url || "[sticker]";
        } else {
          content = "[mídia]";
          messageType = "midia";
        }

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
