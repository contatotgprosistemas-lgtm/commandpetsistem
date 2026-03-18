import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Wifi, WifiOff, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

type Status = "connected" | "disconnected" | "loading";

export function WhatsAppStatusIndicator() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("loading");

  const checkStatus = useCallback(async () => {
    if (!profile?.empresa_id) return;
    try {
      const { data, error } = await supabase.functions.invoke("evolution-api", {
        body: { action: "connection_status" },
      });
      if (error || !data) {
        setStatus("disconnected");
        return;
      }
      setStatus(data.state === "open" ? "connected" : "disconnected");
    } catch {
      setStatus("disconnected");
    }
  }, [profile?.empresa_id]);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, [checkStatus]);

  if (status === "loading") {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-muted text-muted-foreground text-xs">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>WhatsApp</span>
      </div>
    );
  }

  if (status === "connected") {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
        <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
        <span>WhatsApp Online</span>
      </div>
    );
  }

  return (
    <button
      onClick={() => navigate("/configuracoes")}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-destructive/10 text-destructive text-xs font-medium hover:bg-destructive/20 transition-colors"
    >
      <WifiOff className="h-3 w-3" />
      <span>Reconectar</span>
    </button>
  );
}
