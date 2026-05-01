import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Target, TrendingUp, TrendingDown, Save } from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Cell,
} from "recharts";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtBRLShort(v: number) {
  if (Math.abs(v) >= 1000) return `R$ ${(v / 1000).toFixed(1)}k`;
  return `R$ ${v.toFixed(0)}`;
}

const MESES = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

interface Meta {
  id?: string;
  ano: number;
  mes: number;
  valor_meta: number;
}

export function MetasFaturamentoCard() {
  const { profile } = useAuth();
  const empresaId = profile?.empresa_id;

  const [ano, setAno] = useState<number>(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [metas, setMetas] = useState<Meta[]>([]);
  const [realizadoMap, setRealizadoMap] = useState<Record<number, number>>({});
  // valores em string para edição amigável
  const [draft, setDraft] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!empresaId) return;
    setLoading(true);
    const startDate = `${ano}-01-01`;
    const endDate = `${ano}-12-31`;

    Promise.all([
      supabase
        .from("metas_faturamento")
        .select("*")
        .eq("empresa_id", empresaId)
        .eq("ano", ano),
      // Realizado = entradas (movimentações com valor > 0) no ano
      supabase
        .from("movimentacoes")
        .select("data_movimentacao, valor")
        .eq("empresa_id", empresaId)
        .gte("data_movimentacao", startDate)
        .lte("data_movimentacao", endDate)
        .gt("valor", 0),
    ]).then(([metasRes, movsRes]) => {
      const mts = (metasRes.data || []) as Meta[];
      setMetas(mts);
      const d: Record<number, string> = {};
      for (let m = 1; m <= 12; m++) {
        const found = mts.find((x) => x.mes === m);
        d[m] = found ? String(found.valor_meta) : "";
      }
      setDraft(d);

      const realMap: Record<number, number> = {};
      ((movsRes.data || []) as any[]).forEach((mv) => {
        const mes = Number((mv.data_movimentacao as string).substring(5, 7));
        realMap[mes] = (realMap[mes] || 0) + Number(mv.valor || 0);
      });
      setRealizadoMap(realMap);
      setLoading(false);
    });
  }, [empresaId, ano]);

  const chartData = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const mes = i + 1;
      const meta = metas.find((m) => m.mes === mes)?.valor_meta ?? 0;
      const realizado = realizadoMap[mes] ?? 0;
      const diff = realizado - meta;
      const pct = meta > 0 ? (realizado / meta) * 100 : 0;
      return {
        mes,
        label: MESES[i],
        meta: Number(meta),
        realizado,
        diff,
        pct,
      };
    });
  }, [metas, realizadoMap]);

  const totals = useMemo(() => {
    const meta = chartData.reduce((s, d) => s + d.meta, 0);
    const realizado = chartData.reduce((s, d) => s + d.realizado, 0);
    const diff = realizado - meta;
    const pct = meta > 0 ? (realizado / meta) * 100 : 0;
    return { meta, realizado, diff, pct };
  }, [chartData]);

  async function salvarTudo() {
    if (!empresaId) return;
    setSaving(true);
    const rows = Array.from({ length: 12 }, (_, i) => {
      const mes = i + 1;
      const valor = parseFloat((draft[mes] || "0").toString().replace(",", "."));
      return {
        empresa_id: empresaId,
        ano,
        mes,
        valor_meta: isFinite(valor) && valor >= 0 ? valor : 0,
      };
    });

    const { error } = await supabase
      .from("metas_faturamento")
      .upsert(rows, { onConflict: "empresa_id,ano,mes" });
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar metas: " + error.message);
      return;
    }
    toast.success("Metas salvas com sucesso!");
    // recarrega
    const { data } = await supabase
      .from("metas_faturamento")
      .select("*")
      .eq("empresa_id", empresaId)
      .eq("ano", ano);
    setMetas((data || []) as Meta[]);
  }

  const mesAtual = new Date().getMonth() + 1;
  const anoAtual = new Date().getFullYear();

  if (!empresaId) return null;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-violet-500/10 text-violet-500 flex items-center justify-center">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">
                Metas de faturamento
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Compare planejado x realizado mês a mês
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Label className="text-xs">Ano</Label>
            <Input
              type="number"
              value={ano}
              onChange={(e) => setAno(parseInt(e.target.value) || anoAtual)}
              className="h-9 w-[100px]"
            />
            <Button onClick={salvarTudo} disabled={saving} size="sm">
              <Save className="h-4 w-4 mr-1.5" />
              Salvar metas
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Totais do ano */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SummaryTile label="Meta anual" value={fmtBRL(totals.meta)} accent="violet" />
          <SummaryTile
            label="Realizado anual"
            value={fmtBRL(totals.realizado)}
            accent="emerald"
          />
          <SummaryTile
            label="Diferença"
            value={fmtBRL(totals.diff)}
            accent={totals.diff >= 0 ? "emerald" : "rose"}
          />
          <SummaryTile
            label="% atingido"
            value={`${totals.pct.toFixed(1)}%`}
            accent={totals.pct >= 100 ? "emerald" : totals.pct >= 70 ? "amber" : "rose"}
          />
        </div>

        {/* Tabela de metas */}
        {loading ? (
          <Skeleton className="h-72 rounded-lg" />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr className="text-left">
                  <th className="px-3 py-2 font-semibold text-muted-foreground text-xs uppercase">Mês</th>
                  <th className="px-3 py-2 font-semibold text-muted-foreground text-xs uppercase">Meta (R$)</th>
                  <th className="px-3 py-2 font-semibold text-muted-foreground text-xs uppercase">Realizado</th>
                  <th className="px-3 py-2 font-semibold text-muted-foreground text-xs uppercase">Diferença</th>
                  <th className="px-3 py-2 font-semibold text-muted-foreground text-xs uppercase">% atingido</th>
                </tr>
              </thead>
              <tbody>
                {chartData.map((row) => {
                  const isCurrent = ano === anoAtual && row.mes === mesAtual;
                  const isFuture = ano > anoAtual || (ano === anoAtual && row.mes > mesAtual);
                  return (
                    <tr
                      key={row.mes}
                      className={`border-t border-border ${isCurrent ? "bg-primary/5" : ""}`}
                    >
                      <td className="px-3 py-2 font-medium">
                        {row.label}
                        {isCurrent && (
                          <span className="ml-2 text-[10px] uppercase tracking-wide text-primary font-semibold">
                            atual
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-1.5">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={draft[row.mes] ?? ""}
                          onChange={(e) =>
                            setDraft((d) => ({ ...d, [row.mes]: e.target.value }))
                          }
                          className="h-8 w-32"
                          placeholder="0,00"
                        />
                      </td>
                      <td className="px-3 py-2 font-mono-tabular">
                        {isFuture ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          fmtBRL(row.realizado)
                        )}
                      </td>
                      <td
                        className={`px-3 py-2 font-mono-tabular ${
                          isFuture
                            ? "text-muted-foreground"
                            : row.diff >= 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {isFuture ? "—" : (row.diff >= 0 ? "+" : "") + fmtBRL(row.diff)}
                      </td>
                      <td className="px-3 py-2">
                        {isFuture || row.meta === 0 ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold ${
                              row.pct >= 100
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                : row.pct >= 70
                                  ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                                  : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                            }`}
                          >
                            {row.pct >= 100 ? (
                              <TrendingUp className="h-3 w-3" />
                            ) : (
                              <TrendingDown className="h-3 w-3" />
                            )}
                            {row.pct.toFixed(1)}%
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-muted/30">
                <tr className="border-t border-border">
                  <td className="px-3 py-2 font-semibold">Total</td>
                  <td className="px-3 py-2 font-mono-tabular font-semibold">
                    {fmtBRL(totals.meta)}
                  </td>
                  <td className="px-3 py-2 font-mono-tabular font-semibold">
                    {fmtBRL(totals.realizado)}
                  </td>
                  <td
                    className={`px-3 py-2 font-mono-tabular font-semibold ${
                      totals.diff >= 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {(totals.diff >= 0 ? "+" : "") + fmtBRL(totals.diff)}
                  </td>
                  <td className="px-3 py-2 font-semibold">
                    {totals.meta > 0 ? `${totals.pct.toFixed(1)}%` : "—"}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Gráfico */}
        <div className="rounded-lg border border-border p-3">
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickFormatter={fmtBRLShort}
              />
              <Tooltip
                formatter={(v: any, name: any) => {
                  if (name === "% atingido") return `${Number(v).toFixed(1)}%`;
                  return fmtBRL(Number(v));
                }}
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="meta" name="Meta" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="realizado" name="Realizado" radius={[4, 4, 0, 0]}>
                {chartData.map((d, i) => (
                  <Cell
                    key={i}
                    fill={
                      d.meta === 0
                        ? "#94a3b8"
                        : d.realizado >= d.meta
                          ? "#10b981"
                          : "#f59e0b"
                    }
                  />
                ))}
              </Bar>
              <Line
                type="monotone"
                dataKey="pct"
                name="% atingido"
                stroke="#0ea5e9"
                strokeWidth={2}
                yAxisId={0}
                hide
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: "violet" | "emerald" | "amber" | "rose";
}) {
  const map: Record<string, string> = {
    violet: "from-violet-500 to-fuchsia-600",
    emerald: "from-emerald-500 to-teal-600",
    amber: "from-amber-500 to-orange-600",
    rose: "from-rose-500 to-red-600",
  };
  return (
    <div className={`relative overflow-hidden rounded-lg p-3 text-white bg-gradient-to-br ${map[accent]}`}>
      <div className="text-[10px] uppercase tracking-wider text-white/80">{label}</div>
      <div className="font-mono-tabular text-lg font-semibold mt-0.5">{value}</div>
    </div>
  );
}