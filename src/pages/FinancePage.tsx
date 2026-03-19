import { MetricCard } from "@/components/MetricCard";
import { DollarSign, TrendingUp, TrendingDown, AlertCircle } from "lucide-react";

export default function FinancePage() {
  return (
    <div className="p-6 space-y-6 max-w-[1400px]">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Financeiro</h1>
        <p className="text-sm text-muted-foreground">Visão geral financeira</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Saldo Atual" value="R$ 0" change="—" changeType="neutral" icon={<DollarSign className="h-4 w-4" strokeWidth={1.5} />} />
        <MetricCard title="Receitas do Mês" value="R$ 0" change="—" changeType="neutral" icon={<TrendingUp className="h-4 w-4" strokeWidth={1.5} />} />
        <MetricCard title="Despesas do Mês" value="R$ 0" change="—" changeType="neutral" icon={<TrendingDown className="h-4 w-4" strokeWidth={1.5} />} />
        <MetricCard title="Contas Vencidas" value="0" change="—" changeType="neutral" icon={<AlertCircle className="h-4 w-4" strokeWidth={1.5} />} />
      </div>

      <div className="bg-card rounded-lg p-5 shadow-card">
        <h2 className="text-sm font-medium text-foreground mb-4">Fluxo de Caixa — 6 meses</h2>
        <div className="flex items-center justify-center h-[260px] text-sm text-muted-foreground">
          Sem dados para exibir
        </div>
      </div>

      <div className="bg-card rounded-lg shadow-card">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-medium text-foreground">Contas a Receber</h2>
        </div>
        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
          Nenhuma conta a receber
        </div>
      </div>
    </div>
  );
}
