import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Plus, Trash2, Send, Save, Search } from "lucide-react";

interface Props {
  empresaId: string;
  onSuccess?: () => void;
}

interface ServicoItem {
  key: string;
  descricao: string;
  quantidade: string;
  valor_unitario: string;
}

const emptyServico = (): ServicoItem => ({
  key: crypto.randomUUID(),
  descricao: "",
  quantidade: "1",
  valor_unitario: "0",
});

export function NfeEmissao({ empresaId, onSuccess }: Props) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState<any[]>([]);
  const [searchCliente, setSearchCliente] = useState("");

  const [form, setForm] = useState({
    natureza_operacao: "Prestação de serviços",
    cliente_id: "",
    dest_nome: "",
    dest_cpf_cnpj: "",
    dest_inscricao_estadual: "",
    dest_telefone: "",
    dest_email: "",
    dest_logradouro: "",
    dest_numero: "",
    dest_complemento: "",
    dest_bairro: "",
    dest_cep: "",
    dest_municipio: "",
    dest_codigo_municipio: "",
    dest_uf: "",
    // Campos de serviço
    codigo_servico: "05.08",
    discriminacao_servicos: "",
    iss_retido: "false",
    aliquota_iss: "2",
    informacoes_complementares: "",
  });

  const [items, setItems] = useState<ServicoItem[]>([emptyServico()]);

  useEffect(() => {
    const fetchClientes = async () => {
      const { data } = await supabase
        .from("clientes")
        .select("id, nome, cpf, email, telefone, whatsapp, endereco, cep")
        .eq("empresa_id", empresaId)
        .order("nome");
      if (data) setClientes(data);
    };
    fetchClientes();
  }, [empresaId]);

  const updateForm = (field: string, value: string) => setForm((p) => ({ ...p, [field]: value }));
  const updateItem = (key: string, field: string, value: string) => {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, [field]: value } : i)));
  };

  const addItem = () => setItems((prev) => [...prev, emptyServico()]);
  const removeItem = (key: string) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((i) => i.key !== key));
  };

  const calcTotal = () =>
    items.reduce((acc, i) => acc + Number(i.quantidade) * Number(i.valor_unitario), 0);

  const calcIss = () => {
    const total = calcTotal();
    return total * (Number(form.aliquota_iss) / 100);
  };

  const selectCliente = (clienteId: string) => {
    const cliente = clientes.find((c) => c.id === clienteId);
    if (!cliente) return;
    updateForm("cliente_id", clienteId);
    setForm((p) => ({
      ...p,
      cliente_id: clienteId,
      dest_nome: cliente.nome || "",
      dest_cpf_cnpj: cliente.cpf || "",
      dest_email: cliente.email || "",
      dest_telefone: cliente.telefone || cliente.whatsapp || "",
    }));
    if (cliente.cep) {
      buscarCep(cliente.cep);
      updateForm("dest_cep", cliente.cep);
    }
  };

  const buscarCep = async (cep: string) => {
    const clean = cep.replace(/\D/g, "");
    if (clean.length !== 8) return;
    try {
      const resp = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const data = await resp.json();
      if (!data.erro) {
        setForm((p) => ({
          ...p,
          dest_logradouro: data.logradouro || p.dest_logradouro,
          dest_bairro: data.bairro || p.dest_bairro,
          dest_municipio: data.localidade || p.dest_municipio,
          dest_uf: data.uf || p.dest_uf,
          dest_codigo_municipio: data.ibge || p.dest_codigo_municipio,
        }));
      }
    } catch {}
  };

  const handleSave = async (emitir: boolean) => {
    if (!form.dest_nome || !form.dest_cpf_cnpj) {
      toast.error("Preencha nome e CPF/CNPJ do tomador");
      return;
    }
    if (items.some((i) => !i.descricao || Number(i.valor_unitario) <= 0)) {
      toast.error("Preencha a descrição e valor de todos os serviços");
      return;
    }
    if (!form.discriminacao_servicos && items.length > 0) {
      // Auto-generate discriminação from items
      const disc = items.map((i, idx) => `${idx + 1}. ${i.descricao} - Qtd: ${i.quantidade} x R$ ${Number(i.valor_unitario).toFixed(2)}`).join("\n");
      form.discriminacao_servicos = disc;
    }

    setLoading(true);
    try {
      const reference = `NFS-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      const valorTotal = calcTotal();

      const { data: nfe, error: nfeErr } = await supabase
        .from("nfe_documents")
        .insert({
          empresa_id: empresaId,
          reference,
          status: "rascunho",
          natureza_operacao: form.natureza_operacao,
          finalidade_emissao: "1",
          tipo_operacao: "1",
          cliente_id: form.cliente_id || null,
          dest_nome: form.dest_nome,
          dest_cpf_cnpj: form.dest_cpf_cnpj,
          dest_inscricao_estadual: form.dest_inscricao_estadual,
          dest_telefone: form.dest_telefone,
          dest_email: form.dest_email,
          dest_logradouro: form.dest_logradouro,
          dest_numero: form.dest_numero,
          dest_complemento: form.dest_complemento,
          dest_bairro: form.dest_bairro,
          dest_cep: form.dest_cep,
          dest_municipio: form.dest_municipio,
          dest_codigo_municipio: form.dest_codigo_municipio,
          dest_uf: form.dest_uf,
          valor_total: valorTotal,
          valor_produtos: valorTotal,
          informacoes_complementares: form.informacoes_complementares,
          created_by: profile?.id,
        })
        .select("id")
        .single();

      if (nfeErr) throw nfeErr;

      // Insert service items
      const itemsToInsert = items.map((i, idx) => ({
        empresa_id: empresaId,
        nfe_id: nfe.id,
        numero_item: idx + 1,
        codigo_produto: form.codigo_servico,
        descricao: i.descricao,
        ncm: "",
        cfop: "",
        unidade: "UN",
        quantidade: Number(i.quantidade),
        valor_unitario: Number(i.valor_unitario),
        valor_total: Number(i.quantidade) * Number(i.valor_unitario),
        origem: "0",
        cst_csosn: "",
      }));

      const { error: itemsErr } = await supabase.from("nfe_items").insert(itemsToInsert);
      if (itemsErr) throw itemsErr;

      await supabase.from("nfe_events").insert({
        empresa_id: empresaId,
        nfe_id: nfe.id,
        event_type: "criacao",
        description: "NFS-e criada como rascunho",
        created_by: profile?.id,
      });

      if (emitir) {
        const { data: result, error: focusErr } = await supabase.functions.invoke("focus-nfe-v2", {
          body: { action: "emitir", empresa_id: empresaId, nfe_id: nfe.id },
        });
        if (focusErr) throw focusErr;
        if (result?.error) throw new Error(result.error);
        toast.success("NFS-e enviada para processamento!");
      } else {
        toast.success("Rascunho salvo com sucesso!");
      }

      queryClient.invalidateQueries({ queryKey: ["nfe_documents"] });
      queryClient.invalidateQueries({ queryKey: ["nfe_documents_dashboard"] });
      onSuccess?.();
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredClientes = clientes.filter((c) =>
    c.nome?.toLowerCase().includes(searchCliente.toLowerCase()) ||
    c.cpf?.includes(searchCliente)
  );

  return (
    <div className="space-y-4">
      {/* Dados da Operação */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados da Operação</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label>Natureza da Operação</Label>
            <Input value={form.natureza_operacao} onChange={(e) => updateForm("natureza_operacao", e.target.value)} />
          </div>
          <div>
            <Label>Código do Serviço (LC 116)</Label>
            <Input value={form.codigo_servico} onChange={(e) => updateForm("codigo_servico", e.target.value)} placeholder="Ex: 05.08" />
          </div>
        </CardContent>
      </Card>

      {/* Tomador */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tomador do Serviço</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Buscar cliente existente */}
          <div className="flex gap-2">
            <div className="flex-1">
              <Label>Buscar cliente cadastrado</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  value={searchCliente}
                  onChange={(e) => setSearchCliente(e.target.value)}
                  placeholder="Buscar por nome ou CPF..."
                />
              </div>
            </div>
          </div>
          {searchCliente && filteredClientes.length > 0 && (
            <div className="border rounded-md max-h-32 overflow-auto">
              {filteredClientes.slice(0, 5).map((c) => (
                <button
                  key={c.id}
                  className="w-full text-left px-3 py-2 hover:bg-accent text-sm border-b last:border-b-0"
                  onClick={() => { selectCliente(c.id); setSearchCliente(""); }}
                >
                  <span className="font-medium">{c.nome}</span>
                  {c.cpf && <span className="text-muted-foreground ml-2">({c.cpf})</span>}
                </button>
              ))}
            </div>
          )}
          <Separator />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div><Label>Nome / Razão Social *</Label><Input value={form.dest_nome} onChange={(e) => updateForm("dest_nome", e.target.value)} /></div>
            <div><Label>CPF/CNPJ *</Label><Input value={form.dest_cpf_cnpj} onChange={(e) => updateForm("dest_cpf_cnpj", e.target.value)} /></div>
            <div><Label>Inscrição Estadual</Label><Input value={form.dest_inscricao_estadual} onChange={(e) => updateForm("dest_inscricao_estadual", e.target.value)} /></div>
            <div><Label>Telefone</Label><Input value={form.dest_telefone} onChange={(e) => updateForm("dest_telefone", e.target.value)} /></div>
            <div><Label>E-mail</Label><Input value={form.dest_email} onChange={(e) => updateForm("dest_email", e.target.value)} /></div>
            <div><Label>CEP</Label><Input value={form.dest_cep} onChange={(e) => updateForm("dest_cep", e.target.value)} onBlur={(e) => buscarCep(e.target.value)} /></div>
            <div><Label>Logradouro</Label><Input value={form.dest_logradouro} onChange={(e) => updateForm("dest_logradouro", e.target.value)} /></div>
            <div><Label>Número</Label><Input value={form.dest_numero} onChange={(e) => updateForm("dest_numero", e.target.value)} /></div>
            <div><Label>Complemento</Label><Input value={form.dest_complemento} onChange={(e) => updateForm("dest_complemento", e.target.value)} /></div>
            <div><Label>Bairro</Label><Input value={form.dest_bairro} onChange={(e) => updateForm("dest_bairro", e.target.value)} /></div>
            <div><Label>Município</Label><Input value={form.dest_municipio} onChange={(e) => updateForm("dest_municipio", e.target.value)} /></div>
            <div><Label>UF</Label><Input value={form.dest_uf} onChange={(e) => updateForm("dest_uf", e.target.value)} maxLength={2} /></div>
          </div>
        </CardContent>
      </Card>

      {/* Serviços */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Serviços Prestados</CardTitle>
          <Button variant="outline" size="sm" onClick={addItem}>
            <Plus className="h-4 w-4 mr-1" /> Adicionar Serviço
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.map((item, idx) => (
            <div key={item.key} className="border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Serviço {idx + 1}</span>
                {items.length > 1 && (
                  <Button variant="ghost" size="sm" onClick={() => removeItem(item.key)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <div className="md:col-span-2">
                  <Label className="text-xs">Descrição do Serviço *</Label>
                  <Input value={item.descricao} onChange={(e) => updateItem(item.key, "descricao", e.target.value)} placeholder="Ex: Banho e tosa completa" />
                </div>
                <div>
                  <Label className="text-xs">Quantidade</Label>
                  <Input type="number" min="1" value={item.quantidade} onChange={(e) => updateItem(item.key, "quantidade", e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Valor Unitário (R$)</Label>
                  <Input type="number" step="0.01" min="0" value={item.valor_unitario} onChange={(e) => updateItem(item.key, "valor_unitario", e.target.value)} />
                </div>
              </div>
              <div className="flex justify-end">
                <p className="text-sm font-medium">
                  Subtotal: {(Number(item.quantidade) * Number(item.valor_unitario)).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </p>
              </div>
            </div>
          ))}
          <Separator />
          <div className="flex flex-col items-end gap-1">
            <p className="text-lg font-bold">
              Total dos Serviços: {calcTotal().toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </p>
            <p className="text-sm text-muted-foreground">
              ISS ({form.aliquota_iss}%): {calcIss().toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Tributos do Serviço */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tributação do Serviço</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label>ISS Retido?</Label>
            <Select value={form.iss_retido} onValueChange={(v) => updateForm("iss_retido", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="false">Não</SelectItem>
                <SelectItem value="true">Sim</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Alíquota ISS (%)</Label>
            <Input type="number" step="0.01" min="0" max="5" value={form.aliquota_iss} onChange={(e) => updateForm("aliquota_iss", e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Discriminação e Observações */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Discriminação dos Serviços</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Discriminação (texto que aparece na NFS-e)</Label>
            <Textarea
              value={form.discriminacao_servicos}
              onChange={(e) => updateForm("discriminacao_servicos", e.target.value)}
              placeholder="Descreva os serviços prestados. Se vazio, será gerado automaticamente a partir dos itens acima."
              rows={4}
            />
          </div>
          <div>
            <Label>Informações Complementares</Label>
            <Textarea
              value={form.informacoes_complementares}
              onChange={(e) => updateForm("informacoes_complementares", e.target.value)}
              placeholder="Observações adicionais..."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Ações */}
      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={() => handleSave(false)} disabled={loading}>
          <Save className="h-4 w-4 mr-1" /> Salvar Rascunho
        </Button>
        <Button onClick={() => handleSave(true)} disabled={loading}>
          <Send className="h-4 w-4 mr-1" /> Emitir NFS-e
        </Button>
      </div>
    </div>
  );
}
