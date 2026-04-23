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

async function sendAutoMedia(
  baseUrl: string,
  headers: Record<string, string>,
  instanceName: string,
  phone: string,
  mediaType: "image" | "audio" | "video" | "document",
  mediaUrl: string,
  caption: string,
  fileName: string | undefined,
  supabase: any,
  conversaId: string,
  empresaId: string,
) {
  try {
    const cleanNumber = String(phone).replace(/\D/g, "");
    if (cleanNumber.length < 10 || !mediaUrl) return;

    let endpoint = "";
    let body: Record<string, any> = { number: phone };

    if (mediaType === "audio") {
      endpoint = `${baseUrl}/message/sendWhatsAppAudio/${instanceName}`;
      body.audio = mediaUrl;
    } else {
      endpoint = `${baseUrl}/message/sendMedia/${instanceName}`;
      body.mediatype = mediaType; // image | video | document
      body.media = mediaUrl;
      if (caption) body.caption = caption;
      if (mediaType === "document") {
        body.fileName = fileName || "arquivo.pdf";
        body.mimetype = fileName?.toLowerCase().endsWith(".pdf") ? "application/pdf" : "application/octet-stream";
      }
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    const txt = await res.text();
    console.log(`Media (${mediaType}) sent to ${phone}: ${res.status} ${txt.slice(0, 200)}`);

    const tipoDb = mediaType === "image" ? "imagem"
      : mediaType === "audio" ? "audio"
      : mediaType === "document" ? "documento"
      : "midia";

    await supabase.from("mensagens").insert({
      conversa_id: conversaId,
      empresa_id: empresaId,
      conteudo: mediaUrl,
      remetente: "bot",
      tipo: tipoDb,
    });
  } catch (err) {
    console.error("Failed to send auto-media:", err);
  }
}

// Build menu text with numbered options
function buildMenuText(message: string, options: { label: string }[]): string {
  if (!options?.length) return message;
  const lines = options.map((opt, i) => `${i + 1}. ${opt.label}`);
  return `${message}\n\n${lines.join("\n")}`;
}

// Render a single step as outgoing message(s) and return the next step id (or null if flow ends)
async function renderStep(
  step: any,
  baseUrl: string,
  headers: Record<string, string>,
  instanceName: string,
  phone: string,
  supabase: any,
  conversaId: string,
  empresaId: string,
): Promise<string | null> {
  if (!step) return null;

  if (step.delay_seconds && step.delay_seconds > 0) {
    await new Promise((r) => setTimeout(r, Math.min(step.delay_seconds * 1000, 5000)));
  }

  if (step.step_type === "message") {
    const cfg = (step.condition_config && typeof step.condition_config === "object") ? step.condition_config : {};
    const messageType = cfg.message_type || "text";
    const mediaUrl = cfg.media_url || "";
    const fileName = cfg.media_filename || undefined;

    if (messageType !== "text" && mediaUrl) {
      await sendAutoMedia(
        baseUrl, headers, instanceName, phone,
        messageType as any, mediaUrl, step.message || "", fileName,
        supabase, conversaId, empresaId,
      );
    } else if (step.message?.trim()) {
      await sendAutoReply(baseUrl, headers, instanceName, phone, step.message, supabase, conversaId, empresaId);
    }
    // Respect "Continuar = Após resposta": pause the flow on this step until the user replies.
    if (cfg.continue_mode === "after_reply") {
      return `__WAIT__:${step.id}`;
    }
    return step.next_step_id || null;
  }

  if (step.step_type === "menu") {
    const text = buildMenuText(step.message || "", step.options || []);
    if (text.trim()) {
      await sendAutoReply(baseUrl, headers, instanceName, phone, text, supabase, conversaId, empresaId);
    }
    // For menu, we WAIT for the user's reply — do not advance now.
    return step.id;
  }

  if (step.step_type === "redirect") {
    const cfg = (step.condition_config && typeof step.condition_config === "object") ? step.condition_config : {};
    if (cfg.redirect_type === "agent") {
      let agentName = (cfg.agent_name || "").trim();
      const agentId = cfg.agent_id || null;

      // Resolve agent name from DB if missing
      if (!agentName && agentId) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("nome")
          .eq("user_id", agentId)
          .maybeSingle();
        if (prof?.nome) agentName = prof.nome;
      }

      const displayName = agentName || "um atendente";
      const transferText = `🔔 Você foi transferido para ${displayName}. Em instantes você será atendido(a).`;

      // Notify the customer on WhatsApp + log as bot message
      await sendAutoReply(baseUrl, headers, instanceName, phone, transferText, supabase, conversaId, empresaId);

      // Internal note for the team (visible in chat as system bubble)
      await supabase.from("mensagens").insert({
        conversa_id: conversaId,
        empresa_id: empresaId,
        conteudo: `Conversa transferida pelo chatbot para ${displayName}.`,
        remetente: "bot",
        tipo: "texto",
      });

      // Assign agent + mark conversation as in-service, disable bot for this conversation
      const updates: Record<string, any> = {
        status: "em_atendimento",
        ultima_mensagem_at: new Date().toISOString(),
        last_message_preview: `Transferida para ${displayName}`,
      };
      if (agentId) updates.atendente_id = agentId;
      await supabase.from("conversas").update(updates).eq("id", conversaId);

      // Stop the flow — clear any session
      await supabase.from("chatbot_sessions").delete().eq("conversa_id", conversaId);

      return null;
    }
    return step.next_step_id || null;
  }

  // For redirect / other types: just advance to next step
  return step.next_step_id || null;
}

// Run the flow until we hit a menu (waiting for input) or the end.
async function runFlowFromStep(
  startStepId: string,
  steps: any[],
  baseUrl: string,
  headers: Record<string, string>,
  instanceName: string,
  phone: string,
  supabase: any,
  conversaId: string,
  empresaId: string,
): Promise<string | null> {
  const stepMap = new Map(steps.map((s) => [s.id, s]));
  let currentId: string | null = startStepId;
  let safety = 0;
  let lastWaitingStepId: string | null = null;

  while (currentId && safety < 20) {
    safety++;
    const step: any = stepMap.get(currentId);
    if (!step) break;
    const nextId = await renderStep(step, baseUrl, headers, instanceName, phone, supabase, conversaId, empresaId);
    if (step.step_type === "menu") {
      lastWaitingStepId = step.id;
      break;
    }
    // Message step configured to wait for user reply before advancing.
    if (typeof nextId === "string" && nextId.startsWith("__WAIT__:")) {
      lastWaitingStepId = nextId.slice("__WAIT__:".length);
      break;
    }
    if (!nextId || nextId === currentId) break;
    currentId = nextId;
  }
  return lastWaitingStepId;
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
        // pushName from WhatsApp:
        // - For incoming (fromMe=false): name of the contact (good!)
        // - For outgoing (fromMe=true): name of the OWNER of the WhatsApp (the company itself - we must IGNORE)
        const rawPushName = (msg.pushName || "").trim();
        const pushName = !isFromMe && rawPushName ? rawPushName : "";

        // Determine message type and content
        let content = "";
        let messageType = "texto";
        let msgData = msg.message;

        // Unwrap envelope wrappers used by WhatsApp/Baileys for ephemeral/view-once/edited
        for (let i = 0; i < 4 && msgData; i++) {
          if (msgData.ephemeralMessage?.message) { msgData = msgData.ephemeralMessage.message; continue; }
          if (msgData.viewOnceMessage?.message) { msgData = msgData.viewOnceMessage.message; continue; }
          if (msgData.viewOnceMessageV2?.message) { msgData = msgData.viewOnceMessageV2.message; continue; }
          if (msgData.viewOnceMessageV2Extension?.message) { msgData = msgData.viewOnceMessageV2Extension.message; continue; }
          if (msgData.editedMessage?.message?.protocolMessage?.editedMessage) { msgData = msgData.editedMessage.message.protocolMessage.editedMessage; continue; }
          if (msgData.documentWithCaptionMessage?.message) { msgData = { ...msgData, ...msgData.documentWithCaptionMessage.message }; continue; }
          break;
        }

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
          content = msgData.videoMessage.caption || "";
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
                  const mimeType = msgData.videoMessage.mimetype || "video/mp4";
                  content = `data:${mimeType};base64,${mediaData.base64}`;
                }
              }
            } catch (mediaErr) {
              console.error("Failed to download video:", mediaErr);
            }
          }
          if (!content) content = "[vídeo]";
        } else if (msgData?.documentMessage || msgData?.documentWithCaptionMessage) {
          messageType = "documento";
          const docMsg = msgData.documentMessage || msgData.documentWithCaptionMessage?.message?.documentMessage;
          const fileName = docMsg?.fileName || "[documento]";
          content = fileName;
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
                  const mimeType = docMsg?.mimetype || "application/octet-stream";
                  content = `data:${mimeType};base64,${mediaData.base64}`;
                }
              }
            } catch (mediaErr) {
              console.error("Failed to download document:", mediaErr);
            }
          }
        } else if (msgData?.stickerMessage) {
          messageType = "texto";
          content = "🏷️ Figurinha";
        } else if (msgData?.contactMessage || msgData?.contactsArrayMessage) {
          messageType = "texto";
          const c = msgData.contactMessage || msgData.contactsArrayMessage?.contacts?.[0];
          const nome = c?.displayName ? ` (${c.displayName})` : "";
          content = `👤 Contato compartilhado${nome}`;
        } else if (msgData?.locationMessage || msgData?.liveLocationMessage) {
          messageType = "texto";
          const loc = msgData.locationMessage || msgData.liveLocationMessage;
          content = `📍 Localização: ${loc?.degreesLatitude || ""},${loc?.degreesLongitude || ""}`;
        } else if (msgData?.reactionMessage) {
          messageType = "texto";
          content = `Reagiu: ${msgData.reactionMessage.text || "👍"}`;
        } else if (msgData?.pollCreationMessage || msgData?.pollCreationMessageV3 || msgData?.pollCreationMessageV2) {
          messageType = "texto";
          const poll = msgData.pollCreationMessage || msgData.pollCreationMessageV3 || msgData.pollCreationMessageV2;
          content = `📊 Enquete: ${poll?.name || ""}`;
        } else if (msgData?.pollUpdateMessage) {
          messageType = "texto";
          content = "📊 Voto em enquete";
        } else if (msgData?.buttonsResponseMessage) {
          messageType = "texto";
          content = msgData.buttonsResponseMessage.selectedDisplayText || msgData.buttonsResponseMessage.selectedButtonId || "[resposta de botão]";
        } else if (msgData?.listResponseMessage) {
          messageType = "texto";
          content = msgData.listResponseMessage.title || msgData.listResponseMessage.singleSelectReply?.selectedRowId || "[resposta de lista]";
        } else if (msgData?.templateButtonReplyMessage) {
          messageType = "texto";
          content = msgData.templateButtonReplyMessage.selectedDisplayText || "[resposta]";
        } else if (msgData?.protocolMessage) {
          // Protocol messages (delete/edit/etc.) – ignore silently
          continue;
        } else if (msgData?.senderKeyDistributionMessage || msgData?.messageContextInfo) {
          // Internal protocol payloads – ignore
          continue;
        } else {
          // Final fallback: try to extract any text-like field, otherwise log keys
          const textGuess =
            msgData?.imageMessage?.caption ||
            msgData?.videoMessage?.caption ||
            msgData?.title ||
            msgData?.text;
          if (textGuess) {
            content = String(textGuess);
            messageType = "texto";
          } else {
            console.warn("Unsupported message keys:", msgData ? Object.keys(msgData) : []);
            content = "[mídia não suportada]";
            messageType = "texto";
          }
        }

        // Find or create conversation
        let { data: conversas } = await supabase
          .from("conversas")
          .select("id, status, unread_count, contato_nome, cliente_id")
          .eq("empresa_id", empresaId)
          .eq("contato_telefone", phone)
          .order("ultima_mensagem_at", { ascending: false })
          .limit(1);
        let conversa: any = conversas && conversas.length > 0 ? conversas[0] : null;

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
              contato_nome: cliente?.nome || pushName || phone,
              contato_telefone: phone,
              cliente_id: cliente?.id || null,
              status: "novo",
              ultima_mensagem_at: new Date().toISOString(),
            })
            .select("id, status")
            .single();

          conversa = newConversa;
        } else if (!isFromMe) {
          // Update contato_nome with incoming pushName when better than current
          // Also link cliente if missing
          const updates: Record<string, any> = {};
          const currentName = ((conversa as any).contato_nome || "").trim();
          const looksLikePhone = /^\d+$/.test(currentName);
          if (pushName && (looksLikePhone || !currentName)) {
            updates.contato_nome = pushName;
          }
          if (!(conversa as any).cliente_id) {
            const { data: cliente } = await supabase
              .from("clientes")
              .select("id, nome")
              .eq("empresa_id", empresaId)
              .or(`whatsapp.eq.${phone},telefone.eq.${phone}`)
              .limit(1)
              .maybeSingle();
            if (cliente) {
              updates.cliente_id = cliente.id;
              if (cliente.nome) updates.contato_nome = cliente.nome;
            }
          }
          if (Object.keys(updates).length > 0) {
            await supabase.from("conversas").update(updates).eq("id", conversa.id);
          }
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

          // ─── NEW: chatbot_flows engine ──────────────────────────────
          let flowHandled = false;
          let chatbotEnabled = true;
          try {
            // Respect per-conversation chatbot toggle
            const { data: conv } = await supabase
              .from("conversas")
              .select("chatbot_enabled")
              .eq("id", conversa.id)
              .maybeSingle();
            if (conv && conv.chatbot_enabled === false) {
              chatbotEnabled = false;
              throw new Error("__CHATBOT_DISABLED__");
            }

            // Check if there's an active session for this conversation
            const { data: session } = await supabase
              .from("chatbot_sessions")
              .select("*")
              .eq("conversa_id", conversa.id)
              .maybeSingle();

            // Or pick an active flow for the empresa (first one wins)
            let flowId: string | null = session?.flow_id ?? null;
            if (!flowId) {
              const { data: flow } = await supabase
                .from("chatbot_flows")
                .select("id")
                .eq("empresa_id", empresaId)
                .eq("active", true)
                .order("updated_at", { ascending: false })
                .limit(1)
                .maybeSingle();
              flowId = flow?.id ?? null;
            }

            if (flowId) {
              const { data: steps } = await supabase
                .from("chatbot_flow_steps")
                .select("*")
                .eq("flow_id", flowId)
                .order("position", { ascending: true });

              if (steps && steps.length > 0) {
                let nextStartStepId: string | null = null;

                if (!session) {
                  // Start from first step
                  nextStartStepId = steps[0].id;
                } else if (session.current_step_id) {
                  // We were waiting at a menu step — process user's choice
                  const currentStep = steps.find((s: any) => s.id === session.current_step_id);
                  if (currentStep?.step_type === "menu") {
                    const opts = (currentStep.options || []) as { label: string; next_step_id?: string }[];
                    const userInput = content.trim().toLowerCase();
                    const numChoice = parseInt(userInput, 10);
                    let chosenIndex = -1;
                    if (!isNaN(numChoice) && numChoice >= 1 && numChoice <= opts.length) {
                      chosenIndex = numChoice - 1;
                    } else {
                      chosenIndex = opts.findIndex((o) => o.label?.toLowerCase().trim() === userInput);
                    }
                    if (chosenIndex >= 0) {
                      const chosen = opts[chosenIndex];
                      nextStartStepId = chosen.next_step_id || currentStep.next_step_id || null;
                    } else {
                      // Invalid input — re-send the menu
                      nextStartStepId = currentStep.id;
                    }
                  } else {
                    nextStartStepId = currentStep?.next_step_id || null;
                  }
                } else {
                  nextStartStepId = steps[0].id;
                }

                if (nextStartStepId) {
                  const waitingStepId = await runFlowFromStep(
                    nextStartStepId,
                    steps,
                    baseUrl,
                    apiHeaders,
                    instance,
                    phone,
                    supabase,
                    conversa.id,
                    empresaId,
                  );

                  // Upsert session
                  if (waitingStepId) {
                    await supabase
                      .from("chatbot_sessions")
                      .upsert(
                        {
                          conversa_id: conversa.id,
                          empresa_id: empresaId,
                          flow_id: flowId,
                          current_step_id: waitingStepId,
                          last_interaction_at: new Date().toISOString(),
                        },
                        { onConflict: "conversa_id" },
                      );
                  } else {
                    // Flow ended — clear session
                    await supabase.from("chatbot_sessions").delete().eq("conversa_id", conversa.id);
                  }
                  flowHandled = true;
                }
              }
            }
          } catch (flowErr) {
            if ((flowErr as Error)?.message !== "__CHATBOT_DISABLED__") {
              console.error("Flow execution error:", flowErr);
            }
          }

          if (flowHandled) {
            continue;
          }

          // Skip auto-reply rules if chatbot is disabled for this conversation
          if (!chatbotEnabled) {
            continue;
          }

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
