import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Wifi, WifiOff, QrCode, RefreshCw, LogOut } from "lucide-react";

type ConnectionState = "disconnected" | "waiting_qr" | "connected" | "loading";

export function WhatsAppConnectionPanel() {
  const { session, profile } = useAuth();
  const [state, setState] = useState<ConnectionState>("loading");
  const [qrBase64, setQrBase64] = useState<string | null>(null);
  const [numero, setNumero] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);

  const invoke = useCallback(async (action: string, extra = {}) => {
    const { data, error } = await supabase.functions.invoke("evolution-api", {
      body: { action, ...extra },
    });
    if (error) {
      // 404 "No instance found" is expected on first load
      if (action === "connection_status") {
        return { state: "unknown" };
      }
      throw error;
    }
    return data;
  }, []);

  // Check initial status
  const checkStatus = useCallback(async () => {
    try {
      const res = await invoke("connection_status");
      if (res.state === "open") {
        setState("connected");
        setQrBase64(null);
        const { data: conn } = await supabase
          .from("conexoes_whatsapp")
          .select("numero")
          .eq("empresa_id", profile!.empresa_id!)
          .single();
        setNumero(conn?.numero || null);
      } else {
        setState("disconnected");
      }
    } catch {
      // No instance yet or error — just show disconnected
      setState("disconnected");
    }
  }, [invoke, profile]);

  useEffect(() => {
    if (profile?.empresa_id) checkStatus();
  }, [profile?.empresa_id, checkStatus]);

  // Poll for connection while QR is showing
  useEffect(() => {
    if (!polling) return;
    const interval = setInterval(async () => {
      try {
        const res = await invoke("connection_status");
        if (res.state === "open") {
          setState("connected");
          setQrBase64(null);
          setPolling(false);
          toast({ title: "WhatsApp conectado com sucesso!" });
        }
      } catch { /* ignore */ }
    }, 4000);
    return () => clearInterval(interval);
  }, [polling, invoke]);

  const handleConnect = async () => {
    setState("waiting_qr");
    try {
      // Create instance if needed
      await invoke("create_instance");
      // Get QR Code
      const qrRes = await invoke("get_qrcode");
      const base64 = qrRes?.base64 || qrRes?.qrcode?.base64 || null;
      if (base64) {
        setQrBase64(base64);
        setPolling(true);
      } else {
        toast({ title: "Erro ao gerar QR Code", description: "Tente novamente", variant: "destructive" });
        setState("disconnected");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      toast({ title: "Erro na conexão", description: message, variant: "destructive" });
      setState("disconnected");
    }
  };

  const handleRefreshQR = async () => {
    try {
      const qrRes = await invoke("get_qrcode");
      const base64 = qrRes.base64 || qrRes.qrcode?.base64 || null;
      if (base64) setQrBase64(base64);
    } catch {
      toast({ title: "Erro ao atualizar QR", variant: "destructive" });
    }
  };

  const handleDisconnect = async () => {
    try {
      await invoke("logout");
      setState("disconnected");
      setQrBase64(null);
      setNumero(null);
      setPolling(false);
      toast({ title: "WhatsApp desconectado" });
    } catch (err: any) {
      toast({ title: "Erro ao desconectar", description: err.message, variant: "destructive" });
    }
  };

  if (state === "loading") {
    return (
      <Card>
        <CardContent className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <QrCode className="h-5 w-5 text-primary" />
          Conexão WhatsApp
        </CardTitle>
        <CardDescription>
          Conecte seu WhatsApp via QR Code para enviar e receber mensagens no CRM
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Badge */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Status:</span>
          {state === "connected" ? (
            <Badge className="bg-primary/10 text-primary border-primary/20">
              <Wifi className="h-3 w-3 mr-1" /> Conectado
            </Badge>
          ) : state === "waiting_qr" ? (
            <Badge className="bg-accent text-accent-foreground border-accent">
              <QrCode className="h-3 w-3 mr-1" /> Aguardando QR Code
            </Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">
              <WifiOff className="h-3 w-3 mr-1" /> Desconectado
            </Badge>
          )}
        </div>

        {/* Connected state */}
        {state === "connected" && (
          <div className="space-y-3">
            {numero && (
              <p className="text-sm text-foreground">
                Número conectado: <span className="font-mono font-medium">{numero}</span>
              </p>
            )}
            <Button variant="destructive" size="sm" onClick={handleDisconnect}>
              <LogOut className="h-4 w-4 mr-2" /> Desconectar
            </Button>
          </div>
        )}

        {/* Disconnected state */}
        {state === "disconnected" && (
          <Button onClick={handleConnect}>
            <QrCode className="h-4 w-4 mr-2" /> Conectar WhatsApp
          </Button>
        )}

        {/* QR Code display */}
        {state === "waiting_qr" && qrBase64 && (
          <div className="space-y-3">
            <div className="bg-white rounded-lg p-4 inline-block border border-border">
              <img
                src={qrBase64.startsWith("data:") ? qrBase64 : `data:image/png;base64,${qrBase64}`}
                alt="QR Code WhatsApp"
                className="w-64 h-64"
              />
            </div>
            <div className="space-y-1">
              <p className="text-sm text-foreground font-medium">Escaneie o QR Code com o WhatsApp</p>
              <p className="text-xs text-muted-foreground">
                Abra o WhatsApp → Menu (⋮) → Aparelhos conectados → Conectar aparelho
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleRefreshQR}>
              <RefreshCw className="h-4 w-4 mr-2" /> Atualizar QR Code
            </Button>
          </div>
        )}

        {state === "waiting_qr" && !qrBase64 && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Gerando QR Code...</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
