import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { format, subDays, addDays, startOfDay, parseISO, isBefore, isAfter } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ResponsiveContainer,
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, Legend, CartesianGrid,
} from "recharts";
import { TrendingUp, TrendingDown, Calendar, Wallet, PiggyBank, BarChart3 } from "lucide-react";
import { MetasFaturamentoCard } from "./MetasFaturamentoCard";

const COLORS = ["#0ea5e9", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899", "#84cc16"];

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtBRLShort(v: number) {
  if (Math.abs(v) >= 1000) return `R$ ${(v / 1000).toFixed(1)}k`;
  return `R$ ${v.toFixed(0)}`;
}

export function FinanceAnalyticsTab() {
  const { profile } = useAuth();
  const empresaId = profile?.empresa_id;

  // Filtros
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(new Date(), "yyyy-MM-dd"));
  const [bancoFilter, setBancoFilter] = useState<string>("all");

  const [loading, setLoading] = useState(true);
  const [movimentacoes, setMovimentacoes] = useState<any[]>([]);
  const [contasReceber, setContasReceber] = useState<any[]>([]);
  const [contasPagar, setContasPagar] = useState<any[]>([]);
  const [bancos, setBancos] = useState<any[]>([]);

  useEffect(() => {
    if (!empresaId) return;
    setLoading(true);

    Promise.all([
      supabase.from("movimentacoes").select("*").eq("empresa_id", empresaId)
        .gte("data_movimentacao", dateFrom).lte("data_movimentacao", dateTo)
        .order("data_movimentacao", { ascending: true }),
      supabase.from("contas_receber").select("*").eq("empresa_id", empresaId),
      supabase.from("contas_pagar").select("*").eq("empresa_id", empresaId),
      supabase.from("contas_bancarias").select("*").eq("empresa_id", empresaId),
    ]).then(([movRes, crRes, cpRes, bRes]) => {
      let movs = (movRes.data || []) as any[];
      if (bancoFilter !== "all") {
        movs = movs.filter(m => m.conta_bancaria_id === bancoFilter);
      }
      setMovimentacoes(movs);
      setContasReceber((crRes.data || []) as any[]);
      setContasPagar((cpRes.data || []) as any[]);
      setBancos((bRes.data || []) as any[]);
      setLoading(false);
    });
  }, [empresaId, dateFrom, dateTo, bancoFilter]);

  // ============================================================
  // 1. PROJEÇÃO PRÓXIMOS 30 DIAS (contas a receber vs a pagar)
  // ============================================================
  const projecao = useMemo(() => {
    const hoje = startOfDay(new Date());
    const days: { date: string; label: string; receber: number; pagar: number; saldo: number }[] = [];

    for (let i = 0; i < 30; i++) {
      const d = addDays(hoje, i);
      const dStr = format(d, "yyyy-MM-dd");
      const recDia = contasReceber
        .filter(c => c.status === "pendente" && c.vencimento === dStr)
        .reduce((s, c) => s + Number(c.valor || 0), 0);
      const pagDia = contasPagar
        .filter(c => c.status === "pendente" && c.vencimento === dStr)
        .reduce((s, c) => s + Number(c.valor || 0), 0);
      days.push({
        date: dStr,
        label: format(d, "dd/MM"),
        receber: recDia,
        pagar: pagDia,
        saldo: recDia - pagDia,
      });
    }
    return days;
  }, [contasReceber, contasPagar]);

  const totalProjReceber = projecao.reduce((s, d) => s + d.receber, 0);
  const totalProjPagar = projecao.reduce((s, d) => s + d.pagar, 0);

  // ============================================================
  // 2. FLUXO DE CAIXA (entradas vs saídas no período)
  // ============================================================
  const fluxoCaixa = useMemo(() => {
    const map = new Map<string, { entrada: number; saida: number }>();
    movimentacoes.forEach(m => {
      const dStr = m.data_movimentacao;
      if (!map.has(dStr)) map.set(dStr, { entrada: 0, saida: 0 });
      const v = Number(m.valor || 0);
      const slot = map.get(dStr)!;
      if (v >= 0) slot.entrada += v;
      else slot.saida += Math.abs(v);
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, v]) => ({
        date,
        label: format(parseISO(date), "dd/MM"),
        entrada: v.entrada,
        saida: v.saida,
        saldo: v.entrada - v.saida,
      }));
  }, [movimentacoes]);

  const totalEntradas = fluxoCaixa.reduce((s, d) => s + d.entrada, 0);
  const totalSaidas = fluxoCaixa.reduce((s, d) => s + d.saida, 0);
  const lucroLiquido = totalEntradas - totalSaidas;

  // ============================================================
  // 3. SAÍDAS POR PLANO DE CONTAS
  // ============================================================
  const saidasPorPlano = useMemo(() => {
    const map = new Map<string, number>();
    movimentacoes
      .filter(m => Number(m.valor) < 0)
      .forEach(m => {
        const cat = m.plano_contas || "Sem categoria";
        map.set(cat, (map.get(cat) || 0) + Math.abs(Number(m.valor)));
      });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [movimentacoes]);

  // ============================================================
  // 4. ENTRADAS POR PLANO DE CONTAS
  // ============================================================
  const entradasPorPlano = useMemo(() => {
    const map = new Map<string, number>();
    movimentacoes
      .filter(m => Number(m.valor) > 0)
      .forEach(m => {
        const cat = m.plano_contas || "Sem categoria";
        map.set(cat, (map.get(cat) || 0) + Number(m.valor));
      });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [movimentacoes]);

  // ============================================================
  // 5. EVOLUÇÃO DE SALDO POR BANCO
  // ============================================================
  const evolucaoBancos = useMemo(() => {
    if (bancos.length === 0 || movimentacoes.length === 0) return [];

    // Compute daily delta per bank, then cumulative
    const banksFiltered = bancoFilter === "all" ? bancos : bancos.filter(b => b.id === bancoFilter);
    const dateSet = new Set<string>();
    movimentacoes.forEach(m => dateSet.add(m.data_movimentacao));
    const dates = Array.from(dateSet).sort();

    if (dates.length === 0) return [];

    const result: any[] = [];
    const cumulative: Record<string, number> = {};
    banksFiltered.forEach(b => {
      cumulative[b.id] = Number(b.saldo_atual || 0);
      // back-calc starting balance: subtract all movs in period
      const movs = movimentacoes.filter(m => m.conta_bancaria_id === b.id);
      const totalDelta = movs.reduce((s, m) => s + Number(m.valor), 0);
      cumulative[b.id] = Number(b.saldo_atual || 0) - totalDelta;
    });

    for (const d of dates) {
      const point: any = { date: d, label: format(parseISO(d), "dd/MM") };
      for (const b of banksFiltered) {
        const dailyDelta = movimentacoes
          .filter(m => m.conta_bancaria_id === b.id && m.data_movimentacao === d)
          .reduce((s, m) => s + Number(m.valor), 0);
        cumulative[b.id] += dailyDelta;
        point[b.titular || b.banco] = Math.round(cumulative[b.id] * 100) / 100;
      }
      result.push(point);
    }
    return result;
  }, [movimentacoes, bancos, bancoFilter]);

  const banksForChart = bancoFilter === "all" ? bancos : bancos.filter(b => b.id === bancoFilter);

  // ============================================================
  // 6. LUCRO LÍQUIDO MENSAL (últimos 6 meses, derivado de movs)
  // ============================================================
  const lucroMensal = useMemo(() => {
    const map = new Map<string, { entrada: number; saida: number }>();
    movimentacoes.forEach(m => {
      const ym = (m.data_movimentacao as string).substring(0, 7);
      if (!map.has(ym)) map.set(ym, { entrada: 0, saida: 0 });
      const v = Number(m.valor);
      const slot = map.get(ym)!;
      if (v >= 0) slot.entrada += v;
      else slot.saida += Math.abs(v);
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([ym, v]) => ({
        label: format(parseISO(ym + "-01"), "MMM/yy", { locale: ptBR }),
        entrada: v.entrada,
        saida: v.saida,
        lucro: v.entrada - v.saida,
      }));
  }, [movimentacoes]);

  if (!empresaId) return null;

  return (
    <div className="space-y-5 mt-4">
      {/* Metas de faturamento */}
      <MetasFaturamentoCard />

      {/* Filtros */}
      <div className="bg-card border border-border rounded-xl p-4 flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Data inicial</Label>
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-9 w-[160px]" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Data final</Label>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-9 w-[160px]" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Banco</Label>
          <Select value={bancoFilter} onValueChange={setBancoFilter}>
            <SelectTrigger className="h-9 w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os bancos</SelectItem>
              {bancos.map(b => (
                <SelectItem key={b.id} value={b.id}>{b.banco} — {b.titular}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto flex gap-2 text-xs">
          {[
            { label: "7 dias", days: 7 },
            { label: "30 dias", days: 30 },
            { label: "90 dias", days: 90 },
          ].map(p => (
            <button key={p.label} onClick={() => {
              setDateFrom(format(subDays(new Date(), p.days), "yyyy-MM-dd"));
              setDateTo(format(new Date(), "yyyy-MM-dd"));
            }} className="px-3 py-1.5 rounded-md border border-border hover:bg-accent transition">
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="Entradas no período" value={fmtBRL(totalEntradas)} icon={<TrendingUp className="h-4 w-4" />} accent="emerald" />
        <KpiCard title="Saídas no período" value={fmtBRL(totalSaidas)} icon={<TrendingDown className="h-4 w-4" />} accent="amber" />
        <KpiCard title="Lucro líquido" value={fmtBRL(lucroLiquido)} icon={<PiggyBank className="h-4 w-4" />} accent={lucroLiquido >= 0 ? "blue" : "rose"} />
        <KpiCard title="Projeção próx. 30d (líquido)" value={fmtBRL(totalProjReceber - totalProjPagar)} icon={<Calendar className="h-4 w-4" />} accent="violet" />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-72 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Projeção */}
          <ChartCard
            title="Projeção próximos 30 dias"
            subtitle={`A receber: ${fmtBRL(totalProjReceber)} • A pagar: ${fmtBRL(totalProjPagar)}`}
            icon={<Calendar className="h-4 w-4 text-violet-500" />}
          >
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={projecao}>
                <defs>
                  <linearGradient id="gradReceber" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="gradPagar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} interval={3} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={fmtBRLShort} />
                <Tooltip formatter={(v: any) => fmtBRL(Number(v))} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="receber" name="A receber" stroke="#10b981" fill="url(#gradReceber)" strokeWidth={2} />
                <Area type="monotone" dataKey="pagar" name="A pagar" stroke="#ef4444" fill="url(#gradPagar)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Fluxo de Caixa */}
          <ChartCard
            title="Fluxo de caixa"
            subtitle={`Entradas: ${fmtBRL(totalEntradas)} • Saídas: ${fmtBRL(totalSaidas)}`}
            icon={<Wallet className="h-4 w-4 text-sky-500" />}
          >
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={fluxoCaixa}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={fmtBRLShort} />
                <Tooltip formatter={(v: any) => fmtBRL(Number(v))} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="entrada" name="Entradas" fill="#10b981" radius={[4,4,0,0]} />
                <Bar dataKey="saida" name="Saídas" fill="#ef4444" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Saídas por plano */}
          <ChartCard
            title="Saídas por plano de contas"
            subtitle={`${saidasPorPlano.length} categoria(s)`}
            icon={<TrendingDown className="h-4 w-4 text-rose-500" />}
          >
            {saidasPorPlano.length === 0 ? (
              <EmptyChart text="Sem saídas no período" />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={saidasPorPlano} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={(e: any) => `${e.name}: ${fmtBRLShort(e.value)}`} labelLine={false} fontSize={10}>
                    {saidasPorPlano.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => fmtBRL(Number(v))} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* Entradas por plano */}
          <ChartCard
            title="Entradas por plano de contas"
            subtitle={`${entradasPorPlano.length} categoria(s)`}
            icon={<TrendingUp className="h-4 w-4 text-emerald-500" />}
          >
            {entradasPorPlano.length === 0 ? (
              <EmptyChart text="Sem entradas no período" />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={entradasPorPlano} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={fmtBRLShort} />
                  <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} width={120} />
                  <Tooltip formatter={(v: any) => fmtBRL(Number(v))} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                  <Bar dataKey="value" name="Entrada" fill="#10b981" radius={[0,4,4,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* Evolução por banco */}
          <ChartCard
            title="Evolução de saldo por banco"
            subtitle={`${banksForChart.length} conta(s)`}
            icon={<BarChart3 className="h-4 w-4 text-blue-500" />}
          >
            {evolucaoBancos.length === 0 ? (
              <EmptyChart text="Sem movimentações no período" />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={evolucaoBancos}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={fmtBRLShort} />
                  <Tooltip formatter={(v: any) => fmtBRL(Number(v))} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {banksForChart.map((b, i) => (
                    <Line key={b.id} type="monotone" dataKey={b.titular || b.banco} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* Lucro líquido mensal */}
          <ChartCard
            title="Lucro líquido por mês"
            subtitle={lucroMensal.length > 0 ? `Última: ${fmtBRL(lucroMensal[lucroMensal.length - 1].lucro)}` : ""}
            icon={<PiggyBank className="h-4 w-4 text-emerald-500" />}
          >
            {lucroMensal.length === 0 ? (
              <EmptyChart text="Sem dados no período" />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={lucroMensal}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={fmtBRLShort} />
                  <Tooltip formatter={(v: any) => fmtBRL(Number(v))} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                  <Bar dataKey="lucro" name="Lucro líquido" radius={[6,6,0,0]}>
                    {lucroMensal.map((d, i) => (
                      <Cell key={i} fill={d.lucro >= 0 ? "#10b981" : "#ef4444"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>
      )}
    </div>
  );
}

function KpiCard({ title, value, icon, accent }: { title: string; value: string; icon: React.ReactNode; accent: "blue"|"emerald"|"violet"|"amber"|"rose" }) {
  const map: Record<string, string> = {
    blue: "from-sky-500 to-blue-600",
    emerald: "from-emerald-500 to-teal-600",
    violet: "from-violet-500 to-fuchsia-600",
    amber: "from-amber-500 to-orange-600",
    rose: "from-rose-500 to-red-600",
  };
  return (
    <div className={`relative overflow-hidden rounded-xl p-4 text-white bg-gradient-to-br ${map[accent]}`}>
      <div className="absolute -top-8 -right-8 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
      <div className="relative flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-white/80 uppercase tracking-wider">{title}</span>
        <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center">{icon}</div>
      </div>
      <div className="relative font-mono-tabular text-xl font-semibold tracking-tight">{value}</div>
    </div>
  );
}

function ChartCard({ title, subtitle, icon, children }: { title: string; subtitle?: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold">{title}</CardTitle>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          {icon && <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">{icon}</div>}
        </div>
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  );
}

function EmptyChart({ text }: { text: string }) {
  return (
    <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}