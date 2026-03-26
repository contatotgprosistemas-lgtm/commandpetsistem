import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function sendAutoReply(
  baseUrl: string,
  headers: Record<string, string>,
  instanceName: string,
  phone: string,
  text: string,
  supabase: any,
  conversaId: string,
  empresaId: string,
) {
  try {
    const cleanNumber = String(phone).replace(/\D/g, "");
    if (cleanNumber.length < 10) return;

    await fetch(`${baseUrl}/message/sendText/${instanceName}`, {
      method: "POST",
      headers,
      body: JSON.stringify({ number: phone, text }),
    });

    // Save auto-reply as message
    await supabase.from("mensagens").insert({
      conversa_id: conversaId,
      empresa_id: empresaId,
      conteudo: text,
      remetente: "bot",
      tipo: "texto",
    });

    console.log("Auto-reply sent to", phone);
  } catch (err) {
    console.error("Failed to send auto-reply:", err);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
  const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");
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

    // Find empresa by instanceName
    let conn = null;
    const { data: conn1 } = await supabase
      .from("conexoes_whatsapp")
      .select("empresa_id")
      .filter("session_data->>instanceName", "eq", instance)
      .single();
    conn = conn1;

    if (!conn) {
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
        if (!key) continue;
        const isFromMe = !!key.fromMe;

        const remoteJid = key.remoteJid || "";

        // Ignore group messages
        if (remoteJid.endsWith("@g.us")) {
          console.log("Ignoring group message from:", remoteJid);
          continue;
        }

        const phone = remoteJid.replace("@s.whatsapp.net", "");
        const pushName = msg.pushName || phone;

        // Determine message type and content
        let content = "";
        let messageType = "texto";
        const msgData = msg.message;

        if (msgData?.conversation) {
          content = msgData.conversation;
          messageType = "texto";
        } else if (msgData?.extendedTextMessage?.text) {
          content = msgData.extendedTextMessage.text;
          messageType = "texto";
        } else if (msgData?.imageMessage) {
          messageType = "imagem";
          content = msgData.imageMessage.caption || "";
          // Try to get media URL from Evolution API
          if (EVOLUTION_API_URL && EVOLUTION_API_KEY && key.id) {
            try {
              const baseUrl = EVOLUTION_API_URL.replace(/\/$/, "");
              const mediaRes = await fetch(`${baseUrl}/chat/getBase64FromMediaMessage/${instance}`, {
                method: "POST",
                headers: { "Content-Type": "application/json", apikey: EVOLUTION_API_KEY },
                body: JSON.stringify({ message: { key }, convertToMp4: false }),
              });
              if (mediaRes.ok) {
                const mediaData = await mediaRes.json();
                if (mediaData.base64) {
                  const mimeType = msgData.imageMessage.mimetype || "image/jpeg";
                  content = `data:${mimeType};base64,${mediaData.base64}`;
                }
              }
            } catch (mediaErr) {
              console.error("Failed to download media:", mediaErr);
            }
          }
          if (!content) content = "[imagem]";
        } else if (msgData?.audioMessage || msgData?.pttMessage) {
          messageType = "audio";
          if (EVOLUTION_API_URL && EVOLUTION_API_KEY && key.id) {
            try {
              const baseUrl = EVOLUTION_API_URL.replace(/\/$/, "");
              const mediaRes = await fetch(`${baseUrl}/chat/getBase64FromMediaMessage/${instance}`, {
                method: "POST",
                headers: { "Content-Type": "application/json", apikey: EVOLUTION_API_KEY },
                body: JSON.stringify({ message: { key }, convertToMp4: false }),
              });
              if (mediaRes.ok) {
                const mediaData = await mediaRes.json();
                if (mediaData.base64) {
                  const mimeType = (msgData.audioMessage || msgData.pttMessage)?.mimetype || "audio/ogg";
                  content = `data:${mimeType};base64,${mediaData.base64}`;
                }
              }
            } catch (mediaErr) {
              console.error("Failed to download audio:", mediaErr);
            }
          }
          if (!content) content = "[áudio]";
        } else if (msgData?.videoMessage) {
          messageType = "midia";
          content = msgData.videoMessage.caption || "[vídeo]";
        } else if (msgData?.documentMessage || msgData?.documentWithCaptionMessage) {
          messageType = "documento";
          const docMsg = msgData.documentMessage || msgData.documentWithCaptionMessage?.message?.documentMessage;
          content = docMsg?.fileName || "[documento]";
        } else if (msgData?.stickerMessage) {
          messageType = "texto";
          content = "🏷️ Figurinha";
        } else if (msgData?.contactMessage || msgData?.contactsArrayMessage) {
          messageType = "texto";
          content = "👤 Contato compartilhado";
        } else if (msgData?.locationMessage || msgData?.liveLocationMessage) {
          messageType = "texto";
          const loc = msgData.locationMessage || msgData.liveLocationMessage;
          content = `📍 Localização: ${loc?.degreesLatitude || ""},${loc?.degreesLongitude || ""}`;
        } else {
          content = "[mídia não suportada]";
          messageType = "texto";
        }

        // Find or create conversation
        let { data: conversa } = await supabase
          .from("conversas")
          .select("id, status, unread_count")
          .eq("empresa_id", empresaId)
          .eq("contato_telefone", phone)
          .single();

        const isNewConversation = !conversa;

        if (!conversa) {
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
            .select("id, status")
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
          remetente: isFromMe ? "atendente" : "cliente",
          tipo: messageType,
        });

        // Update conversation timestamp, unread count, and preview
        const preview = content.length > 100 ? content.substring(0, 100) + "..." : content;
        const displayPreview = messageType === "imagem" ? "📷 Imagem" 
          : messageType === "audio" ? "🎵 Áudio"
          : messageType === "documento" ? "📄 Documento"
          : messageType === "midia" ? "🎥 Vídeo"
          : preview;

        const updateData: Record<string, any> = {
          ultima_mensagem_at: new Date().toISOString(),
          last_message_preview: isFromMe ? `Você: ${displayPreview}` : displayPreview,
        };

        // Only increment unread and set status for incoming messages
        if (!isFromMe) {
          updateData.status = "novo";
          updateData.unread_count = (conversa as any).unread_count ? (conversa as any).unread_count + 1 : 1;
        }

        await supabase
          .from("conversas")
          .update(updateData)
          .eq("id", conversa.id);

        // ─── CHATBOT AUTO-REPLY LOGIC (only for incoming messages) ──────────────────────
        if (!isFromMe && EVOLUTION_API_URL && EVOLUTION_API_KEY) {
          const baseUrl = EVOLUTION_API_URL.replace(/\/$/, "");
          const apiHeaders = { "Content-Type": "application/json", apikey: EVOLUTION_API_KEY };

          // Fetch active chatbot rules for this empresa
          const { data: regras } = await supabase
            .from("chatbot_regras")
            .select("*")
            .eq("empresa_id", empresaId)
            .eq("ativo", true)
            .order("ordem", { ascending: true });

          if (regras && regras.length > 0) {
            const now = new Date();
            const currentDay = now.getDay() === 0 ? 7 : now.getDay(); // 1=Mon...7=Sun
            const currentTime = now.toTimeString().slice(0, 5); // HH:MM

            let replied = false;

            for (const regra of regras) {
              if (replied) break;

              // Check schedule constraints
              if (regra.horario_inicio && regra.horario_fim) {
                if (currentTime < regra.horario_inicio || currentTime > regra.horario_fim) {
                  // Outside business hours - check if it's an 'ausencia' rule
                  if (regra.tipo === "ausencia") {
                    // Ausencia fires OUTSIDE business hours
                  } else {
                    continue; // Skip non-ausencia rules outside hours
                  }
                } else if (regra.tipo === "ausencia") {
                  continue; // Don't fire ausencia during business hours
                }
              }

              if (regra.dias_semana && regra.dias_semana.length > 0) {
                if (!regra.dias_semana.includes(currentDay)) continue;
              }

              switch (regra.tipo) {
                case "boas_vindas": {
                  // Only send welcome on new conversations
                  if (isNewConversation) {
                    await sendAutoReply(baseUrl, apiHeaders, instance, phone, regra.resposta, supabase, conversa.id, empresaId);
                    replied = true;
                  }
                  break;
                }

                case "menu": {
                  // Send menu when message matches trigger or on new conversations after welcome
                  const trigger = (regra.gatilho || "").toLowerCase().trim();
                  const msgLower = content.toLowerCase().trim();
                  if (!trigger || msgLower === trigger || msgLower === "menu" || msgLower === "0") {
                    await sendAutoReply(baseUrl, apiHeaders, instance, phone, regra.resposta, supabase, conversa.id, empresaId);
                    replied = true;
                  }
                  break;
                }

                case "palavra_chave": {
                  const keywords = (regra.gatilho || "").toLowerCase().split(",").map((k: string) => k.trim()).filter(Boolean);
                  const msgLower = content.toLowerCase().trim();
                  if (keywords.some((kw: string) => msgLower.includes(kw))) {
                    await sendAutoReply(baseUrl, apiHeaders, instance, phone, regra.resposta, supabase, conversa.id, empresaId);
                    replied = true;
                  }
                  break;
                }

                case "ausencia": {
                  await sendAutoReply(baseUrl, apiHeaders, instance, phone, regra.resposta, supabase, conversa.id, empresaId);
                  replied = true;
                  break;
                }
              }
            }
          }
        }
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
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
