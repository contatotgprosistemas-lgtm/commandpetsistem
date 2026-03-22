import { useState, useEffect } from "react";
import { MetricCard } from "@/components/MetricCard";
import { DollarSign, TrendingUp, TrendingDown, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { format, isPast, isToday } from "date-fns";

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
  const [loading, setLoading] = useState(true);

  async function fetchContas() {
    setLoading(true);
    const { data } = await supabase
      .from("contas_receber")
      .select("id, descricao, valor, vencimento, categoria, status, cliente:clientes(nome)")
      .order("vencimento", { ascending: false });
    if (data) setContas(data as any);
    setLoading(false);
  }

  useEffect(() => { fetchContas(); }, []);

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

      <div className="bg-card rounded-lg shadow-card">
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
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
