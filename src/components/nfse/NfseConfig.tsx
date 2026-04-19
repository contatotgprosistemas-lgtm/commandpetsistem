import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Save, TestTube, Loader2, CheckCircle, XCircle } from "lucide-react";

interface Props { empresaId: string }

export function NfseConfig({ empresaId }: Props) {
  const qc = useQueryClient();
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const { data: cfg, isLoading } = useQuery({
    queryKey: ["asaas_nfse_config", empresaId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("asaas_nfse_config")
        .select("*")
        .eq("empresa_id", empresaId)
        .maybeSingle();
      return data;
    },
  });

  const { data: contasAsaas = [] } = useQuery({
    queryKey: ["asaas_contas_ativas", empresaId],
    queryFn: async () => {
      const { data } = await supabase
        .from("asaas_contas")
        .select("id, label")
        .eq("empresa_id", empresaId)
        .eq("ativo", true)
        .order("prioridade");
      return data || [];
    },
  });

  const [form, setForm] = useState({
    asaas_conta_id: "",
    municipio_codigo_ibge: "",
    municipio_nome: "",
    uf: "",
    aliquota_iss: 0,
    item_lista_servico: "",
    codigo_servico_municipio: "",
    cnae: "",
    descricao_servico_padrao: "Prestação de serviços",
    rps_serie: "1",
    iss_retido: false,
    observacoes: "",
    emitir_automaticamente: false,
  });

  useEffect(() => {
    if (cfg) {
      setForm({
        asaas_conta_id: cfg.asaas_conta_id || "",
        municipio_codigo_ibge: cfg.municipio_codigo_ibge || "",
        municipio_nome: cfg.municipio_nome || "",
        uf: cfg.uf || "",
        aliquota_iss: Number(cfg.aliquota_iss || 0),
        item_lista_servico: cfg.item_lista_servico || "",
        codigo_servico_municipio: cfg.codigo_servico_municipio || "",
        cnae: cfg.cnae || "",
        descricao_servico_padrao: cfg.descricao_servico_padrao || "Prestação de serviços",
        rps_serie: cfg.rps_serie || "1",
        iss_retido: !!cfg.iss_retido,
        observacoes: cfg.observacoes || "",
        emitir_automaticamente: !!cfg.emitir_automaticamente,
      });
    }
  }, [cfg]);

  const upd = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));

  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...form, empresa_id: empresaId, asaas_conta_id: form.asaas_conta_id || null };
      if (cfg?.id) {
        const { error } = await (supabase as any)
          .from("asaas_nfse_config")
          .update(payload)
          .eq("id", cfg.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("asaas_nfse_config")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Configurações salvas!");
      qc.invalidateQueries({ queryKey: ["asaas_nfse_config"] });
    },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });

  const testar = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("asaas-nfse", {
        body: { action: "testar_conexao" },
      });
      if (error) throw error;
      setTestResult({
        ok: !!data?.ok,
        message: data?.ok
          ? `Conectado: ${data.conta?.name || data.conta?.email || "OK"}`
          : data?.error || `Status ${data?.status}`,
      });
    } catch (e: any) {
      setTestResult({ ok: false, message: e.message });
    } finally {
      setTesting(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Conta Asaas</CardTitle>
          <CardDescription>Selecione a conta Asaas usada para emitir as NFS-e</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label>Conta Asaas</Label>
            <Select value={form.asaas_conta_id || "auto"} onValueChange={(v) => upd("asaas_conta_id", v === "auto" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Automático (prioridade)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Automático (prioridade)</SelectItem>
                {contasAsaas.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-3">
            <Button variant="outline" size="sm" onClick={testar} disabled={testing}>
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
        <CardHeader>
          <CardTitle className="text-base">Dados Fiscais Municipais</CardTitle>
          <CardDescription>Informe os dados conforme cadastro da prefeitura</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label>Código IBGE do Município</Label>
            <Input value={form.municipio_codigo_ibge} onChange={(e) => upd("municipio_codigo_ibge", e.target.value)} placeholder="Ex: 3550308" />
          </div>
          <div>
            <Label>Município</Label>
            <Input value={form.municipio_nome} onChange={(e) => upd("municipio_nome", e.target.value)} placeholder="Ex: São Paulo" />
          </div>
          <div>
            <Label>UF</Label>
            <Input value={form.uf} onChange={(e) => upd("uf", e.target.value.toUpperCase())} maxLength={2} />
          </div>
          <div>
            <Label>Item da Lista de Serviços</Label>
            <Input value={form.item_lista_servico} onChange={(e) => upd("item_lista_servico", e.target.value)} placeholder="Ex: 5.05" />
          </div>
          <div>
            <Label>Código do Serviço (Município)</Label>
            <Input value={form.codigo_servico_municipio} onChange={(e) => upd("codigo_servico_municipio", e.target.value)} />
          </div>
          <div>
            <Label>CNAE</Label>
            <Input value={form.cnae} onChange={(e) => upd("cnae", e.target.value)} />
          </div>
          <div>
            <Label>Alíquota ISS (%)</Label>
            <Input type="number" step="0.01" value={form.aliquota_iss} onChange={(e) => upd("aliquota_iss", Number(e.target.value))} />
          </div>
          <div>
            <Label>Série RPS</Label>
            <Input value={form.rps_serie} onChange={(e) => upd("rps_serie", e.target.value)} />
          </div>
          <div className="flex items-end gap-2">
            <Switch checked={form.iss_retido} onCheckedChange={(v) => upd("iss_retido", v)} />
            <Label>ISS Retido</Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Padrões de Emissão</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Descrição padrão do serviço</Label>
            <Textarea
              value={form.descricao_servico_padrao}
              onChange={(e) => upd("descricao_servico_padrao", e.target.value)}
              rows={2}
            />
          </div>
          <div>
            <Label>Observações (opcional)</Label>
            <Textarea
              value={form.observacoes}
              onChange={(e) => upd("observacoes", e.target.value)}
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          <Save className="h-4 w-4 mr-1" /> Salvar Configurações
        </Button>
      </div>
    </div>
  );
}
