import { useState, useEffect } from "react";
import { MetricCard } from "@/components/MetricCard";
import { DollarSign, TrendingUp, TrendingDown, AlertCircle, ArrowDownCircle, Plus, Trash2, MoreVertical, Pencil, Search, Ban, CheckSquare, XCircle, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { format, isPast, isToday } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { BaixaContaDialog } from "@/components/BaixaContaDialog";
import { NovaContaBancariaDialog } from "@/components/NovaContaBancariaDialog";
import { NovaContaReceberDialog } from "@/components/NovaContaReceberDialog";
import { NovaContaPagarDialog } from "@/components/NovaContaPagarDialog";
import FluxoCaixaPage from "@/pages/FluxoCaixaPage";
import DREPage from "@/pages/DREPage";
import MovimentacaoPage from "@/pages/MovimentacaoPage";
import PlanoContasPage from "@/pages/PlanoContasPage";
import { ImportContasReceberDialog } from "@/components/ImportContasReceberDialog";
import { ImportContasPagarDialog } from "@/components/ImportContasPagarDialog";
import { EditarContaReceberDialog } from "@/components/EditarContaReceberDialog";
import { DividirFaturaDialog } from "@/components/DividirFaturaDialog";
import { SplitSquareVertical } from "lucide-react";
import FinanceConfigPage from "@/pages/FinanceConfigPage";

interface ContaReceber {
  id: string;
  descricao: string;
  valor: number;
  vencimento: string;
  categoria: string | null;
  status: string;
  cliente: { nome: string } | null;
  cliente_id: string | null;
  banco: string | null;
}

function statusBadge(status: string, vencimento: string) {
  if (status === "pago") return <Badge className="bg-emerald-500/15 text-emerald-600 border-0 text-xs">Pago</Badge>;
  const vencDate = new Date(vencimento + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (vencDate < today)
    return <Badge variant="destructive" className="text-xs">Vencida</Badge>;
  return <Badge className="bg-amber-500/15 text-amber-600 border-0 text-xs">Em Aberto</Badge>;
}

export default function FinancePage() {
  const { profile } = useAuth();
  const [contas, setContas] = useState<ContaReceber[]>([]);
  const [contasBancarias, setContasBancarias] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [baixaConta, setBaixaConta] = useState<{ id: string; descricao: string; valor: number } | null>(null);
  const [baixaLote, setBaixaLote] = useState<{ ids: string[]; descricao: string; valor: number } | null>(null);
  const [novaContaOpen, setNovaContaOpen] = useState(false);
  const [novaContaReceberOpen, setNovaContaReceberOpen] = useState(false);
  const [novaContaPagarOpen, setNovaContaPagarOpen] = useState(false);
  const [importReceberOpen, setImportReceberOpen] = useState(false);
  const [importPagarOpen, setImportPagarOpen] = useState(false);

  const [editConta, setEditConta] = useState<ContaReceber | null>(null);
  const [dividirConta, setDividirConta] = useState<ContaReceber | null>(null);

  async function fetchContas() {
    setLoading(true);
    const { data } = await supabase
      .from("contas_receber")
      .select("id, descricao, valor, vencimento, categoria, status, cliente_id, banco, cliente:clientes(nome)")
      .neq("status", "pago")
      .order("vencimento", { ascending: false });
    if (data) {
      const sorted = [...data].sort((a: any, b: any) => (a.cliente?.nome ?? "").localeCompare(b.cliente?.nome ?? ""));
      setContas(sorted as any);
    }
    setLoading(false);
  }

  async function fetchContasBancarias() {
    const { data } = await supabase
      .from("contas_bancarias" as any)
      .select("*")
      .order("created_at", { ascending: true });
    if (data) setContasBancarias(data as any);
  }

  useEffect(() => { fetchContas(); fetchContasBancarias(); }, []);

  const totalReceber = contas.filter(c => c.status === "pendente").reduce((s, c) => s + c.valor, 0);
  const totalPago = contas.filter(c => c.status === "pago").reduce((s, c) => s + c.valor, 0);
  const vencidas = contas.filter(c => c.status === "pendente" && isPast(new Date(c.vencimento)) && !isToday(new Date(c.vencimento)));

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Financeiro</h1>
        <p className="text-sm text-muted-foreground">Visão geral financeira</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Total a Receber" value={`R$ ${totalReceber.toFixed(2)}`} change="—" changeType="neutral" icon={<DollarSign className="h-4 w-4" strokeWidth={1.5} />} />
        <MetricCard title="Total Recebido" value={`R$ ${totalPago.toFixed(2)}`} change="—" changeType="neutral" icon={<TrendingUp className="h-4 w-4" strokeWidth={1.5} />} />
        <MetricCard title="Faturas Pendentes" value={String(contas.filter(c => c.status === "pendente").length)} change="—" changeType="neutral" icon={<TrendingDown className="h-4 w-4" strokeWidth={1.5} />} />
        <MetricCard title="Contas Vencidas" value={String(vencidas.length)} change="—" changeType="neutral" icon={<AlertCircle className="h-4 w-4" strokeWidth={1.5} />} />
      </div>

      <Tabs defaultValue="contas-a-receber" className="w-full">
        <TabsList className="bg-transparent border-b border-border rounded-none p-0 h-auto gap-4 flex-wrap">
          {["Contas a Receber", "Contas a Pagar", "Fluxo de Caixa", "DRE", "Movimentação", "Plano de Contas", "Contas Bancárias", "Configuração"].map(tab => (
            <TabsTrigger
              key={tab}
              value={tab.toLowerCase().replace(/ /g, "-")}
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-2 text-sm"
            >
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="contas-bancárias">
          {contasBancarias.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
              {contasBancarias.map((cb: any) => (
                <div key={cb.id} className="bg-primary rounded-lg p-5 text-primary-foreground">
                  <p className="text-sm font-medium opacity-90">Saldo {cb.banco}</p>
                  <p className="text-2xl font-bold mt-1">
                    R$ {Number(cb.saldo_atual).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between mt-4 mb-2">
            <h2 className="text-sm font-medium text-foreground">Contas Bancárias</h2>
            <Button size="sm" className="gap-1" onClick={() => setNovaContaOpen(true)}>
              <Plus className="h-4 w-4" />
              Nova Conta
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="contas-a-receber">
          <div className="flex items-center justify-end mt-4 mb-2 gap-2">
            <Button size="sm" variant="outline" className="gap-1" onClick={() => setImportReceberOpen(true)}>
              <Upload className="h-4 w-4" />
              Importar Excel
            </Button>
            <Button size="sm" className="gap-1" onClick={() => setNovaContaReceberOpen(true)}>
              <Plus className="h-4 w-4" />
              Nova Conta a Receber
            </Button>
          </div>
          <ContasReceberTable
            contas={contas}
            loading={loading}
            onBaixar={(c) => setBaixaConta({ id: c.id, descricao: c.descricao, valor: c.valor })}
            onBaixarLote={(items) => {
              const totalValor = items.reduce((s, c) => s + c.valor, 0);
              setBaixaLote({
                ids: items.map(c => c.id),
                descricao: `Baixa em lote (${items.length} faturas)`,
                valor: totalValor,
              });
            }}
            onEdit={(c) => setEditConta(c)}
            onDividir={(c) => setDividirConta(c)}
            onDelete={async (id) => {
              const { error } = await supabase.from("contas_receber").delete().eq("id", id);
              if (error) { toast.error("Erro ao excluir"); return; }
              toast.success("Fatura excluída");
              fetchContas();
            }}
          />
        </TabsContent>

        <TabsContent value="contas-a-pagar">
          <div className="flex items-center justify-end mt-4 mb-2 gap-2">
            <Button size="sm" variant="outline" className="gap-1" onClick={() => setImportPagarOpen(true)}>
              <Upload className="h-4 w-4" />
              Importar Excel
            </Button>
            <Button size="sm" className="gap-1" onClick={() => setNovaContaPagarOpen(true)}>
              <Plus className="h-4 w-4" />
              Nova Conta a Pagar
            </Button>
          </div>
          <ContasPagarContent />
        </TabsContent>

        <TabsContent value="fluxo-de-caixa"><FluxoCaixaPage /></TabsContent>
        <TabsContent value="dre"><DREPage /></TabsContent>
        <TabsContent value="movimentação"><MovimentacaoPage /></TabsContent>
        <TabsContent value="plano-de-contas"><PlanoContasPage /></TabsContent>
        <TabsContent value="configuração"><FinanceConfigPage /></TabsContent>
      </Tabs>

      <BaixaContaDialog
        conta={baixaConta}
        open={!!baixaConta}
        onOpenChange={(o) => { if (!o) setBaixaConta(null); }}
        onSuccess={() => { setBaixaConta(null); fetchContas(); }}
      />

      <BaixaContaDialog
        conta={baixaLote ? { id: baixaLote.ids[0], descricao: baixaLote.descricao, valor: baixaLote.valor } : null}
        contaIds={baixaLote?.ids}
        open={!!baixaLote}
        onOpenChange={(o) => { if (!o) setBaixaLote(null); }}
        onSuccess={() => { setBaixaLote(null); fetchContas(); }}
      />

      <NovaContaReceberDialog
        open={novaContaReceberOpen}
        onOpenChange={setNovaContaReceberOpen}
        onSuccess={fetchContas}
      />

      <NovaContaPagarDialog
        open={novaContaPagarOpen}
        onOpenChange={setNovaContaPagarOpen}
        onSuccess={() => {}}
      />

      <NovaContaBancariaDialog
        open={novaContaOpen}
        onOpenChange={setNovaContaOpen}
        onSuccess={fetchContasBancarias}
      />

      <ImportContasReceberDialog
        open={importReceberOpen}
        onOpenChange={setImportReceberOpen}
        onSuccess={fetchContas}
      />

      <ImportContasPagarDialog
        open={importPagarOpen}
        onOpenChange={setImportPagarOpen}
        onSuccess={() => {}}
      />

      <EditarContaReceberDialog
        open={!!editConta}
        onOpenChange={(o) => { if (!o) setEditConta(null); }}
        onSuccess={() => { setEditConta(null); fetchContas(); }}
        conta={editConta}
      />

      <DividirFaturaDialog
        open={!!dividirConta}
        onOpenChange={(o) => { if (!o) setDividirConta(null); }}
        onSuccess={() => { setDividirConta(null); fetchContas(); }}
        conta={dividirConta}
        empresaId={profile?.empresa_id || ""}
      />
    </div>
  );
}

function ContasReceberTable({ contas, loading, onBaixar, onBaixarLote, onEdit, onDividir, onDelete }: { contas: ContaReceber[]; loading: boolean; onBaixar: (c: ContaReceber) => void; onBaixarLote: (items: ContaReceber[]) => void; onEdit: (c: ContaReceber) => void; onDividir: (c: ContaReceber) => void; onDelete: (id: string) => void }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const filtered = contas.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (c.descricao?.toLowerCase().includes(q)) || (c.cliente?.nome?.toLowerCase().includes(q)) || (c.categoria?.toLowerCase().includes(q));
  });
  const allSelected = filtered.length > 0 && selected.length === filtered.length;

  const toggleAll = () => {
    setSelected(allSelected ? [] : filtered.map(c => c.id));
  };
  const toggle = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleBulkBaixar = () => {
    const items = contas.filter(c => selected.includes(c.id));
    onBaixarLote(items);
    setSelected([]);
  };
  const handleBulkDelete = async () => {
    for (const id of selected) { await onDelete(id); }
    setSelected([]);
  };

  return (
    <div className="bg-card rounded-lg shadow-card mt-4 overflow-hidden">
      {selected.length > 0 && (
        <div className="px-5 py-3 border-b border-border flex items-center gap-3 bg-muted/30">
          <Button size="sm" onClick={handleBulkBaixar} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1">
            <ArrowDownCircle className="h-4 w-4" /> Baixar Selecionados
          </Button>
          <Button size="sm" variant="destructive" onClick={handleBulkDelete} className="gap-1">
            <XCircle className="h-4 w-4" /> Cancelar Selecionados
          </Button>
        </div>
      )}
      <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground shrink-0">{filtered.length} fatura(s)</span>
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar fatura..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      {loading ? (
        <div className="p-5 space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
          Nenhuma fatura encontrada
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
              </TableHead>
              <TableHead>Documento</TableHead>
              <TableHead>Emissão</TableHead>
              <TableHead>Plano de Contas</TableHead>
              <TableHead>Pessoa</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-right">Valor Pago</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(c => (
              <TableRow key={c.id} className={selected.includes(c.id) ? "bg-primary/5" : ""}>
                <TableCell>
                  <Checkbox checked={selected.includes(c.id)} onCheckedChange={() => toggle(c.id)} />
                </TableCell>
                <TableCell>
                  <p className="text-sm font-medium">Fatura</p>
                </TableCell>
                <TableCell className="text-sm">
                  {format(new Date(c.vencimento + "T00:00:00"), "dd/MM/yy")}
                </TableCell>
                <TableCell className="text-sm">{c.categoria || "—"}</TableCell>
                <TableCell>
                  <p className="text-sm">{c.cliente?.nome || "—"}</p>
                  <p className="text-xs text-muted-foreground">{c.descricao}</p>
                </TableCell>
                <TableCell className="text-sm">
                  {format(new Date(c.vencimento + "T00:00:00"), "dd/MM/yy")}
                </TableCell>
                <TableCell className="text-sm text-right tabular-nums font-medium">
                  {Number(c.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </TableCell>
                <TableCell className="text-sm text-right tabular-nums">0,00</TableCell>
                <TableCell>
                  {statusBadge(c.status, c.vencimento)}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon" className="h-7 w-7">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(c)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onBaixar(c)}>
                        <ArrowDownCircle className="h-4 w-4 mr-2" />
                        Baixar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onDividir(c)}>
                        <SplitSquareVertical className="h-4 w-4 mr-2" />
                        Dividir
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => onDelete(c.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Summary cards */}
      {(() => {
        const totalTitulos = filtered.reduce((s, c) => s + c.valor, 0);
        const totalPago = filtered.filter(c => c.status === "pago").reduce((s, c) => s + c.valor, 0);
        const totalAberto = filtered.filter(c => c.status !== "pago").reduce((s, c) => s + c.valor, 0);
        return (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-5 border-t border-border">
            <div className="rounded-lg border border-border p-4 text-center">
              <p className="text-sm text-muted-foreground">Total de Títulos</p>
              <p className="text-xl font-bold text-foreground mt-1">
                R$ {totalTitulos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="rounded-lg border border-border p-4 text-center">
              <p className="text-sm text-muted-foreground">Total Pago</p>
              <p className="text-xl font-bold text-foreground mt-1">
                R$ {totalPago.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="rounded-lg bg-emerald-500 p-4 text-center">
              <p className="text-sm text-white/90">Total em Aberto</p>
              <p className="text-xl font-bold text-white mt-1">
                R$ {totalAberto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function ContasPagarContent() {
  const [contas, setContas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);

  const allSelected = contas.length > 0 && selected.length === contas.length;
  const toggleAll = () => setSelected(allSelected ? [] : contas.map((c: any) => c.id));
  const toggle = (id: string) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  async function fetchData() {
    setLoading(true);
    const { data } = await supabase
      .from("contas_pagar")
      .select("*")
      .order("vencimento", { ascending: false });
    if (data) setContas(data);
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, []);

  const handleBulkDelete = async () => {
    for (const id of selected) {
      await supabase.from("contas_pagar").delete().eq("id", id);
    }
    toast.success(`${selected.length} conta(s) excluída(s)`);
    setSelected([]);
    fetchData();
  };

  return (
    <div className="bg-card rounded-lg shadow-card mt-4 overflow-hidden">
      {selected.length > 0 && (
        <div className="px-5 py-3 border-b border-border flex items-center gap-3 bg-muted/30">
          <Button size="sm" variant="destructive" onClick={handleBulkDelete} className="gap-1">
            <XCircle className="h-4 w-4" /> Cancelar Selecionados
          </Button>
        </div>
      )}
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <h2 className="text-sm font-medium text-foreground">Contas a Pagar</h2>
        <span className="text-xs text-muted-foreground">{contas.length} conta(s)</span>
      </div>
      {loading ? (
        <div className="p-5 space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
        </div>
      ) : contas.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
          Nenhuma conta a pagar encontrada
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
              </TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Fornecedor</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contas.map((c: any) => (
              <TableRow key={c.id} className={selected.includes(c.id) ? "bg-primary/5" : ""}>
                <TableCell>
                  <Checkbox checked={selected.includes(c.id)} onCheckedChange={() => toggle(c.id)} />
                </TableCell>
                <TableCell className="text-sm font-medium">{c.descricao}</TableCell>
                <TableCell className="text-sm">{c.fornecedor}</TableCell>
                <TableCell className="text-sm">{c.categoria || "—"}</TableCell>
                <TableCell className="text-sm">{format(new Date(c.vencimento + "T00:00:00"), "dd/MM/yy")}</TableCell>
                <TableCell className="text-sm text-right tabular-nums font-medium">
                  R$ {Number(c.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </TableCell>
                <TableCell>{statusBadge(c.status, c.vencimento)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
