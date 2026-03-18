import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { WifiOff, Loader2, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

type Status = "connected" | "disconnected" | "loading";

export function WhatsAppStatusIndicator() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<Status>("loading");
  const [syncing, setSyncing] = useState(false);
  const hasSynced = useRef(false);

  const syncChats = useCallback(async () => {
    if (syncing || hasSynced.current) return;
    setSyncing(true);
    try {
      const { data } = await supabase.functions.invoke("evolution-api", {
        body: { action: "sync_chats" },
      });
      if (data?.synced > 0) {
        toast({ title: `${data.synced} conversas sincronizadas do WhatsApp` });
        queryClient.invalidateQueries({ queryKey: ["conversas"] });
      }
      hasSynced.current = true;
    } catch {
      // silent fail
    } finally {
      setSyncing(false);
    }
  }, [syncing, queryClient]);

  const checkStatus = useCallback(async () => {
    if (!profile?.empresa_id) return;
    try {
      const { data, error } = await supabase.functions.invoke("evolution-api", {
        body: { action: "connection_status" },
      });
      if (error || !data) {
        setStatus("disconnected");
        hasSynced.current = false;
        return;
      }
      const isConnected = data.state === "open";
      setStatus(isConnected ? "connected" : "disconnected");

      // Auto-sync chats when first connected
      if (isConnected && !hasSynced.current) {
        syncChats();
      }
      if (!isConnected) {
        hasSynced.current = false;
      }
    } catch {
      setStatus("disconnected");
    }
  }, [profile?.empresa_id, syncChats]);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, [checkStatus]);

  const handleManualSync = () => {
    hasSynced.current = false;
    syncChats();
  };

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
      <div className="flex items-center gap-1">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          <span>{syncing ? "Sincronizando..." : "Online"}</span>
        </div>
        <button
          onClick={handleManualSync}
          disabled={syncing}
          className="h-6 w-6 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground transition-colors disabled:opacity-50"
          title="Sincronizar conversas"
        >
          <RefreshCw className={`h-3 w-3 ${syncing ? "animate-spin" : ""}`} />
        </button>
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
