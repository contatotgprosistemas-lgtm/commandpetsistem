import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { format, differenceInDays } from "date-fns";
import { Search, Package, AlertTriangle, CheckCircle2, Calendar } from "lucide-react";
import { cn, parseLocalDate } from "@/lib/utils";

/** Today at 00:00 local time, for date-only comparisons. */
function startOfToday(): Date {
  const t = new Date();
  return new Date(t.getFullYear(), t.getMonth(), t.getDate());
}
/** Days remaining until endDate (positive = future, 0 = today, negative = past). */
function daysUntil(endDate: string): number {
  return differenceInDays(parseLocalDate(endDate), startOfToday());
}
/** A subscription is only "vencido" AFTER the end_date day has fully passed. */
function isExpired(endDate: string | null): boolean {
  if (!endDate) return false;
  return daysUntil(endDate) < 0;
}

interface ConsumoRow {
  subscriptionId: string;
  cliente: string;
  pet: string;
  tipo: "Plano" | "Pacote";
  nome: string;
  totalCreditos: number | null;     // null for plans without explicit credits
  usados: number;
  restantes: number | null;
  startDate: string;
  endDate: string | null;
  renovacao: string | null;
  autoRenew: boolean;
  status: string;
  finalPrice: number;
}

export function ConsumoTab() {
  const { profile } = useAuth();
  const empresaId = profile?.empresa_id;

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ConsumoRow[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "ativo" | "vencendo" | "vencido" | "saldo_baixo">("all");

  useEffect(() => {
    if (!empresaId) return;
    setLoading(true);

    Promise.all([
      supabase.from("customer_pet_subscriptions" as any)
        .select("*, cliente:clientes(nome), pet:pets(nome)")
        .eq("empresa_id", empresaId)
        .order("created_at", { ascending: false }),
      supabase.from("service_plans" as any).select("*").eq("empresa_id", empresaId),
      supabase.from("service_packages" as any).select("*").eq("empresa_id", empresaId),
      supabase.from("subscription_usage_logs" as any)
        .select("subscription_id, quantity_used")
        .eq("empresa_id", empresaId),
    ]).then(([subsRes, plansRes, pkgsRes, usageRes]) => {
      const subs = (subsRes.data || []) as any[];
      const plans = (plansRes.data || []) as any[];
      const pkgs = (pkgsRes.data || []) as any[];
      const usage = (usageRes.data || []) as any[];

      // Sum used credits per subscription
      const usadoMap = new Map<string, number>();
      usage.forEach((u: any) => {
        usadoMap.set(u.subscription_id, (usadoMap.get(u.subscription_id) || 0) + Number(u.quantity_used || 1));
      });

      const mapped: ConsumoRow[] = subs.map((s: any) => {
        const isPlan = !!s.plan_id;
        const plan = plans.find(p => p.id === s.plan_id);
        const pkg = pkgs.find(p => p.id === s.package_id);
        const totalCreditos = isPlan ? null : (pkg?.total_credits ?? null);
        const usados = usadoMap.get(s.id) || 0;
        const restantes = totalCreditos != null ? Math.max(0, totalCreditos - usados) : null;
        return {
          subscriptionId: s.id,
          cliente: s.cliente?.nome || "—",
          pet: s.pet?.nome || "—",
          tipo: isPlan ? "Plano" : "Pacote",
          nome: plan?.name || pkg?.name || "—",
          totalCreditos,
          usados,
          restantes,
          startDate: s.start_date,
          endDate: s.end_date,
          renovacao: s.next_renewal_date,
          autoRenew: !!s.auto_renew,
          status: s.status,
          finalPrice: Number(s.final_price || 0),
        };
      });

      setRows(mapped);
      setLoading(false);
    });
  }, [empresaId]);

  const filtered = useMemo(() => {
    return rows.filter(r => {
      if (search) {
        const q = search.toLowerCase();
        if (!r.cliente.toLowerCase().includes(q) && !r.pet.toLowerCase().includes(q) && !r.nome.toLowerCase().includes(q)) return false;
      }
      if (statusFilter === "ativo") return r.status === "ativo";
      if (statusFilter === "vencendo") {
        if (!r.endDate) return false;
        const days = daysUntil(r.endDate);
        return r.status === "ativo" && days >= 0 && days <= 7;
      }
      if (statusFilter === "vencido") {
        return isExpired(r.endDate);
      }
      if (statusFilter === "saldo_baixo") {
        return r.restantes != null && r.totalCreditos != null && r.totalCreditos > 0 && r.restantes / r.totalCreditos <= 0.2;
      }
      return true;
    });
  }, [rows, search, statusFilter]);

  // KPIs
  const totalAtivos = rows.filter(r => r.status === "ativo").length;
  const vencendo = rows.filter(r => {
    if (!r.endDate) return false;
    const days = daysUntil(r.endDate);
    return r.status === "ativo" && days >= 0 && days <= 7;
  }).length;
  const saldoBaixo = rows.filter(r => r.restantes != null && r.totalCreditos != null && r.totalCreditos > 0 && r.restantes / r.totalCreditos <= 0.2 && r.restantes > 0).length;
  const totalCreditosUsados = rows.reduce((s, r) => s + r.usados, 0);

  return (
    <div className="space-y-4 mt-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="Contratações ativas" value={String(totalAtivos)} icon={<Package className="h-4 w-4" />} accent="blue" />
        <KpiCard title="Vencendo em 7 dias" value={String(vencendo)} icon={<Calendar className="h-4 w-4" />} accent="amber" />
        <KpiCard title="Saldo baixo (≤20%)" value={String(saldoBaixo)} icon={<AlertTriangle className="h-4 w-4" />} accent="rose" />
        <KpiCard title="Créditos consumidos" value={String(totalCreditosUsados)} icon={<CheckCircle2 className="h-4 w-4" />} accent="emerald" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar cliente, pet ou plano…" className="pl-9 h-9" />
        </div>
        <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
          <SelectTrigger className="w-[200px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="ativo">Apenas ativos</SelectItem>
            <SelectItem value="vencendo">Vencendo em 7 dias</SelectItem>
            <SelectItem value="vencido">Vencidos</SelectItem>
            <SelectItem value="saldo_baixo">Saldo baixo (≤20%)</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} contratação(ões)</span>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-3">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Nenhuma contratação encontrada</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Pet</TableHead>
                <TableHead>Plano / Pacote</TableHead>
                <TableHead className="text-center">Tipo</TableHead>
                <TableHead className="text-center">Créditos</TableHead>
                <TableHead className="text-center">Uso</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Renovação</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(r => {
                const pct = r.totalCreditos && r.totalCreditos > 0
                  ? Math.min(100, Math.round((r.usados / r.totalCreditos) * 100))
                  : null;
                const venceEm = r.endDate ? daysUntil(r.endDate) : null;
                const venceuJa = venceEm != null && venceEm < 0;
                return (
                  <TableRow key={r.subscriptionId}>
                    <TableCell className="text-sm font-medium">{r.cliente}</TableCell>
                    <TableCell className="text-sm">{r.pet}</TableCell>
                    <TableCell className="text-sm">{r.nome}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={cn("text-[10px]", r.tipo === "Plano" ? "border-sky-500/40 text-sky-600" : "border-violet-500/40 text-violet-600")}>
                        {r.tipo}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center text-sm tabular-nums">
                      {r.totalCreditos != null ? (
                        <span><span className="font-semibold">{r.restantes}</span> / {r.totalCreditos}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {pct != null ? (
                        <div className="flex items-center gap-2 min-w-[140px]">
                          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                            <div className={cn("h-full rounded-full transition-all", pct >= 80 ? "bg-rose-500" : pct >= 60 ? "bg-amber-500" : "bg-emerald-500")} style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[11px] text-muted-foreground tabular-nums w-9 text-right">{pct}%</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">{r.usados} usado(s)</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.endDate ? (
                        <div>
                          <div>{format(parseLocalDate(r.endDate), "dd/MM/yy")}</div>
                          {r.status === "ativo" && venceEm != null && (
                            <div className={cn("text-[10px]", venceuJa ? "text-rose-600" : venceEm <= 7 ? "text-amber-600" : "text-muted-foreground")}>
                              {venceuJa
                                ? `${Math.abs(venceEm)}d atraso`
                                : venceEm === 0 ? "vence hoje" : `em ${venceEm}d`}
                            </div>
                          )}
                        </div>
                      ) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.autoRenew && r.renovacao
                        ? <span className="text-emerald-600">{format(parseLocalDate(r.renovacao), "dd/MM/yy")} <span className="text-[10px] text-muted-foreground">(auto)</span></span>
                        : r.autoRenew
                          ? <span className="text-emerald-600 text-xs">Automática</span>
                          : <span className="text-muted-foreground text-xs">Manual</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      <StatusBadge status={r.status} venceuJa={venceuJa} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status, venceuJa }: { status: string; venceuJa: boolean }) {
  if (venceuJa && status === "ativo") return <Badge className="bg-rose-500/15 text-rose-600 border-0 text-xs">Vencido</Badge>;
  const map: Record<string, string> = {
    ativo: "bg-emerald-500/15 text-emerald-600",
    pausado: "bg-amber-500/15 text-amber-600",
    cancelado: "bg-rose-500/15 text-rose-600",
    vencido: "bg-rose-500/15 text-rose-600",
    arquivado: "bg-muted text-muted-foreground",
  };
  return <Badge className={cn("border-0 text-xs", map[status] || "bg-muted text-muted-foreground")}>{status}</Badge>;
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