import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
  if (!EVOLUTION_API_URL) return json({ error: "EVOLUTION_API_URL not configured" }, 500);

  const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");
  if (!EVOLUTION_API_KEY) return json({ error: "EVOLUTION_API_KEY not configured" }, 500);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Authenticate user
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user) return json({ error: "Unauthorized" }, 401);

  const userId = user.id;

  // Get user's empresa_id
  const { data: profile } = await supabase
    .from("profiles")
    .select("empresa_id")
    .eq("user_id", userId)
    .single();
  if (!profile?.empresa_id) return json({ error: "No empresa found" }, 403);

  const empresaId = profile.empresa_id;
  const baseUrl = EVOLUTION_API_URL.replace(/\/$/, "");
  const headers = { "Content-Type": "application/json", apikey: EVOLUTION_API_KEY };

  try {
    const { action, instanceName, ...body } = await req.json();

    switch (action) {
      // ─── Create Instance ──────────────────────────────────
      case "create_instance": {
        const name = instanceName || `petcmd_${empresaId.slice(0, 8)}`;
        const webhookUrl = `${SUPABASE_URL}/functions/v1/evolution-webhook`;

        const res = await fetch(`${baseUrl}/instance/create`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            instanceName: name,
            integration: "WHATSAPP-BAILEYS",
            qrcode: true,
            webhook: {
              url: webhookUrl,
              byEvents: false,
              base64: false,
              events: [
                "messages.upsert",
                "connection.update",
              ],
            },
          }),
        });
        const data = await res.json();

        // If instance already exists, that's fine — just ensure DB is in sync
        const alreadyExists = !res.ok && res.status === 403 &&
          JSON.stringify(data).includes("already in use");

        if (!res.ok && !alreadyExists) {
          return json({ error: "Evolution API error", details: data }, res.status);
        }

        // Always (re)configure webhook on the instance
        try {
          await fetch(`${baseUrl}/webhook/set/${name}`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              webhook: {
                url: webhookUrl,
                webhookByEvents: false,
                webhookBase64: false,
                events: [
                  "MESSAGES_UPSERT",
                  "CONNECTION_UPDATE",
                ],
                enabled: true,
              },
            }),
          });
          console.log("Webhook configured for instance:", name);
        } catch (whErr) {
          console.error("Failed to set webhook:", whErr);
        }

        // Save connection to DB
        await supabase.from("conexoes_whatsapp").upsert({
          empresa_id: empresaId,
          status: "aguardando_qr",
          session_data: { instanceName: name, webhookUrl },
        }, { onConflict: "empresa_id" });

        return json({ success: true, instance: data, instanceName: name });
      }

      // ─── Get QR Code ──────────────────────────────────────
      case "get_qrcode": {
        const { data: conn } = await supabase
          .from("conexoes_whatsapp")
          .select("session_data")
          .eq("empresa_id", empresaId)
          .single();
        const name = conn?.session_data?.instanceName || instanceName;
        if (!name) return json({ error: "No instance found" }, 404);

        const res = await fetch(`${baseUrl}/instance/connect/${name}`, { headers });
        const data = await res.json();
        if (!res.ok) return json({ error: "Evolution API error", details: data }, res.status);

        return json({ success: true, ...data });
      }

      // ─── Check Connection Status ─────────────────────────
      case "connection_status": {
        const { data: conn } = await supabase
          .from("conexoes_whatsapp")
          .select("session_data")
          .eq("empresa_id", empresaId)
          .single();
        const name = conn?.session_data?.instanceName || instanceName;
        if (!name) return json({ error: "No instance found" }, 404);

        const res = await fetch(`${baseUrl}/instance/connectionState/${name}`, { headers });
        const data = await res.json();
        if (!res.ok) return json({ error: "Evolution API error", details: data }, res.status);

        const state = data?.instance?.state || data?.state || "unknown";

        // Update DB status
        const dbStatus = state === "open" ? "conectado" : state === "close" ? "desconectado" : "aguardando_qr";
        await supabase
          .from("conexoes_whatsapp")
          .update({
            status: dbStatus,
            ...(state === "open" ? { data_conexao: new Date().toISOString() } : {}),
            ultima_atividade: new Date().toISOString(),
          })
          .eq("empresa_id", empresaId);

        return json({ success: true, state, dbStatus });
      }

      // ─── Disconnect / Logout ──────────────────────────────
      case "logout": {
        const { data: conn } = await supabase
          .from("conexoes_whatsapp")
          .select("session_data")
          .eq("empresa_id", empresaId)
          .single();
        const name = conn?.session_data?.instanceName || instanceName;
        if (!name) return json({ error: "No instance found" }, 404);

        await fetch(`${baseUrl}/instance/logout/${name}`, { method: "DELETE", headers });
        await supabase
          .from("conexoes_whatsapp")
          .update({ status: "desconectado", ultima_atividade: new Date().toISOString() })
          .eq("empresa_id", empresaId);

        return json({ success: true });
      }

      // ─── Send Text Message ────────────────────────────────
      case "send_message": {
        const { data: conn } = await supabase
          .from("conexoes_whatsapp")
          .select("session_data")
          .eq("empresa_id", empresaId)
          .single();
        const name = conn?.session_data?.instanceName;
        if (!name) return json({ error: "No instance found" }, 404);

        const { number, text } = body;
        if (!number || !text) return json({ error: "number and text required" }, 400);
        // Validate phone number - must be at least 10 digits (country code + number)
        const cleanNumber = String(number).replace(/\D/g, "");
        if (cleanNumber.length < 10) return json({ error: "Invalid phone number format" }, 400);

        const res = await fetch(`${baseUrl}/message/sendText/${name}`, {
          method: "POST",
          headers,
          body: JSON.stringify({ number, text }),
        });
        const data = await res.json();
        if (!res.ok) return json({ error: "Evolution API error", details: data }, res.status);

        return json({ success: true, data });
      }

      // ─── Send Media (image, audio, document) ──────────────
      case "send_media": {
        const { data: conn } = await supabase
          .from("conexoes_whatsapp")
          .select("session_data")
          .eq("empresa_id", empresaId)
          .single();
        const name = conn?.session_data?.instanceName;
        if (!name) return json({ error: "No instance found" }, 404);

        const { number, mediaUrl, mediaType, caption, fileName } = body;
        if (!number || !mediaUrl || !mediaType) {
          return json({ error: "number, mediaUrl and mediaType required" }, 400);
        }
        const cleanMediaNumber = String(number).replace(/\D/g, "");
        if (cleanMediaNumber.length < 10) return json({ error: "Invalid phone number format" }, 400);

        let endpoint = "sendMedia";
        const payload: Record<string, unknown> = { number, media: mediaUrl };

        if (mediaType === "audio") {
          endpoint = "sendWhatsAppAudio";
          payload.audio = mediaUrl;
          delete payload.media;
        } else if (mediaType === "document") {
          payload.mediatype = "document";
          payload.caption = caption || "";
          payload.fileName = fileName || "document";
        } else {
          payload.mediatype = "image";
          payload.caption = caption || "";
        }

        const res = await fetch(`${baseUrl}/message/${endpoint}/${name}`, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) return json({ error: "Evolution API error", details: data }, res.status);

        return json({ success: true, data });
      }

      // ─── Fetch WhatsApp Contacts ────────────────────────
      case "fetch_contacts": {
        const { data: conn } = await supabase
          .from("conexoes_whatsapp")
          .select("session_data")
          .eq("empresa_id", empresaId)
          .single();
        const name = conn?.session_data?.instanceName;
        if (!name) return json({ error: "No instance found" }, 404);

        const res = await fetch(`${baseUrl}/chat/findContacts/${name}`, {
          method: "POST",
          headers,
          body: JSON.stringify({}),
        });
        const data = await res.json();
        if (!res.ok) return json({ error: "Evolution API error", details: data }, res.status);

        // Filter to real contacts (with name and number)
        const contacts = (Array.isArray(data) ? data : data?.contacts || data?.data || [])
          .filter((c: any) => c.id && !c.id.includes("@g.us") && c.pushName)
          .map((c: any) => ({
            name: c.pushName || c.name || c.verifiedName || "Sem nome",
            number: c.id?.replace("@s.whatsapp.net", "") || "",
            profilePicUrl: c.profilePictureUrl || null,
          }));

        return json({ success: true, contacts });
      }

      // ─── Set/Update Webhook ─────────────────────────────
      case "set_webhook": {
        const { data: conn } = await supabase
          .from("conexoes_whatsapp")
          .select("session_data")
          .eq("empresa_id", empresaId)
          .single();
        const name = conn?.session_data?.instanceName || instanceName;
        if (!name) return json({ error: "No instance found" }, 404);

        const webhookUrl = `${SUPABASE_URL}/functions/v1/evolution-webhook`;

        const res = await fetch(`${baseUrl}/webhook/set/${name}`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            webhook: {
              url: webhookUrl,
              webhookByEvents: false,
              webhookBase64: false,
              events: [
                "MESSAGES_UPSERT",
                "CONNECTION_UPDATE",
              ],
              enabled: true,
            },
          }),
        });
        const data = await res.json();

        // Update DB
        await supabase.from("conexoes_whatsapp").update({
          session_data: { instanceName: name, webhookUrl },
        }).eq("empresa_id", empresaId);

        return json({ success: true, data });
      }

      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (err) {
    console.error("Evolution API edge function error:", err);
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
