import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Play, Eye, EyeOff } from "lucide-react";
import { formatDateBR } from "@/lib/utils";

function fmtMoney(v: number) {
  return Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function statusBadge(s: string) {
  const map: Record<string, any> = {
    pendente: ["secondary", "Pendente"],
    pago: ["default", "Pago"],
    vencido: ["destructive", "Vencido"],
    cancelado: ["outline", "Cancelado"],
  };
  const [v, l] = map[s] || ["outline", s];
  return <Badge variant={v}>{l}</Badge>;
}

export function CobrancaSaasTab({ empresas }: { empresas: any[] }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [config, setConfig] = useState<any>({
    api_key: "",
    ambiente: "sandbox",
    pix_habilitado: true,
    boleto_habilitado: true,
    webhook_token: "",
  });
  const [configId, setConfigId] = useState<string | null>(null);
  const [faturas, setFaturas] = useState<any[]>([]);
  const [filterEmpresa, setFilterEmpresa] = useState("todas");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [empresaGerar, setEmpresaGerar] = useState("");

  async function load() {
    setLoading(true);
    const [{ data: cfg }, { data: fats }] = await Promise.all([
      supabase.from("sistema_asaas_config").select("*").maybeSingle(),
      supabase.from("faturas_sistema").select("*").order("competencia", { ascending: false }),
    ]);
    if (cfg) {
      setConfig({
        api_key: cfg.api_key || "",
        ambiente: cfg.ambiente || "sandbox",
        pix_habilitado: cfg.pix_habilitado,
        boleto_habilitado: cfg.boleto_habilitado,
        webhook_token: cfg.webhook_token || "",
      });
      setConfigId(cfg.id);
    }
    setFaturas(fats || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function salvar() {
    setSaving(true);
    const payload = { ...config };
    let error;
    if (configId) {
      ({ error } = await supabase.from("sistema_asaas_config").update(payload).eq("id", configId));
    } else {
      const { data, error: e } = await supabase.from("sistema_asaas_config").insert(payload).select().single();
      error = e;
      if (data) setConfigId(data.id);
    }
    setSaving(false);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else toast({ title: "Configuração salva" });
  }

  async function gerarFaturas(empresaId?: string) {
    setRunning(true);
    const { data, error } = await supabase.functions.invoke("gerar-fatura-sistema", {
      body: empresaId ? { empresa_id: empresaId } : {},
    });
    setRunning(false);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Processamento concluído", description: `${data?.processed || 0} empresa(s)` });
      load();
    }
  }

  const empresaNome = (id: string) => empresas.find((e) => e.id === id)?.nome || "—";

  const faturasFiltradas = faturas.filter((f) => {
    if (filterEmpresa !== "todas" && f.empresa_id !== filterEmpresa) return false;
    if (filterStatus !== "todos" && f.status !== filterStatus) return false;
    return true;
  });

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Configuração Asaas (Cobrança do SaaS)</CardTitle>
          <CardDescription>Conta Asaas usada para cobrar a mensalidade das empresas clientes.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label>API Key Asaas</Label>
            <div className="flex gap-2">
              <Input
                type={showKey ? "text" : "password"}
                value={config.api_key}
                onChange={(e) => setConfig({ ...config, api_key: e.target.value })}
                placeholder="$aact_..."
              />
              <Button type="button" variant="outline" size="icon" onClick={() => setShowKey(!showKey)}>
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <div>
            <Label>Ambiente</Label>
            <Select value={config.ambiente} onValueChange={(v) => setConfig({ ...config, ambiente: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sandbox">Sandbox</SelectItem>
                <SelectItem value="production">Produção</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Token Webhook (opcional)</Label>
            <Input
              value={config.webhook_token}
              onChange={(e) => setConfig({ ...config, webhook_token: e.target.value })}
              placeholder="Token de validação do webhook"
            />
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={config.pix_habilitado} onCheckedChange={(v) => setConfig({ ...config, pix_habilitado: v })} />
            <Label>PIX habilitado</Label>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={config.boleto_habilitado} onCheckedChange={(v) => setConfig({ ...config, boleto_habilitado: v })} />
            <Label>Boleto habilitado</Label>
          </div>
          <div className="md:col-span-2 flex justify-between items-center pt-2 border-t">
            <div className="text-xs text-muted-foreground">
              URL Webhook: <code className="bg-muted px-1.5 py-0.5 rounded">https://eydsprhlsdgqfovjuylt.supabase.co/functions/v1/asaas-sistema-webhook</code>
            </div>
            <Button onClick={salvar} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Gerar fatura manual</CardTitle>
          <CardDescription>Útil para gerar a primeira fatura ou recriar uma faltante.</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2 items-end">
          <div className="flex-1">
            <Label>Empresa</Label>
            <Select value={empresaGerar} onValueChange={setEmpresaGerar}>
              <SelectTrigger><SelectValue placeholder="Selecione (vazio = todas)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as empresas</SelectItem>
                {empresas.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={() => gerarFaturas(empresaGerar && empresaGerar !== "todas" ? empresaGerar : undefined)}
            disabled={running}
          >
            {running ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
            Gerar
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Faturas do sistema</CardTitle>
          <CardDescription>Todas as cobranças mensais geradas para as empresas.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-3">
            <Select value={filterEmpresa} onValueChange={setFilterEmpresa}>
              <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as empresas</SelectItem>
                {empresas.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos status</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="pago">Pago</SelectItem>
                <SelectItem value="vencido">Vencido</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead>Competência</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Pagamento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {faturasFiltradas.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhuma fatura encontrada</TableCell></TableRow>
              ) : (
                faturasFiltradas.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell>{empresaNome(f.empresa_id)}</TableCell>
                    <TableCell>{f.competencia.slice(0, 7).split("-").reverse().join("/")}</TableCell>
                    <TableCell>{formatDateBR(f.vencimento)}</TableCell>
                    <TableCell>{fmtMoney(Number(f.valor))}</TableCell>
                    <TableCell>{statusBadge(f.status)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {f.data_pagamento ? `${formatDateBR(f.data_pagamento)} · ${f.forma_pagamento || ""}` : "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}