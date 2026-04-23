import { Card } from "@/components/ui/card";
import { MessageSquare, Users, TrendingUp, DollarSign, Clock, Target, Zap, Activity } from "lucide-react";

const cards = [
  { label: "Conversas abertas", value: "0", icon: MessageSquare, accent: "from-violet-500 to-fuchsia-500" },
  { label: "Leads do dia", value: "0", icon: Users, accent: "from-blue-500 to-cyan-500" },
  { label: "Conversão", value: "0%", icon: TrendingUp, accent: "from-emerald-500 to-teal-500" },
  { label: "Receita gerada", value: "R$ 0", icon: DollarSign, accent: "from-amber-500 to-orange-500" },
  { label: "Tempo médio resp.", value: "—", icon: Clock, accent: "from-pink-500 to-rose-500" },
  { label: "Meta de vendas", value: "0%", icon: Target, accent: "from-indigo-500 to-purple-500" },
  { label: "Atendentes online", value: "1", icon: Zap, accent: "from-green-500 to-emerald-500" },
  { label: "Pipeline", value: "R$ 0", icon: Activity, accent: "from-cyan-500 to-blue-500" },
];

export default function CRMDashboard() {
  return (
    <div className="h-full overflow-y-auto p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral da operação comercial em tempo real.</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.label} className="p-4 relative overflow-hidden border-border/60 hover:shadow-card-hover transition-shadow">
              <div className={`absolute -top-6 -right-6 h-20 w-20 rounded-full bg-gradient-to-br ${c.accent} opacity-10 blur-2xl`} />
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-muted-foreground font-medium">{c.label}</span>
                <div className={`h-8 w-8 rounded-lg bg-gradient-to-br ${c.accent} flex items-center justify-center`}>
                  <Icon className="h-4 w-4 text-white" strokeWidth={2} />
                </div>
              </div>
              <div className="text-2xl font-semibold font-mono-tabular">{c.value}</div>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5 lg:col-span-2 border-border/60">
          <h3 className="text-sm font-semibold mb-1">Volume de mensagens</h3>
          <p className="text-xs text-muted-foreground mb-4">Últimos 7 dias</p>
          <div className="h-48 flex items-center justify-center text-xs text-muted-foreground border border-dashed border-border rounded-lg">
            Conecte um canal para começar a ver dados
          </div>
        </Card>
        <Card className="p-5 border-border/60">
          <h3 className="text-sm font-semibold mb-1">Conversas por canal</h3>
          <p className="text-xs text-muted-foreground mb-4">Distribuição</p>
          <div className="h-48 flex items-center justify-center text-xs text-muted-foreground border border-dashed border-border rounded-lg">
            Sem dados
          </div>
        </Card>
      </div>
    </div>
  );
}