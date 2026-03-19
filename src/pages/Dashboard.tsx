import { MetricCard } from "@/components/MetricCard";
import { MessageSquare, PawPrint, DollarSign, Users } from "lucide-react";

export default function Dashboard() {
  return (
    <div className="p-6 space-y-6 max-w-[1400px]">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral do dia — {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Chats Ativos" value="0" change="—" changeType="neutral" icon={<MessageSquare className="h-4 w-4" strokeWidth={1.5} />} />
        <MetricCard title="Pets na Empresa" value="0" change="—" changeType="neutral" icon={<PawPrint className="h-4 w-4" strokeWidth={1.5} />} />
        <MetricCard title="Faturamento Hoje" value="R$ 0" change="—" changeType="neutral" icon={<DollarSign className="h-4 w-4" strokeWidth={1.5} />} />
        <MetricCard title="Contas Pendentes" value="0" change="—" changeType="neutral" icon={<Users className="h-4 w-4" strokeWidth={1.5} />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-card rounded-lg p-5 shadow-card">
          <h2 className="text-sm font-medium text-foreground mb-4">Faturamento Semanal</h2>
          <div className="flex items-center justify-center h-[220px] text-sm text-muted-foreground">
            Sem dados para exibir
          </div>
        </div>

        <div className="bg-card rounded-lg p-5 shadow-card">
          <h2 className="text-sm font-medium text-foreground mb-4">Atividades Recentes</h2>
          <div className="flex items-center justify-center h-[160px] text-sm text-muted-foreground">
            Nenhuma atividade recente
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg shadow-card">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-medium text-foreground">Pets na Empresa</h2>
        </div>
        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
          Nenhum pet na empresa no momento
        </div>
      </div>
    </div>
  );
}
