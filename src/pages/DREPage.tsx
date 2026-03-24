import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Printer, FileSpreadsheet, Search } from "lucide-react";
import * as XLSX from "xlsx";

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function fmt(v: number) {
  if (v === 0) return "-";
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function pct(v: number) {
  if (v === 0) return "-";
  return `${Math.round(v * 100)}%`;
}

// Categories mapping from plano_contas field in movimentacoes
const RECEITA_CATS = ["1 - Receita com Vendas", "15 - Outras Receitas", "98 - Importação"];
const DEDUCAO_CATS = ["2 - Impostos Sobre Vendas", "3 - Outras Deduções"];
const CUSTO_VAR_CATS = ["4 - Despesas Variáveis", "7 - Despesas com Serviços de Terceiros", "16 - Despesas Operacionais", "18 - Despesas Financeiras"];
const CUSTO_FIXO_CATS = ["5 - Custos Fixos", "6 - Folha de Pagamento", "8 - Despesas Administrativas", "9 - Despesas com Ocupação", "10 - Despesas com Veículos", "11 - Despesas com Marketing"];

interface MonthlyData {
  [categoria: string]: number[];
}

export default function DREPage() {
  const now = new Date();
  const [ano, setAno] = useState(String(now.getFullYear()));
  const [loading, setLoading] = useState(false);
  const [movs, setMovs] = useState<any[]>([]);

  async function buscar() {
    setLoading(true);
    const { data } = await supabase
      .from("movimentacoes")
      .select("*")
      .gte("data_movimentacao", `${ano}-01-01`)
      .lte("data_movimentacao", `${ano}-12-31`);
    setMovs(data || []);
    setLoading(false);
  }

  useEffect(() => { buscar(); }, []);

  // Group by categoria and month
  const catData = useMemo(() => {
    const result: MonthlyData = {};
    movs.forEach(m => {
      const cat = m.plano_contas || "Outros";
      if (!result[cat]) result[cat] = new Array(12).fill(0);
      const mesStr = m.data_movimentacao?.substring(5, 7);
      const mesIdx = parseInt(mesStr) - 1;
      if (mesIdx >= 0 && mesIdx < 12) {
        result[cat][mesIdx] += Number(m.valor);
      }
    });
    return result;
  }, [movs]);

  function sumCats(cats: string[]): number[] {
    const totals = new Array(12).fill(0);
    cats.forEach(cat => {
      // Match by prefix to be flexible
      Object.keys(catData).forEach(key => {
        if (cats.some(c => key.startsWith(c.split(" - ")[0])) || cats.includes(key)) {
          for (let i = 0; i < 12; i++) totals[i] += catData[key]?.[i] || 0;
        }
      });
    });
    // Deduplicate: use exact match approach
    const seen = new Set<string>();
    const result = new Array(12).fill(0);
    Object.keys(catData).forEach(key => {
      if (seen.has(key)) return;
      for (const cat of cats) {
        if (key === cat || key.startsWith(cat.split(" -")[0] + " -") || key.startsWith(cat.split(" -")[0] + " ")) {
          seen.add(key);
          for (let i = 0; i < 12; i++) result[i] += catData[key][i] || 0;
          break;
        }
      }
    });
    return result;
  }

  // Also get receitas from contas_receber (type contas_a_receber) and despesas from contas_a_pagar
  const receitaByMonth = useMemo(() => {
    const r = new Array(12).fill(0);
    movs.filter(m => m.tipo === "contas_a_receber").forEach(m => {
      const idx = parseInt(m.data_movimentacao?.substring(5, 7)) - 1;
      if (idx >= 0 && idx < 12) r[idx] += Number(m.valor);
    });
    return r;
  }, [movs]);

  const despesaByMonth = useMemo(() => {
    const r = new Array(12).fill(0);
    movs.filter(m => m.tipo !== "contas_a_receber").forEach(m => {
      const idx = parseInt(m.data_movimentacao?.substring(5, 7)) - 1;
      if (idx >= 0 && idx < 12) r[idx] += Number(m.valor);
    });
    return r;
  }, [movs]);

  // Build DRE rows using movimentacoes grouped by plano_contas
  const receitaBruta = receitaByMonth;
  const deducoes = useMemo(() => {
    // Deductions are a portion of expenses categorized as tax/deductions
    const r = new Array(12).fill(0);
    movs.forEach(m => {
      const cat = m.plano_contas || "";
      if (DEDUCAO_CATS.some(c => cat.startsWith(c.split(" -")[0]))) {
        const idx = parseInt(m.data_movimentacao?.substring(5, 7)) - 1;
        if (idx >= 0 && idx < 12) r[idx] += Number(m.valor);
      }
    });
    return r;
  }, [movs]);

  const receitaLiquida = receitaBruta.map((v, i) => v - deducoes[i]);

  const custosVariaveis = useMemo(() => {
    const r = new Array(12).fill(0);
    movs.forEach(m => {
      const cat = m.plano_contas || "";
      if (CUSTO_VAR_CATS.some(c => cat.startsWith(c.split(" -")[0]))) {
        const idx = parseInt(m.data_movimentacao?.substring(5, 7)) - 1;
        if (idx >= 0 && idx < 12) r[idx] += Number(m.valor);
      }
    });
    return r;
  }, [movs]);

  const margemContribuicao = receitaLiquida.map((v, i) => v - custosVariaveis[i]);
  const pctMargemContribuicao = receitaBruta.map((v, i) => v > 0 ? margemContribuicao[i] / v : 0);

  const custosFixos = useMemo(() => {
    const r = new Array(12).fill(0);
    movs.forEach(m => {
      const cat = m.plano_contas || "";
      if (CUSTO_FIXO_CATS.some(c => cat.startsWith(c.split(" -")[0]))) {
        const idx = parseInt(m.data_movimentacao?.substring(5, 7)) - 1;
        if (idx >= 0 && idx < 12) r[idx] += Number(m.valor);
      }
    });
    return r;
  }, [movs]);

  const resultadoOperacional = margemContribuicao.map((v, i) => v - custosFixos[i]);
  const resultadoLiquido = resultadoOperacional; // simplified

  // Get all unique plano_contas used
  const allCats = useMemo(() => {
    const cats = new Set<string>();
    movs.forEach(m => { if (m.plano_contas) cats.add(m.plano_contas); });
    return Array.from(cats).sort();
  }, [movs]);

  const receitaSubcats = allCats.filter(c => !DEDUCAO_CATS.some(d => c.startsWith(d.split(" -")[0])) && !CUSTO_VAR_CATS.some(d => c.startsWith(d.split(" -")[0])) && !CUSTO_FIXO_CATS.some(d => c.startsWith(d.split(" -")[0])));
  const deducaoSubcats = allCats.filter(c => DEDUCAO_CATS.some(d => c.startsWith(d.split(" -")[0])));
  const custoVarSubcats = allCats.filter(c => CUSTO_VAR_CATS.some(d => c.startsWith(d.split(" -")[0])));
  const custoFixoSubcats = allCats.filter(c => CUSTO_FIXO_CATS.some(d => c.startsWith(d.split(" -")[0])));

  function sumArr(arr: number[]) { return arr.reduce((s, v) => s + v, 0); }

  type DRERow = { label: string; values: number[]; total: number; avPct?: number; style: "header" | "sub" | "total" | "pct" };

  const dreRows: DRERow[] = useMemo(() => {
    const totalReceita = sumArr(receitaBruta);
    const rows: DRERow[] = [];

    // Receita Bruta
    rows.push({ label: "(+) Receita Bruta", values: receitaBruta, total: totalReceita, avPct: 1, style: "header" });
    receitaSubcats.forEach(cat => {
      const vals = catData[cat] || new Array(12).fill(0);
      const t = sumArr(vals);
      rows.push({ label: `    ${cat}`, values: vals, total: t, avPct: totalReceita > 0 ? t / totalReceita : 0, style: "sub" });
    });

    // Deduções
    const totalDed = sumArr(deducoes);
    rows.push({ label: "(-) Deduções Sobre Vendas", values: deducoes, total: totalDed, avPct: totalReceita > 0 ? totalDed / totalReceita : 0, style: "header" });
    deducaoSubcats.forEach(cat => {
      const vals = catData[cat] || new Array(12).fill(0);
      const t = sumArr(vals);
      rows.push({ label: `    ${cat}`, values: vals, total: t, avPct: totalReceita > 0 ? t / totalReceita : 0, style: "sub" });
    });

    // Receita Líquida
    const totalRL = sumArr(receitaLiquida);
    rows.push({ label: "(=) Receita Líquida", values: receitaLiquida, total: totalRL, avPct: totalReceita > 0 ? totalRL / totalReceita : 0, style: "total" });

    // Custos Variáveis
    const totalCV = sumArr(custosVariaveis);
    rows.push({ label: "(-) Custos Variáveis", values: custosVariaveis, total: totalCV, avPct: totalReceita > 0 ? totalCV / totalReceita : 0, style: "header" });
    custoVarSubcats.forEach(cat => {
      const vals = catData[cat] || new Array(12).fill(0);
      const t = sumArr(vals);
      rows.push({ label: `    ${cat}`, values: vals, total: t, avPct: totalReceita > 0 ? t / totalReceita : 0, style: "sub" });
    });

    // Margem de Contribuição
    const totalMC = sumArr(margemContribuicao);
    rows.push({ label: "(=) Margem de Contribuição", values: margemContribuicao, total: totalMC, avPct: totalReceita > 0 ? totalMC / totalReceita : 0, style: "total" });
    rows.push({ label: "(=) % Margem de Contribuição", values: pctMargemContribuicao, total: totalReceita > 0 ? totalMC / totalReceita : 0, style: "pct" });

    // Custos Fixos
    const totalCF = sumArr(custosFixos);
    rows.push({ label: "(-) Custos Fixos", values: custosFixos, total: totalCF, avPct: totalReceita > 0 ? totalCF / totalReceita : 0, style: "header" });
    custoFixoSubcats.forEach(cat => {
      const vals = catData[cat] || new Array(12).fill(0);
      const t = sumArr(vals);
      rows.push({ label: `    ${cat}`, values: vals, total: t, avPct: totalReceita > 0 ? t / totalReceita : 0, style: "sub" });
    });

    // Resultado Operacional
    const totalRO = sumArr(resultadoOperacional);
    rows.push({ label: "(=) Resultado Operacional", values: resultadoOperacional, total: totalRO, avPct: totalReceita > 0 ? totalRO / totalReceita : 0, style: "total" });

    // Resultado Líquido
    const totalRLiq = sumArr(resultadoLiquido);
    rows.push({ label: "(=) Resultado Líquido", values: resultadoLiquido, total: totalRLiq, avPct: totalReceita > 0 ? totalRLiq / totalReceita : 0, style: "total" });

    return rows;
  }, [receitaBruta, deducoes, receitaLiquida, custosVariaveis, margemContribuicao, pctMargemContribuicao, custosFixos, resultadoOperacional, resultadoLiquido, catData, receitaSubcats, deducaoSubcats, custoVarSubcats, custoFixoSubcats]);

  function exportExcel() {
    const header = ["Descrição", ...MESES, ano, "AV%"];
    const data = dreRows.map(r => [
      r.label.trim(),
      ...r.values.map(v => r.style === "pct" ? pct(v) : Number(v.toFixed(2))),
      r.style === "pct" ? pct(r.total) : Number(r.total.toFixed(2)),
      r.avPct !== undefined ? pct(r.avPct) : "-"
    ]);
    const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DRE");
    XLSX.writeFile(wb, `dre_${ano}.xlsx`);
  }

  function rowStyles(style: string) {
    switch (style) {
      case "header": return "bg-emerald-500/10 font-semibold text-emerald-700 dark:text-emerald-400";
      case "total": return "bg-primary/10 font-bold";
      case "pct": return "bg-primary/5 text-sm italic";
      default: return "";
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-lg shadow-card p-4 flex flex-wrap items-end gap-4">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Ano</label>
          <Input value={ano} onChange={e => setAno(e.target.value)} className="w-28" />
        </div>
        <Button onClick={buscar} className="gap-1"><Search className="h-4 w-4" /> Buscar</Button>
      </div>

      {loading ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <div className="bg-card rounded-lg shadow-card overflow-hidden">
          <div className="px-5 py-3 flex items-center gap-2">
            <Button size="sm" variant="outline" className="gap-1" onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> Imprimir
            </Button>
            <Button size="sm" variant="outline" className="gap-1" onClick={exportExcel}>
              <FileSpreadsheet className="h-4 w-4" /> Exportar para Excel
            </Button>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-card z-10 min-w-[200px]">Descrição</TableHead>
                  {MESES.map(m => <TableHead key={m} className="text-right min-w-[90px]">{m}</TableHead>)}
                  <TableHead className="text-right min-w-[100px] font-bold">{ano}</TableHead>
                  <TableHead className="text-right min-w-[60px]">AV%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dreRows.map((row, idx) => (
                  <TableRow key={idx} className={rowStyles(row.style)}>
                    <TableCell className="sticky left-0 bg-card z-10 text-sm whitespace-nowrap">{row.label}</TableCell>
                    {row.values.map((v, i) => (
                      <TableCell key={i} className={`text-right tabular-nums text-sm ${v < 0 ? "text-destructive" : ""}`}>
                        {row.style === "pct" ? pct(v) : fmt(v)}
                      </TableCell>
                    ))}
                    <TableCell className={`text-right tabular-nums text-sm font-semibold ${row.total < 0 ? "text-destructive" : ""}`}>
                      {row.style === "pct" ? pct(row.total) : fmt(row.total)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {row.avPct !== undefined ? pct(row.avPct) : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
