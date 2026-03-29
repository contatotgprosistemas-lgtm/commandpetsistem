import { useEffect, useState, useCallback } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Clock, Users, AlertTriangle, TrendingUp, TrendingDown,
  MapPin, Camera, CalendarDays, Settings, BarChart3, ClipboardList,
  ChevronLeft, ChevronRight, Loader2, Save, Eye, UserPlus, Pencil
} from "lucide-react";
import ColaboradoresTab from "@/components/ponto/ColaboradoresTab";
import RelatorioTab from "@/components/ponto/RelatorioTab";

const PUNCH_LABELS: Record<string, string> = {
  entrada: "Entrada",
  pausa_inicio: "Início Pausa",
  pausa_fim: "Fim Pausa",
  saida: "Saída",
};

const PUNCH_COLORS: Record<string, string> = {
  entrada: "bg-emerald-500/10 text-emerald-600",
  pausa_inicio: "bg-amber-500/10 text-amber-600",
  pausa_fim: "bg-blue-500/10 text-blue-600",
  saida: "bg-red-500/10 text-red-600",
};

const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function formatMinutes(min: number): string {
  const h = Math.floor(Math.abs(min) / 60);
  const m = Math.abs(min) % 60;
  const sign = min < 0 ? "-" : "";
  return `${sign}${h}h${m.toString().padStart(2, "0")}`;
}

export default function PontoPage() {
  const { profile } = useAuth();
  const empresaId = profile?.empresa_id;

  const [employees, setEmployees] = useState<any[]>([]);
  const [punches, setPunches] = useState<any[]>([]);
  const [jornadas, setJornadas] = useState<any[]>([]);
  const [configs, setConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterEmployee, setFilterEmployee] = useState("all");
  const [filterMonth, setFilterMonth] = useState(() => format(new Date(), "yyyy-MM"));
  const [filterDate, setFilterDate] = useState(() => format(new Date(), "yyyy-MM-dd"));

  // Config form
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<any>(null);

  // Edit punch
  const [editPunchDialogOpen, setEditPunchDialogOpen] = useState(false);
  const [editingPunch, setEditingPunch] = useState<any>(null);
  const [editPunchTime, setEditPunchTime] = useState("");
  const [editPunchType, setEditPunchType] = useState("");
  const [savingPunch, setSavingPunch] = useState(false);

  const [configForm, setConfigForm] = useState({
    nome: "Jornada Padrão",
    jornada_diaria_min: 480,
    intervalo_min: 60,
    tolerancia_min: 10,
    dias_trabalho: [1, 2, 3, 4, 5] as number[],
  });
  const [savingConfig, setSavingConfig] = useState(false);

  // Selfie preview
  const [selfieUrl, setSelfieUrl] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);

    const [empRes, configRes] = await Promise.all([
      supabase.from("operational_users").select("id, nome, email, ativo, jornada_id, pin").eq("empresa_id", empresaId),
      supabase.from("ponto_configuracoes").select("*").eq("empresa_id", empresaId).order("nome"),
    ]);

    setEmployees(empRes.data || []);
    setConfigs(configRes.data || []);
    setLoading(false);
  }, [empresaId]);

  // Fetch punches for selected date
  const fetchPunches = useCallback(async () => {
    if (!empresaId) return;
    const dayStart = new Date(filterDate + "T00:00:00");
    const dayEnd = new Date(filterDate + "T23:59:59");

    let q = supabase
      .from("ponto_registros")
      .select("*, operational_users(nome)")
      .eq("empresa_id", empresaId)
      .gte("data_hora", dayStart.toISOString())
      .lte("data_hora", dayEnd.toISOString())
      .order("data_hora", { ascending: true });

    if (filterEmployee !== "all") {
      q = q.eq("operational_user_id", filterEmployee);
    }

    const { data } = await q;
    setPunches(data || []);
  }, [empresaId, filterDate, filterEmployee]);

  // Fetch jornadas for selected month
  const fetchJornadas = useCallback(async () => {
    if (!empresaId) return;
    const start = startOfMonth(new Date(filterMonth + "-01"));
    const end = endOfMonth(start);

    let q = supabase
      .from("ponto_jornadas")
      .select("*, operational_users(nome)")
      .eq("empresa_id", empresaId)
      .gte("data", format(start, "yyyy-MM-dd"))
      .lte("data", format(end, "yyyy-MM-dd"))
      .order("data", { ascending: true });

    if (filterEmployee !== "all") {
      q = q.eq("operational_user_id", filterEmployee);
    }

    const { data } = await q;
    setJornadas(data || []);
  }, [empresaId, filterMonth, filterEmployee]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { fetchPunches(); }, [fetchPunches]);
  useEffect(() => { fetchJornadas(); }, [fetchJornadas]);

  // Realtime subscription
  useEffect(() => {
    if (!empresaId) return;
    const channel = supabase
      .channel("ponto-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "ponto_registros" }, () => {
        fetchPunches();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [empresaId, fetchPunches]);

  // Dashboard stats
  const todayPunches = punches;
  const employeesWithEntry = new Set(todayPunches.filter(p => p.tipo === "entrada").map(p => p.operational_user_id));
  const employeesWithExit = new Set(todayPunches.filter(p => p.tipo === "saida").map(p => p.operational_user_id));
  const activeNow = [...employeesWithEntry].filter(id => !employeesWithExit.has(id)).length;
  const totalActive = employees.filter(e => e.ativo).length;

  // Bank hours totals
  const bankByEmployee: Record<string, { nome: string; total: number; days: number }> = {};
  jornadas.forEach((j: any) => {
    const key = j.operational_user_id;
    if (!bankByEmployee[key]) {
      bankByEmployee[key] = { nome: j.operational_users?.nome || "—", total: 0, days: 0 };
    }
    bankByEmployee[key].total += j.saldo_min || 0;
    bankByEmployee[key].days += 1;
  });

  const openNewConfig = () => {
    setEditingConfig(null);
    setConfigForm({ nome: "", jornada_diaria_min: 480, intervalo_min: 60, tolerancia_min: 10, dias_trabalho: [1, 2, 3, 4, 5] });
    setConfigDialogOpen(true);
  };

  const openEditConfig = (c: any) => {
    setEditingConfig(c);
    setConfigForm({
      nome: c.nome,
      jornada_diaria_min: c.jornada_diaria_min,
      intervalo_min: c.intervalo_min,
      tolerancia_min: c.tolerancia_min,
      dias_trabalho: c.dias_trabalho || [1, 2, 3, 4, 5],
    });
    setConfigDialogOpen(true);
  };

  const handleSaveConfig = async () => {
    if (!empresaId || !configForm.nome.trim()) {
      toast.error("Nome da jornada é obrigatório.");
      return;
    }
    setSavingConfig(true);
    try {
      if (editingConfig) {
        await supabase.from("ponto_configuracoes").update(configForm).eq("id", editingConfig.id);
      } else {
        await supabase.from("ponto_configuracoes").insert({ ...configForm, empresa_id: empresaId });
      }
      toast.success("Jornada salva!");
      setConfigDialogOpen(false);
      fetchData();
    } catch {
      toast.error("Erro ao salvar jornada.");
    }
    setSavingConfig(false);
  };

  const handleDeleteConfig = async (id: string) => {
    const linked = employees.filter(e => e.jornada_id === id).length;
    if (linked > 0) {
      toast.error(`Essa jornada está vinculada a ${linked} colaborador(es). Desvincule primeiro.`);
      return;
    }
    const { error } = await supabase.from("ponto_configuracoes").delete().eq("id", id);
    if (error) toast.error("Erro ao excluir.");
    else { toast.success("Jornada excluída."); fetchData(); }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Clock className="h-6 w-6 text-primary" />
          Registro de Ponto
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Controle de jornada dos colaboradores</p>
      </div>

      <Tabs defaultValue="painel" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="painel" className="gap-1.5"><BarChart3 className="h-4 w-4" />Painel</TabsTrigger>
          <TabsTrigger value="registros" className="gap-1.5"><ClipboardList className="h-4 w-4" />Registros</TabsTrigger>
          <TabsTrigger value="banco" className="gap-1.5"><TrendingUp className="h-4 w-4" />Banco de Horas</TabsTrigger>
          <TabsTrigger value="relatorio" className="gap-1.5"><CalendarDays className="h-4 w-4" />Relatório</TabsTrigger>
          <TabsTrigger value="colaboradores" className="gap-1.5"><Users className="h-4 w-4" />Colaboradores</TabsTrigger>
          <TabsTrigger value="config" className="gap-1.5"><Settings className="h-4 w-4" />Configurações</TabsTrigger>
        </TabsList>

        {/* PAINEL TAB */}
        <TabsContent value="painel" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Colaboradores Ativos</p>
                  <p className="text-xl font-bold text-foreground">{totalActive}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Trabalhando Agora</p>
                  <p className="text-xl font-bold text-foreground">{activeNow}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Entradas Hoje</p>
                  <p className="text-xl font-bold text-foreground">{employeesWithEntry.size}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Ausentes Hoje</p>
                  <p className="text-xl font-bold text-foreground">{Math.max(0, totalActive - employeesWithEntry.size)}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Today's real-time feed */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Registros de Hoje — {format(new Date(filterDate), "dd/MM/yyyy")}</CardTitle>
            </CardHeader>
            <CardContent>
              {todayPunches.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum registro hoje.</p>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {todayPunches.map((p: any) => (
                    <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-card">
                      {p.selfie_url && (
                        <button onClick={() => setSelfieUrl(p.selfie_url)} className="shrink-0">
                          <img src={p.selfie_url} alt="" className="h-10 w-10 rounded-full object-cover border-2 border-border" />
                        </button>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-foreground truncate">{p.operational_users?.nome || "—"}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(p.data_hora), "HH:mm:ss")}</p>
                      </div>
                      <Badge variant="secondary" className={PUNCH_COLORS[p.tipo] || ""}>
                        {PUNCH_LABELS[p.tipo] || p.tipo}
                      </Badge>
                      {p.latitude && (
                        <a
                          href={`https://www.google.com/maps?q=${p.latitude},${p.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary"
                        >
                          <MapPin className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* REGISTROS TAB */}
        <TabsContent value="registros" className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <div>
              <Label className="text-xs">Data</Label>
              <Input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="w-40" />
            </div>
            <div>
              <Label className="text-xs">Colaborador</Label>
              <Select value={filterEmployee} onValueChange={setFilterEmployee}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {employees.map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Horário</TableHead>
                    <TableHead>Localização</TableHead>
                    <TableHead>Selfie</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {punches.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum registro encontrado.</TableCell></TableRow>
                  ) : (
                    punches.map((p: any) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.operational_users?.nome || "—"}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={PUNCH_COLORS[p.tipo] || ""}>
                            {PUNCH_LABELS[p.tipo] || p.tipo}
                          </Badge>
                        </TableCell>
                        <TableCell>{format(new Date(p.data_hora), "HH:mm:ss")}</TableCell>
                        <TableCell>
                          {p.latitude ? (
                            <a
                              href={`https://www.google.com/maps?q=${p.latitude},${p.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline flex items-center gap-1 text-xs"
                            >
                              <MapPin className="h-3 w-3" />Ver mapa
                            </a>
                          ) : "—"}
                        </TableCell>
                        <TableCell>
                          {p.selfie_url ? (
                            <button onClick={() => setSelfieUrl(p.selfie_url)}>
                              <img src={p.selfie_url} alt="" className="h-8 w-8 rounded object-cover border border-border cursor-pointer hover:opacity-80" />
                            </button>
                          ) : "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* BANCO DE HORAS TAB */}
        <TabsContent value="banco" className="space-y-4">
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
                  {employees.map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(bankByEmployee).map(([id, data]) => (
              <Card key={id}>
                <CardContent className="p-4">
                  <p className="font-medium text-foreground">{data.nome}</p>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Dias registrados</p>
                      <p className="font-semibold">{data.days}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Saldo</p>
                      <p className={`font-semibold flex items-center gap-1 ${data.total >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                        {data.total >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {formatMinutes(data.total)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {Object.keys(bankByEmployee).length === 0 && (
              <p className="text-sm text-muted-foreground col-span-full text-center py-8">Nenhum dado para o período selecionado.</p>
            )}
          </div>

          {/* Detailed table */}
          {jornadas.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Detalhamento Diário</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Colaborador</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Trabalhado</TableHead>
                      <TableHead>Esperado</TableHead>
                      <TableHead>Saldo</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jornadas.map((j: any) => (
                      <TableRow key={j.id}>
                        <TableCell className="font-medium">{j.operational_users?.nome || "—"}</TableCell>
                        <TableCell>{format(parseISO(j.data), "dd/MM/yyyy")}</TableCell>
                        <TableCell>{formatMinutes(j.horas_trabalhadas_min)}</TableCell>
                        <TableCell>{formatMinutes(j.horas_esperadas_min)}</TableCell>
                        <TableCell className={j.saldo_min >= 0 ? "text-emerald-600" : "text-red-500"}>
                          {formatMinutes(j.saldo_min)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {j.status === "aberto" ? "Aberto" : j.status === "fechado" ? "Fechado" : j.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* RELATÓRIO TAB */}
        <TabsContent value="relatorio">
          <RelatorioTab empresaId={empresaId!} employees={employees} configs={configs} defaultMonth={filterMonth} />
        </TabsContent>

        {/* COLABORADORES TAB */}
        <TabsContent value="colaboradores">
          <ColaboradoresTab employees={employees} empresaId={empresaId!} onRefresh={fetchData} configs={configs} />
        </TabsContent>

        {/* CONFIGURAÇÕES TAB */}
        <TabsContent value="config" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Jornadas de Trabalho</h2>
            <Button onClick={openNewConfig} className="gap-2">
              <UserPlus className="h-4 w-4" />
              Nova Jornada
            </Button>
          </div>

          {configs.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                Nenhuma jornada cadastrada. Crie a primeira jornada.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {configs.map((c: any) => {
                const linkedCount = employees.filter(e => e.jornada_id === c.id).length;
                return (
                  <Card key={c.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{c.nome}</CardTitle>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEditConfig(c)}>
                            <Settings className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDeleteConfig(c.id)}>
                            ✕
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">Jornada</p>
                          <p className="font-medium">{formatMinutes(c.jornada_diaria_min)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Intervalo</p>
                          <p className="font-medium">{c.intervalo_min}min</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Tolerância</p>
                          <p className="font-medium">{c.tolerancia_min}min</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {DAY_LABELS.map((label, i) => (
                          <Badge
                            key={i}
                            variant={c.dias_trabalho?.includes(i) ? "default" : "outline"}
                            className="text-xs"
                          >
                            {label}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">{linkedCount} colaborador(es) vinculado(s)</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Config dialog */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingConfig ? "Editar Jornada" : "Nova Jornada"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome da Jornada *</Label>
              <Input value={configForm.nome} onChange={e => setConfigForm(prev => ({ ...prev, nome: e.target.value }))} placeholder="Ex: Jornada 8h, Meio Período..." />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Jornada (horas)</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={configForm.jornada_diaria_min / 60}
                  onChange={e => setConfigForm(prev => ({ ...prev, jornada_diaria_min: Math.round(parseFloat(e.target.value || "0") * 60) }))}
                />
                <p className="text-xs text-muted-foreground mt-1">{formatMinutes(configForm.jornada_diaria_min)}</p>
              </div>
              <div>
                <Label>Intervalo (min)</Label>
                <Input
                  type="number"
                  value={configForm.intervalo_min}
                  onChange={e => setConfigForm(prev => ({ ...prev, intervalo_min: parseInt(e.target.value || "0") }))}
                />
              </div>
              <div>
                <Label>Tolerância (min)</Label>
                <Input
                  type="number"
                  value={configForm.tolerancia_min}
                  onChange={e => setConfigForm(prev => ({ ...prev, tolerancia_min: parseInt(e.target.value || "0") }))}
                />
              </div>
            </div>
            <div>
              <Label>Dias de trabalho</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {DAY_LABELS.map((label, i) => (
                  <button
                    key={i}
                    onClick={() => setConfigForm(prev => ({
                      ...prev,
                      dias_trabalho: prev.dias_trabalho.includes(i)
                        ? prev.dias_trabalho.filter(d => d !== i)
                        : [...prev.dias_trabalho, i].sort(),
                    }))}
                    className={`h-10 w-12 rounded-lg text-sm font-medium border transition-colors ${
                      configForm.dias_trabalho.includes(i)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-muted-foreground border-border hover:border-primary/50"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <Button onClick={handleSaveConfig} disabled={savingConfig} className="w-full gap-2">
              {savingConfig ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {editingConfig ? "Salvar Alterações" : "Criar Jornada"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Selfie preview dialog */}
      <Dialog open={!!selfieUrl} onOpenChange={() => setSelfieUrl(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Selfie do Registro</DialogTitle>
          </DialogHeader>
          {selfieUrl && <img src={selfieUrl} alt="Selfie" className="w-full rounded-lg" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
