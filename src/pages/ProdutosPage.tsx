import { useState } from "react";
import { ShoppingBag, Plus, Loader2, Package, BarChart3, Search, Trash2, Edit, AlertTriangle, ShoppingCart, Receipt } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

/* ─── Produto Form Dialog ─── */
function ProdutoFormDialog({
  open, onOpenChange, empresaId, produto, onSaved,
}: {
  open: boolean; onOpenChange: (v: boolean) => void; empresaId: string;
  produto?: any; onSaved: () => void;
}) {
  const [descricao, setDescricao] = useState(produto?.descricao ?? "");
  const [valor, setValor] = useState(produto?.valor?.toString() ?? "");
  const [custo, setCusto] = useState(produto?.custo?.toString() ?? "0");
  const [estoqueAtual, setEstoqueAtual] = useState(produto?.estoque_atual?.toString() ?? "0");
  const [estoqueMinimo, setEstoqueMinimo] = useState(produto?.estoque_minimo?.toString() ?? "0");
  const [codigoBarras, setCodigoBarras] = useState(produto?.codigo_barras ?? "");
  const [unidade, setUnidade] = useState(produto?.unidade ?? "un");
  const [ncm, setNcm] = useState(produto?.ncm ?? "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!descricao) return;
    setSaving(true);
    const payload = {
      empresa_id: empresaId,
      descricao,
      valor: parseFloat(valor) || 0,
      custo: parseFloat(custo) || 0,
      estoque_atual: parseInt(estoqueAtual) || 0,
      estoque_minimo: parseInt(estoqueMinimo) || 0,
      codigo_barras: codigoBarras || null,
      unidade,
      ncm: ncm || null,
    };
    const { error } = produto
      ? await supabase.from("produtos").update(payload).eq("id", produto.id)
      : await supabase.from("produtos").insert(payload);
    setSaving(false);
    if (error) { toast.error("Erro ao salvar produto."); return; }
    toast.success(produto ? "Produto atualizado!" : "Produto adicionado!");
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{produto ? "Editar Produto" : "Novo Produto"}</DialogTitle>
          <DialogDescription>Preencha os dados do produto.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label>Descrição *</Label>
            <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Nome / descrição do produto" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Valor Venda (R$)</Label>
              <Input type="number" min="0" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Custo (R$)</Label>
              <Input type="number" min="0" step="0.01" value={custo} onChange={(e) => setCusto(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Estoque Atual</Label>
              <Input type="number" min="0" value={estoqueAtual} onChange={(e) => setEstoqueAtual(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Estoque Mínimo</Label>
              <Input type="number" min="0" value={estoqueMinimo} onChange={(e) => setEstoqueMinimo(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Unidade</Label>
              <Select value={unidade} onValueChange={setUnidade}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="un">Unidade</SelectItem>
                  <SelectItem value="kg">Kg</SelectItem>
                  <SelectItem value="lt">Litro</SelectItem>
                  <SelectItem value="cx">Caixa</SelectItem>
                  <SelectItem value="pc">Pacote</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Código de Barras</Label>
              <Input value={codigoBarras} onChange={(e) => setCodigoBarras(e.target.value)} placeholder="EAN" />
            </div>
            <div className="space-y-2">
              <Label>NCM</Label>
              <Input value={ncm} onChange={(e) => setNcm(e.target.value)} placeholder="NCM fiscal" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!descricao || saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Nova Venda Dialog (PDV) ─── */
function NovaVendaDialog({ open, onOpenChange, empresaId, onSaved }: {
  open: boolean; onOpenChange: (v: boolean) => void; empresaId: string; onSaved: () => void;
}) {
  const { profile } = useAuth();
  const [itens, setItens] = useState<{ produto_id: string; descricao: string; quantidade: number; valor_unitario: number; subtotal: number }[]>([]);
  const [produtoId, setProdutoId] = useState("");
  const [quantidade, setQuantidade] = useState("1");
  const [desconto, setDesconto] = useState("0");
  const [formaPagamento, setFormaPagamento] = useState("dinheiro");
  const [cupomFiscal, setCupomFiscal] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [saving, setSaving] = useState(false);
  const [searchProd, setSearchProd] = useState("");

  const { data: produtos } = useQuery({
    queryKey: ["produtos-ativos", empresaId],
    queryFn: async () => {
      const { data } = await supabase.from("produtos").select("*").eq("ativo", true).order("descricao");
      return data || [];
    },
    enabled: open && !!empresaId,
  });

  const { data: clientes } = useQuery({
    queryKey: ["clientes-venda", empresaId],
    queryFn: async () => {
      const { data } = await supabase.from("clientes").select("id, nome").is("deleted_at", null).order("nome");
      return data || [];
    },
    enabled: open && !!empresaId,
  });

  const filteredProdutos = produtos?.filter(p =>
    p.descricao.toLowerCase().includes(searchProd.toLowerCase()) ||
    (p.codigo_barras && p.codigo_barras.includes(searchProd))
  );

  const addItem = () => {
    const prod = produtos?.find(p => p.id === produtoId);
    if (!prod) return;
    const qty = parseInt(quantidade) || 1;
    if (qty > prod.estoque_atual) {
      toast.error(`Estoque insuficiente! Disponível: ${prod.estoque_atual}`);
      return;
    }
    const existing = itens.findIndex(i => i.produto_id === prod.id);
    if (existing >= 0) {
      const updated = [...itens];
      updated[existing].quantidade += qty;
      updated[existing].subtotal = updated[existing].quantidade * updated[existing].valor_unitario;
      setItens(updated);
    } else {
      setItens([...itens, {
        produto_id: prod.id,
        descricao: prod.descricao,
        quantidade: qty,
        valor_unitario: Number(prod.valor),
        subtotal: qty * Number(prod.valor),
      }]);
    }
    setProdutoId("");
    setQuantidade("1");
    setSearchProd("");
  };

  const removeItem = (idx: number) => setItens(itens.filter((_, i) => i !== idx));

  const valorTotal = itens.reduce((s, i) => s + i.subtotal, 0);
  const valorFinal = Math.max(0, valorTotal - (parseFloat(desconto) || 0));

  const handleFinalizarVenda = async () => {
    if (itens.length === 0) { toast.error("Adicione ao menos um item."); return; }
    setSaving(true);
    const { data: venda, error: vendaErr } = await supabase.from("vendas_produtos").insert({
      empresa_id: empresaId,
      cliente_id: clienteId || null,
      vendedor_id: profile?.id || null,
      valor_total: valorTotal,
      desconto: parseFloat(desconto) || 0,
      valor_final: valorFinal,
      forma_pagamento: formaPagamento,
      cupom_fiscal: cupomFiscal || null,
      observacoes: observacoes || null,
    }).select("id").single();

    if (vendaErr || !venda) { toast.error("Erro ao registrar venda."); setSaving(false); return; }

    const itensPayload = itens.map(i => ({
      venda_id: venda.id,
      produto_id: i.produto_id,
      quantidade: i.quantidade,
      valor_unitario: i.valor_unitario,
      subtotal: i.subtotal,
    }));

    const { error: itensErr } = await supabase.from("vendas_produtos_itens").insert(itensPayload);
    setSaving(false);
    if (itensErr) { toast.error("Erro ao salvar itens da venda."); return; }
    toast.success("Venda finalizada com sucesso!");
    setItens([]);
    setDesconto("0");
    setCupomFiscal("");
    setObservacoes("");
    setClienteId("");
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ShoppingCart className="h-5 w-5" /> Nova Venda (PDV)</DialogTitle>
          <DialogDescription>Adicione produtos e finalize a venda.</DialogDescription>
        </DialogHeader>

        {/* Add item */}
        <div className="border rounded-lg p-4 space-y-3">
          <Label className="font-semibold">Adicionar Produto</Label>
          <div className="flex gap-2">
            <div className="flex-1">
              <Input placeholder="Buscar por nome ou código de barras..." value={searchProd} onChange={e => setSearchProd(e.target.value)} />
              {searchProd && filteredProdutos && filteredProdutos.length > 0 && (
                <div className="border rounded-md mt-1 max-h-32 overflow-y-auto bg-background shadow-md">
                  {filteredProdutos.map(p => (
                    <button key={p.id} className="w-full text-left px-3 py-2 hover:bg-muted text-sm flex justify-between"
                      onClick={() => { setProdutoId(p.id); setSearchProd(p.descricao); }}>
                      <span>{p.descricao}</span>
                      <span className="text-muted-foreground">R$ {Number(p.valor).toFixed(2)} | Est: {p.estoque_atual}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Input className="w-20" type="number" min="1" value={quantidade} onChange={e => setQuantidade(e.target.value)} placeholder="Qtd" />
            <Button onClick={addItem} disabled={!produtoId}>Adicionar</Button>
          </div>
        </div>

        {/* Items list */}
        {itens.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead className="text-center">Qtd</TableHead>
                <TableHead className="text-right">Unit.</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {itens.map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell className="text-sm">{item.descricao}</TableCell>
                  <TableCell className="text-center">{item.quantidade}</TableCell>
                  <TableCell className="text-right">R$ {item.valor_unitario.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-medium">R$ {item.subtotal.toFixed(2)}</TableCell>
                  <TableCell><Button variant="ghost" size="icon" onClick={() => removeItem(idx)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Totals & details */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Cliente (opcional)</Label>
            <Select value={clienteId} onValueChange={setClienteId}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {clientes?.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Forma de Pagamento</Label>
            <Select value={formaPagamento} onValueChange={setFormaPagamento}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="dinheiro">Dinheiro</SelectItem>
                <SelectItem value="pix">PIX</SelectItem>
                <SelectItem value="cartao_debito">Cartão Débito</SelectItem>
                <SelectItem value="cartao_credito">Cartão Crédito</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Desconto (R$)</Label>
            <Input type="number" min="0" step="0.01" value={desconto} onChange={e => setDesconto(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Nº Cupom Fiscal</Label>
            <Input value={cupomFiscal} onChange={e => setCupomFiscal(e.target.value)} placeholder="Opcional" />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Observações</Label>
          <Textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} placeholder="Observações da venda..." />
        </div>

        {/* Summary */}
        <div className="bg-muted rounded-lg p-4 flex justify-between items-center">
          <div>
            <p className="text-sm text-muted-foreground">{itens.length} item(s)</p>
            {parseFloat(desconto) > 0 && <p className="text-sm text-muted-foreground">Desconto: -R$ {parseFloat(desconto).toFixed(2)}</p>}
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-2xl font-bold">R$ {valorFinal.toFixed(2)}</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleFinalizarVenda} disabled={itens.length === 0 || saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Receipt className="h-4 w-4" />}
            Finalizar Venda
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Ajuste Estoque Dialog ─── */
function AjusteEstoqueDialog({ open, onOpenChange, empresaId, onSaved }: {
  open: boolean; onOpenChange: (v: boolean) => void; empresaId: string; onSaved: () => void;
}) {
  const [produtoId, setProdutoId] = useState("");
  const [tipo, setTipo] = useState("entrada");
  const [quantidade, setQuantidade] = useState("");
  const [motivo, setMotivo] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: produtos } = useQuery({
    queryKey: ["produtos-ajuste", empresaId],
    queryFn: async () => {
      const { data } = await supabase.from("produtos").select("id, descricao, estoque_atual").eq("ativo", true).order("descricao");
      return data || [];
    },
    enabled: open && !!empresaId,
  });

  const handleSave = async () => {
    if (!produtoId || !quantidade) return;
    setSaving(true);
    const qty = parseInt(quantidade);

    const { error: movErr } = await supabase.from("movimentacoes_estoque").insert({
      empresa_id: empresaId,
      produto_id: produtoId,
      tipo,
      quantidade: qty,
      motivo: motivo || null,
    });

    if (movErr) { toast.error("Erro ao registrar movimentação."); setSaving(false); return; }

    const prod = produtos?.find(p => p.id === produtoId);
    const novoEstoque = tipo === "entrada"
      ? (prod?.estoque_atual || 0) + qty
      : Math.max(0, (prod?.estoque_atual || 0) - qty);

    await supabase.from("produtos").update({ estoque_atual: novoEstoque }).eq("id", produtoId);

    setSaving(false);
    toast.success("Estoque atualizado!");
    onSaved();
    onOpenChange(false);
    setProdutoId(""); setQuantidade(""); setMotivo("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajuste de Estoque</DialogTitle>
          <DialogDescription>Registre entradas ou saídas manuais.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label>Produto</Label>
            <Select value={produtoId} onValueChange={setProdutoId}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {produtos?.map(p => <SelectItem key={p.id} value={p.id}>{p.descricao} (Est: {p.estoque_atual})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">Entrada</SelectItem>
                  <SelectItem value="saida">Saída</SelectItem>
                  <SelectItem value="ajuste">Ajuste</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quantidade</Label>
              <Input type="number" min="1" value={quantidade} onChange={e => setQuantidade(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Motivo</Label>
            <Input value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ex: Compra fornecedor, avaria..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!produtoId || !quantidade || saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Main Page ─── */
const ProdutosPage = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const empresaId = profile?.empresa_id;

  const [produtoDialogOpen, setProdutoDialogOpen] = useState(false);
  const [editProduto, setEditProduto] = useState<any>(null);
  const [vendaOpen, setVendaOpen] = useState(false);
  const [ajusteOpen, setAjusteOpen] = useState(false);
  const [search, setSearch] = useState("");

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["produtos"] });
    queryClient.invalidateQueries({ queryKey: ["vendas-produtos"] });
    queryClient.invalidateQueries({ queryKey: ["movimentacoes-estoque"] });
  };

  const { data: produtos, isLoading } = useQuery({
    queryKey: ["produtos", empresaId],
    queryFn: async () => {
      const { data, error } = await supabase.from("produtos").select("*").order("descricao");
      if (error) throw error;
      return data;
    },
    enabled: !!empresaId,
  });

  const { data: vendas } = useQuery({
    queryKey: ["vendas-produtos", empresaId],
    queryFn: async () => {
      const { data } = await supabase.from("vendas_produtos").select("*, clientes(nome)").order("data_venda", { ascending: false }).limit(50);
      return data || [];
    },
    enabled: !!empresaId,
  });

  const { data: movEstoque } = useQuery({
    queryKey: ["movimentacoes-estoque", empresaId],
    queryFn: async () => {
      const { data } = await supabase.from("movimentacoes_estoque").select("*, produtos(descricao)").order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
    enabled: !!empresaId,
  });

  const filteredProdutos = produtos?.filter(p =>
    p.descricao.toLowerCase().includes(search.toLowerCase()) ||
    (p.codigo_barras && p.codigo_barras.includes(search))
  );

  const estoqueAlerta = produtos?.filter(p => p.ativo && p.estoque_atual <= p.estoque_minimo) || [];
  const totalEstoqueValor = produtos?.reduce((s, p) => s + (p.ativo ? Number(p.valor) * p.estoque_atual : 0), 0) || 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <ShoppingBag className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Produtos & Estoque</h1>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setAjusteOpen(true)} className="gap-2">
            <Package className="h-4 w-4" /> Ajuste Estoque
          </Button>
          <Button variant="outline" onClick={() => setVendaOpen(true)} className="gap-2">
            <ShoppingCart className="h-4 w-4" /> Nova Venda
          </Button>
          <Button onClick={() => { setEditProduto(null); setProdutoDialogOpen(true); }} className="gap-2">
            <Plus className="h-4 w-4" /> Novo Produto
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Produtos</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{produtos?.filter(p => p.ativo).length || 0}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Valor em Estoque</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">R$ {totalEstoqueValor.toFixed(2)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Vendas (últimas 50)</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{vendas?.length || 0}</p></CardContent>
        </Card>
        <Card className={estoqueAlerta.length > 0 ? "border-destructive" : ""}>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-1">
            {estoqueAlerta.length > 0 && <AlertTriangle className="h-4 w-4 text-destructive" />} Estoque Baixo
          </CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{estoqueAlerta.length}</p></CardContent>
        </Card>
      </div>

      <Tabs defaultValue="produtos">
        <TabsList>
          <TabsTrigger value="produtos">Produtos</TabsTrigger>
          <TabsTrigger value="vendas">Vendas</TabsTrigger>
          <TabsTrigger value="estoque">Movimentações Estoque</TabsTrigger>
        </TabsList>

        {/* ─── Tab Produtos ─── */}
        <TabsContent value="produtos" className="space-y-4">
          <div className="flex items-center gap-2 max-w-sm">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar produto..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : filteredProdutos && filteredProdutos.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead className="text-center">Estoque</TableHead>
                  <TableHead className="text-right">Custo</TableHead>
                  <TableHead className="text-right">Venda</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProdutos.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.descricao}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.codigo_barras || "—"}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={p.estoque_atual <= p.estoque_minimo ? "destructive" : "secondary"}>
                        {p.estoque_atual} {p.unidade}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">R$ {Number(p.custo).toFixed(2)}</TableCell>
                    <TableCell className="text-right">R$ {Number(p.valor).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={p.ativo ? "default" : "outline"}>{p.ativo ? "Ativo" : "Inativo"}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => { setEditProduto(p); setProdutoDialogOpen(true); }}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-8">Nenhum produto cadastrado.</p>
          )}
        </TabsContent>

        {/* ─── Tab Vendas ─── */}
        <TabsContent value="vendas" className="space-y-4">
          {vendas && vendas.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead>Cupom Fiscal</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Desconto</TableHead>
                  <TableHead className="text-right">Final</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendas.map((v: any) => (
                  <TableRow key={v.id}>
                    <TableCell className="text-sm">{new Date(v.data_venda).toLocaleDateString("pt-BR")} {new Date(v.data_venda).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</TableCell>
                    <TableCell>{v.clientes?.nome || "—"}</TableCell>
                    <TableCell className="capitalize">{v.forma_pagamento?.replace("_", " ") || "—"}</TableCell>
                    <TableCell>{v.cupom_fiscal || "—"}</TableCell>
                    <TableCell className="text-right">R$ {Number(v.valor_total).toFixed(2)}</TableCell>
                    <TableCell className="text-right">{Number(v.desconto) > 0 ? `R$ ${Number(v.desconto).toFixed(2)}` : "—"}</TableCell>
                    <TableCell className="text-right font-medium">R$ {Number(v.valor_final).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-8">Nenhuma venda registrada.</p>
          )}
        </TabsContent>

        {/* ─── Tab Movimentações Estoque ─── */}
        <TabsContent value="estoque" className="space-y-4">
          {movEstoque && movEstoque.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-center">Qtd</TableHead>
                  <TableHead>Motivo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movEstoque.map((m: any) => (
                  <TableRow key={m.id}>
                    <TableCell className="text-sm">{new Date(m.created_at).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell>{m.produtos?.descricao || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={m.tipo === "entrada" ? "default" : m.tipo === "saida" ? "destructive" : "secondary"}>
                        {m.tipo === "entrada" ? "Entrada" : m.tipo === "saida" ? "Saída" : "Ajuste"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">{m.quantidade}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{m.motivo || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-8">Nenhuma movimentação registrada.</p>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      {empresaId && (
        <>
          <ProdutoFormDialog
            open={produtoDialogOpen}
            onOpenChange={v => { setProdutoDialogOpen(v); if (!v) setEditProduto(null); }}
            empresaId={empresaId}
            produto={editProduto}
            onSaved={invalidateAll}
          />
          <NovaVendaDialog open={vendaOpen} onOpenChange={setVendaOpen} empresaId={empresaId} onSaved={invalidateAll} />
          <AjusteEstoqueDialog open={ajusteOpen} onOpenChange={setAjusteOpen} empresaId={empresaId} onSaved={invalidateAll} />
        </>
      )}
    </div>
  );
};

export default ProdutosPage;
