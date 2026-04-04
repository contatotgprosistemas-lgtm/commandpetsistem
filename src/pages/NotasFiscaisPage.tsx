import { useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import {
  FileText,
  Plus,
  Search,
  RefreshCw,
  XCircle,
  Download,
  Settings,
  Loader2,
  CheckCircle,
  AlertCircle,
  Clock,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pendente: { label: "Pendente", variant: "outline" },
  processando: { label: "Processando", variant: "secondary" },
  autorizada: { label: "Autorizada", variant: "default" },
  rejeitada: { label: "Rejeitada", variant: "destructive" },
  cancelada: { label: "Cancelada", variant: "destructive" },
};

const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case "autorizada": return <CheckCircle className="h-4 w-4 text-green-500" />;
    case "rejeitada":
    case "cancelada": return <XCircle className="h-4 w-4 text-destructive" />;
    case "processando": return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
    default: return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
};

export default function NotasFiscaisPage() {
  const { profile } = useAuth();
  const empresaId = profile?.empresa_id;
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("notas");
  const [emitirOpen, setEmitirOpen] = useState(false);
  const [tipoNota, setTipoNota] = useState<"nfse" | "nfe">("nfse");
  const [searchTerm, setSearchTerm] = useState("");
  const [cepLoading, setCepLoading] = useState(false);

  const buscarCep = useCallback(async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, "");
    if (cleanCep.length !== 8) return;
    setCepLoading(true);
    try {
      const resp = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await resp.json();
      if (!data.erro) {
        setFiscalForm((p) => ({
          ...p,
          endereco_logradouro: data.logradouro || p.endereco_logradouro,
          endereco_bairro: data.bairro || p.endereco_bairro,
          endereco_complemento: data.complemento || p.endereco_complemento,
          uf: data.uf || p.uf,
          codigo_municipio: data.ibge || p.codigo_municipio,
        }));
      }
    } catch {
      // silently fail
    } finally {
      setCepLoading(false);
    }
  }, []);

  // NFS-e form state
  const [nfseForm, setNfseForm] = useState({
    cliente_nome: "",
    cliente_cpf_cnpj: "",
    descricao: "",
    valor: "",
    aliquota_iss: "5",
    codigo_servico: "05.08",
    codigo_tributacao_nacional: "050801",
    codigo_tributario_municipio: "0508",
    endereco_logradouro: "",
    endereco_numero: "",
    endereco_complemento: "",
    endereco_bairro: "",
    endereco_cep: "",
    endereco_uf: "",
    endereco_municipio: "",
    endereco_codigo_municipio: "",
  });

  // NF-e form state
  const [nfeForm, setNfeForm] = useState({
    cliente_nome: "",
    cliente_cpf_cnpj: "",
    descricao: "",
    valor: "",
    ncm: "",
    cfop: "5102",
    quantidade: "1",
    endereco_logradouro: "",
    endereco_numero: "",
    endereco_complemento: "",
    endereco_bairro: "",
    endereco_cep: "",
    endereco_uf: "",
    endereco_municipio: "",
    endereco_codigo_municipio: "",
  });

  // Dados fiscais form state
  const [fiscalForm, setFiscalForm] = useState({
    razao_social: "",
    nome_fantasia: "",
    cnpj: "",
    inscricao_municipal: "",
    inscricao_estadual: "",
    regime_tributario: "simples_nacional",
    codigo_municipio: "",
    uf: "",
    endereco_logradouro: "",
    endereco_numero: "",
    endereco_complemento: "",
    endereco_bairro: "",
    endereco_cep: "",
    telefone: "",
    email: "",
  });

  // Fetch notas
  const { data: notas = [], isLoading: notasLoading } = useQuery({
    queryKey: ["notas_fiscais", empresaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notas_fiscais")
        .select("*")
        .eq("empresa_id", empresaId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!empresaId,
  });

  // Fetch dados fiscais
  const { data: dadosFiscais, isLoading: fiscaisLoading } = useQuery({
    queryKey: ["dados_fiscais_empresa", empresaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dados_fiscais_empresa")
        .select("*")
        .eq("empresa_id", empresaId!)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        setFiscalForm({
          razao_social: data.razao_social || "",
          nome_fantasia: data.nome_fantasia || "",
          cnpj: data.cnpj || "",
          inscricao_municipal: data.inscricao_municipal || "",
          inscricao_estadual: data.inscricao_estadual || "",
          regime_tributario: data.regime_tributario || "simples_nacional",
          codigo_municipio: data.codigo_municipio || "",
          uf: data.uf || "",
          endereco_logradouro: data.endereco_logradouro || "",
          endereco_numero: data.endereco_numero || "",
          endereco_complemento: data.endereco_complemento || "",
          endereco_bairro: data.endereco_bairro || "",
          endereco_cep: data.endereco_cep || "",
          telefone: data.telefone || "",
          email: data.email || "",
        });
      }
      return data;
    },
    enabled: !!empresaId,
  });

  // Save dados fiscais
  const saveFiscalMutation = useMutation({
    mutationFn: async () => {
      if (dadosFiscais) {
        const { error } = await supabase
          .from("dados_fiscais_empresa")
          .update(fiscalForm)
          .eq("id", dadosFiscais.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("dados_fiscais_empresa")
          .insert({ ...fiscalForm, empresa_id: empresaId! });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Dados fiscais salvos com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["dados_fiscais_empresa"] });
    },
    onError: () => toast.error("Erro ao salvar dados fiscais"),
  });

  // Emitir nota
  const emitirMutation = useMutation({
    mutationFn: async () => {
      const ref = `${tipoNota}-${Date.now()}`;
      const isNfse = tipoNota === "nfse";
      const form = isNfse ? nfseForm : nfeForm;
      const valor = parseFloat(form.valor);

      if (!form.cliente_nome || !form.cliente_cpf_cnpj || !form.descricao || isNaN(valor)) {
        throw new Error("Preencha todos os campos obrigatórios");
      }

      let dados: Record<string, unknown>;

      if (isNfse) {
        const prestadorCodigoMunicipio = fiscalForm.codigo_municipio.replace(/\D/g, "");
        const tomadorCodigoMunicipio = nfseForm.endereco_codigo_municipio.replace(/\D/g, "");
        const documentoTomador = form.cliente_cpf_cnpj.replace(/\D/g, "");
        const itemListaServico = nfseForm.codigo_servico.replace(/\D/g, "") || "0508";
        const codigoTributacaoNacional = nfseForm.codigo_tributacao_nacional.replace(/\D/g, "") || (itemListaServico === "0508" ? "050801" : "");
        const codigoTributarioMunicipio = nfseForm.codigo_tributario_municipio.replace(/\D/g, "");
        const shouldSendMunicipalTaxCode = !!codigoTributarioMunicipio && codigoTributarioMunicipio !== itemListaServico;

        dados = {
          data_emissao: new Date().toISOString().split("T")[0],
          codigo_municipio_prestacao: prestadorCodigoMunicipio || undefined,
          codigo_tributacao_nacional_iss: codigoTributacaoNacional || undefined,
          descricao_servico: form.descricao,
          valor_servico: valor,
          prestador: {
            cnpj: fiscalForm.cnpj,
            inscricao_municipal: fiscalForm.inscricao_municipal,
            codigo_municipio: prestadorCodigoMunicipio || undefined,
          },
          tomador: {
            cnpj: documentoTomador.length > 11 ? documentoTomador : undefined,
            cpf: documentoTomador.length <= 11 ? documentoTomador : undefined,
            razao_social: form.cliente_nome,
            endereco: nfseForm.endereco_logradouro
              ? {
                  logradouro: nfseForm.endereco_logradouro,
                  numero: nfseForm.endereco_numero || "S/N",
                  complemento: nfseForm.endereco_complemento || undefined,
                  bairro: nfseForm.endereco_bairro || undefined,
                  codigo_municipio: tomadorCodigoMunicipio || undefined,
                  uf: nfseForm.endereco_uf || undefined,
                  cep: nfseForm.endereco_cep || undefined,
                }
              : undefined,
          },
          servico: {
            aliquota: parseFloat(nfseForm.aliquota_iss) / 100,
            discriminacao: form.descricao,
            iss_retido: false,
            item_lista_servico: itemListaServico,
            codigo_municipio: prestadorCodigoMunicipio || undefined,
            codigo_tributacao_nacional_iss: codigoTributacaoNacional || undefined,
            codigo_tributario_municipio: shouldSendMunicipalTaxCode ? codigoTributarioMunicipio : undefined,
            valor_servicos: valor,
          },
        };
      } else {
        dados = {
          natureza_operacao: "Venda de mercadoria",
          forma_pagamento: "0",
          tipo_documento: "1",
          finalidade_emissao: "1",
          cnpj_emitente: fiscalForm.cnpj,
          nome_emitente: fiscalForm.razao_social,
          nome_fantasia_emitente: fiscalForm.nome_fantasia,
          inscricao_estadual_emitente: fiscalForm.inscricao_estadual,
          logradouro_emitente: fiscalForm.endereco_logradouro,
          numero_emitente: fiscalForm.endereco_numero,
          bairro_emitente: fiscalForm.endereco_bairro,
          municipio_emitente: fiscalForm.codigo_municipio,
          uf_emitente: fiscalForm.uf,
          cep_emitente: fiscalForm.endereco_cep,
          nome_destinatario: form.cliente_nome,
          cpf_destinatario: nfeForm.cliente_cpf_cnpj.length <= 11 ? nfeForm.cliente_cpf_cnpj : undefined,
          cnpj_destinatario: nfeForm.cliente_cpf_cnpj.length > 11 ? nfeForm.cliente_cpf_cnpj : undefined,
          logradouro_destinatario: nfeForm.endereco_logradouro || undefined,
          numero_destinatario: nfeForm.endereco_numero || undefined,
          complemento_destinatario: nfeForm.endereco_complemento || undefined,
          bairro_destinatario: nfeForm.endereco_bairro || undefined,
          municipio_destinatario: nfeForm.endereco_codigo_municipio || undefined,
          uf_destinatario: nfeForm.endereco_uf || undefined,
          cep_destinatario: nfeForm.endereco_cep || undefined,
          items: [
            {
              numero_item: "1",
              codigo_produto: "001",
              descricao: form.descricao,
              cfop: nfeForm.cfop,
              unidade_comercial: "UN",
              quantidade_comercial: nfeForm.quantidade,
              valor_unitario_comercial: valor,
              valor_bruto: valor * parseFloat(nfeForm.quantidade || "1"),
              ncm: nfeForm.ncm,
              inclui_no_total: "1",
              icms_origem: "0",
              icms_situacao_tributaria: "102",
              pis_situacao_tributaria: "07",
              cofins_situacao_tributaria: "07",
            },
          ],
        };
      }

      // Call edge function
      const { data: focusResult, error: focusError } = await supabase.functions.invoke("focus-nfe", {
        body: {
          action: isNfse ? "emitir_nfse" : "emitir_nfe",
          ref,
          dados,
        },
      });

      if (focusError) throw focusError;

      // Check for Focus API errors
      const hasApiError = focusResult?._http_status && focusResult._http_status >= 400;
      const hasErros = focusResult?.erros || focusResult?.codigo === "nao_encontrado" || focusResult?.error;
      const errorMsg = focusResult?.mensagem || (focusResult?.erros ? JSON.stringify(focusResult.erros) : null) || focusResult?.error || null;

      // Determine status
      let notaStatus = "processando";
      if (focusResult?.status === "autorizado" || focusResult?.status_sefaz === "100") {
        notaStatus = "autorizada";
      } else if (hasApiError || hasErros) {
        notaStatus = "rejeitada";
      }

      // Save to DB
      const { error: dbError } = await supabase.from("notas_fiscais").insert([{
        empresa_id: empresaId!,
        tipo: tipoNota,
        referencia: ref,
        status: notaStatus,
        numero: focusResult?.numero || null,
        url_pdf: focusResult?.url || null,
        cliente_nome: form.cliente_nome,
        cliente_cpf_cnpj: form.cliente_cpf_cnpj,
        descricao: form.descricao,
        valor_total: valor,
        dados_envio: JSON.parse(JSON.stringify(dados)),
        resposta_api: JSON.parse(JSON.stringify(focusResult)),
        mensagem_erro: errorMsg,
      }]);

      if (dbError) throw dbError;
      if (hasApiError || hasErros) {
        throw new Error(errorMsg || "Erro retornado pela API Focus NFe");
      }
      return focusResult;
    },
    onSuccess: (result) => {
      if (result?.erros) {
        toast.error("Nota enviada mas com erros. Verifique na lista.");
      } else {
        toast.success("Nota fiscal enviada para processamento!");
      }
      setEmitirOpen(false);
      queryClient.invalidateQueries({ queryKey: ["notas_fiscais"] });
      setNfseForm({ cliente_nome: "", cliente_cpf_cnpj: "", descricao: "", valor: "", aliquota_iss: "5", codigo_servico: "05.08", codigo_tributacao_nacional: "050801", codigo_tributario_municipio: "0508", endereco_logradouro: "", endereco_numero: "", endereco_complemento: "", endereco_bairro: "", endereco_cep: "", endereco_uf: "", endereco_municipio: "", endereco_codigo_municipio: "" });
      setNfeForm({ cliente_nome: "", cliente_cpf_cnpj: "", descricao: "", valor: "", ncm: "", cfop: "5102", quantidade: "1", endereco_logradouro: "", endereco_numero: "", endereco_complemento: "", endereco_bairro: "", endereco_cep: "", endereco_uf: "", endereco_municipio: "", endereco_codigo_municipio: "" });
    },
    onError: (err: Error) => toast.error(err.message || "Erro ao emitir nota"),
  });

  // Consultar status
  const consultarMutation = useMutation({
    mutationFn: async (nota: { id: string; referencia: string; tipo: string }) => {
      const { data: result, error } = await supabase.functions.invoke("focus-nfe", {
        body: {
          action: nota.tipo === "nfse" ? "consultar_nfse" : "consultar_nfe",
          ref: nota.referencia,
        },
      });
      if (error) throw error;

      const mensagemErro = result?.mensagem_sefaz || result?.mensagem || (result?.erros ? JSON.stringify(result.erros) : null) || null;

      await supabase
        .from("notas_fiscais")
        .update({
          status: result?.status === "autorizado" ? "autorizada" : result?.status === "cancelado" ? "cancelada" : result?.status === "erro_autorizacao" ? "rejeitada" : "processando",
          numero: result?.numero || null,
          chave_acesso: result?.chave_nfe || null,
          url_pdf: result?.url || result?.caminho_danfe || null,
          url_xml: result?.caminho_xml_nota_fiscal || null,
          resposta_api: result,
          mensagem_erro: mensagemErro,
        })
        .eq("id", nota.id);

      return result;
    },
    onSuccess: () => {
      toast.success("Status atualizado!");
      queryClient.invalidateQueries({ queryKey: ["notas_fiscais"] });
    },
    onError: () => toast.error("Erro ao consultar status"),
  });

  // Cancelar nota
  const cancelarMutation = useMutation({
    mutationFn: async (nota: { id: string; referencia: string; tipo: string }) => {
      const { data: result, error } = await supabase.functions.invoke("focus-nfe", {
        body: {
          action: nota.tipo === "nfse" ? "cancelar_nfse" : "cancelar_nfe",
          ref: nota.referencia,
          justificativa: "Cancelamento solicitado pelo emissor",
        },
      });
      if (error) throw error;

      await supabase
        .from("notas_fiscais")
        .update({ status: "cancelada", resposta_api: result })
        .eq("id", nota.id);

      return result;
    },
    onSuccess: () => {
      toast.success("Nota cancelada!");
      queryClient.invalidateQueries({ queryKey: ["notas_fiscais"] });
    },
    onError: () => toast.error("Erro ao cancelar nota"),
  });

  // Excluir registro com erro
  const excluirMutation = useMutation({
    mutationFn: async (notaId: string) => {
      const { error } = await supabase
        .from("notas_fiscais")
        .delete()
        .eq("id", notaId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Registro excluído!");
      queryClient.invalidateQueries({ queryKey: ["notas_fiscais"] });
    },
    onError: () => toast.error("Erro ao excluir registro"),
  });

  const filteredNotas = notas.filter(
    (n) =>
      !searchTerm ||
      n.cliente_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.referencia?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.numero?.includes(searchTerm)
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notas Fiscais</h1>
          <p className="text-sm text-muted-foreground">
            Emissão e gestão de NFS-e e NF-e via Focus NFe (Homologação)
          </p>
        </div>
        <Dialog open={emitirOpen} onOpenChange={setEmitirOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Emitir Nota
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Emitir Nota Fiscal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>Tipo</Label>
                <Select value={tipoNota} onValueChange={(v) => setTipoNota(v as "nfse" | "nfe")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nfse">NFS-e (Serviços)</SelectItem>
                    <SelectItem value="nfe">NF-e (Produtos)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {tipoNota === "nfse" ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Nome do Cliente *</Label>
                      <Input value={nfseForm.cliente_nome} onChange={(e) => setNfseForm((p) => ({ ...p, cliente_nome: e.target.value }))} />
                    </div>
                    <div>
                      <Label>CPF/CNPJ *</Label>
                      <Input value={nfseForm.cliente_cpf_cnpj} onChange={(e) => setNfseForm((p) => ({ ...p, cliente_cpf_cnpj: e.target.value.replace(/\D/g, "") }))} />
                    </div>
                  </div>
                  <div>
                    <Label>Descrição do Serviço *</Label>
                    <Textarea value={nfseForm.descricao} onChange={(e) => setNfseForm((p) => ({ ...p, descricao: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Valor (R$) *</Label>
                      <Input type="number" step="0.01" value={nfseForm.valor} onChange={(e) => setNfseForm((p) => ({ ...p, valor: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Alíquota ISS (%)</Label>
                      <Input type="number" step="0.01" value={nfseForm.aliquota_iss} onChange={(e) => setNfseForm((p) => ({ ...p, aliquota_iss: e.target.value }))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label>Cód. Serviço (item lista)</Label>
                      <Input value={nfseForm.codigo_servico} onChange={(e) => setNfseForm((p) => ({ ...p, codigo_servico: e.target.value }))} placeholder="Ex: 05.08" />
                    </div>
                    <div>
                      <Label>Cód. Tributação Nacional</Label>
                      <Input value={nfseForm.codigo_tributacao_nacional} onChange={(e) => setNfseForm((p) => ({ ...p, codigo_tributacao_nacional: e.target.value.replace(/\D/g, "") }))} placeholder="Ex: 050801" />
                    </div>
                    <div>
                      <Label>Cód. Tributário Município</Label>
                      <Input value={nfseForm.codigo_tributario_municipio} onChange={(e) => setNfseForm((p) => ({ ...p, codigo_tributario_municipio: e.target.value.replace(/\D/g, "") }))} placeholder="Ex: 0508" />
                    </div>
                  </div>

                  <Separator />
                  <p className="text-sm font-medium text-muted-foreground">Endereço do Tomador</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label>CEP</Label>
                      <Input
                        value={nfseForm.endereco_cep}
                        onChange={(e) => {
                          const cep = e.target.value.replace(/\D/g, "");
                          setNfseForm((p) => ({ ...p, endereco_cep: cep }));
                          if (cep.length === 8) {
                            fetch(`https://viacep.com.br/ws/${cep}/json/`)
                              .then(r => r.json())
                              .then(d => {
                                if (!d.erro) setNfseForm(p => ({
                                  ...p,
                                  endereco_logradouro: d.logradouro || "",
                                  endereco_bairro: d.bairro || "",
                                  endereco_complemento: d.complemento || "",
                                  endereco_uf: d.uf || "",
                                  endereco_municipio: d.localidade || "",
                                  endereco_codigo_municipio: d.ibge || "",
                                }));
                              }).catch(() => {});
                          }
                        }}
                        placeholder="00000000"
                      />
                    </div>
                    <div>
                      <Label>Logradouro</Label>
                      <Input value={nfseForm.endereco_logradouro} onChange={(e) => setNfseForm((p) => ({ ...p, endereco_logradouro: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Número</Label>
                      <Input value={nfseForm.endereco_numero} onChange={(e) => setNfseForm((p) => ({ ...p, endereco_numero: e.target.value }))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <Label>Complemento</Label>
                      <Input value={nfseForm.endereco_complemento} onChange={(e) => setNfseForm((p) => ({ ...p, endereco_complemento: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Bairro</Label>
                      <Input value={nfseForm.endereco_bairro} onChange={(e) => setNfseForm((p) => ({ ...p, endereco_bairro: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Município</Label>
                      <Input value={nfseForm.endereco_municipio} onChange={(e) => setNfseForm((p) => ({ ...p, endereco_municipio: e.target.value }))} disabled />
                    </div>
                    <div>
                      <Label>UF</Label>
                      <Input value={nfseForm.endereco_uf} onChange={(e) => setNfseForm((p) => ({ ...p, endereco_uf: e.target.value }))} maxLength={2} />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Nome do Cliente *</Label>
                      <Input value={nfeForm.cliente_nome} onChange={(e) => setNfeForm((p) => ({ ...p, cliente_nome: e.target.value }))} />
                    </div>
                    <div>
                      <Label>CPF/CNPJ *</Label>
                      <Input value={nfeForm.cliente_cpf_cnpj} onChange={(e) => setNfeForm((p) => ({ ...p, cliente_cpf_cnpj: e.target.value.replace(/\D/g, "") }))} />
                    </div>
                  </div>
                  <div>
                    <Label>Descrição do Produto *</Label>
                    <Textarea value={nfeForm.descricao} onChange={(e) => setNfeForm((p) => ({ ...p, descricao: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Valor Unitário (R$) *</Label>
                      <Input type="number" step="0.01" value={nfeForm.valor} onChange={(e) => setNfeForm((p) => ({ ...p, valor: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Quantidade</Label>
                      <Input type="number" value={nfeForm.quantidade} onChange={(e) => setNfeForm((p) => ({ ...p, quantidade: e.target.value }))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>NCM</Label>
                      <Input value={nfeForm.ncm} onChange={(e) => setNfeForm((p) => ({ ...p, ncm: e.target.value }))} placeholder="Ex: 01012100" />
                    </div>
                    <div>
                      <Label>CFOP</Label>
                      <Input value={nfeForm.cfop} onChange={(e) => setNfeForm((p) => ({ ...p, cfop: e.target.value }))} />
                    </div>
                  </div>

                  <Separator />
                  <p className="text-sm font-medium text-muted-foreground">Endereço do Destinatário</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label>CEP</Label>
                      <Input
                        value={nfeForm.endereco_cep}
                        onChange={(e) => {
                          const cep = e.target.value.replace(/\D/g, "");
                          setNfeForm((p) => ({ ...p, endereco_cep: cep }));
                          if (cep.length === 8) {
                            fetch(`https://viacep.com.br/ws/${cep}/json/`)
                              .then(r => r.json())
                              .then(d => {
                                if (!d.erro) setNfeForm(p => ({
                                  ...p,
                                  endereco_logradouro: d.logradouro || "",
                                  endereco_bairro: d.bairro || "",
                                  endereco_complemento: d.complemento || "",
                                  endereco_uf: d.uf || "",
                                  endereco_municipio: d.localidade || "",
                                  endereco_codigo_municipio: d.ibge || "",
                                }));
                              }).catch(() => {});
                          }
                        }}
                        placeholder="00000000"
                      />
                    </div>
                    <div>
                      <Label>Logradouro</Label>
                      <Input value={nfeForm.endereco_logradouro} onChange={(e) => setNfeForm((p) => ({ ...p, endereco_logradouro: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Número</Label>
                      <Input value={nfeForm.endereco_numero} onChange={(e) => setNfeForm((p) => ({ ...p, endereco_numero: e.target.value }))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <Label>Complemento</Label>
                      <Input value={nfeForm.endereco_complemento} onChange={(e) => setNfeForm((p) => ({ ...p, endereco_complemento: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Bairro</Label>
                      <Input value={nfeForm.endereco_bairro} onChange={(e) => setNfeForm((p) => ({ ...p, endereco_bairro: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Município</Label>
                      <Input value={nfeForm.endereco_municipio} onChange={(e) => setNfeForm((p) => ({ ...p, endereco_municipio: e.target.value }))} disabled />
                    </div>
                    <div>
                      <Label>UF</Label>
                      <Input value={nfeForm.endereco_uf} onChange={(e) => setNfeForm((p) => ({ ...p, endereco_uf: e.target.value }))} maxLength={2} />
                    </div>
                  </div>
                </>
              )}

              {!dadosFiscais?.cnpj && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  Configure seus dados fiscais na aba "Configurações Fiscais" antes de emitir.
                </div>
              )}

              <Button
                className="w-full"
                onClick={() => emitirMutation.mutate()}
                disabled={emitirMutation.isPending || !dadosFiscais?.cnpj}
              >
                {emitirMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4 mr-2" />
                )}
                Emitir {tipoNota === "nfse" ? "NFS-e" : "NF-e"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="notas">Notas Emitidas</TabsTrigger>
          <TabsTrigger value="config">
            <Settings className="h-4 w-4 mr-1" />
            Configurações Fiscais
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notas" className="space-y-4">
          {/* Search */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente, nº ou referência..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              {notasLoading ? (
                <div className="flex items-center justify-center p-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredNotas.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
                  <FileText className="h-10 w-10 mb-3" />
                  <p className="text-sm">Nenhuma nota fiscal encontrada</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Nº / Ref</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredNotas.map((nota) => (
                      <TableRow key={nota.id}>
                        <TableCell>
                          <Badge variant="outline">
                            {nota.tipo === "nfse" ? "NFS-e" : "NF-e"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {nota.numero || nota.referencia?.slice(0, 16)}
                        </TableCell>
                        <TableCell>{nota.cliente_nome || "—"}</TableCell>
                        <TableCell>
                          {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(nota.valor_total)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <StatusIcon status={nota.status} />
                            <Badge variant={statusConfig[nota.status]?.variant || "outline"}>
                              {statusConfig[nota.status]?.label || nota.status}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {format(new Date(nota.created_at), "dd/MM/yyyy HH:mm")}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              title="Consultar status"
                              onClick={() => consultarMutation.mutate({ id: nota.id, referencia: nota.referencia, tipo: nota.tipo })}
                              disabled={consultarMutation.isPending}
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                            {nota.url_pdf && (
                              <Button
                                size="icon"
                                variant="ghost"
                                title="Download PDF"
                                asChild
                              >
                                <a href={nota.url_pdf} target="_blank" rel="noopener noreferrer">
                                  <Download className="h-4 w-4" />
                                </a>
                              </Button>
                            )}
                            {nota.status === "autorizada" && (
                              <Button
                                size="icon"
                                variant="ghost"
                                title="Cancelar nota"
                                onClick={() => {
                                  if (confirm("Tem certeza que deseja cancelar esta nota?")) {
                                    cancelarMutation.mutate({ id: nota.id, referencia: nota.referencia, tipo: nota.tipo });
                                  }
                                }}
                                disabled={cancelarMutation.isPending}
                              >
                                <XCircle className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                            {(nota.status === "rejeitada" || nota.status === "pendente" || nota.status === "processando") && (
                              <Button
                                size="icon"
                                variant="ghost"
                                title="Excluir registro"
                                onClick={() => {
                                  if (confirm("Excluir este registro?")) {
                                    excluirMutation.mutate(nota.id);
                                  }
                                }}
                                disabled={excluirMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Dados Fiscais da Empresa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {fiscaisLoading ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Razão Social</Label>
                      <Input value={fiscalForm.razao_social} onChange={(e) => setFiscalForm((p) => ({ ...p, razao_social: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Nome Fantasia</Label>
                      <Input value={fiscalForm.nome_fantasia} onChange={(e) => setFiscalForm((p) => ({ ...p, nome_fantasia: e.target.value }))} />
                    </div>
                    <div>
                      <Label>CNPJ</Label>
                      <Input value={fiscalForm.cnpj} onChange={(e) => setFiscalForm((p) => ({ ...p, cnpj: e.target.value.replace(/\D/g, "") }))} placeholder="Somente números" />
                    </div>
                    <div>
                      <Label>Regime Tributário</Label>
                      <Select value={fiscalForm.regime_tributario} onValueChange={(v) => setFiscalForm((p) => ({ ...p, regime_tributario: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="simples_nacional">Simples Nacional</SelectItem>
                          <SelectItem value="lucro_presumido">Lucro Presumido</SelectItem>
                          <SelectItem value="lucro_real">Lucro Real</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Inscrição Municipal</Label>
                      <Input value={fiscalForm.inscricao_municipal} onChange={(e) => setFiscalForm((p) => ({ ...p, inscricao_municipal: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Inscrição Estadual</Label>
                      <Input value={fiscalForm.inscricao_estadual} onChange={(e) => setFiscalForm((p) => ({ ...p, inscricao_estadual: e.target.value }))} />
                    </div>
                  </div>

                  <Separator />

                  <h3 className="font-medium text-sm">Endereço</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <Label>Logradouro</Label>
                      <Input value={fiscalForm.endereco_logradouro} onChange={(e) => setFiscalForm((p) => ({ ...p, endereco_logradouro: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Número</Label>
                      <Input value={fiscalForm.endereco_numero} onChange={(e) => setFiscalForm((p) => ({ ...p, endereco_numero: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Complemento</Label>
                      <Input value={fiscalForm.endereco_complemento} onChange={(e) => setFiscalForm((p) => ({ ...p, endereco_complemento: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Bairro</Label>
                      <Input value={fiscalForm.endereco_bairro} onChange={(e) => setFiscalForm((p) => ({ ...p, endereco_bairro: e.target.value }))} />
                    </div>
                    <div>
                      <Label>CEP</Label>
                      <div className="relative">
                        <Input
                          value={fiscalForm.endereco_cep}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, "");
                            setFiscalForm((p) => ({ ...p, endereco_cep: val }));
                            if (val.length === 8) buscarCep(val);
                          }}
                          placeholder="Digite o CEP"
                        />
                        {cepLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
                      </div>
                    </div>
                    <div>
                      <Label>Código Município (IBGE)</Label>
                      <Input value={fiscalForm.codigo_municipio} onChange={(e) => setFiscalForm((p) => ({ ...p, codigo_municipio: e.target.value }))} placeholder="Ex: 4106902" />
                    </div>
                    <div>
                      <Label>UF</Label>
                      <Input value={fiscalForm.uf} onChange={(e) => setFiscalForm((p) => ({ ...p, uf: e.target.value.toUpperCase().slice(0, 2) }))} placeholder="Ex: PR" maxLength={2} />
                    </div>
                  </div>

                  <Separator />

                  <h3 className="font-medium text-sm">Contato</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Telefone</Label>
                      <Input value={fiscalForm.telefone} onChange={(e) => setFiscalForm((p) => ({ ...p, telefone: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input type="email" value={fiscalForm.email} onChange={(e) => setFiscalForm((p) => ({ ...p, email: e.target.value }))} />
                    </div>
                  </div>

                  <Button
                    onClick={() => saveFiscalMutation.mutate()}
                    disabled={saveFiscalMutation.isPending}
                    className="mt-2"
                  >
                    {saveFiscalMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Salvar Dados Fiscais
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
