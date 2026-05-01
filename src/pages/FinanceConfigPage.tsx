import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2, CreditCard, QrCode, Wallet, AlertTriangle } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface TaxaFinanceira {
  id: string;
  tipo: string;
  bandeira: string | null;
  parcelas_de: number;
  parcelas_ate: number;
  percentual: number;
  valor_fixo: number;
  ativo: boolean;
}

interface FormaPagamento {
  id: string;
  nome: string;
  codigo: string;
  ativo: boolean;
}

const BANDEIRAS = ["Visa", "Mastercard", "Elo", "Amex", "Hipercard", "Outras"];

export default function FinanceConfigPage() {
  const { profile } = useAuth();

  // === Multa por atraso ===
  const [multaLoading, setMultaLoading] = useState(true);
  const [multaSaving, setMultaSaving] = useState(false);
  const [multaEnabled, setMultaEnabled] = useState(false);
  const [multaValor, setMultaValor] = useState<string>("30");
  const [multaDescricao, setMultaDescricao] = useState<string>("Multa por atraso no pagamento");

  // === Formas de Pagamento ===
  const [formas, setFormas] = useState<FormaPagamento[]>([]);
  const [loadingFormas, setLoadingFormas] = useState(true);
  const [formaDialogOpen, setFormaDialogOpen] = useState(false);
  const [editingForma, setEditingForma] = useState<FormaPagamento | null>(null);
  const [formaNome, setFormaNome] = useState("");
  const [formaCodigo, setFormaCodigo] = useState("");
  const [formaAtivo, setFormaAtivo] = useState(true);

  // === Taxas ===
  const [taxas, setTaxas] = useState<TaxaFinanceira[]>([]);
  const [loadingTaxas, setLoadingTaxas] = useState(true);
  const [taxaDialogOpen, setTaxaDialogOpen] = useState(false);
  const [editingTaxa, setEditingTaxa] = useState<TaxaFinanceira | null>(null);
  const [taxaTipo, setTaxaTipo] = useState("");
  const [taxaBandeira, setTaxaBandeira] = useState("");
  const [taxaParcelasDe, setTaxaParcelasDe] = useState(1);
  const [taxaParcelasAte, setTaxaParcelasAte] = useState(1);
  const [taxaPercentual, setTaxaPercentual] = useState("");
  const [taxaValorFixo, setTaxaValorFixo] = useState("");
  const [taxaAtivo, setTaxaAtivo] = useState(true);

  async function fetchFormas() {
    setLoadingFormas(true);
    const { data } = await supabase.from("formas_pagamento").select("*").order("nome");
    if (data) setFormas(data as any);
    setLoadingFormas(false);
  }

  async function fetchTaxas() {
    setLoadingTaxas(true);
    const { data } = await supabase.from("taxas_financeiras").select("*").order("tipo").order("parcelas_de");
    if (data) setTaxas(data as any);
    setLoadingTaxas(false);
  }

  useEffect(() => {
    fetchFormas();
    fetchTaxas();
    fetchMulta();
  }, []);

  async function fetchMulta() {
    if (!profile?.empresa_id) { setMultaLoading(false); return; }
    setMultaLoading(true);
    const { data } = await supabase
      .from("invoice_notification_config")
      .select("multa_atraso_enabled, multa_atraso_valor, multa_atraso_descricao")
      .eq("empresa_id", profile.empresa_id)
      .maybeSingle();
    if (data) {
      setMultaEnabled((data as any).multa_atraso_enabled ?? false);
      setMultaValor(String((data as any).multa_atraso_valor ?? 30));
      setMultaDescricao((data as any).multa_atraso_descricao ?? "Multa por atraso no pagamento");
    }
    setMultaLoading(false);
  }

  async function handleSaveMulta() {
    if (!profile?.empresa_id) { toast.error("Empresa não encontrada"); return; }
    const valor = parseFloat(multaValor.replace(",", ".")) || 0;
    if (valor < 0) { toast.error("Valor inválido"); return; }
    setMultaSaving(true);
    const { error } = await supabase
      .from("invoice_notification_config")
      .upsert({
        empresa_id: profile.empresa_id,
        multa_atraso_enabled: multaEnabled,
        multa_atraso_valor: valor,
        multa_atraso_descricao: multaDescricao.trim() || "Multa por atraso no pagamento",
      });
    setMultaSaving(false);
    if (error) { toast.error("Erro ao salvar: " + error.message); return; }
    toast.success("Regra de multa salva");
  }

  // --- Formas de Pagamento handlers ---
  function openNewForma() {
    setEditingForma(null);
    setFormaNome("");
    setFormaCodigo("");
    setFormaAtivo(true);
    setFormaDialogOpen(true);
  }

  function openEditForma(f: FormaPagamento) {
    setEditingForma(f);
    setFormaNome(f.nome);
    setFormaCodigo(f.codigo);
    setFormaAtivo(f.ativo);
    setFormaDialogOpen(true);
  }

  async function handleSaveForma() {
    if (!profile?.empresa_id) { toast.error("Empresa não encontrada"); return; }
    if (!formaNome.trim() || !formaCodigo.trim()) { toast.error("Preencha nome e código"); return; }

    const payload = {
      empresa_id: profile.empresa_id,
      nome: formaNome.trim(),
      codigo: formaCodigo.trim().toLowerCase().replace(/\s+/g, "_"),
      ativo: formaAtivo,
    };

    if (editingForma) {
      const { error } = await supabase.from("formas_pagamento").update(payload).eq("id", editingForma.id);
      if (error) { toast.error("Erro ao atualizar"); return; }
      toast.success("Forma de pagamento atualizada");
    } else {
      const { error } = await supabase.from("formas_pagamento").insert(payload as any);
      if (error) { toast.error("Erro ao criar"); return; }
      toast.success("Forma de pagamento cadastrada");
    }
    setFormaDialogOpen(false);
    fetchFormas();
  }

  async function handleDeleteForma(id: string) {
    const { error } = await supabase.from("formas_pagamento").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir"); return; }
    toast.success("Forma de pagamento excluída");
    fetchFormas();
  }

  async function handleToggleForma(id: string, val: boolean) {
    await supabase.from("formas_pagamento").update({ ativo: val }).eq("id", id);
    fetchFormas();
  }

  // --- Taxas handlers ---
  const isCartao = taxaTipo.startsWith("cartao");

  function openNewTaxa() {
    setEditingTaxa(null);
    setTaxaTipo(formas.length > 0 ? formas[0].codigo : "");
    setTaxaBandeira("");
    setTaxaParcelasDe(1);
    setTaxaParcelasAte(1);
    setTaxaPercentual("");
    setTaxaValorFixo("");
    setTaxaAtivo(true);
    setTaxaDialogOpen(true);
  }

  function openEditTaxa(t: TaxaFinanceira) {
    setEditingTaxa(t);
    setTaxaTipo(t.tipo);
    setTaxaBandeira(t.bandeira ?? "");
    setTaxaParcelasDe(t.parcelas_de);
    setTaxaParcelasAte(t.parcelas_ate);
    setTaxaPercentual(String(t.percentual));
    setTaxaValorFixo(String(t.valor_fixo));
    setTaxaAtivo(t.ativo);
    setTaxaDialogOpen(true);
  }

  async function handleSaveTaxa() {
    if (!profile?.empresa_id) { toast.error("Empresa não encontrada"); return; }
    const pct = parseFloat(taxaPercentual) || 0;
    const vf = parseFloat(taxaValorFixo) || 0;

    const payload = {
      empresa_id: profile.empresa_id,
      tipo: taxaTipo,
      bandeira: isCartao ? (taxaBandeira || null) : null,
      parcelas_de: isCartao ? taxaParcelasDe : 1,
      parcelas_ate: isCartao ? taxaParcelasAte : 1,
      percentual: pct,
      valor_fixo: vf,
      ativo: taxaAtivo,
    };

    if (editingTaxa) {
      const { error } = await supabase.from("taxas_financeiras").update(payload).eq("id", editingTaxa.id);
      if (error) { toast.error("Erro ao atualizar"); return; }
      toast.success("Taxa atualizada");
    } else {
      const { error } = await supabase.from("taxas_financeiras").insert(payload as any);
      if (error) { toast.error("Erro ao criar taxa"); return; }
      toast.success("Taxa cadastrada");
    }
    setTaxaDialogOpen(false);
    fetchTaxas();
  }

  async function handleDeleteTaxa(id: string) {
    const { error } = await supabase.from("taxas_financeiras").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir"); return; }
    toast.success("Taxa excluída");
    fetchTaxas();
  }

  async function handleToggleTaxa(id: string, val: boolean) {
    await supabase.from("taxas_financeiras").update({ ativo: val }).eq("id", id);
    fetchTaxas();
  }

  const formaLabel = (codigo: string) => formas.find(f => f.codigo === codigo)?.nome ?? codigo;
  const tipoIcon = (t: string) => t.includes("pix") ? <QrCode className="h-4 w-4" /> : t.startsWith("cartao") ? <CreditCard className="h-4 w-4" /> : <Wallet className="h-4 w-4" />;

  return (
    <div className="space-y-8">
      {/* === MULTA POR ATRASO === */}
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" /> Multa por atraso
          </h2>
          <p className="text-sm text-muted-foreground">
            Quando ativa, no dia seguinte ao vencimento (10h BRT) o sistema gera uma fatura
            complementar fixa para cada fatura em aberto. O cliente é obrigado a pagar a multa
            junto com a fatura original.
          </p>
        </div>

        {multaLoading ? (
          <Skeleton className="h-32 w-full rounded-lg" />
        ) : (
          <div className="bg-card rounded-lg border border-border p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Gerar fatura de multa automaticamente</p>
                <p className="text-xs text-muted-foreground">
                  Roda diariamente às 10h (horário de Brasília).
                </p>
              </div>
              <Switch checked={multaEnabled} onCheckedChange={setMultaEnabled} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Valor da multa (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={multaValor}
                  onChange={(e) => setMultaValor(e.target.value)}
                  disabled={!multaEnabled}
                  placeholder="30.00"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Descrição (aparece na fatura)</Label>
                <Input
                  value={multaDescricao}
                  onChange={(e) => setMultaDescricao(e.target.value)}
                  disabled={!multaEnabled}
                  placeholder="Multa por atraso no pagamento"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button size="sm" onClick={handleSaveMulta} disabled={multaSaving}>
                {multaSaving ? "Salvando..." : "Salvar regra de multa"}
              </Button>
            </div>
          </div>
        )}
      </section>

      <Separator />

      {/* === FORMAS DE PAGAMENTO === */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">Formas de Pagamento</h2>
            <p className="text-sm text-muted-foreground">
              Crie e gerencie as formas de pagamento utilizadas na baixa de faturas.
            </p>
          </div>
          <Button size="sm" className="gap-1" onClick={openNewForma}>
            <Plus className="h-4 w-4" /> Nova Forma
          </Button>
        </div>

        {loadingFormas ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
          </div>
        ) : formas.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            Nenhuma forma de pagamento cadastrada.
          </div>
        ) : (
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead className="text-center">Ativo</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {formas.map(f => (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium text-sm">{f.nome}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{f.codigo}</TableCell>
                    <TableCell className="text-center">
                      <Switch checked={f.ativo} onCheckedChange={v => handleToggleForma(f.id, v)} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditForma(f)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteForma(f.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <Separator />

      {/* === TAXAS FINANCEIRAS === */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">Configuração de Taxas</h2>
            <p className="text-sm text-muted-foreground">
              Configure as taxas por forma de pagamento. Ao dar baixa em faturas, as taxas serão lançadas automaticamente como despesas financeiras.
            </p>
          </div>
          <Button size="sm" className="gap-1" onClick={openNewTaxa}>
            <Plus className="h-4 w-4" /> Nova Taxa
          </Button>
        </div>

        {loadingTaxas ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
          </div>
        ) : taxas.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            Nenhuma taxa configurada. Clique em "Nova Taxa" para começar.
          </div>
        ) : (
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Forma</TableHead>
                  <TableHead>Bandeira</TableHead>
                  <TableHead>Parcelas</TableHead>
                  <TableHead className="text-right">Taxa (%)</TableHead>
                  <TableHead className="text-right">Valor Fixo (R$)</TableHead>
                  <TableHead className="text-center">Ativo</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {taxas.map(t => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {tipoIcon(t.tipo)}
                        <span className="text-sm font-medium">{formaLabel(t.tipo)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{t.bandeira || "—"}</TableCell>
                    <TableCell className="text-sm">
                      {t.tipo.startsWith("cartao") ? `${t.parcelas_de}x - ${t.parcelas_ate}x` : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-right tabular-nums">{Number(t.percentual).toFixed(2)}%</TableCell>
                    <TableCell className="text-sm text-right tabular-nums">
                      {Number(t.valor_fixo) > 0 ? `R$ ${Number(t.valor_fixo).toFixed(2)}` : "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch checked={t.ativo} onCheckedChange={v => handleToggleTaxa(t.id, v)} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditTaxa(t)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteTaxa(t.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      {/* === Dialog Forma de Pagamento === */}
      <Dialog open={formaDialogOpen} onOpenChange={setFormaDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingForma ? "Editar Forma de Pagamento" : "Nova Forma de Pagamento"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Nome</Label>
              <Input placeholder="Ex: PIX - Asaas" value={formaNome} onChange={e => setFormaNome(e.target.value)} />
            </div>
            <div>
              <Label>Código (identificador interno)</Label>
              <Input placeholder="Ex: pix_asaas" value={formaCodigo} onChange={e => setFormaCodigo(e.target.value)} />
              <p className="text-xs text-muted-foreground mt-1">Usado internamente para vincular taxas.</p>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={formaAtivo} onCheckedChange={setFormaAtivo} />
              <Label>Ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormaDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveForma}>{editingForma ? "Salvar" : "Cadastrar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* === Dialog Taxa === */}
      <Dialog open={taxaDialogOpen} onOpenChange={setTaxaDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTaxa ? "Editar Taxa" : "Nova Taxa"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Forma de Pagamento</Label>
              <Select value={taxaTipo} onValueChange={setTaxaTipo}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {formas.filter(f => f.ativo).map(f => (
                    <SelectItem key={f.codigo} value={f.codigo}>{f.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isCartao && (
              <>
                <div>
                  <Label>Bandeira</Label>
                  <Select value={taxaBandeira} onValueChange={setTaxaBandeira}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {BANDEIRAS.map(b => (
                        <SelectItem key={b} value={b}>{b}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Parcelas De</Label>
                    <Input type="number" min={1} value={taxaParcelasDe} onChange={e => setTaxaParcelasDe(Number(e.target.value))} />
                  </div>
                  <div>
                    <Label>Parcelas Até</Label>
                    <Input type="number" min={1} value={taxaParcelasAte} onChange={e => setTaxaParcelasAte(Number(e.target.value))} />
                  </div>
                </div>
              </>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Taxa (%)</Label>
                <Input type="number" step="0.01" min={0} placeholder="0.00" value={taxaPercentual} onChange={e => setTaxaPercentual(e.target.value)} />
              </div>
              <div>
                <Label>Valor Fixo (R$)</Label>
                <Input type="number" step="0.01" min={0} placeholder="0.00" value={taxaValorFixo} onChange={e => setTaxaValorFixo(e.target.value)} />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={taxaAtivo} onCheckedChange={setTaxaAtivo} />
              <Label>Ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTaxaDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveTaxa}>{editingTaxa ? "Salvar" : "Cadastrar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
