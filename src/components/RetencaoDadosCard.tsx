import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Loader2, Save, Trash2, Database } from "lucide-react";
import { formatDateBR } from "@/lib/utils";

export function RetencaoDadosCard() {
  const { profile } = useAuth();
  const empresaId = profile?.empresa_id;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [form, setForm] = useState({
    enabled: true,
    crm_media_retention_days: 60,
    crm_message_retention_days: 180,
    audit_log_retention_days: 180,
  });
  const [lastRunAt, setLastRunAt] = useState<string | null>(null);
  const [lastRunSummary, setLastRunSummary] = useState<any>(null);

  useEffect(() => {
    if (!empresaId) return;
    (async () => {
      const { data } = await supabase
        .from("data_retention_config")
        .select("*")
        .eq("empresa_id", empresaId)
        .maybeSingle();
      if (data) {
        setForm({
          enabled: data.enabled,
          crm_media_retention_days: data.crm_media_retention_days,
          crm_message_retention_days: data.crm_message_retention_days,
          audit_log_retention_days: data.audit_log_retention_days,
        });
        setLastRunAt(data.last_run_at);
        setLastRunSummary(data.last_run_summary);
      }
      setLoading(false);
    })();
  }, [empresaId]);

  const save = async () => {
    if (!empresaId) return;
    setSaving(true);
    const { error } = await supabase
      .from("data_retention_config")
      .upsert({ empresa_id: empresaId, ...form }, { onConflict: "empresa_id" });
    setSaving(false);
    if (error) toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    else toast({ title: "Configuração salva!" });
  };

  const runNow = async () => {
    if (!empresaId) return;
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("cleanup-old-data", {
        body: { empresa_id: empresaId },
      });
      if (error) throw error;
      const stats = data?.empresas?.[0];
      toast({
        title: "Limpeza concluída",
        description: stats
          ? `Mídias: ${stats.crm_media_files_deleted} • Mensagens: ${stats.crm_messages_deleted} • Logs: ${stats.audit_logs_deleted}`
          : "Sem dados a remover.",
      });
      // refresh
      const { data: updated } = await supabase
        .from("data_retention_config")
        .select("last_run_at, last_run_summary")
        .eq("empresa_id", empresaId)
        .maybeSingle();
      setLastRunAt(updated?.last_run_at ?? null);
      setLastRunSummary(updated?.last_run_summary ?? null);
    } catch (e: any) {
      toast({ title: "Erro na limpeza", description: e.message, variant: "destructive" });
    } finally {
      setRunning(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Database className="h-4 w-4" /> Retenção de Dados (Cloud)
        </CardTitle>
        <CardDescription>
          Apaga automaticamente mídias do WhatsApp, mensagens do CRM e logs de auditoria
          antigos para reduzir o consumo de armazenamento e tráfego (egress).
          Executado diariamente às 03:00.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label>Limpeza automática ativa</Label>
            <p className="text-xs text-muted-foreground">Quando desligado, nada é apagado.</p>
          </div>
          <Switch
            checked={form.enabled}
            onCheckedChange={(v) => setForm({ ...form, enabled: v })}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Mídias do WhatsApp (dias)</Label>
            <Input
              type="number"
              min={7}
              value={form.crm_media_retention_days}
              onChange={(e) => setForm({ ...form, crm_media_retention_days: Number(e.target.value) })}
            />
            <p className="text-xs text-muted-foreground">Apaga arquivos no storage. Padrão: 60</p>
          </div>
          <div className="space-y-2">
            <Label>Mensagens do CRM (dias)</Label>
            <Input
              type="number"
              min={30}
              value={form.crm_message_retention_days}
              onChange={(e) => setForm({ ...form, crm_message_retention_days: Number(e.target.value) })}
            />
            <p className="text-xs text-muted-foreground">Apaga registros antigos. Padrão: 180</p>
          </div>
          <div className="space-y-2">
            <Label>Logs de auditoria (dias)</Label>
            <Input
              type="number"
              min={30}
              value={form.audit_log_retention_days}
              onChange={(e) => setForm({ ...form, audit_log_retention_days: Number(e.target.value) })}
            />
            <p className="text-xs text-muted-foreground">Apaga histórico antigo. Padrão: 180</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Salvar
          </Button>
          <Button variant="outline" onClick={runNow} disabled={running}>
            {running ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
            Executar limpeza agora
          </Button>
        </div>

        {lastRunAt && (
          <div className="text-xs text-muted-foreground border-t pt-3">
            Última execução: {formatDateBR(lastRunAt)}{" "}
            {lastRunSummary && (
              <>
                — Mídias: <strong>{lastRunSummary.crm_media_files_deleted ?? 0}</strong> •
                {" "}Mensagens: <strong>{lastRunSummary.crm_messages_deleted ?? 0}</strong> •
                {" "}Logs: <strong>{lastRunSummary.audit_logs_deleted ?? 0}</strong>
                {lastRunSummary.errors?.length > 0 && (
                  <span className="text-destructive"> • {lastRunSummary.errors.length} erro(s)</span>
                )}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}