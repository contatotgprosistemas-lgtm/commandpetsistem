import { useState } from "react";
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
import { Plus, Trash2, Send, Save } from "lucide-react";

interface Props {
  empresaId: string;
  onSuccess?: () => void;
}

interface NfeItem {
  key: string;
  codigo_produto: string;
  descricao: string;
  ncm: string;
  cfop: string;
  unidade: string;
  quantidade: string;
  valor_unitario: string;
  origem: string;
  cst_csosn: string;
}

const emptyItem = (): NfeItem => ({
  key: crypto.randomUUID(),
  codigo_produto: "",
  descricao: "",
  ncm: "",
  cfop: "5102",
  unidade: "UN",
  quantidade: "1",
  valor_unitario: "0",
  origem: "0",
  cst_csosn: "102",
});

export function NfeEmissao({ empresaId, onSuccess }: Props) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    natureza_operacao: "Venda de mercadorias",
    finalidade_emissao: "1",
    tipo_operacao: "1",
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
    informacoes_complementares: "",
  });

  const [items, setItems] = useState<NfeItem[]>([emptyItem()]);

  const updateForm = (field: string, value: string) => setForm((p) => ({ ...p, [field]: value }));
  const updateItem = (key: string, field: string, value: string) => {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, [field]: value } : i)));
  };

  const addItem = () => setItems((prev) => [...prev, emptyItem()]);
  const removeItem = (key: string) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((i) => i.key !== key));
  };

  const calcTotal = () =>
    items.reduce((acc, i) => acc + Number(i.quantidade) * Number(i.valor_unitario), 0);

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
      toast.error("Preencha nome e CPF/CNPJ do destinatário");
      return;
    }
    if (items.some((i) => !i.descricao)) {
      toast.error("Preencha a descrição de todos os itens");
      return;
    }

    setLoading(true);
    try {
      const reference = `NFE-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      const valorTotal = calcTotal();

      const { data: nfe, error: nfeErr } = await supabase
        .from("nfe_documents")
        .insert({
          empresa_id: empresaId,
          reference,
          status: "rascunho",
          natureza_operacao: form.natureza_operacao,
          finalidade_emissao: form.finalidade_emissao,
          tipo_operacao: form.tipo_operacao,
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

      // Insert items
      const itemsToInsert = items.map((i, idx) => ({
        empresa_id: empresaId,
        nfe_id: nfe.id,
        numero_item: idx + 1,
        codigo_produto: i.codigo_produto,
        descricao: i.descricao,
        ncm: i.ncm,
        cfop: i.cfop,
        unidade: i.unidade,
        quantidade: Number(i.quantidade),
        valor_unitario: Number(i.valor_unitario),
        valor_total: Number(i.quantidade) * Number(i.valor_unitario),
        origem: i.origem,
        cst_csosn: i.cst_csosn,
      }));

      const { error: itemsErr } = await supabase.from("nfe_items").insert(itemsToInsert);
      if (itemsErr) throw itemsErr;

      // Register creation event
      await supabase.from("nfe_events").insert({
        empresa_id: empresaId,
        nfe_id: nfe.id,
        event_type: "criacao",
        description: "NF-e criada como rascunho",
        created_by: profile?.id,
      });

      if (emitir) {
        const { data: result, error: focusErr } = await supabase.functions.invoke("focus-nfe-v2", {
          body: { action: "emitir", empresa_id: empresaId, nfe_id: nfe.id },
        });
        if (focusErr) throw focusErr;
        if (result?.error) throw new Error(result.error);
        toast.success("NF-e enviada para processamento!");
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

  return (
    <div className="space-y-4">
      {/* Destinatário */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados da Operação</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label>Natureza da Operação</Label>
            <Input value={form.natureza_operacao} onChange={(e) => updateForm("natureza_operacao", e.target.value)} />
          </div>
          <div>
            <Label>Finalidade</Label>
            <Select value={form.finalidade_emissao} onValueChange={(v) => updateForm("finalidade_emissao", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Normal</SelectItem>
                <SelectItem value="2">Complementar</SelectItem>
                <SelectItem value="3">Ajuste</SelectItem>
                <SelectItem value="4">Devolução</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tipo Operação</Label>
            <Select value={form.tipo_operacao} onValueChange={(v) => updateForm("tipo_operacao", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Entrada</SelectItem>
                <SelectItem value="1">Saída</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Destinatário</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
        </CardContent>
      </Card>

      {/* Itens */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Itens da Nota</CardTitle>
          <Button variant="outline" size="sm" onClick={addItem}>
            <Plus className="h-4 w-4 mr-1" /> Adicionar Item
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.map((item, idx) => (
            <div key={item.key} className="border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Item {idx + 1}</span>
                {items.length > 1 && (
                  <Button variant="ghost" size="sm" onClick={() => removeItem(item.key)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div><Label className="text-xs">Código</Label><Input value={item.codigo_produto} onChange={(e) => updateItem(item.key, "codigo_produto", e.target.value)} /></div>
                <div className="col-span-2 md:col-span-3"><Label className="text-xs">Descrição *</Label><Input value={item.descricao} onChange={(e) => updateItem(item.key, "descricao", e.target.value)} /></div>
                <div><Label className="text-xs">NCM</Label><Input value={item.ncm} onChange={(e) => updateItem(item.key, "ncm", e.target.value)} /></div>
                <div><Label className="text-xs">CFOP</Label><Input value={item.cfop} onChange={(e) => updateItem(item.key, "cfop", e.target.value)} /></div>
                <div><Label className="text-xs">Unidade</Label><Input value={item.unidade} onChange={(e) => updateItem(item.key, "unidade", e.target.value)} /></div>
                <div><Label className="text-xs">Quantidade</Label><Input type="number" value={item.quantidade} onChange={(e) => updateItem(item.key, "quantidade", e.target.value)} /></div>
                <div><Label className="text-xs">Valor Unitário</Label><Input type="number" step="0.01" value={item.valor_unitario} onChange={(e) => updateItem(item.key, "valor_unitario", e.target.value)} /></div>
                <div><Label className="text-xs">Origem</Label><Input value={item.origem} onChange={(e) => updateItem(item.key, "origem", e.target.value)} /></div>
                <div><Label className="text-xs">CST/CSOSN</Label><Input value={item.cst_csosn} onChange={(e) => updateItem(item.key, "cst_csosn", e.target.value)} /></div>
                <div className="flex items-end">
                  <p className="text-sm font-medium">
                    Subtotal: {(Number(item.quantidade) * Number(item.valor_unitario)).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </p>
                </div>
              </div>
            </div>
          ))}
          <Separator />
          <div className="flex justify-end">
            <p className="text-lg font-bold">
              Total: {calcTotal().toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Observações */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informações Complementares</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={form.informacoes_complementares}
            onChange={(e) => updateForm("informacoes_complementares", e.target.value)}
            placeholder="Informações adicionais da nota fiscal..."
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Ações */}
      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={() => handleSave(false)} disabled={loading}>
          <Save className="h-4 w-4 mr-1" /> Salvar Rascunho
        </Button>
        <Button onClick={() => handleSave(true)} disabled={loading}>
          <Send className="h-4 w-4 mr-1" /> Emitir NF-e
        </Button>
      </div>
    </div>
  );
}
