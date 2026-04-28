import { useState, useEffect, useMemo, Fragment } from "react";
import { MetricCard } from "@/components/MetricCard";
import { DollarSign, TrendingUp, TrendingDown, AlertCircle, ArrowDownCircle, Plus, Trash2, MoreVertical, Pencil, Search, Ban, CheckSquare, XCircle, Upload, ChevronDown, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, BarChart3, Wallet, FileText, Settings2, Receipt, Landmark, ArrowDownToLine, ArrowUpFromLine, ListTree } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ChevronLeft as ChevronLeftIcon, ChevronRight as ChevronRightIcon, ChevronsLeft, ChevronsRight } from "lucide-react";
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
import { EditarContaBancariaDialog } from "@/components/EditarContaBancariaDialog";
import { DividirFaturaDialog } from "@/components/DividirFaturaDialog";
import { SplitSquareVertical } from "lucide-react";
import FinanceConfigPage from "@/pages/FinanceConfigPage";
import { FinanceAnalyticsTab } from "@/components/finance/FinanceAnalyticsTab";

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
  if (status === "pago")
    return (
      <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-[11px] font-medium px-2 py-0.5 rounded-full">
        ● Pago
      </Badge>
    );
  const vencDate = new Date(vencimento + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (vencDate < today)
    return (
      <Badge className="bg-destructive/10 text-destructive border border-destructive/20 text-[11px] font-medium px-2 py-0.5 rounded-full">
        ● Vencida
      </Badge>
    );
  return (
    <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 text-[11px] font-medium px-2 py-0.5 rounded-full">
      ● Em Aberto
    </Badge>
  );
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
  const [editContaBancaria, setEditContaBancaria] = useState<any | null>(null);
  const [dividirConta, setDividirConta] = useState<ContaReceber | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ ids: string[] } | null>(null);

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
        <MetricCard title="Total a Receber" value={`R$ ${totalReceber.toFixed(2)}`} icon={<DollarSign className="h-4 w-4" strokeWidth={1.5} />} accent="emerald" filled />
        <MetricCard title="Total Recebido" value={`R$ ${totalPago.toFixed(2)}`} icon={<TrendingUp className="h-4 w-4" strokeWidth={1.5} />} accent="blue" filled />
        <MetricCard title="Faturas Pendentes" value={String(contas.filter(c => c.status === "pendente").length)} icon={<TrendingDown className="h-4 w-4" strokeWidth={1.5} />} accent="violet" filled />
        <MetricCard title="Contas Vencidas" value={String(vencidas.length)} icon={<AlertCircle className="h-4 w-4" strokeWidth={1.5} />} accent="amber" filled />
      </div>

      <Tabs defaultValue="contas-a-receber" className="w-full">
        <TabsList className="bg-muted/40 border border-border rounded-xl p-1 h-auto gap-1 flex-wrap w-full justify-start overflow-x-auto">
          {[
            { v: "contas-a-receber", l: "Contas a Receber", i: ArrowDownToLine },
            { v: "contas-a-pagar", l: "Contas a Pagar", i: ArrowUpFromLine },
            { v: "movimentação", l: "Movimentação", i: Receipt },
            { v: "fluxo-de-caixa", l: "Fluxo de Caixa", i: Wallet },
            { v: "analise", l: "Análise", i: BarChart3 },
            { v: "dre", l: "DRE", i: FileText },
            { v: "plano-de-contas", l: "Plano de Contas", i: ListTree },
            { v: "contas-bancárias", l: "Contas Bancárias", i: Landmark },
            { v: "configuração", l: "Configuração", i: Settings2 },
          ].map(({ v, l, i: Icon }) => (
            <TabsTrigger
              key={v}
              value={v}
              className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-foreground text-muted-foreground px-3 py-1.5 text-xs font-medium gap-1.5 whitespace-nowrap"
            >
              <Icon className="h-3.5 w-3.5" />
              {l}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="contas-bancárias">
          {contasBancarias.length > 0 && (
            <>
            <div className="bg-card border border-border rounded-lg p-5 mt-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Saldo Total</p>
                <p className="text-xs text-muted-foreground mt-0.5">Soma de todas as contas bancárias</p>
              </div>
              <p className="font-mono-tabular text-2xl font-semibold text-foreground">
                R$ {contasBancarias.reduce((sum: number, cb: any) => sum + Number(cb.saldo_atual), 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
              {contasBancarias.map((cb: any) => {
                const saldo = Number(cb.saldo_atual);
                const podeExcluir = Math.abs(saldo) < 0.01;
                return (
                  <div key={cb.id} className="bg-primary rounded-lg p-5 text-primary-foreground relative">
                    <div className="flex items-start justify-between">
                      <p className="text-sm font-medium opacity-90 pr-2">Saldo {cb.titular}</p>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 -mt-1 -mr-1 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditContaBancaria(cb)}>
                            <Pencil className="h-4 w-4 mr-2" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            disabled={!podeExcluir}
                            onClick={async () => {
                              if (!podeExcluir) return;
                              if (!confirm(`Excluir conta "${cb.titular}"? O histórico de movimentações será mantido.`)) return;
                              const { error } = await supabase.from("contas_bancarias").delete().eq("id", cb.id);
                              if (error) { toast.error("Erro ao excluir: " + error.message); return; }
                              toast.success("Conta excluída");
                              fetchContasBancarias();
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {podeExcluir ? "Excluir" : "Excluir (saldo ≠ 0)"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <p className="text-2xl font-bold mt-1">
                      R$ {saldo.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                );
              })}
            </div>
            </>
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
            onDelete={(id) => setDeleteTarget({ ids: [id] })}
            onDeleteBulk={(ids) => setDeleteTarget({ ids })}
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
        <TabsContent value="analise"><FinanceAnalyticsTab /></TabsContent>
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

      <EditarContaBancariaDialog
        open={!!editContaBancaria}
        onOpenChange={(o) => { if (!o) setEditContaBancaria(null); }}
        onSuccess={() => { setEditContaBancaria(null); fetchContasBancarias(); }}
        conta={editContaBancaria}
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

type SortDir = "asc" | "desc" | null;
type SortKey = string;

function SortableHead({ label, sortKey, currentSort, currentDir, onSort, className }: { label: string; sortKey: SortKey; currentSort: SortKey | null; currentDir: SortDir; onSort: (key: SortKey) => void; className?: string }) {
  const active = currentSort === sortKey;
  return (
    <TableHead className={`h-11 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground ${className || ""}`}>
      <button onClick={() => onSort(sortKey)} className={`flex items-center gap-1 hover:text-foreground transition-colors ${className?.includes("text-right") ? "ml-auto" : ""}`}>
        {label}
        {active && currentDir === "asc" ? <ArrowUp className="h-3 w-3" /> : active && currentDir === "desc" ? <ArrowDown className="h-3 w-3" /> : <ArrowUpDown className="h-3 w-3 opacity-40" />}
      </button>
    </TableHead>
  );
}

function useSortable() {
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);

  const onSort = (key: SortKey) => {
    if (sortKey === key) {
      if (sortDir === "asc") { setSortDir("desc"); }
      else if (sortDir === "desc") { setSortDir(null); setSortKey(null); }
      else { setSortDir("asc"); }
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  return { sortKey, sortDir, onSort };
}

function sortData<T>(data: T[], sortKey: SortKey | null, sortDir: SortDir, accessor: (item: T, key: string) => any): T[] {
  if (!sortKey || !sortDir) return data;
  return [...data].sort((a, b) => {
    const va = accessor(a, sortKey);
    const vb = accessor(b, sortKey);
    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;
    if (typeof va === "string" && typeof vb === "string") {
      return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
    }
    return sortDir === "asc" ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
  });
}

function PaginationBar({ page, pageSize, total, totalPages, onPage, onPageSize }: { page: number; pageSize: number; total: number; totalPages: number; onPage: (p: number) => void; onPageSize: (s: number) => void }) {
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  return (
    <div className="px-5 py-3 border-t border-border flex flex-wrap items-center justify-between gap-3 bg-muted/10">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Itens por página:</span>
        <Select value={String(pageSize)} onValueChange={v => onPageSize(Number(v))}>
          <SelectTrigger className="h-8 w-[80px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[10, 25, 50, 100].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="ml-2">{start}–{end} de {total}</span>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === 1} onClick={() => onPage(1)}><ChevronsLeft className="h-4 w-4" /></Button>
        <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === 1} onClick={() => onPage(page - 1)}><ChevronLeftIcon className="h-4 w-4" /></Button>
        <span className="text-xs text-muted-foreground px-2 tabular-nums">Página {page} de {totalPages}</span>
        <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === totalPages} onClick={() => onPage(page + 1)}><ChevronRightIcon className="h-4 w-4" /></Button>
        <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === totalPages} onClick={() => onPage(totalPages)}><ChevronsRight className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}

function ContasReceberTable({ contas, loading, onBaixar, onBaixarLote, onEdit, onDividir, onDelete, onDeleteBulk }: { contas: ContaReceber[]; loading: boolean; onBaixar: (c: ContaReceber) => void; onBaixarLote: (items: ContaReceber[]) => void; onEdit: (c: ContaReceber) => void; onDividir: (c: ContaReceber) => void; onDelete: (id: string) => void; onDeleteBulk: (ids: string[]) => void }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  const [itemsCache, setItemsCache] = useState<Record<string, { descricao: string; valor: number; tipo: string }[]>>({});
  const { sortKey, sortDir, onSort } = useSortable();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const toggleExpand = async (id: string) => {
    if (expandedRows.includes(id)) {
      setExpandedRows(prev => prev.filter(r => r !== id));
      return;
    }
    setExpandedRows(prev => [...prev, id]);
    if (!itemsCache[id]) {
      const { data } = await supabase.from("contas_receber_itens" as any).select("descricao, valor, tipo").eq("conta_receber_id", id);
      setItemsCache(prev => ({ ...prev, [id]: (data as any) || [] }));
    }
  };

  const preFiltered = contas.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (c.descricao?.toLowerCase().includes(q)) || (c.cliente?.nome?.toLowerCase().includes(q)) || (c.categoria?.toLowerCase().includes(q));
  });

  const filtered = useMemo(() => {
    return sortData(preFiltered, sortKey, sortDir, (item, key) => {
      switch (key) {
        case "pessoa": return item.cliente?.nome ?? "";
        case "categoria": return item.categoria ?? "";
        case "vencimento": return item.vencimento;
        case "valor": return item.valor;
        case "status": return item.status;
        case "descricao": return item.descricao;
        default: return null;
      }
    });
  }, [preFiltered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  useEffect(() => { if (page > totalPages) setPage(1); }, [totalPages, page]);
  useEffect(() => { setPage(1); }, [search, sortKey, sortDir, pageSize]);
  const paginated = useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page, pageSize]);

  const allSelected = paginated.length > 0 && paginated.every(c => selected.includes(c.id));

  const toggleAll = () => {
    setSelected(allSelected ? selected.filter(id => !paginated.some(c => c.id === id)) : Array.from(new Set([...selected, ...paginated.map(c => c.id)])));
  };
  const toggle = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleBulkBaixar = () => {
    const items = contas.filter(c => selected.includes(c.id));
    onBaixarLote(items);
    setSelected([]);
  };
  const handleBulkDelete = () => {
    onDeleteBulk(selected);
    setSelected([]);
  };

  return (
    <div className="bg-card rounded-xl border border-border/60 shadow-sm mt-4 overflow-hidden">
      {selected.length > 0 && (
        <div className="px-5 py-3 border-b border-border flex items-center gap-3 bg-primary/5">
          <span className="text-xs font-medium text-foreground mr-1">{selected.length} selecionada(s)</span>
          <Button size="sm" onClick={handleBulkBaixar} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 h-8">
            <ArrowDownCircle className="h-4 w-4" /> Baixar Selecionados
          </Button>
          <Button size="sm" variant="destructive" onClick={handleBulkDelete} className="gap-1 h-8">
            <XCircle className="h-4 w-4" /> Cancelar Selecionados
          </Button>
        </div>
      )}
      <div className="px-5 py-3.5 border-b border-border flex items-center justify-between gap-2 bg-muted/20">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">Faturas</span>
          <Badge variant="secondary" className="text-[10px] font-medium rounded-full px-2 py-0">{filtered.length}</Badge>
        </div>
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar fatura..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9 bg-card"
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
            <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border">
              <TableHead className="w-10 h-11 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
              </TableHead>
              <TableHead className="h-11 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Documento</TableHead>
              <TableHead className="h-11 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Emissão</TableHead>
              <SortableHead label="Plano de Contas" sortKey="categoria" currentSort={sortKey} currentDir={sortDir} onSort={onSort} />
              <SortableHead label="Pessoa" sortKey="pessoa" currentSort={sortKey} currentDir={sortDir} onSort={onSort} />
              <SortableHead label="Vencimento" sortKey="vencimento" currentSort={sortKey} currentDir={sortDir} onSort={onSort} />
              <SortableHead label="Valor" sortKey="valor" currentSort={sortKey} currentDir={sortDir} onSort={onSort} className="text-right" />
              <TableHead className="h-11 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-right">Valor Pago</TableHead>
              <SortableHead label="Status" sortKey="status" currentSort={sortKey} currentDir={sortDir} onSort={onSort} />
              <TableHead className="h-11 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.map(c => {
              const isExpanded = expandedRows.includes(c.id);
              const items = itemsCache[c.id] || [];
              return (
                <Fragment key={c.id}>
                  <TableRow className={`group transition-colors ${selected.includes(c.id) ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/30"}`}>
                    <TableCell className="py-3">
                      <Checkbox checked={selected.includes(c.id)} onCheckedChange={() => toggle(c.id)} />
                    </TableCell>
                    <TableCell className="py-3">
                      <button onClick={() => toggleExpand(c.id)} className="flex items-center gap-1 text-sm font-medium hover:text-primary transition-colors">
                        {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                        Fatura
                      </button>
                    </TableCell>
                    <TableCell className="text-sm py-3 text-muted-foreground tabular-nums">
                      {format(new Date(c.vencimento + "T00:00:00"), "dd/MM/yy")}
                    </TableCell>
                    <TableCell className="text-sm py-3">
                      {c.categoria ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted text-foreground text-xs font-medium">
                          {c.categoria}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="py-3">
                      <p className="text-sm font-medium text-foreground">{c.cliente?.nome || "—"}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[240px]">{c.descricao}</p>
                    </TableCell>
                    <TableCell className="text-sm py-3 tabular-nums">
                      {format(new Date(c.vencimento + "T00:00:00"), "dd/MM/yy")}
                    </TableCell>
                    <TableCell className="text-sm py-3 text-right tabular-nums font-semibold text-foreground">
                      R$ {Number(c.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-sm py-3 text-right tabular-nums text-muted-foreground">R$ 0,00</TableCell>
                    <TableCell className="py-3">
                      {statusBadge(c.status, c.vencimento)}
                    </TableCell>
                    <TableCell className="text-right py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-60 group-hover:opacity-100 transition-opacity">
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
                  {isExpanded && (
                    items.length > 0 ? items.map((item, i) => (
                      <TableRow key={`${c.id}-item-${i}`} className="bg-muted/20">
                        <TableCell />
                        <TableCell colSpan={4} className="text-xs text-muted-foreground pl-10">
                          <Badge variant="outline" className="text-[9px] mr-2">
                            {item.tipo === "principal" ? "Principal" : item.tipo === "extra" ? "Extra" : "Cortesia"}
                          </Badge>
                          {item.descricao}
                        </TableCell>
                        <TableCell />
                        <TableCell className="text-xs text-right tabular-nums text-muted-foreground">
                          {Number(item.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell colSpan={3} />
                      </TableRow>
                    )) : (
                      <TableRow key={`${c.id}-empty`} className="bg-muted/20">
                        <TableCell />
                        <TableCell colSpan={9} className="text-xs text-muted-foreground text-center py-2">
                          Sem detalhamento de itens
                        </TableCell>
                      </TableRow>
                    )
                  )}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      )}

      {!loading && filtered.length > 0 && (
        <PaginationBar page={page} pageSize={pageSize} total={filtered.length} totalPages={totalPages} onPage={setPage} onPageSize={setPageSize} />
      )}

      {/* Summary cards */}
      {(() => {
        const totalTitulos = filtered.reduce((s, c) => s + c.valor, 0);
        const totalPago = filtered.filter(c => c.status === "pago").reduce((s, c) => s + c.valor, 0);
        const totalAberto = filtered.filter(c => c.status !== "pago").reduce((s, c) => s + c.valor, 0);
        return (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-5 bg-muted/20 border-t border-border">
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground">Total de Títulos</p>
              <p className="text-lg font-semibold text-foreground mt-1.5 tabular-nums">
                R$ {totalTitulos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground">Total Pago</p>
              <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400 mt-1.5 tabular-nums">
                R$ {totalPago.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 p-4 shadow-sm">
              <p className="text-[11px] uppercase tracking-wider font-medium text-white/90">Total em Aberto</p>
              <p className="text-lg font-semibold text-white mt-1.5 tabular-nums">
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
  const { sortKey, sortDir, onSort } = useSortable();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const sorted = useMemo(() => {
    return sortData(contas, sortKey, sortDir, (item: any, key: string) => {
      switch (key) {
        case "descricao": return item.descricao ?? "";
        case "fornecedor": return item.fornecedor ?? "";
        case "categoria": return item.categoria ?? "";
        case "vencimento": return item.vencimento;
        case "valor": return item.valor;
        case "status": return item.status;
        default: return null;
      }
    });
  }, [contas, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  useEffect(() => { if (page > totalPages) setPage(1); }, [totalPages, page]);
  useEffect(() => { setPage(1); }, [sortKey, sortDir, pageSize]);
  const paginated = useMemo(() => sorted.slice((page - 1) * pageSize, page * pageSize), [sorted, page, pageSize]);

  const allSelected = paginated.length > 0 && paginated.every((c: any) => selected.includes(c.id));
  const toggleAll = () => setSelected(allSelected ? selected.filter(id => !paginated.some((c: any) => c.id === id)) : Array.from(new Set([...selected, ...paginated.map((c: any) => c.id)])));
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
    <div className="bg-card rounded-xl border border-border/60 shadow-sm mt-4 overflow-hidden">
      {selected.length > 0 && (
        <div className="px-5 py-3 border-b border-border flex items-center gap-3 bg-primary/5">
          <span className="text-xs font-medium text-foreground mr-1">{selected.length} selecionada(s)</span>
          <Button size="sm" variant="destructive" onClick={handleBulkDelete} className="gap-1 h-8">
            <XCircle className="h-4 w-4" /> Cancelar Selecionados
          </Button>
        </div>
      )}
      <div className="px-5 py-3.5 border-b border-border flex items-center justify-between bg-muted/20">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-foreground">Contas a Pagar</h2>
          <Badge variant="secondary" className="text-[10px] font-medium rounded-full px-2 py-0">{sorted.length}</Badge>
        </div>
      </div>
      {loading ? (
        <div className="p-5 space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
        </div>
      ) : sorted.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
          Nenhuma conta a pagar encontrada
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border">
              <TableHead className="w-10 h-11 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
              </TableHead>
              <SortableHead label="Descrição" sortKey="descricao" currentSort={sortKey} currentDir={sortDir} onSort={onSort} />
              <SortableHead label="Fornecedor" sortKey="fornecedor" currentSort={sortKey} currentDir={sortDir} onSort={onSort} />
              <SortableHead label="Categoria" sortKey="categoria" currentSort={sortKey} currentDir={sortDir} onSort={onSort} />
              <SortableHead label="Vencimento" sortKey="vencimento" currentSort={sortKey} currentDir={sortDir} onSort={onSort} />
              <SortableHead label="Valor" sortKey="valor" currentSort={sortKey} currentDir={sortDir} onSort={onSort} className="text-right" />
              <SortableHead label="Status" sortKey="status" currentSort={sortKey} currentDir={sortDir} onSort={onSort} />
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.map((c: any) => (
              <TableRow key={c.id} className={`group transition-colors ${selected.includes(c.id) ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/30"}`}>
                <TableCell className="py-3">
                  <Checkbox checked={selected.includes(c.id)} onCheckedChange={() => toggle(c.id)} />
                </TableCell>
                <TableCell className="text-sm py-3 font-medium text-foreground">{c.descricao}</TableCell>
                <TableCell className="text-sm py-3 text-muted-foreground">{c.fornecedor}</TableCell>
                <TableCell className="text-sm py-3">
                  {c.categoria ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted text-foreground text-xs font-medium">{c.categoria}</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-sm py-3 tabular-nums">{format(new Date(c.vencimento + "T00:00:00"), "dd/MM/yy")}</TableCell>
                <TableCell className="text-sm py-3 text-right tabular-nums font-semibold text-foreground">
                  R$ {Number(c.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </TableCell>
                <TableCell className="py-3">{statusBadge(c.status, c.vencimento)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {!loading && sorted.length > 0 && (
        <PaginationBar page={page} pageSize={pageSize} total={sorted.length} totalPages={totalPages} onPage={setPage} onPageSize={setPageSize} />
      )}
    </div>
  );
}
