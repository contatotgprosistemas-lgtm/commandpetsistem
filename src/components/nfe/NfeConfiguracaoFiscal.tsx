import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Save, TestTube, Loader2, CheckCircle, XCircle } from "lucide-react";

interface Props { empresaId: string }

export function NfeConfiguracaoFiscal({ empresaId }: Props) {
  const queryClient = useQueryClient();
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [testing, setTesting] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["fiscal_settings", empresaId],
    queryFn: async () => {
      const { data } = await supabase
        .from("fiscal_settings")
        .select("*")
        .eq("empresa_id", empresaId)
        .maybeSingle();
      return data;
    },
  });

  const [form, setForm] = useState({
    razao_social: "",
    nome_fantasia: "",
    cnpj: "",
    inscricao_estadual: "",
    regime_tributario: "simples_nacional",
    endereco_logradouro: "",
    endereco_numero: "",
    endereco_complemento: "",
    endereco_bairro: "",
    endereco_cep: "",
    endereco_municipio: "",
    endereco_codigo_municipio: "",
    endereco_uf: "",
    token_focus: "",
    ambiente: "homologacao",
    serie_padrao: "1",
    natureza_operacao_padrao: "Venda de mercadorias",
    cfop_padrao: "5102",
    webhook_url: "",
    webhook_ativo: false,
  });

  useEffect(() => {
    if (settings) {
      setForm({
        razao_social: settings.razao_social || "",
        nome_fantasia: settings.nome_fantasia || "",
        cnpj: settings.cnpj || "",
        inscricao_estadual: settings.inscricao_estadual || "",
        regime_tributario: settings.regime_tributario || "simples_nacional",
        endereco_logradouro: settings.endereco_logradouro || "",
        endereco_numero: settings.endereco_numero || "",
        endereco_complemento: settings.endereco_complemento || "",
        endereco_bairro: settings.endereco_bairro || "",
        endereco_cep: settings.endereco_cep || "",
        endereco_municipio: settings.endereco_municipio || "",
        endereco_codigo_municipio: settings.endereco_codigo_municipio || "",
        endereco_uf: settings.endereco_uf || "",
        token_focus: settings.token_focus || "",
        ambiente: settings.ambiente || "homologacao",
        serie_padrao: settings.serie_padrao || "1",
        natureza_operacao_padrao: settings.natureza_operacao_padrao || "Venda de mercadorias",
        cfop_padrao: settings.cfop_padrao || "5102",
        webhook_url: settings.webhook_url || "",
        webhook_ativo: settings.webhook_ativo || false,
      });
    }
  }, [settings]);

  const update = (field: string, value: any) => setForm((p) => ({ ...p, [field]: value }));

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { ...form, empresa_id: empresaId };
      if (settings) {
        const { error } = await supabase.from("fiscal_settings").update(payload).eq("id", settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("fiscal_settings").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Configurações salvas!");
      queryClient.invalidateQueries({ queryKey: ["fiscal_settings"] });
    },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });

  const testConnection = async () => {
    if (!form.token_focus) {
      toast.error("Informe o token da Focus NFe");
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("focus-nfe-v2", {
        body: { action: "testar_conexao", empresa_id: empresaId },
      });
      if (error) throw error;
      setTestResult({ ok: data?.ok || data?.status === 200, message: data?.ok ? "Conexão OK!" : `Status: ${data?.status}` });
    } catch (e: any) {
      setTestResult({ ok: false, message: e.message });
    } finally {
      setTesting(false);
    }
  };

  const buscarCep = async () => {
    const clean = form.endereco_cep.replace(/\D/g, "");
    if (clean.length !== 8) return;
    try {
      const resp = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const data = await resp.json();
      if (!data.erro) {
        update("endereco_logradouro", data.logradouro || "");
        update("endereco_bairro", data.bairro || "");
        update("endereco_municipio", data.localidade || "");
        update("endereco_uf", data.uf || "");
        update("endereco_codigo_municipio", data.ibge || "");
      }
    } catch {}
  };

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados do Emitente</CardTitle>
          <CardDescription>Configuração fiscal da empresa para emissão de NF-e</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div><Label>Razão Social</Label><Input value={form.razao_social} onChange={(e) => update("razao_social", e.target.value)} /></div>
          <div><Label>Nome Fantasia</Label><Input value={form.nome_fantasia} onChange={(e) => update("nome_fantasia", e.target.value)} /></div>
          <div><Label>CNPJ</Label><Input value={form.cnpj} onChange={(e) => update("cnpj", e.target.value)} /></div>
          <div><Label>Inscrição Estadual</Label><Input value={form.inscricao_estadual} onChange={(e) => update("inscricao_estadual", e.target.value)} /></div>
          <div>
            <Label>Regime Tributário</Label>
            <Select value={form.regime_tributario} onValueChange={(v) => update("regime_tributario", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="simples_nacional">Simples Nacional</SelectItem>
                <SelectItem value="lucro_presumido">Lucro Presumido</SelectItem>
                <SelectItem value="lucro_real">Lucro Real</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Endereço Fiscal</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div><Label>CEP</Label><Input value={form.endereco_cep} onChange={(e) => update("endereco_cep", e.target.value)} onBlur={buscarCep} /></div>
          <div className="md:col-span-2"><Label>Logradouro</Label><Input value={form.endereco_logradouro} onChange={(e) => update("endereco_logradouro", e.target.value)} /></div>
          <div><Label>Número</Label><Input value={form.endereco_numero} onChange={(e) => update("endereco_numero", e.target.value)} /></div>
          <div><Label>Complemento</Label><Input value={form.endereco_complemento} onChange={(e) => update("endereco_complemento", e.target.value)} /></div>
          <div><Label>Bairro</Label><Input value={form.endereco_bairro} onChange={(e) => update("endereco_bairro", e.target.value)} /></div>
          <div><Label>Município</Label><Input value={form.endereco_municipio} onChange={(e) => update("endereco_municipio", e.target.value)} /></div>
          <div><Label>Cód. Município (IBGE)</Label><Input value={form.endereco_codigo_municipio} onChange={(e) => update("endereco_codigo_municipio", e.target.value)} /></div>
          <div><Label>UF</Label><Input value={form.endereco_uf} onChange={(e) => update("endereco_uf", e.target.value)} maxLength={2} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Integração Focus NFe</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <Label>Token da Focus NFe</Label>
              <Input type="password" value={form.token_focus} onChange={(e) => update("token_focus", e.target.value)} placeholder="Insira o token de acesso" />
            </div>
            <div>
              <Label>Ambiente</Label>
              <Select value={form.ambiente} onValueChange={(v) => update("ambiente", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="homologacao">Homologação</SelectItem>
                  <SelectItem value="producao">Produção</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={testConnection} disabled={testing}>
              {testing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <TestTube className="h-4 w-4 mr-1" />}
              Testar Conexão
            </Button>
            {testResult && (
              <Badge variant={testResult.ok ? "default" : "destructive"} className="gap-1">
                {testResult.ok ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                {testResult.message}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Padrões de Emissão</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div><Label>Série Padrão</Label><Input value={form.serie_padrao} onChange={(e) => update("serie_padrao", e.target.value)} /></div>
          <div><Label>Natureza de Operação</Label><Input value={form.natureza_operacao_padrao} onChange={(e) => update("natureza_operacao_padrao", e.target.value)} /></div>
          <div><Label>CFOP Padrão</Label><Input value={form.cfop_padrao} onChange={(e) => update("cfop_padrao", e.target.value)} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Webhook</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label>URL do Webhook</Label>
            <Input value={form.webhook_url} onChange={(e) => update("webhook_url", e.target.value)} placeholder="https://..." />
          </div>
          <div className="flex items-end gap-2">
            <Button variant={form.webhook_ativo ? "default" : "outline"} size="sm" onClick={() => update("webhook_ativo", !form.webhook_ativo)}>
              {form.webhook_ativo ? "Ativo" : "Inativo"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          <Save className="h-4 w-4 mr-1" /> Salvar Configurações
        </Button>
      </div>
    </div>
  );
}
