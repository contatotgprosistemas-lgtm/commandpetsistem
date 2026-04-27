import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentEmpresa } from "@/lib/useCurrentEmpresa";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Receipt, History, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const DEFAULT_MSG =
  "Olá {nome}! 👋\n\nUma nova fatura foi gerada para você:\n\n📄 *{descricao}*\n💰 Valor: *R$ {valor}*\n📅 Vencimento: *{vencimento}*\n\nQualquer dúvida, estamos à disposição. 🐾";

export function FaturaWhatsappCard() {
  const { data: empresaId } = useCurrentEmpresa();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [mensagem, setMensagem] = useState(DEFAULT_MSG);
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    if (!empresaId) return;
    (async () => {
      const { data } = await supabase
        .from("invoice_notification_config")
        .select("*")
        .eq("empresa_id", empresaId)
        .maybeSingle();
      if (data) {
        setEnabled(data.enabled);
        setMensagem(data.mensagem);
      }
      const { data: logData } = await supabase
        .from("invoice_notification_log")
        .select("id, status, erro, enviado_em, cliente_id, clientes:cliente_id(nome)")
        .eq("empresa_id", empresaId)
        .order("enviado_em", { ascending: false })
        .limit(20);
      setLogs(logData ?? []);
      setLoading(false);
    })();
  }, [empresaId]);

  const salvar = async () => {
    if (!empresaId) return;
    setSaving(true);
    const { error } = await supabase
      .from("invoice_notification_config")
      .upsert({ empresa_id: empresaId, enabled, mensagem });
    setSaving(false);
    if (error) toast.error("Erro ao salvar: " + error.message);
    else toast.success("Configurações salvas!");
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Receipt className="h-4 w-4 text-primary" /> Notificação de fatura via WhatsApp
        </CardTitle>
        <CardDescription>
          Quando uma nova fatura for gerada automaticamente, envia uma mensagem ao cliente pelo
          número do WhatsApp conectado no CRM. Variáveis disponíveis:{" "}
          <code className="bg-muted px-1 rounded text-[11px]">{"{nome}"}</code>,{" "}
          <code className="bg-muted px-1 rounded text-[11px]">{"{descricao}"}</code>,{" "}
          <code className="bg-muted px-1 rounded text-[11px]">{"{valor}"}</code>,{" "}
          <code className="bg-muted px-1 rounded text-[11px]">{"{vencimento}"}</code>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between py-2 border-b border-border">
          <div>
            <p className="text-sm font-medium text-foreground">Envio automático ativo</p>
            <p className="text-xs text-muted-foreground">
              Desligue para não disparar mensagens ao gerar faturas.
            </p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Mensagem enviada</Label>
          <Textarea
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            rows={6}
            disabled={!enabled}
            className="text-sm font-mono"
          />
        </div>

        <div className="flex items-start gap-2 p-3 rounded-md bg-warning/10 border border-warning/30 text-xs text-foreground">
          <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
          <div>
            <strong>Atenção:</strong> envios em massa de mensagens transacionais para muitos
            contatos em curto intervalo podem fazer o WhatsApp suspender o número. Use textos
            personalizados (com {"{nome}"}), evite links suspeitos e mantenha um volume saudável.
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <Button onClick={salvar} disabled={saving} className="gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Salvar configurações
          </Button>
        </div>

        <div className="pt-4 border-t border-border">
          <div className="flex items-center gap-2 mb-3">
            <History className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium">Últimos envios</p>
          </div>
          {logs.length === 0 ? (
            <p className="text-xs text-muted-foreground py-3">Nenhuma mensagem enviada ainda.</p>
          ) : (
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {logs.map((l: any) => (
                <div
                  key={l.id}
                  className="flex items-center justify-between text-xs py-2 px-3 rounded-md bg-muted/40"
                >
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={l.status === "enviado" ? "default" : "destructive"}
                      className="text-[10px]"
                    >
                      {l.status === "enviado" ? "Enviado" : "Falha"}
                    </Badge>
                    <span className="font-medium">{l.clientes?.nome ?? "Cliente"}</span>
                    {l.erro && (
                      <span className="text-muted-foreground truncate max-w-[260px]">
                        • {l.erro}
                      </span>
                    )}
                  </div>
                  <span className="text-muted-foreground">
                    {format(new Date(l.enviado_em), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
