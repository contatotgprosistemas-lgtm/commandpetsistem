import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentEmpresa } from "@/lib/useCurrentEmpresa";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Cake, Send, History } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const DEFAULT_CLIENTE = "🎉 Feliz aniversário, {nome}! Toda nossa equipe deseja um dia maravilhoso, cheio de alegria, saúde e muito carinho. Que este novo ciclo seja repleto de conquistas! 🎂✨";
const DEFAULT_PET = "🐾🎂 Feliz aniversário, {pet}! Hoje é o dia mais especial do ano para esse pet incrível! Mande muito carinho do {tutor} e nossa equipe deseja um dia cheio de petiscos, brincadeiras e amor! 🎉🦴";

export function AniversariosCard() {
  const { data: empresaId } = useCurrentEmpresa();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [sendCliente, setSendCliente] = useState(true);
  const [sendPet, setSendPet] = useState(true);
  const [msgCliente, setMsgCliente] = useState(DEFAULT_CLIENTE);
  const [msgPet, setMsgPet] = useState(DEFAULT_PET);
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    if (!empresaId) return;
    (async () => {
      const { data } = await supabase
        .from("birthday_config")
        .select("*")
        .eq("empresa_id", empresaId)
        .maybeSingle();
      if (data) {
        setEnabled(data.enabled);
        setSendCliente(data.send_to_cliente);
        setSendPet(data.send_to_pet);
        setMsgCliente(data.mensagem_cliente);
        setMsgPet(data.mensagem_pet);
      }
      const { data: logData } = await supabase
        .from("birthday_log")
        .select("id, tipo, ano, enviado_em, cliente_id, pet_id, clientes:cliente_id(nome), pets:pet_id(nome)")
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
    const { error } = await supabase.from("birthday_config").upsert({
      empresa_id: empresaId,
      enabled,
      send_to_cliente: sendCliente,
      send_to_pet: sendPet,
      mensagem_cliente: msgCliente,
      mensagem_pet: msgPet,
    });
    setSaving(false);
    if (error) toast.error("Erro ao salvar: " + error.message);
    else toast.success("Configurações salvas!");
  };

  const dispararAgora = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("birthday-notifications");
      if (error) throw error;
      toast.success(`Processado: ${data?.totalEnviados ?? 0} mensagem(ns) enviada(s) hoje`);
      // recarrega log
      const { data: logData } = await supabase
        .from("birthday_log")
        .select("id, tipo, ano, enviado_em, cliente_id, pet_id, clientes:cliente_id(nome), pets:pet_id(nome)")
        .eq("empresa_id", empresaId!)
        .order("enviado_em", { ascending: false })
        .limit(20);
      setLogs(logData ?? []);
    } catch (err: any) {
      toast.error("Erro: " + (err.message ?? "falha ao executar"));
    }
    setRunning(false);
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
          <Cake className="h-4 w-4 text-primary" /> Mensagens de Aniversário
        </CardTitle>
        <CardDescription>
          Envia automaticamente uma notificação no portal do cliente todo dia às 09:00 (BRT).
          Use as variáveis <code className="bg-muted px-1 rounded text-[11px]">{"{nome}"}</code>, <code className="bg-muted px-1 rounded text-[11px]">{"{pet}"}</code> e <code className="bg-muted px-1 rounded text-[11px]">{"{tutor}"}</code>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between py-2 border-b border-border">
          <div>
            <p className="text-sm font-medium text-foreground">Envios automáticos ativos</p>
            <p className="text-xs text-muted-foreground">Quando desligado, nenhuma mensagem é enviada.</p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">🎉 Aniversário do cliente</Label>
            <Switch checked={sendCliente} onCheckedChange={setSendCliente} disabled={!enabled} />
          </div>
          <Textarea
            value={msgCliente}
            onChange={(e) => setMsgCliente(e.target.value)}
            rows={3}
            disabled={!enabled || !sendCliente}
            className="text-sm"
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">🐾 Aniversário do pet</Label>
            <Switch checked={sendPet} onCheckedChange={setSendPet} disabled={!enabled} />
          </div>
          <Textarea
            value={msgPet}
            onChange={(e) => setMsgPet(e.target.value)}
            rows={3}
            disabled={!enabled || !sendPet}
            className="text-sm"
          />
        </div>

        <div className="flex items-center gap-2 pt-2">
          <Button onClick={salvar} disabled={saving} className="gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Salvar configurações
          </Button>
          <Button variant="outline" onClick={dispararAgora} disabled={running} className="gap-2">
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Verificar e enviar agora
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
              {logs.map((l) => (
                <div key={l.id} className="flex items-center justify-between text-xs py-2 px-3 rounded-md bg-muted/40">
                  <div className="flex items-center gap-2">
                    <Badge variant={l.tipo === "pet" ? "secondary" : "default"} className="text-[10px]">
                      {l.tipo === "pet" ? "🐾 Pet" : "🎉 Cliente"}
                    </Badge>
                    <span className="font-medium">
                      {l.tipo === "pet" ? (l.pets?.nome ?? "Pet") : (l.clientes?.nome ?? "Cliente")}
                    </span>
                    {l.tipo === "pet" && l.clientes?.nome && (
                      <span className="text-muted-foreground">• {l.clientes.nome}</span>
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