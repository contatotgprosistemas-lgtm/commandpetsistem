import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentEmpresa } from "@/lib/useCurrentEmpresa";
import { Card } from "@/components/ui/card";
import { MessageSquare, Users, GitBranch, TrendingUp, Megaphone, CheckCircle2, Clock, Target } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { format, subDays, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

const COLORS = ["hsl(var(--primary))", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function CRMAnalyticsPage() {
  const { data: empresaId } = useCurrentEmpresa();

  const { data: stats } = useQuery({
    queryKey: ["crm-analytics", empresaId],
    enabled: !!empresaId,
    queryFn: async () => {
      const since = subDays(new Date(), 30).toISOString();
      const [contatos, conversas, mensagens, leads, campanhas, tarefas, etapas] = await Promise.all([
        supabase.from("crm_contatos").select("id,created_at", { count: "exact" }).eq("empresa_id", empresaId!),
        supabase.from("crm_conversas").select("id,status,created_at", { count: "exact" }).eq("empresa_id", empresaId!),
        supabase.from("crm_mensagens").select("id,direcao,created_at").eq("empresa_id", empresaId!).gte("created_at", since),
        supabase.from("crm_leads").select("id,valor,etapa_id,created_at").eq("empresa_id", empresaId!),
        supabase.from("crm_campanhas").select("id,status,total_enviados,total_falhas").eq("empresa_id", empresaId!),
        supabase.from("crm_tarefas").select("id,concluida").eq("empresa_id", empresaId!),
        supabase.from("crm_pipeline_etapas").select("id,nome,cor,ordem").eq("empresa_id", empresaId!).order("ordem"),
      ]);

      // Mensagens por dia (30d)
      const msgByDay: Record<string, { date: string; in: number; out: number }> = {};
      for (let i = 29; i >= 0; i--) {
        const d = format(subDays(new Date(), i), "dd/MM");
        msgByDay[d] = { date: d, in: 0, out: 0 };
      }
      (mensagens.data ?? []).forEach((m: any) => {
        const d = format(new Date(m.created_at), "dd/MM");
        if (msgByDay[d]) {
          if (m.direcao === "entrada") msgByDay[d].in++;
          else msgByDay[d].out++;
        }
      });

      // Funil
      const funilData = (etapas.data ?? []).map((e: any) => {
        const leadsEtapa = (leads.data ?? []).filter((l: any) => l.etapa_id === e.id);
        return {
          nome: e.nome,
          cor: e.cor,
          quantidade: leadsEtapa.length,
          valor: leadsEtapa.reduce((s: number, l: any) => s + Number(l.valor || 0), 0),
        };
      });

      // Status conversas
      const statusConvs = (conversas.data ?? []).reduce((acc: any, c: any) => {
        acc[c.status] = (acc[c.status] || 0) + 1;
        return acc;
      }, {});
      const statusData = Object.entries(statusConvs).map(([name, value]) => ({ name, value: value as number }));

      const totalLeads = (leads.data ?? []).length;
      const valorPipeline = (leads.data ?? []).reduce((s, l: any) => s + Number(l.valor || 0), 0);
      const tarefasPend = (tarefas.data ?? []).filter((t: any) => !t.concluida).length;

      return {
        totalContatos: contatos.count ?? 0,
        totalConversas: conversas.count ?? 0,
        totalMensagens: (mensagens.data ?? []).length,
        totalLeads,
        valorPipeline,
        tarefasPend,
        totalCampanhas: (campanhas.data ?? []).length,
        msgsEnviadasCampanha: (campanhas.data ?? []).reduce((s, c: any) => s + (c.total_enviados || 0), 0),
        msgChartData: Object.values(msgByDay),
        funilData,
        statusData,
      };
    },
  });

  if (!stats) {
    return <div className="p-6 text-sm text-muted-foreground">Carregando indicadores...</div>;
  }

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground">BI interno e indicadores comerciais (últimos 30 dias).</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI icon={Users} label="Contatos" value={stats.totalContatos} color="text-blue-600" />
        <KPI icon={MessageSquare} label="Conversas" value={stats.totalConversas} color="text-emerald-600" />
        <KPI icon={GitBranch} label="Leads ativos" value={stats.totalLeads} color="text-amber-600" />
        <KPI icon={TrendingUp} label="Pipeline (R$)"
             value={stats.valorPipeline.toLocaleString("pt-BR", { minimumFractionDigits: 0 })} color="text-violet-600" />
        <KPI icon={MessageSquare} label="Msgs (30d)" value={stats.totalMensagens} color="text-cyan-600" />
        <KPI icon={Megaphone} label="Campanhas" value={stats.totalCampanhas} color="text-pink-600" />
        <KPI icon={Target} label="Disparos (todas)" value={stats.msgsEnviadasCampanha} color="text-orange-600" />
        <KPI icon={Clock} label="Tarefas pendentes" value={stats.tarefasPend} color="text-rose-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5 border-border/60">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Volume de mensagens (30 dias)</h3>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Entrada</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" /> Saída</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={stats.msgChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" fontSize={10} stroke="hsl(var(--muted-foreground))" />
              <YAxis fontSize={10} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="in" stroke="#10b981" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="out" stroke="#3b82f6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5 border-border/60">
          <h3 className="text-sm font-semibold mb-4">Status de conversas</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={stats.statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={90}
                   paddingAngle={3} dataKey="value">
                {stats.statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 justify-center text-xs mt-2">
            {stats.statusData.map((s, i) => (
              <span key={s.name} className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                {s.name} ({s.value})
              </span>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-5 border-border/60">
        <h3 className="text-sm font-semibold mb-4">Funil de vendas</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={stats.funilData} layout="vertical" margin={{ left: 30 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis type="number" fontSize={10} stroke="hsl(var(--muted-foreground))" />
            <YAxis type="category" dataKey="nome" fontSize={11} stroke="hsl(var(--muted-foreground))" width={110} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                     formatter={(v: any, k: any) => k === "valor" ? `R$ ${Number(v).toLocaleString("pt-BR")}` : v} />
            <Bar dataKey="quantidade" radius={[0, 6, 6, 0]}>
              {stats.funilData.map((d, i) => <Cell key={i} fill={d.cor || COLORS[i % COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}

function KPI({ icon: Icon, label, value, color }: any) {
  return (
    <Card className="p-4 border-border/60">
      <div className="flex items-center gap-3">
        <div className={`h-10 w-10 rounded-lg bg-muted/60 flex items-center justify-center ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div>
          <div className="text-lg font-semibold truncate">{value}</div>
        </div>
      </div>
    </Card>
  );
}
