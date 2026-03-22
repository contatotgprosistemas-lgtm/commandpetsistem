/**
 * WhatsApp Service Abstraction Layer
 * Supports Evolution API (current) and external Node.js backend (future)
 */
import { supabase } from "@/integrations/supabase/client";

type WhatsAppProvider = "evolution" | "external";

interface SendMessagePayload {
  phone: string;
  content: string;
  messageType?: "text" | "image" | "audio" | "document" | "video";
  mediaUrl?: string;
  fileName?: string;
}

interface ConnectionStatus {
  connected: boolean;
  phone?: string;
}

// Determine provider from env or default to evolution
const getProvider = (): WhatsAppProvider => {
  const envProvider = import.meta.env.VITE_WHATSAPP_PROVIDER;
  return envProvider === "external" ? "external" : "evolution";
};

const getExternalApiUrl = (): string => {
  return import.meta.env.VITE_WHATSAPP_API_URL || "";
};

// --- Evolution API provider ---
const evolutionProvider = {
  async checkStatus(): Promise<ConnectionStatus> {
    const { data, error } = await supabase.functions.invoke("evolution-api", {
      body: { action: "connection_status" },
    });
    if (error || !data) return { connected: false };
    return {
      connected: data.state === "open",
      phone: data.phone,
    };
  },

  async sendMessage(payload: SendMessagePayload): Promise<void> {
    const { phone, content, messageType, mediaUrl, fileName } = payload;
    if (messageType && messageType !== "text" && mediaUrl) {
      await supabase.functions.invoke("evolution-api", {
        body: {
          action: "send_media",
          number: phone,
          mediaUrl,
          mediaType: messageType,
          fileName,
        },
      });
    } else {
      await supabase.functions.invoke("evolution-api", {
        body: { action: "send_message", number: phone, text: content },
      });
    }
  },

  async connect(): Promise<{ qrBase64?: string }> {
    await supabase.functions.invoke("evolution-api", {
      body: { action: "create_instance" },
    });
    const { data } = await supabase.functions.invoke("evolution-api", {
      body: { action: "get_qrcode" },
    });
    const base64 = data?.base64 || data?.qrcode?.base64 || null;
    return { qrBase64: base64 };
  },

  async disconnect(): Promise<void> {
    await supabase.functions.invoke("evolution-api", {
      body: { action: "logout" },
    });
  },
};

// --- External Node.js provider ---
const externalProvider = {
  async checkStatus(): Promise<ConnectionStatus> {
    const baseUrl = getExternalApiUrl();
    if (!baseUrl) return { connected: false };
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("empresa_id")
        .single();
      const res = await fetch(`${baseUrl}/status/${profile?.empresa_id}`);
      const json = await res.json();
      return { connected: json.connected, phone: json.phone };
    } catch {
      return { connected: false };
    }
  },

  async sendMessage(payload: SendMessagePayload): Promise<void> {
    const baseUrl = getExternalApiUrl();
    if (!baseUrl) throw new Error("WHATSAPP_API_URL not configured");
    const { data: profile } = await supabase
      .from("profiles")
      .select("empresa_id")
      .single();
    await fetch(`${baseUrl}/send-message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyId: profile?.empresa_id,
        phone: payload.phone,
        content: payload.content,
        messageType: payload.messageType || "text",
        mediaUrl: payload.mediaUrl,
      }),
    });
  },

  async connect(): Promise<{ qrBase64?: string }> {
    const baseUrl = getExternalApiUrl();
    if (!baseUrl) throw new Error("WHATSAPP_API_URL not configured");
    const res = await fetch(`${baseUrl}/connect`, { method: "POST" });
    const json = await res.json();
    return { qrBase64: json.qrBase64 };
  },

  async disconnect(): Promise<void> {
    const baseUrl = getExternalApiUrl();
    if (!baseUrl) return;
    await fetch(`${baseUrl}/disconnect`, { method: "POST" });
  },
};

// --- Public API ---
function getProviderInstance() {
  return getProvider() === "external" ? externalProvider : evolutionProvider;
}

export const whatsappService = {
  checkStatus: () => getProviderInstance().checkStatus(),
  sendMessage: (payload: SendMessagePayload) => getProviderInstance().sendMessage(payload),
  connect: () => getProviderInstance().connect(),
  disconnect: () => getProviderInstance().disconnect(),
  getProvider,
};
