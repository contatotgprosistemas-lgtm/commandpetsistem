import { MetricCard } from "@/components/MetricCard";
import { DollarSign, TrendingUp, TrendingDown, AlertCircle, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const cashFlowData = [
  { month: "Jan", receitas: 18500, despesas: 12300 },
  { month: "Fev", receitas: 22100, despesas: 14200 },
  { month: "Mar", receitas: 19800, despesas: 11800 },
  { month: "Abr", receitas: 24500, despesas: 15600 },
  { month: "Mai", receitas: 28200, despesas: 16100 },
  { month: "Jun", receitas: 31000, despesas: 17500 },
];

const receivables = [
  { client: "Maria Silva", desc: "Banho e Tosa - Rex", value: 180, due: "15/03/2026", status: "pendente" },
  { client: "Carlos Lima", desc: "Hospedagem - Bob (5 diárias)", value: 500, due: "10/03/2026", status: "vencido" },
  { client: "Ana Paula", desc: "Daycare - Luna (10 dias)", value: 800, due: "20/03/2026", status: "pendente" },
  { client: "Pedro Alves", desc: "Banho - Thor", value: 120, due: "08/03/2026", status: "vencido" },
  { client: "Fernanda Costa", desc: "Consulta veterinária", value: 250, due: "01/03/2026", status: "pago" },
];

const statusStyles: Record<string, string> = {
  pendente: "bg-warning/10 text-warning",
  vencido: "bg-destructive/10 text-destructive",
  pago: "bg-success/10 text-success",
};

export default function FinancePage() {
  return (
    <div className="p-6 space-y-6 max-w-[1400px]">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Financeiro</h1>
        <p className="text-sm text-muted-foreground">Visão geral financeira</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Saldo Atual" value="R$ 45.200" change="+12% este mês" changeType="positive" icon={<DollarSign className="h-4 w-4" strokeWidth={1.5} />} />
        <MetricCard title="Receitas do Mês" value="R$ 31.000" change="+18% vs mês anterior" changeType="positive" icon={<TrendingUp className="h-4 w-4" strokeWidth={1.5} />} />
        <MetricCard title="Despesas do Mês" value="R$ 17.500" change="+8% vs mês anterior" changeType="negative" icon={<TrendingDown className="h-4 w-4" strokeWidth={1.5} />} />
        <MetricCard title="Contas Vencidas" value="2" change="R$ 620,00" changeType="negative" icon={<AlertCircle className="h-4 w-4" strokeWidth={1.5} />} />
      </div>

      {/* Cash Flow Chart */}
      <div className="bg-card rounded-lg p-5 shadow-card">
        <h2 className="text-sm font-medium text-foreground mb-4">Fluxo de Caixa — 6 meses</h2>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={cashFlowData}>
            <defs>
              <linearGradient id="colorReceitas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.2} />
                <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorDespesas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.15} />
                <stop offset="95%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(215, 16%, 47%)" }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(215, 16%, 47%)" }} tickFormatter={(v) => `R$${v / 1000}k`} />
            <Tooltip contentStyle={{ background: "hsl(0, 0%, 100%)", border: "none", borderRadius: 8, boxShadow: "var(--shadow-md)", fontSize: 12 }} formatter={(value: number) => [`R$ ${value.toLocaleString("pt-BR")}`, ""]} />
            <Area type="monotone" dataKey="receitas" stroke="hsl(142, 71%, 45%)" strokeWidth={2} fill="url(#colorReceitas)" name="Receitas" />
            <Area type="monotone" dataKey="despesas" stroke="hsl(0, 84%, 60%)" strokeWidth={2} fill="url(#colorDespesas)" name="Despesas" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Receivables */}
      <div className="bg-card rounded-lg shadow-card">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-medium text-foreground">Contas a Receber</h2>
          <button className="text-xs text-primary hover:underline">Ver todas</button>
        </div>
        <div className="divide-y divide-border">
          {receivables.map((item, i) => (
            <div key={i} className="px-5 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{item.client}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-mono-tabular text-sm font-medium text-foreground flex items-center gap-1">
                  {item.status === "pago" ? <ArrowUpRight className="h-3 w-3 text-success" /> : <ArrowDownRight className="h-3 w-3 text-muted-foreground" />}
                  R$ {item.value.toLocaleString("pt-BR")}
                </span>
                <span className="font-mono-tabular text-xs text-muted-foreground w-20 text-right">{item.due}</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${statusStyles[item.status]}`}>
                  {item.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
