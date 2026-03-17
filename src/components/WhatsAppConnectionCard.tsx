import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Smartphone, Wifi, WifiOff, QrCode, RefreshCw } from "lucide-react";

type ConnectionStatus = "desconectado" | "aguardando_qrcode" | "conectado" | "sessao_expirada";

const STATUS_CONFIG: Record<ConnectionStatus, { label: string; color: string; icon: typeof Wifi }> = {
  desconectado: { label: "Desconectado", color: "bg-destructive/15 text-destructive border-destructive/30", icon: WifiOff },
  aguardando_qrcode: { label: "Aguardando QR Code", color: "bg-warning/15 text-warning border-warning/30", icon: QrCode },
  conectado: { label: "Conectado", color: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30", icon: Wifi },
  sessao_expirada: { label: "Sessão Expirada", color: "bg-muted text-muted-foreground border-border", icon: WifiOff },
};

export default function WhatsAppConnectionCard() {
  const { profile } = useAuth();
  const [status, setStatus] = useState<ConnectionStatus>("desconectado");
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [numero, setNumero] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [showQr, setShowQr] = useState(false);

  // Fetch existing connection
  useEffect(() => {
    if (!profile?.empresa_id) return;

    const fetchConnection = async () => {
      const { data } = await supabase
        .from("conexoes_whatsapp")
        .select("*")
        .eq("empresa_id", profile.empresa_id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        const conn = data[0];
        setConnectionId(conn.id);
        setStatus(conn.status as ConnectionStatus);
        setNumero(conn.numero);
      }
      setLoading(false);
    };

    fetchConnection();

    // Realtime subscription for status changes
    const channel = supabase
      .channel("whatsapp-connection")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conexoes_whatsapp",
          filter: `empresa_id=eq.${profile.empresa_id}`,
        },
        (payload) => {
          if (payload.new && typeof payload.new === "object" && "status" in payload.new) {
            const row = payload.new as any;
            setStatus(row.status as ConnectionStatus);
            setNumero(row.numero);
            setConnectionId(row.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.empresa_id]);

  const handleConnect = async () => {
    if (!profile?.empresa_id) return;
    setActing(true);

    try {
      if (!connectionId) {
        // Create connection record
        const { data, error } = await supabase
          .from("conexoes_whatsapp")
          .insert({ empresa_id: profile.empresa_id, status: "aguardando_qrcode" })
          .select()
          .single();

        if (error) throw error;
        setConnectionId(data.id);
      } else {
        // Update existing
        await supabase
          .from("conexoes_whatsapp")
          .update({ status: "aguardando_qrcode", updated_at: new Date().toISOString() })
          .eq("id", connectionId);
      }

      setStatus("aguardando_qrcode");
      setShowQr(true);
      toast({ title: "QR Code gerado", description: "Escaneie o QR Code com o WhatsApp" });
    } catch (err: any) {
      toast({ title: "Erro ao conectar", description: err.message, variant: "destructive" });
    }
    setActing(false);
  };

  const handleDisconnect = async () => {
    if (!connectionId) return;
    setActing(true);

    try {
      await supabase
        .from("conexoes_whatsapp")
        .update({ status: "desconectado", numero: null, session_data: null, updated_at: new Date().toISOString() })
        .eq("id", connectionId);

      setStatus("desconectado");
      setShowQr(false);
      setNumero(null);
      toast({ title: "WhatsApp desconectado" });
    } catch (err: any) {
      toast({ title: "Erro ao desconectar", description: err.message, variant: "destructive" });
    }
    setActing(false);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const cfg = STATUS_CONFIG[status];
  const StatusIcon = cfg.icon;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Smartphone className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <CardTitle className="text-base">WhatsApp Business</CardTitle>
              <CardDescription>
                {numero ? `Conectado: ${numero}` : "Conecte sua conta para enviar e receber mensagens"}
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className={`gap-1.5 ${cfg.color}`}>
            <StatusIcon className="h-3 w-3" />
            {cfg.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* QR Code Area */}
        {(showQr || status === "aguardando_qrcode") && (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="w-64 h-64 border-2 border-dashed border-border rounded-xl flex items-center justify-center bg-muted/30">
              <div className="text-center space-y-2">
                <QrCode className="h-16 w-16 text-muted-foreground mx-auto" />
                <p className="text-xs text-muted-foreground max-w-[180px]">
                  O QR Code será exibido aqui quando o servidor WhatsApp estiver configurado
                </p>
              </div>
            </div>

            <div className="text-center space-y-1.5 max-w-xs">
              <p className="text-sm font-medium text-foreground">Como conectar:</p>
              <ol className="text-xs text-muted-foreground space-y-1 text-left list-decimal list-inside">
                <li>Abra o <strong>WhatsApp</strong> no seu celular</li>
                <li>Toque em <strong>Dispositivos conectados</strong></li>
                <li>Toque em <strong>Conectar um dispositivo</strong></li>
                <li>Aponte a câmera para o QR Code acima</li>
              </ol>
            </div>

            <Button variant="ghost" size="sm" className="gap-2" onClick={handleConnect} disabled={acting}>
              <RefreshCw className={`h-3.5 w-3.5 ${acting ? "animate-spin" : ""}`} />
              Gerar novo QR Code
            </Button>
          </div>
        )}

        {/* Connected State */}
        {status === "conectado" && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
            <Wifi className="h-5 w-5 text-emerald-600" />
            <div>
              <p className="text-sm font-medium text-foreground">Sessão ativa</p>
              <p className="text-xs text-muted-foreground">
                Mensagens estão sendo enviadas e recebidas normalmente
              </p>
            </div>
          </div>
        )}

        {/* Session Expired State */}
        {status === "sessao_expirada" && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
            <WifiOff className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">Sessão expirada</p>
              <p className="text-xs text-muted-foreground">
                Reconecte escaneando o QR Code novamente
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          {status === "desconectado" || status === "sessao_expirada" ? (
            <Button onClick={handleConnect} disabled={acting} className="gap-2">
              {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Smartphone className="h-4 w-4" />}
              Conectar WhatsApp
            </Button>
          ) : status === "conectado" ? (
            <Button variant="destructive" onClick={handleDisconnect} disabled={acting} className="gap-2">
              {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : <WifiOff className="h-4 w-4" />}
              Desconectar
            </Button>
          ) : null}
        </div>

        {/* Info */}
        <p className="text-xs text-muted-foreground border-t border-border pt-4">
          ⚠️ Para funcionar completamente, é necessário configurar um servidor WhatsApp externo (ex: Evolution API).
          A interface está preparada para integração.
        </p>
      </CardContent>
    </Card>
  );
}
