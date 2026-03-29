import { useCallback, useEffect, useRef, useState } from "react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Clock, TrendingUp, TrendingDown, AlertTriangle, CalendarDays,
  FileText, Loader2, ChevronDown, ChevronRight, Download, PenTool
} from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";

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
  defaultMonth?: string;
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

export default function RelatorioTab({ empresaId, employees, configs, defaultMonth }: Props) {
  const [filterMonth, setFilterMonth] = useState(() => defaultMonth || format(new Date(), "yyyy-MM"));
  const [filterEmployee, setFilterEmployee] = useState("all");
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState<EmployeeReport[]>([]);
  const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null);

  // Signature
  const [signDialogOpen, setSignDialogOpen] = useState(false);
  const [signingReport, setSigningReport] = useState<EmployeeReport | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);

  const fetchReport = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);

    const monthStart = startOfMonth(new Date(filterMonth + "-01"));
    const monthEnd = endOfMonth(monthStart);
    const startStr = format(monthStart, "yyyy-MM-dd");
    const endStr = format(monthEnd, "yyyy-MM-dd");

    const targetEmployees = filterEmployee === "all"
      ? employees
      : employees.filter(e => e.id === filterEmployee);

    if (targetEmployees.length === 0) {
      setReports([]);
      setLoading(false);
      return;
    }

    const empIds = targetEmployees.map(e => e.id);

    const [jornadasRes, punchesRes] = await Promise.all([
      supabase
        .from("ponto_jornadas")
        .select("*")
        .eq("empresa_id", empresaId)
        .gte("data", startStr)
        .lte("data", endStr)
        .in("operational_user_id", empIds),
      supabase
        .from("ponto_registros")
        .select("*")
        .eq("empresa_id", empresaId)
        .gte("data_hora", monthStart.toISOString())
        .lte("data_hora", monthEnd.toISOString())
        .in("operational_user_id", empIds)
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

  // Totals
  const grandTotalWorked = reports.reduce((s, r) => s + r.totalWorkedMin, 0);
  const grandTotalExpected = reports.reduce((s, r) => s + r.totalExpectedMin, 0);
  const grandTotalOvertime = reports.reduce((s, r) => s + r.totalOvertimeMin, 0);
  const grandTotalAbsences = reports.reduce((s, r) => s + r.totalAbsences, 0);

  // ---- Signature canvas logic ----
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = canvas.offsetWidth * 2;
    canvas.height = canvas.offsetHeight * 2;
    ctx.scale(2, 2);
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
  }, []);

  useEffect(() => {
    if (signDialogOpen) {
      setTimeout(initCanvas, 100);
    }
  }, [signDialogOpen, initCanvas]);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    setIsDrawing(true);
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSigned(true);
  };

  const endDraw = () => setIsDrawing(false);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSigned(false);
  };

  // ---- PDF Generation ----
  const generatePDF = (report: EmployeeReport, signatureDataUrl?: string) => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 14;
    let y = 20;

    const monthLabel = format(parseISO(filterMonth + "-01"), "MMMM yyyy", { locale: ptBR });

    // Header
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Relatório de Ponto", margin, y);
    y += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Colaborador: ${report.nome}`, margin, y);
    y += 5;
    doc.text(`Período: ${monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}`, margin, y);
    y += 5;
    doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, margin, y);
    y += 10;

    // Summary
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, y, pageW - margin * 2, 22, "F");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    const cols = [
      { label: "Dias Trab.", val: String(report.totalDaysWorked) },
      { label: "Trabalhado", val: formatMinutes(report.totalWorkedMin) },
      { label: "Esperado", val: formatMinutes(report.totalExpectedMin) },
      { label: "Horas Extras", val: formatMinutes(report.totalOvertimeMin) },
      { label: "Déficit", val: formatMinutes(report.totalDeficitMin) },
      { label: "Faltas", val: String(report.totalAbsences) },
      { label: "Saldo", val: formatMinutes(report.totalWorkedMin - report.totalExpectedMin) },
    ];
    const colW = (pageW - margin * 2) / cols.length;
    cols.forEach((c, i) => {
      const x = margin + i * colW;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.text(c.label, x + 2, y + 6);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(c.val, x + 2, y + 14);
    });
    y += 28;

    // Day-by-day table
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Detalhamento Diário", margin, y);
    y += 6;

    // Table header
    const thCols = ["Data", "Dia", "Trabalhado", "Esperado", "Saldo", "Registros", "Status"];
    const thWidths = [18, 14, 22, 22, 18, 60, 22];
    doc.setFillColor(50, 50, 50);
    doc.setTextColor(255, 255, 255);
    doc.rect(margin, y, pageW - margin * 2, 7, "F");
    doc.setFontSize(7);
    let xOff = margin;
    thCols.forEach((col, i) => {
      doc.text(col, xOff + 1, y + 5);
      xOff += thWidths[i];
    });
    y += 7;
    doc.setTextColor(0, 0, 0);

    const emp = employees.find(e => e.id === report.id);
    const config = configs.find(c => c.id === emp?.jornada_id);
    const expectedDailyMin = config?.jornada_diaria_min || 480;

    const filteredDays = report.days.filter(d => d.isWorkDay || d.jornada || d.punches.length > 0);

    filteredDays.forEach((d, idx) => {
      if (y > 265) {
        doc.addPage();
        y = 20;
      }

      const dayDate = parseISO(d.date);
      const dayName = format(dayDate, "EEE", { locale: ptBR });
      const worked = d.jornada?.horas_trabalhadas_min || 0;
      const expected = d.isWorkDay ? expectedDailyMin : 0;
      const daySaldo = worked - expected;

      let status = "—";
      if (!d.isWorkDay && d.jornada) status = "H.Extra";
      else if (d.isWorkDay && !d.jornada && d.punches.length === 0) status = "Falta";
      else if (d.jornada) status = d.jornada.status === "fechado" ? "Fechado" : "Aberto";
      else if (d.punches.length > 0) status = "Parcial";

      const punchStr = d.punches.map((p: any) => `${(PUNCH_LABELS[p.tipo] || p.tipo)[0]}:${format(new Date(p.data_hora), "HH:mm")}`).join(" | ");

      if (idx % 2 === 0) {
        doc.setFillColor(248, 248, 248);
        doc.rect(margin, y, pageW - margin * 2, 6, "F");
      }

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      xOff = margin;
      const rowData = [
        format(dayDate, "dd/MM"),
        dayName,
        worked > 0 ? formatMinutes(worked) : "—",
        expected > 0 ? formatMinutes(expected) : "—",
        worked > 0 || expected > 0 ? formatMinutes(daySaldo) : "—",
        punchStr || "—",
        status,
      ];
      rowData.forEach((val, i) => {
        doc.text(val, xOff + 1, y + 4);
        xOff += thWidths[i];
      });
      y += 6;
    });

    // Signature area
    y += 10;
    if (y > 240) {
      doc.addPage();
      y = 30;
    }

    if (signatureDataUrl) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text("Assinatura do colaborador:", margin, y);
      y += 3;
      doc.addImage(signatureDataUrl, "PNG", margin, y, 60, 20);
      y += 22;
      doc.setFontSize(7);
      doc.text(`Assinado digitalmente em ${format(new Date(), "dd/MM/yyyy HH:mm")}`, margin, y);
    } else {
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text("Assinatura do colaborador:", margin, y);
      y += 2;
      doc.setDrawColor(0);
      doc.line(margin, y + 18, margin + 80, y + 18);
      y += 22;
      doc.setFontSize(7);
      doc.text(report.nome, margin, y);
      y += 4;
      doc.text("Data: ____/____/________", margin, y);
    }

    doc.save(`relatorio-ponto-${report.nome.replace(/\s+/g, "-").toLowerCase()}-${filterMonth}.pdf`);
    toast.success("PDF gerado com sucesso!");
  };

  const handleExportPDF = (report: EmployeeReport) => {
    generatePDF(report);
  };

  const handleSignOnline = (report: EmployeeReport) => {
    setSigningReport(report);
    setHasSigned(false);
    setSignDialogOpen(true);
  };

  const handleConfirmSign = () => {
    if (!signingReport || !canvasRef.current || !hasSigned) return;
    const dataUrl = canvasRef.current.toDataURL("image/png");
    generatePDF(signingReport, dataUrl);
    setSignDialogOpen(false);
    setSigningReport(null);
  };

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
            <div className="h-10 w-10 rounded-lg bg-accent/50 flex items-center justify-center">
              <CalendarDays className="h-5 w-5 text-accent-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Esperado</p>
              <p className="text-xl font-bold text-foreground">{formatMinutes(grandTotalExpected)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Horas Extras</p>
              <p className="text-xl font-bold text-foreground">{formatMinutes(grandTotalOvertime)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Faltas</p>
              <p className="text-xl font-bold text-destructive">{grandTotalAbsences}</p>
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
                  <TableHead>Dias Trab.</TableHead>
                  <TableHead>Trabalhado</TableHead>
                  <TableHead>Esperado</TableHead>
                  <TableHead>H. Extras</TableHead>
                  <TableHead>Déficit</TableHead>
                  <TableHead>Faltas</TableHead>
                  <TableHead>Saldo</TableHead>
                  <TableHead className="w-24">Ações</TableHead>
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
                        <TableCell className="text-primary font-medium">{formatMinutes(r.totalOvertimeMin)}</TableCell>
                        <TableCell className="text-destructive">{formatMinutes(r.totalDeficitMin)}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="bg-destructive/10 text-destructive">
                            {r.totalAbsences}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className={`font-semibold flex items-center gap-1 ${saldo >= 0 ? "text-primary" : "text-destructive"}`}>
                            {saldo >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            {formatMinutes(saldo)}
                          </span>
                        </TableCell>
                        <TableCell onClick={e => e.stopPropagation()}>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => handleExportPDF(r)} title="Exportar PDF">
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleSignOnline(r)} title="Assinar e exportar">
                              <PenTool className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>

                      {/* Expanded day-by-day detail */}
                      {isExpanded && (
                        <TableRow key={`${r.id}-detail`}>
                          <TableCell colSpan={10} className="p-0 bg-muted/30">
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

                                    const statusColor = status === "Falta" ? "bg-destructive/10 text-destructive"
                                      : status === "Hora Extra" ? "bg-primary/10 text-primary"
                                      : status === "Fechado" ? "bg-accent text-accent-foreground"
                                      : "bg-muted text-muted-foreground";

                                    return (
                                      <TableRow key={d.date} className={!d.isWorkDay ? "bg-muted/20" : ""}>
                                        <TableCell className="text-sm">{format(dayDate, "dd/MM")}</TableCell>
                                        <TableCell className="text-sm capitalize">{dayName}</TableCell>
                                        <TableCell className="text-sm">{worked > 0 ? formatMinutes(worked) : "—"}</TableCell>
                                        <TableCell className="text-sm">{expected > 0 ? formatMinutes(expected) : "—"}</TableCell>
                                        <TableCell className={`text-sm ${daySaldo >= 0 ? "text-primary" : "text-destructive"}`}>
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

      {/* Online signature dialog */}
      <Dialog open={signDialogOpen} onOpenChange={setSignDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assinar Relatório — {signingReport?.nome}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Desenhe sua assinatura abaixo. O PDF será gerado com a assinatura digital.
            </p>
            <div className="border-2 border-dashed border-border rounded-lg overflow-hidden bg-card">
              <canvas
                ref={canvasRef}
                className="w-full h-32 cursor-crosshair touch-none"
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={endDraw}
                onMouseLeave={endDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={endDraw}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={clearCanvas} className="flex-1">
                Limpar
              </Button>
              <Button onClick={handleConfirmSign} disabled={!hasSigned} className="flex-1 gap-2">
                <Download className="h-4 w-4" />
                Gerar PDF Assinado
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
