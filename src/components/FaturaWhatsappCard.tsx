import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentEmpresa } from "@/lib/useCurrentEmpresa";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Receipt, History, AlertTriangle, Timer } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const DEFAULT_GERACAO =
  "Olá {nome}! 👋\n\nUma nova fatura foi gerada para você:\n\n📄 *{descricao}*\n💰 Valor: *R$ {valor}*\n📅 Vencimento: *{vencimento}*\n\nQualquer dúvida, estamos à disposição. 🐾";
const DEFAULT_PRE =
  "Olá {primeiro_nome}! 👋\n\nPassando para lembrar que sua fatura *{descricao}* no valor de *R$ {valor}* vence em *{vencimento}* (em {dias_restantes} dias).\n\nQualquer dúvida, estamos por aqui. 🐾";
const DEFAULT_VENC =
  "Olá {primeiro_nome}!\n\nSua fatura *{descricao}* no valor de *R$ {valor}* vence *hoje ({vencimento})*.\n\nCaso já tenha efetuado o pagamento, por favor desconsidere. 🐾";
const DEFAULT_ATRASO =
  "Olá {primeiro_nome},\n\nIdentificamos que sua fatura *{descricao}* de *R$ {valor}*, com vencimento em {vencimento}, está em atraso há {dias_atraso} dias.\n\nPor favor, regularize quando possível ou entre em contato conosco. 🐾";

const TIPO_LABEL: Record<string, string> = {
  geracao: "Geração",
  pre_vencimento: "Pré-vencimento",
  vencimento: "Vencimento",
  atraso: "Atraso",
};

export function FaturaWhatsappCard() {
  const { data: empresaId } = useCurrentEmpresa();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // master switch
  const [enabled, setEnabled] = useState(true);

  // per-event
  const [enabledGeracao, setEnabledGeracao] = useState(true);
  const [msgGeracao, setMsgGeracao] = useState(DEFAULT_GERACAO);
  const [horaGeracao, setHoraGeracao] = useState<string>("09:00");

  const [enabledPre, setEnabledPre] = useState(true);
  const [msgPre, setMsgPre] = useState(DEFAULT_PRE);
  const [diasAntes, setDiasAntes] = useState<number>(3);
  const [horaPre, setHoraPre] = useState<string>("09:00");

  const [enabledVenc, setEnabledVenc] = useState(true);
  const [msgVenc, setMsgVenc] = useState(DEFAULT_VENC);
  const [horaVenc, setHoraVenc] = useState<string>("09:00");

  const [enabledAtraso, setEnabledAtraso] = useState(true);
  const [msgAtraso, setMsgAtraso] = useState(DEFAULT_ATRASO);
  const [diasApos, setDiasApos] = useState<number>(2);
  const [horaAtraso, setHoraAtraso] = useState<string>("09:00");

  // cadence
  const [intervalo, setIntervalo] = useState<number>(8);
  const [maxPorMin, setMaxPorMin] = useState<number>(6);

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
        setEnabledGeracao((data as any).enabled_geracao ?? true);
        setMsgGeracao((data as any).mensagem_geracao ?? data.mensagem ?? DEFAULT_GERACAO);
        setHoraGeracao(((data as any).hora_geracao ?? "09:00:00").slice(0, 5));
        setEnabledPre((data as any).enabled_pre_vencimento ?? true);
        setMsgPre((data as any).mensagem_pre_vencimento ?? DEFAULT_PRE);
        setDiasAntes((data as any).dias_antes ?? 3);
        setHoraPre(((data as any).hora_pre_vencimento ?? "09:00:00").slice(0, 5));
        setEnabledVenc((data as any).enabled_vencimento ?? true);
        setMsgVenc((data as any).mensagem_vencimento ?? DEFAULT_VENC);
        setHoraVenc(((data as any).hora_vencimento ?? "09:00:00").slice(0, 5));
        setEnabledAtraso((data as any).enabled_atraso ?? true);
        setMsgAtraso((data as any).mensagem_atraso ?? DEFAULT_ATRASO);
        setDiasApos((data as any).dias_apos ?? 2);
        setHoraAtraso(((data as any).hora_atraso ?? "09:00:00").slice(0, 5));
        setIntervalo((data as any).intervalo_entre_envios_seg ?? 8);
        setMaxPorMin((data as any).max_envios_por_minuto ?? 6);
      }
      const { data: logData } = await supabase
        .from("invoice_notification_log")
        .select("id, status, erro, tipo, enviado_em, cliente_id, clientes:cliente_id(nome)")
        .eq("empresa_id", empresaId)
        .order("enviado_em", { ascending: false })
        .limit(30);
      setLogs(logData ?? []);
      setLoading(false);
    })();
  }, [empresaId]);

  const salvar = async () => {
    if (!empresaId) return;
    setSaving(true);
    const { error } = await supabase
      .from("invoice_notification_config")
      .upsert({
        empresa_id: empresaId,
        enabled,
        // mantém compatibilidade
        mensagem: msgGeracao,
        enabled_geracao: enabledGeracao,
        mensagem_geracao: msgGeracao,
        hora_geracao: horaGeracao,
        enabled_pre_vencimento: enabledPre,
        mensagem_pre_vencimento: msgPre,
        dias_antes: diasAntes,
        hora_pre_vencimento: horaPre,
        enabled_vencimento: enabledVenc,
        mensagem_vencimento: msgVenc,
        hora_vencimento: horaVenc,
        enabled_atraso: enabledAtraso,
        mensagem_atraso: msgAtraso,
        dias_apos: diasApos,
        hora_atraso: horaAtraso,
        intervalo_entre_envios_seg: intervalo,
        max_envios_por_minuto: maxPorMin,
      });
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

  const variaveis = (
    <p className="text-[11px] text-muted-foreground">
      Variáveis: <code className="bg-muted px-1 rounded">{"{nome}"}</code>{" "}
      <code className="bg-muted px-1 rounded">{"{primeiro_nome}"}</code>{" "}
      <code className="bg-muted px-1 rounded">{"{descricao}"}</code>{" "}
      <code className="bg-muted px-1 rounded">{"{valor}"}</code>{" "}
      <code className="bg-muted px-1 rounded">{"{vencimento}"}</code>{" "}
      <code className="bg-muted px-1 rounded">{"{dias_restantes}"}</code>{" "}
      <code className="bg-muted px-1 rounded">{"{dias_atraso}"}</code>
    </p>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Receipt className="h-4 w-4 text-primary" /> Notificações de fatura via WhatsApp
        </CardTitle>
        <CardDescription>
          Envia mensagens automáticas ao cliente em 4 momentos: ao gerar a fatura, antes do
          vencimento, no dia do vencimento e em caso de atraso. Tudo pelo número de WhatsApp
          conectado no CRM.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between py-2 border-b border-border">
          <div>
            <p className="text-sm font-medium text-foreground">Envios automáticos ativos</p>
            <p className="text-xs text-muted-foreground">
              Chave geral. Desligando, nenhum dos 4 lembretes será enviado.
            </p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>

        <Tabs defaultValue="geracao" className="w-full">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="geracao">Geração</TabsTrigger>
            <TabsTrigger value="pre">Pré-venc.</TabsTrigger>
            <TabsTrigger value="venc">Vencimento</TabsTrigger>
            <TabsTrigger value="atraso">Atraso</TabsTrigger>
          </TabsList>

          <TabsContent value="geracao" className="space-y-3 pt-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Enviar ao gerar a fatura</Label>
              <Switch checked={enabledGeracao} onCheckedChange={setEnabledGeracao} disabled={!enabled} />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Horário de envio</Label>
              <Input
                type="time"
                value={horaGeracao}
                onChange={(e) => setHoraGeracao(e.target.value || "09:00")}
                disabled={!enabled || !enabledGeracao}
                className="w-28 h-8"
              />
              <span className="text-[11px] text-muted-foreground">(horário de Brasília)</span>
            </div>
            <Textarea
              value={msgGeracao}
              onChange={(e) => setMsgGeracao(e.target.value)}
              rows={7}
              disabled={!enabled || !enabledGeracao}
              className="text-sm font-mono"
            />
            {variaveis}
          </TabsContent>

          <TabsContent value="pre" className="space-y-3 pt-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Lembrete antes do vencimento</Label>
              <Switch checked={enabledPre} onCheckedChange={setEnabledPre} disabled={!enabled} />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Disparar</Label>
              <Input
                type="number"
                min={1}
                max={30}
                value={diasAntes}
                onChange={(e) => setDiasAntes(Math.max(1, Number(e.target.value || 1)))}
                disabled={!enabled || !enabledPre}
                className="w-20 h-8"
              />
              <span className="text-xs text-muted-foreground">dias antes do vencimento</span>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Horário de envio</Label>
              <Input
                type="time"
                value={horaPre}
                onChange={(e) => setHoraPre(e.target.value || "09:00")}
                disabled={!enabled || !enabledPre}
                className="w-28 h-8"
              />
              <span className="text-[11px] text-muted-foreground">(horário de Brasília)</span>
            </div>
            <Textarea
              value={msgPre}
              onChange={(e) => setMsgPre(e.target.value)}
              rows={7}
              disabled={!enabled || !enabledPre}
              className="text-sm font-mono"
            />
            {variaveis}
          </TabsContent>

          <TabsContent value="venc" className="space-y-3 pt-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">No dia do vencimento</Label>
              <Switch checked={enabledVenc} onCheckedChange={setEnabledVenc} disabled={!enabled} />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Horário de envio</Label>
              <Input
                type="time"
                value={horaVenc}
                onChange={(e) => setHoraVenc(e.target.value || "09:00")}
                disabled={!enabled || !enabledVenc}
                className="w-28 h-8"
              />
              <span className="text-[11px] text-muted-foreground">(horário de Brasília)</span>
            </div>
            <Textarea
              value={msgVenc}
              onChange={(e) => setMsgVenc(e.target.value)}
              rows={7}
              disabled={!enabled || !enabledVenc}
              className="text-sm font-mono"
            />
            {variaveis}
          </TabsContent>

          <TabsContent value="atraso" className="space-y-3 pt-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Aviso de atraso</Label>
              <Switch checked={enabledAtraso} onCheckedChange={setEnabledAtraso} disabled={!enabled} />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Disparar</Label>
              <Input
                type="number"
                min={1}
                max={30}
                value={diasApos}
                onChange={(e) => setDiasApos(Math.max(1, Number(e.target.value || 1)))}
                disabled={!enabled || !enabledAtraso}
                className="w-20 h-8"
              />
              <span className="text-xs text-muted-foreground">dias após o vencimento</span>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Horário de envio</Label>
              <Input
                type="time"
                value={horaAtraso}
                onChange={(e) => setHoraAtraso(e.target.value || "09:00")}
                disabled={!enabled || !enabledAtraso}
                className="w-28 h-8"
              />
              <span className="text-[11px] text-muted-foreground">(horário de Brasília)</span>
            </div>
            <Textarea
              value={msgAtraso}
              onChange={(e) => setMsgAtraso(e.target.value)}
              rows={7}
              disabled={!enabled || !enabledAtraso}
              className="text-sm font-mono"
            />
            {variaveis}
          </TabsContent>
        </Tabs>

        <div className="rounded-md border border-border p-3 space-y-3">
          <div className="flex items-center gap-2">
            <Timer className="h-4 w-4 text-primary" />
            <p className="text-sm font-medium">Cadência de envio</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Intervalo entre mensagens (segundos)</Label>
              <Input
                type="number"
                min={1}
                max={120}
                value={intervalo}
                onChange={(e) => setIntervalo(Math.max(1, Number(e.target.value || 1)))}
                disabled={!enabled}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Máximo de envios por minuto</Label>
              <Input
                type="number"
                min={1}
                max={30}
                value={maxPorMin}
                onChange={(e) => setMaxPorMin(Math.max(1, Number(e.target.value || 1)))}
                disabled={!enabled}
              />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Quanto maior o intervalo, menor o risco de bloqueio. Recomendado: 8s entre mensagens
            e até 6 por minuto.
          </p>
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
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      variant={l.status === "enviado" ? "default" : "destructive"}
                      className="text-[10px]"
                    >
                      {l.status === "enviado" ? "Enviado" : "Falha"}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px]">
                      {TIPO_LABEL[l.tipo] ?? "Geração"}
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
