import { MetricCard } from "@/components/MetricCard";
import { StatusTag } from "@/components/StatusTag";
import { MessageSquare, PawPrint, DollarSign, Users } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const revenueData = [
  { day: "Seg", value: 2400 }, { day: "Ter", value: 3100 }, { day: "Qua", value: 2800 },
  { day: "Qui", value: 3600 }, { day: "Sex", value: 4200 }, { day: "Sáb", value: 5100 },
  { day: "Dom", value: 1800 },
];

const recentActivities = [
  { time: "14:32", text: "Rex (Golden) check-in para Banho e Tosa", type: "in-bath" as const },
  { time: "14:15", text: "Luna (Shih Tzu) pronta para retirada", type: "ready" as const },
  { time: "13:50", text: "Novo agendamento: Thor - Daycare amanhã", type: "daycare" as const },
  { time: "13:22", text: "Pagamento recebido: R$ 180,00 - Maria Silva", type: "ready" as const },
  { time: "12:45", text: "Bob (Labrador) hospedado - entrada hoje", type: "hosted" as const },
];

const petsInHouse = [
  { name: "Rex", breed: "Golden Retriever", status: "in-bath" as const, tutor: "João Santos" },
  { name: "Luna", breed: "Shih Tzu", status: "ready" as const, tutor: "Ana Paula" },
  { name: "Bob", breed: "Labrador", status: "hosted" as const, tutor: "Carlos Lima" },
  { name: "Mel", breed: "Poodle", status: "waiting" as const, tutor: "Fernanda Costa" },
  { name: "Thor", breed: "Bulldog", status: "in-bath" as const, tutor: "Pedro Alves" },
];

export default function Dashboard() {
  return (
    <div className="p-6 space-y-6 max-w-[1400px]">
      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral do dia — {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Chats Ativos"
          value="12"
          change="+3 desde ontem"
          changeType="positive"
          icon={<MessageSquare className="h-4 w-4" strokeWidth={1.5} />}
        />
        <MetricCard
          title="Pets na Casa"
          value="5"
          change="2 banho, 1 hotel, 2 daycare"
          changeType="neutral"
          icon={<PawPrint className="h-4 w-4" strokeWidth={1.5} />}
        />
        <MetricCard
          title="Faturamento Hoje"
          value="R$ 2.340"
          change="+18% vs ontem"
          changeType="positive"
          icon={<DollarSign className="h-4 w-4" strokeWidth={1.5} />}
        />
        <MetricCard
          title="Contas Pendentes"
          value="3"
          change="R$ 890,00 total"
          changeType="negative"
          icon={<Users className="h-4 w-4" strokeWidth={1.5} />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-card rounded-lg p-5 shadow-card">
          <h2 className="text-sm font-medium text-foreground mb-4">Faturamento Semanal</h2>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(221, 83%, 53%)" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="hsl(221, 83%, 53%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(215, 16%, 47%)" }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(215, 16%, 47%)" }} tickFormatter={(v) => `R$${v / 1000}k`} />
              <Tooltip
                contentStyle={{ background: "hsl(0, 0%, 100%)", border: "none", borderRadius: 8, boxShadow: "var(--shadow-md)", fontSize: 12 }}
                formatter={(value: number) => [`R$ ${value.toLocaleString("pt-BR")}`, "Receita"]}
              />
              <Area type="monotone" dataKey="value" stroke="hsl(221, 83%, 53%)" strokeWidth={2} fill="url(#colorRevenue)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Activity Feed */}
        <div className="bg-card rounded-lg p-5 shadow-card">
          <h2 className="text-sm font-medium text-foreground mb-4">Atividades Recentes</h2>
          <div className="space-y-3">
            {recentActivities.map((a, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="font-mono-tabular text-xs text-muted-foreground mt-0.5 shrink-0 w-10">{a.time}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground leading-tight">{a.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pets In House */}
      <div className="bg-card rounded-lg shadow-card">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-medium text-foreground">Pets na Casa</h2>
        </div>
        <div className="divide-y divide-border">
          {petsInHouse.map((pet, i) => (
            <div key={i} className="px-5 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                  <PawPrint className="h-4 w-4 text-primary" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{pet.name}</p>
                  <p className="text-xs text-muted-foreground">{pet.breed} — {pet.tutor}</p>
                </div>
              </div>
              <StatusTag status={pet.status} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
