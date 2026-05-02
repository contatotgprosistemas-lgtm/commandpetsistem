import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Printer, FileSpreadsheet, Search } from "lucide-react";
import { format, getDaysInMonth } from "date-fns";
import * as XLSX from "xlsx";

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function ValorCell({ value, className = "" }: { value: number; className?: string }) {
  const color = value < 0 ? "text-destructive" : value > 0 ? "text-emerald-600" : "text-muted-foreground";
  return <TableCell className={`text-right tabular-nums text-sm ${color} ${className}`}>{fmt(value)}</TableCell>;
}

// ─── DAILY ───
function FluxoDiario() {
  const now = new Date();
  const [mesAno, setMesAno] = useState(`${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`);
  const [banco, setBanco] = useState("todos");
  const [bancos, setBancos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [movs, setMovs] = useState<any[]>([]);
  const [contasReceber, setContasReceber] = useState<any[]>([]);
  const [contasPagar, setContasPagar] = useState<any[]>([]);
  const [saldoAnterior, setSaldoAnterior] = useState(0);

  useEffect(() => {
    supabase.from("contas_bancarias").select("*").then(({ data }) => {
      if (data) setBancos(data);
    });
  }, []);

  async function buscar() {
    setLoading(true);
    const [mesStr, anoStr] = mesAno.split("/");
    const mes = parseInt(mesStr);
    const ano = parseInt(anoStr);
    if (!mes || !ano) { setLoading(false); return; }

    const inicioMes = `${ano}-${String(mes).padStart(2, "0")}-01`;
    const diasNoMes = getDaysInMonth(new Date(ano, mes - 1));
    const fimMes = `${ano}-${String(mes).padStart(2, "0")}-${String(diasNoMes).padStart(2, "0")}`;

    // Fetch movimentacoes for this month (realized)
    let qMovs = supabase.from("movimentacoes").select("*").gte("data_movimentacao", inicioMes).lte("data_movimentacao", fimMes);
    if (banco !== "todos") qMovs = qMovs.eq("banco", banco);
    const { data: movsData } = await qMovs;
    setMovs(movsData || []);

    // Fetch contas_receber pendentes for projected
    const { data: crData } = await supabase.from("contas_receber").select("*").gte("vencimento", inicioMes).lte("vencimento", fimMes).eq("status", "pendente");
    setContasReceber(crData || []);

    // Fetch contas_pagar pendentes for projected
    const { data: cpData } = await supabase.from("contas_pagar").select("*").gte("vencimento", inicioMes).lte("vencimento", fimMes).eq("status", "pendente");
    setContasPagar(cpData || []);

    // Saldo anterior = saldo_atual dos bancos − soma das movimentações do mês corrente
    // (saldo_atual já é mantido por sincronizar_saldo_bancario e respeita RLS por empresa)
    const bancosFiltrados = banco === "todos" ? bancos : bancos.filter((b: any) => b.banco === banco);
    const saldoAtualTotal = bancosFiltrados.reduce((s: number, b: any) => s + Number(b.saldo_atual || 0), 0);
    const movsDoMes = (movsData || []).reduce((s: number, m: any) => s + Number(m.valor), 0);
    setSaldoAnterior(saldoAtualTotal - movsDoMes);
    setLoading(false);
  }

  useEffect(() => { if (bancos.length > 0) buscar(); }, [bancos.length]);

  const [mesStr, anoStr] = mesAno.split("/");
  const mes = parseInt(mesStr) || (now.getMonth() + 1);
  const ano = parseInt(anoStr) || now.getFullYear();
  const diasNoMes = getDaysInMonth(new Date(ano, mes - 1));

  // Realized data by day
  const realizadoPorDia = useMemo(() => {
    const days: { dia: number; entradas: number; saidas: number }[] = [];
    for (let d = 1; d <= diasNoMes; d++) {
      const dateStr = `${ano}-${String(mes).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const dayMovs = movs.filter(m => m.data_movimentacao === dateStr);
      // Movimentações já guardam o sinal: entradas positivas, saídas negativas.
      const entradas = dayMovs.filter(m => Number(m.valor) > 0).reduce((s, m) => s + Number(m.valor), 0);
      const saidas = dayMovs.filter(m => Number(m.valor) < 0).reduce((s, m) => s + Math.abs(Number(m.valor)), 0);
      if (entradas > 0 || saidas > 0) days.push({ dia: d, entradas, saidas });
    }
    return days;
  }, [movs, diasNoMes, ano, mes]);

  // Projected data by day
  const projetadoPorDia = useMemo(() => {
    const days: { dia: number; entradas: number; saidas: number }[] = [];
    for (let d = 1; d <= diasNoMes; d++) {
      const dateStr = `${ano}-${String(mes).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const entradas = contasReceber.filter(c => c.vencimento === dateStr).reduce((s, c) => s + Number(c.valor), 0);
      const saidas = contasPagar.filter(c => c.vencimento === dateStr).reduce((s, c) => s + Number(c.valor), 0);
      if (entradas > 0 || saidas > 0) days.push({ dia: d, entradas, saidas });
    }
    return days;
  }, [contasReceber, contasPagar, diasNoMes, ano, mes]);

  function renderTable(title: string, data: { dia: number; entradas: number; saidas: number }[]) {
    let saldoAcum = saldoAnterior;
    return (
      <div className="flex-1 bg-card rounded-lg shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Saldo Final do Mês Anterior</p>
            <p className="text-lg font-bold tabular-nums">{fmt(saldoAnterior)}</p>
          </div>
        </div>
        <div className="px-5 py-2">
          <Button size="sm" variant="outline" className="gap-1" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Imprimir
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Dia</TableHead>
              <TableHead className="text-right">Entradas</TableHead>
              <TableHead className="text-right">Saídas</TableHead>
              <TableHead className="text-right">Saldo do Dia</TableHead>
              <TableHead className="text-right">Saldo do Mês</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">Sem movimentações</TableCell></TableRow>
            ) : data.map(row => {
              const saldoDia = row.entradas - row.saidas;
              saldoAcum += saldoDia;
              return (
                <TableRow key={row.dia}>
                  <TableCell className="text-sm font-medium">{row.dia}</TableCell>
                  <ValorCell value={row.entradas} />
                  <TableCell className="text-right tabular-nums text-sm text-destructive">{fmt(row.saidas)}</TableCell>
                  <ValorCell value={saldoDia} />
                  <ValorCell value={saldoAcum} />
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-lg shadow-card p-4 flex flex-wrap items-end gap-4">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Mês/Ano</label>
          <Input value={mesAno} onChange={e => setMesAno(e.target.value)} placeholder="MM/AAAA" className="w-36" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Banco</label>
          <Select value={banco} onValueChange={setBanco}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {bancos.map((b: any) => <SelectItem key={b.id} value={b.banco}>{b.banco}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={buscar} className="gap-1"><Search className="h-4 w-4" /> Buscar</Button>
      </div>

      {loading ? (
        <div className="space-y-3"><Skeleton className="h-64 w-full" /><Skeleton className="h-64 w-full" /></div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-4">
          {renderTable("Realizado", realizadoPorDia)}
          {renderTable("Projetado", projetadoPorDia)}
        </div>
      )}
    </div>
  );
}

// ─── MONTHLY ───
const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function FluxoMensal() {
  const now = new Date();
  const [ano, setAno] = useState(String(now.getFullYear()));
  const [tipo, setTipo] = useState("realizado");
  const [loading, setLoading] = useState(false);
  const [movs, setMovs] = useState<any[]>([]);
  const [contasReceber, setContasReceber] = useState<any[]>([]);
  const [contasPagar, setContasPagar] = useState<any[]>([]);
  const [bancos, setBancos] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("contas_bancarias").select("*").then(({ data }) => { if (data) setBancos(data); });
  }, []);

  async function buscar() {
    setLoading(true);
    const anoNum = parseInt(ano);
    const inicio = `${anoNum}-01-01`;
    const fim = `${anoNum}-12-31`;

    if (tipo === "realizado") {
      const { data } = await supabase.from("movimentacoes").select("*").gte("data_movimentacao", inicio).lte("data_movimentacao", fim);
      setMovs(data || []);
    } else {
      const { data: cr } = await supabase.from("contas_receber").select("*").gte("vencimento", inicio).lte("vencimento", fim).eq("status", "pendente");
      setContasReceber(cr || []);
      const { data: cp } = await supabase.from("contas_pagar").select("*").gte("vencimento", inicio).lte("vencimento", fim).eq("status", "pendente");
      setContasPagar(cp || []);
    }
    setLoading(false);
  }

  useEffect(() => { buscar(); }, []);

  const saldoInicialTotal = bancos.reduce((s, b) => s + Number(b.saldo_inicial || 0), 0);

  // Build monthly data
  const mesesData = useMemo(() => {
    const result: { entradas: number; saidas: number; saldoInicial: number }[] = [];
    let saldoAcum = saldoInicialTotal;

    for (let m = 0; m < 12; m++) {
      const mesNum = m + 1;
      const mesStr = String(mesNum).padStart(2, "0");
      const anoNum = parseInt(ano);

      let entradas = 0;
      let saidas = 0;

      if (tipo === "realizado") {
        movs.forEach(mov => {
          const movDate = mov.data_movimentacao;
          if (movDate && movDate.startsWith(`${anoNum}-${mesStr}`)) {
            const v = Number(mov.valor);
            if (v > 0) entradas += v;
            else saidas += Math.abs(v);
          }
        });
      } else {
        contasReceber.forEach(c => {
          if (c.vencimento && c.vencimento.startsWith(`${anoNum}-${mesStr}`)) entradas += Number(c.valor);
        });
        contasPagar.forEach(c => {
          if (c.vencimento && c.vencimento.startsWith(`${anoNum}-${mesStr}`)) saidas += Number(c.valor);
        });
      }

      result.push({ entradas, saidas, saldoInicial: saldoAcum });
      saldoAcum += entradas - saidas;
    }
    return result;
  }, [movs, contasReceber, contasPagar, ano, tipo, saldoInicialTotal]);

  // Categories for display
  const rows = [
    { label: "SALDO INICIAL", values: mesesData.map(d => d.saldoInicial), highlight: "bg-muted/50 font-semibold" },
    { label: "ENTRADAS", values: mesesData.map(d => d.entradas), highlight: "bg-emerald-500/10 font-semibold text-emerald-700" },
    { label: "SAÍDAS", values: mesesData.map(d => d.saidas), highlight: "bg-destructive/10 font-semibold text-destructive" },
    { label: "SALDO DO MÊS", values: mesesData.map(d => d.entradas - d.saidas), highlight: "font-semibold" },
    { label: "SALDO FINAL", values: mesesData.map(d => d.saldoInicial + d.entradas - d.saidas), highlight: "bg-primary/10 font-bold" },
  ];

  function exportExcel() {
    const header = ["Fluxo de Caixa", ...MESES];
    const data = rows.map(r => [r.label, ...r.values.map(v => Number(v.toFixed(2)))]);
    const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Fluxo de Caixa");
    XLSX.writeFile(wb, `fluxo_caixa_${ano}.xlsx`);
  }

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-lg shadow-card p-4 flex flex-wrap items-end gap-4">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Tipo de Relatório</label>
          <Select value={tipo} onValueChange={setTipo}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="realizado">Realizado</SelectItem>
              <SelectItem value="projetado">Projetado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Ano</label>
          <Input value={ano} onChange={e => setAno(e.target.value)} className="w-28" />
        </div>
        <Button onClick={buscar} className="gap-1"><Search className="h-4 w-4" /> Buscar</Button>
      </div>

      {loading ? (
        <Skeleton className="h-64 w-full" />
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
                  <TableHead className="sticky left-0 bg-card z-10 min-w-[140px]">Fluxo de Caixa</TableHead>
                  {MESES.map(m => <TableHead key={m} className="text-right min-w-[100px]">{m}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(row => (
                  <TableRow key={row.label} className={row.highlight}>
                    <TableCell className="sticky left-0 bg-card z-10 text-sm">{row.label}</TableCell>
                    {row.values.map((v, i) => (
                      <TableCell key={i} className={`text-right tabular-nums text-sm ${row.label === "SAÍDAS" || v < 0 ? "text-destructive" : ""}`}>
                        {fmt(v)}
                      </TableCell>
                    ))}
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

// ─── MAIN ───
export default function FluxoCaixaPage() {
  return (
    <div className="space-y-4">
      <Tabs defaultValue="diario" className="w-full">
        <TabsList>
          <TabsTrigger value="diario">Fluxo Diário</TabsTrigger>
          <TabsTrigger value="mensal">Fluxo Mensal</TabsTrigger>
        </TabsList>
        <TabsContent value="diario"><FluxoDiario /></TabsContent>
        <TabsContent value="mensal"><FluxoMensal /></TabsContent>
      </Tabs>
    </div>
  );
}
