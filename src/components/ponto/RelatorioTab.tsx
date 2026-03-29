import { useCallback, useEffect, useState } from "react";
import { format, startOfMonth, endOfMonth, parseISO, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Clock, TrendingUp, TrendingDown, AlertTriangle, CalendarDays,
  FileText, Loader2, ChevronDown, ChevronRight
} from "lucide-react";

const PUNCH_LABELS: Record<string, string> = {
  entrada: "Entrada",
  pausa_inicio: "Início Pausa",
  pausa_fim: "Fim Pausa",
  saida: "Saída",
};

function formatMinutes(min: number): string {
  const h = Math.floor(Math.abs(min) / 60);
  const m = Math.abs(min) % 60;
  const sign = min < 0 ? "-" : "";
  return `${sign}${h}h${m.toString().padStart(2, "0")}`;
}

interface Props {
  empresaId: string;
  employees: any[];
  configs: any[];
}

interface DayReport {
  date: string;
  jornada: any | null;
  punches: any[];
  isWorkDay: boolean;
}

interface EmployeeReport {
  id: string;
  nome: string;
  totalWorkedMin: number;
  totalExpectedMin: number;
  totalOvertimeMin: number;
  totalDeficitMin: number;
  totalAbsences: number;
  totalDaysWorked: number;
  days: DayReport[];
}

export default function RelatorioTab({ empresaId, employees, configs }: Props) {
  const [filterMonth, setFilterMonth] = useState(() => format(new Date(), "yyyy-MM"));
  const [filterEmployee, setFilterEmployee] = useState("all");
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState<EmployeeReport[]>([]);
  const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);

    const monthStart = startOfMonth(new Date(filterMonth + "-01"));
    const monthEnd = endOfMonth(monthStart);
    const startStr = format(monthStart, "yyyy-MM-dd");
    const endStr = format(monthEnd, "yyyy-MM-dd");

    const targetEmployees = filterEmployee === "all"
      ? employees.filter(e => e.ativo)
      : employees.filter(e => e.id === filterEmployee);

    // Fetch jornadas and punches for the month
    const [jornadasRes, punchesRes] = await Promise.all([
      supabase
        .from("ponto_jornadas")
        .select("*")
        .eq("empresa_id", empresaId)
        .gte("data", startStr)
        .lte("data", endStr)
        .in("operational_user_id", targetEmployees.map(e => e.id)),
      supabase
        .from("ponto_registros")
        .select("*")
        .eq("empresa_id", empresaId)
        .gte("data_hora", monthStart.toISOString())
        .lte("data_hora", monthEnd.toISOString())
        .in("operational_user_id", targetEmployees.map(e => e.id))
        .order("data_hora", { ascending: true }),
    ]);

    const allJornadas = jornadasRes.data || [];
    const allPunches = punchesRes.data || [];
    const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd > new Date() ? new Date() : monthEnd });

    const results: EmployeeReport[] = targetEmployees.map(emp => {
      const config = configs.find(c => c.id === emp.jornada_id);
      const workDays = config?.dias_trabalho || [1, 2, 3, 4, 5];
      const expectedDailyMin = config?.jornada_diaria_min || 480;

      const empJornadas = allJornadas.filter(j => j.operational_user_id === emp.id);
      const empPunches = allPunches.filter(p => p.operational_user_id === emp.id);

      let totalWorkedMin = 0;
      let totalExpectedMin = 0;
      let totalOvertimeMin = 0;
      let totalDeficitMin = 0;
      let totalAbsences = 0;
      let totalDaysWorked = 0;

      const days: DayReport[] = allDays.map(day => {
        const dateStr = format(day, "yyyy-MM-dd");
        const dayOfWeek = day.getDay();
        const isWorkDay = workDays.includes(dayOfWeek);
        const jornada = empJornadas.find(j => j.data === dateStr) || null;
        const dayPunches = empPunches.filter(p => format(new Date(p.data_hora), "yyyy-MM-dd") === dateStr);

        if (isWorkDay) {
          totalExpectedMin += expectedDailyMin;

          if (jornada) {
            totalWorkedMin += jornada.horas_trabalhadas_min || 0;
            const saldo = jornada.saldo_min || 0;
            if (saldo > 0) totalOvertimeMin += saldo;
            if (saldo < 0) totalDeficitMin += Math.abs(saldo);
            totalDaysWorked += 1;
          } else if (dayPunches.length > 0) {
            totalDaysWorked += 1;
          } else {
            totalAbsences += 1;
          }
        } else {
          // Worked on non-work day = overtime
          if (jornada) {
            totalWorkedMin += jornada.horas_trabalhadas_min || 0;
            totalOvertimeMin += jornada.horas_trabalhadas_min || 0;
            totalDaysWorked += 1;
          }
        }

        return { date: dateStr, jornada, punches: dayPunches, isWorkDay };
      });

      return {
        id: emp.id,
        nome: emp.nome,
        totalWorkedMin,
        totalExpectedMin,
        totalOvertimeMin,
        totalDeficitMin,
        totalAbsences,
        totalDaysWorked,
        days,
      };
    });

    setReports(results);
    setLoading(false);
  }, [empresaId, filterMonth, filterEmployee, employees, configs]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const toggleExpand = (id: string) => {
    setExpandedEmployee(prev => prev === id ? null : id);
  };

  // Totals across all employees
  const grandTotalWorked = reports.reduce((s, r) => s + r.totalWorkedMin, 0);
  const grandTotalExpected = reports.reduce((s, r) => s + r.totalExpectedMin, 0);
  const grandTotalOvertime = reports.reduce((s, r) => s + r.totalOvertimeMin, 0);
  const grandTotalAbsences = reports.reduce((s, r) => s + r.totalAbsences, 0);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <Label className="text-xs">Mês</Label>
          <Input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="w-44" />
        </div>
        <div>
          <Label className="text-xs">Colaborador</Label>
          <Select value={filterEmployee} onValueChange={setFilterEmployee}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {employees.filter(e => e.ativo).map(e => (
                <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" onClick={fetchReport} disabled={loading} className="gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
          Gerar Relatório
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Trabalhado</p>
              <p className="text-xl font-bold text-foreground">{formatMinutes(grandTotalWorked)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <CalendarDays className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Esperado</p>
              <p className="text-xl font-bold text-foreground">{formatMinutes(grandTotalExpected)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Horas Extras</p>
              <p className="text-xl font-bold text-emerald-600">{formatMinutes(grandTotalOvertime)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Faltas</p>
              <p className="text-xl font-bold text-red-500">{grandTotalAbsences}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Per-employee consolidated */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : reports.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Nenhum dado encontrado para o período selecionado.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Consolidado por Colaborador</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Dias Trabalhados</TableHead>
                  <TableHead>Horas Trabalhadas</TableHead>
                  <TableHead>Horas Esperadas</TableHead>
                  <TableHead>Horas Extras</TableHead>
                  <TableHead>Déficit</TableHead>
                  <TableHead>Faltas</TableHead>
                  <TableHead>Saldo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map(r => {
                  const saldo = r.totalWorkedMin - r.totalExpectedMin;
                  const isExpanded = expandedEmployee === r.id;
                  return (
                    <>
                      <TableRow
                        key={r.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleExpand(r.id)}
                      >
                        <TableCell>
                          {isExpanded
                            ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          }
                        </TableCell>
                        <TableCell className="font-medium">{r.nome}</TableCell>
                        <TableCell>{r.totalDaysWorked}</TableCell>
                        <TableCell>{formatMinutes(r.totalWorkedMin)}</TableCell>
                        <TableCell>{formatMinutes(r.totalExpectedMin)}</TableCell>
                        <TableCell className="text-emerald-600">{formatMinutes(r.totalOvertimeMin)}</TableCell>
                        <TableCell className="text-red-500">{formatMinutes(r.totalDeficitMin)}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="bg-red-500/10 text-red-600">
                            {r.totalAbsences}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className={`font-semibold flex items-center gap-1 ${saldo >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                            {saldo >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            {formatMinutes(saldo)}
                          </span>
                        </TableCell>
                      </TableRow>

                      {/* Expanded day-by-day detail */}
                      {isExpanded && (
                        <TableRow key={`${r.id}-detail`}>
                          <TableCell colSpan={9} className="p-0 bg-muted/30">
                            <div className="p-4 space-y-2">
                              <p className="text-sm font-semibold text-foreground mb-2">
                                Detalhamento Diário — {r.nome}
                              </p>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Data</TableHead>
                                    <TableHead>Dia</TableHead>
                                    <TableHead>Trabalhado</TableHead>
                                    <TableHead>Esperado</TableHead>
                                    <TableHead>Saldo</TableHead>
                                    <TableHead>Registros</TableHead>
                                    <TableHead>Status</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {r.days.filter(d => d.isWorkDay || d.jornada || d.punches.length > 0).map(d => {
                                    const dayDate = parseISO(d.date);
                                    const dayName = format(dayDate, "EEE", { locale: ptBR });
                                    const worked = d.jornada?.horas_trabalhadas_min || 0;
                                    const expected = d.isWorkDay ? (configs.find(c => c.id === employees.find(e => e.id === r.id)?.jornada_id)?.jornada_diaria_min || 480) : 0;
                                    const daySaldo = worked - expected;

                                    let status = "—";
                                    if (!d.isWorkDay && d.jornada) status = "Hora Extra";
                                    else if (d.isWorkDay && !d.jornada && d.punches.length === 0) status = "Falta";
                                    else if (d.jornada) status = d.jornada.status === "fechado" ? "Fechado" : "Aberto";
                                    else if (d.punches.length > 0) status = "Parcial";

                                    const statusColor = status === "Falta" ? "bg-red-500/10 text-red-600"
                                      : status === "Hora Extra" ? "bg-emerald-500/10 text-emerald-600"
                                      : status === "Fechado" ? "bg-blue-500/10 text-blue-600"
                                      : "bg-muted text-muted-foreground";

                                    return (
                                      <TableRow key={d.date} className={!d.isWorkDay ? "bg-muted/20" : ""}>
                                        <TableCell className="text-sm">{format(dayDate, "dd/MM")}</TableCell>
                                        <TableCell className="text-sm capitalize">{dayName}</TableCell>
                                        <TableCell className="text-sm">{worked > 0 ? formatMinutes(worked) : "—"}</TableCell>
                                        <TableCell className="text-sm">{expected > 0 ? formatMinutes(expected) : "—"}</TableCell>
                                        <TableCell className={`text-sm ${daySaldo >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                                          {worked > 0 || expected > 0 ? formatMinutes(daySaldo) : "—"}
                                        </TableCell>
                                        <TableCell className="text-xs">
                                          {d.punches.length > 0 ? (
                                            <div className="flex flex-wrap gap-1">
                                              {d.punches.map((p: any) => (
                                                <Badge key={p.id} variant="outline" className="text-[10px] px-1.5 py-0">
                                                  {PUNCH_LABELS[p.tipo]?.[0] || p.tipo[0]}: {format(new Date(p.data_hora), "HH:mm")}
                                                </Badge>
                                              ))}
                                            </div>
                                          ) : "—"}
                                        </TableCell>
                                        <TableCell>
                                          <Badge variant="secondary" className={`text-xs ${statusColor}`}>
                                            {status}
                                          </Badge>
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
