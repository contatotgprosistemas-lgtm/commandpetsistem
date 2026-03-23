import { useState, useEffect } from "react";
import { MetricCard } from "@/components/MetricCard";
import { DollarSign, TrendingUp, TrendingDown, AlertCircle, ArrowDownCircle, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { format, isPast, isToday } from "date-fns";
import { BaixaContaDialog } from "@/components/BaixaContaDialog";
import { NovaContaBancariaDialog } from "@/components/NovaContaBancariaDialog";
import FluxoCaixaPage from "@/pages/FluxoCaixaPage";
import DREPage from "@/pages/DREPage";
import MovimentacaoPage from "@/pages/MovimentacaoPage";
import PlanoContasPage from "@/pages/PlanoContasPage";

interface ContaReceber {
  id: string;
  descricao: string;
  valor: number;
  vencimento: string;
  categoria: string | null;
  status: string;
  cliente: { nome: string } | null;
}

function statusBadge(status: string, vencimento: string) {
  if (status === "pago") return <Badge className="bg-emerald-500/15 text-emerald-600 border-0 text-xs">Pago</Badge>;
  if (isPast(new Date(vencimento)) && !isToday(new Date(vencimento)))
    return <Badge variant="destructive" className="text-xs">Vencida</Badge>;
  return <Badge className="bg-amber-500/15 text-amber-600 border-0 text-xs">Pendente</Badge>;
}

export default function FinancePage() {
  const [contas, setContas] = useState<ContaReceber[]>([]);
  const [contasBancarias, setContasBancarias] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [baixaConta, setBaixaConta] = useState<{ id: string; descricao: string; valor: number } | null>(null);
  const [novaContaOpen, setNovaContaOpen] = useState(false);

  async function fetchContas() {
    setLoading(true);
    const { data } = await supabase
      .from("contas_receber")
      .select("id, descricao, valor, vencimento, categoria, status, cliente:clientes(nome)")
      .order("vencimento", { ascending: false });
    if (data) setContas(data as any);
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

      <Tabs defaultValue="contas-bancárias" className="w-full">
        <TabsList className="bg-transparent border-b border-border rounded-none p-0 h-auto gap-4 flex-wrap">
          {["Contas Bancárias", "Contas a Receber", "Contas a Pagar", "Fluxo de Caixa", "DRE", "Movimentação", "Plano de Contas"].map(tab => (
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
          <ContasContent
            contas={contas}
            loading={loading}
            onBaixar={(c) => setBaixaConta({ id: c.id, descricao: c.descricao, valor: c.valor })}
          />
        </TabsContent>

        <TabsContent value="contas-a-pagar">
          <ContasPagarContent />
        </TabsContent>

        <TabsContent value="fluxo-de-caixa"><FluxoCaixaPage /></TabsContent>
        <TabsContent value="dre"><DREPage /></TabsContent>
        <TabsContent value="movimentação"><MovimentacaoPage /></TabsContent>
        <TabsContent value="plano-de-contas"><PlanoContasPage /></TabsContent>
      </Tabs>

      <BaixaContaDialog
        conta={baixaConta}
        open={!!baixaConta}
        onOpenChange={(o) => { if (!o) setBaixaConta(null); }}
        onSuccess={() => { setBaixaConta(null); fetchContas(); }}
      />

      <NovaContaBancariaDialog
        open={novaContaOpen}
        onOpenChange={setNovaContaOpen}
        onSuccess={fetchContasBancarias}
      />
    </div>
  );
}

function ContasContent({ contas, loading, onBaixar }: { contas: ContaReceber[]; loading: boolean; onBaixar: (c: ContaReceber) => void }) {
  return (
    <div className="bg-card rounded-lg shadow-card mt-4">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <h2 className="text-sm font-medium text-foreground">Contas a Receber</h2>
        <span className="text-xs text-muted-foreground">{contas.length} fatura(s)</span>
      </div>

      {loading ? (
        <div className="p-5 space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
        </div>
      ) : contas.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
          Nenhuma fatura encontrada
        </div>
      ) : (
        <div className="divide-y divide-border">
          {contas.map(c => (
            <div key={c.id} className="flex items-center gap-4 px-5 py-3 hover:bg-muted/30 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{c.descricao}</p>
                <p className="text-xs text-muted-foreground">
                  {c.cliente?.nome || "—"} {c.categoria && `• ${c.categoria}`}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-foreground tabular-nums">
                  R$ {c.valor.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Venc. {format(new Date(c.vencimento + "T00:00:00"), "dd/MM/yyyy")}
                </p>
              </div>
              <div className="shrink-0">
                {statusBadge(c.status, c.vencimento)}
              </div>
              {c.status === "pendente" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 text-xs shrink-0"
                  onClick={() => onBaixar(c)}
                >
                  <ArrowDownCircle className="h-3.5 w-3.5" />
                  Baixar
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ContasPagarContent() {
  const [contas, setContas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      setLoading(true);
      const { data } = await supabase
        .from("contas_pagar")
        .select("*")
        .order("vencimento", { ascending: false });
      if (data) setContas(data);
      setLoading(false);
    }
    fetch();
  }, []);

  return (
    <div className="bg-card rounded-lg shadow-card mt-4">
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
        <div className="divide-y divide-border">
          {contas.map((c: any) => (
            <div key={c.id} className="flex items-center gap-4 px-5 py-3 hover:bg-muted/30 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{c.descricao}</p>
                <p className="text-xs text-muted-foreground">{c.fornecedor} {c.categoria && `• ${c.categoria}`}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-foreground tabular-nums">R$ {Number(c.valor).toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Venc. {format(new Date(c.vencimento + "T00:00:00"), "dd/MM/yyyy")}</p>
              </div>
              <div className="shrink-0">
                {statusBadge(c.status, c.vencimento)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
