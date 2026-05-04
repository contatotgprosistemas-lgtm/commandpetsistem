import { useState, useEffect } from "react";
import { Gift, Plus, Package, Users, BarChart3, FileText, Trash2, Pause, Play, XCircle, RefreshCw, CalendarDays, DollarSign, Pencil, FileSignature, PercentCircle, Search, ClipboardList, Activity, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MetricCard } from "@/components/MetricCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format, differenceInDays, addDays } from "date-fns";
import { parseLocalDate } from "@/lib/utils";

// Date-only "vencido": a subscription is only expired AFTER the end_date day passes.
function startOfTodayLocal(): Date {
  const t = new Date();
  return new Date(t.getFullYear(), t.getMonth(), t.getDate());
}
function isSubExpired(endDate?: string | null): boolean {
  if (!endDate) return false;
  return differenceInDays(parseLocalDate(endDate), startOfTodayLocal()) < 0;
}
import { useNavigate } from "react-router-dom";
import { NovoPlanoDialog } from "@/components/planos/NovoPlanoDialog";
import { NovoPacoteDialog } from "@/components/planos/NovoPacoteDialog";
import { ContratacaoDialog } from "@/components/planos/ContratacaoDialog";
import { PlanejamentoDiasDialog } from "@/components/planos/PlanejamentoDiasDialog";
import { EditarContratacaoDialog } from "@/components/planos/EditarContratacaoDialog";
import { ConsumoTab } from "@/components/planos/ConsumoTab";
import { CancelamentoContratacaoDialog } from "@/components/planos/CancelamentoContratacaoDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function PlanosPacotesPage() {
  const { profile } = useAuth();
  const empresaId = profile?.empresa_id || "";
  const navigate = useNavigate();

  const [plans, setPlans] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [usageLogs, setUsageLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [novoPlanoOpen, setNovoPlanoOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [novoPacoteOpen, setNovoPacoteOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<any>(null);
  const [contratacaoOpen, setContratacaoOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: string; id: string; name: string } | null>(null);
  const [actionTarget, setActionTarget] = useState<{ action: string; id: string } | null>(null);
  const [planejamentoSub, setPlanejamentoSub] = useState<any>(null);
  const [discountTarget, setDiscountTarget] = useState<any>(null);
  const [editingSub, setEditingSub] = useState<any>(null);
  const [cancelSub, setCancelSub] = useState<any>(null);
  const [discountValue, setDiscountValue] = useState("");
  const [searchContratacao, setSearchContratacao] = useState("");
  const [tipoFilterContratacao, setTipoFilterContratacao] = useState<"all" | "banho" | "escola" | "taxipet">("all");
  const [statusFilterContratacao, setStatusFilterContratacao] = useState<"all" | "ativo" | "vencendo" | "vencido" | "pausado" | "cancelado">("all");

  async function fetchAll() {
    setLoading(true);
    const [plansRes, pkgRes, subsRes, usageRes] = await Promise.all([
      supabase.from("service_plans" as any).select("*").order("created_at", { ascending: false }),
      supabase.from("service_packages" as any).select("*").order("created_at", { ascending: false }),
      supabase.from("customer_pet_subscriptions" as any).select("*, cliente:clientes(nome), pet:pets(nome)").order("created_at", { ascending: false }).then(res => {
        if (res.data) res.data.sort((a: any, b: any) => (a.cliente?.nome ?? "").localeCompare(b.cliente?.nome ?? ""));
        return res;
      }),
      supabase.from("subscription_usage_logs" as any).select("*").order("usage_date", { ascending: false }).limit(100),
    ]);
    if (plansRes.data) setPlans(plansRes.data as any);
    if (pkgRes.data) setPackages(pkgRes.data as any);
    if (subsRes.data) setSubscriptions(subsRes.data as any);
    if (usageRes.data) setUsageLogs(usageRes.data as any);
    setLoading(false);
  }

  useEffect(() => { if (empresaId) fetchAll(); }, [empresaId]);

  async function handleDelete() {
    if (!deleteTarget) return;
    const table = deleteTarget.type === "plan" ? "service_plans" : deleteTarget.type === "package" ? "service_packages" : "customer_pet_subscriptions";
    // Se for contratação, excluir agendamentos vinculados antes
    if (deleteTarget.type === "subscription") {
      await supabase.from("agendamentos").delete().eq("subscription_id", deleteTarget.id);
    }
    await supabase.from(table as any).delete().eq("id", deleteTarget.id);
    toast.success("Removido com sucesso");
    setDeleteTarget(null);
    fetchAll();
  }

  async function handleAction() {
    if (!actionTarget) return;
    const newStatus = actionTarget.action === "pause" ? "pausado" : actionTarget.action === "cancel" ? "cancelado" : actionTarget.action === "reactivate" ? "ativo" : "ativo";
    await supabase.from("customer_pet_subscriptions" as any).update({ status: newStatus }).eq("id", actionTarget.id);

    // Excluir agendamentos futuros vinculados quando pausar ou cancelar
    if (actionTarget.action === "pause" || actionTarget.action === "cancel") {
      const today = format(new Date(), "yyyy-MM-dd");
      const { error: errAg, count } = await supabase
        .from("agendamentos")
        .delete({ count: "exact" })
        .eq("subscription_id", actionTarget.id)
        .gte("data_hora", today);
      if (errAg) {
        console.error("Erro ao excluir agendamentos:", errAg);
      } else if (count && count > 0) {
        toast.info(`${count} agendamento(s) futuro(s) excluído(s)`);
      }
    }

    // Log event
    await supabase.from("subscription_events" as any).insert({
      empresa_id: empresaId, subscription_id: actionTarget.id,
      event_type: actionTarget.action, description: `Status alterado para ${newStatus}`
    });

    toast.success("Status atualizado");
    setActionTarget(null);
    fetchAll();
  }

  async function handleApplyDiscount() {
    if (!discountTarget) return;
    const discountAmount = Number(discountValue || 0);
    const newFinalPrice = Math.max(0, Number(discountTarget.price_contracted) - discountAmount);
    await supabase.from("customer_pet_subscriptions" as any).update({
      discount_amount: discountAmount,
      final_price: newFinalPrice,
    }).eq("id", discountTarget.id);
    toast.success(`Desconto de R$ ${discountAmount.toFixed(2)} aplicado`);
    setDiscountTarget(null);
    setDiscountValue("");
    fetchAll();
  }

  async function handleRenew(sub: any) {
    const plan = plans.find((p: any) => p.id === sub.plan_id);
    const pkg = packages.find((p: any) => p.id === sub.package_id);
    const validityDays = plan?.validity_days || pkg?.validity_days || 30;
    const newStart = format(new Date(), "yyyy-MM-dd");
    const newEnd = format(addDays(new Date(), validityDays), "yyyy-MM-dd");

    await supabase.from("customer_pet_subscriptions" as any).update({
      start_date: newStart, end_date: newEnd, status: "ativo",
      next_renewal_date: sub.auto_renew ? newEnd : null
    }).eq("id", sub.id);

    await supabase.from("subscription_events" as any).insert({
      empresa_id: empresaId, subscription_id: sub.id,
      event_type: "renovacao", description: "Plano renovado"
    });

    await supabase.from("contas_receber").insert({
      empresa_id: empresaId, cliente_id: sub.cliente_id,
      descricao: `Renovação: ${plan?.name || pkg?.name}`,
      valor: sub.final_price, vencimento: newStart, status: "pendente", categoria: "Planos e Pacotes"
    });

    toast.success("Plano renovado com sucesso!");
    fetchAll();
  }

  async function handleFaturar(sub: any) {
    const planName = plans.find((p: any) => p.id === sub.plan_id)?.name || packages.find((p: any) => p.id === sub.package_id)?.name || "Plano/Pacote";

    // Buscar dia de vencimento do cliente
    const { data: cliente } = await supabase
      .from("clientes")
      .select("dia_vencimento_fatura")
      .eq("id", sub.cliente_id)
      .maybeSingle();

    const hoje = new Date();
    const diaVenc = Number(cliente?.dia_vencimento_fatura) || 10;
    const ano = hoje.getFullYear();
    const mes = hoje.getMonth();
    const diaHoje = hoje.getDate();
    const ultimoDiaMesAtual = new Date(ano, mes + 1, 0).getDate();
    const diaEsteMes = Math.min(diaVenc, ultimoDiaMesAtual);
    let vencimento: Date;
    if (diaEsteMes >= diaHoje) {
      vencimento = new Date(ano, mes, diaEsteMes);
    } else {
      const ultimoDiaMesProx = new Date(ano, mes + 2, 0).getDate();
      const diaProxMes = Math.min(diaVenc, ultimoDiaMesProx);
      vencimento = new Date(ano, mes + 1, diaProxMes);
    }

    const { error } = await supabase.from("contas_receber").insert({
      empresa_id: empresaId, cliente_id: sub.cliente_id,
      descricao: `Fatura manual: ${planName}`,
      valor: sub.final_price, vencimento: format(vencimento, "yyyy-MM-dd"),
      status: "pendente", categoria: "Planos e Pacotes"
    });
    if (error) { toast.error("Erro ao gerar fatura"); return; }
    toast.success(`Fatura gerada — vencimento ${format(vencimento, "dd/MM/yyyy")}`);
  }

  // Dashboard metrics
  const activeSubs = subscriptions.filter((s: any) => s.status === "ativo");
  const expiringThisWeek = activeSubs.filter((s: any) => {
    if (!s.end_date) return false;
    const d = differenceInDays(parseLocalDate(s.end_date), startOfTodayLocal());
    return d >= 0 && d <= 7;
  });
  const expiredSubs = subscriptions.filter((s: any) => s.status === "ativo" && isSubExpired(s.end_date));
  const monthlyRevenue = activeSubs.reduce((acc: number, s: any) => acc + Number(s.final_price || 0), 0);
  const totalUsage = usageLogs.length;

  const filteredSubscriptions = subscriptions.filter((s: any) => {
    const clienteNome = (s.cliente as any)?.nome?.toLowerCase() || "";
    const petNome = (s.pet as any)?.nome?.toLowerCase() || "";
    const planName = (plans.find((p: any) => p.id === s.plan_id)?.name || packages.find((p: any) => p.id === s.package_id)?.name || "").toLowerCase();
    if (searchContratacao) {
      const q = searchContratacao.toLowerCase();
      if (!clienteNome.includes(q) && !petNome.includes(q) && !planName.includes(q)) return false;
    }
    if (tipoFilterContratacao !== "all") {
      if (tipoFilterContratacao === "banho" && !planName.includes("banho")) return false;
      if (tipoFilterContratacao === "escola" && !(planName.includes("escola") || planName.includes("creche") || planName.includes("daycare"))) return false;
      if (tipoFilterContratacao === "taxipet" && !(planName.includes("taxi") || planName.includes("táxi"))) return false;
    }
    if (statusFilterContratacao !== "all") {
      const expired = isSubExpired(s.end_date) && s.status === "ativo";
      if (statusFilterContratacao === "vencido") {
        if (!(expired || s.status === "vencido")) return false;
      } else if (statusFilterContratacao === "vencendo") {
        if (s.status !== "ativo" || !s.end_date) return false;
        const d = differenceInDays(parseLocalDate(s.end_date), startOfTodayLocal());
        if (!(d >= 0 && d <= 7)) return false;
      } else if (statusFilterContratacao === "ativo") {
        if (s.status !== "ativo" || expired) return false;
      } else if (s.status !== statusFilterContratacao) {
        return false;
      }
    }
    return true;
  });

  function statusBadge(status: string) {
    return statusBadgeImpl(status);
  }

  function handleExportExcel() {
    try {
      const rows = filteredSubscriptions.map((s: any) => {
        const planName = plans.find((p: any) => p.id === s.plan_id)?.name || packages.find((p: any) => p.id === s.package_id)?.name || "—";
        const expired = isSubExpired(s.end_date) && s.status === "ativo";
        const statusLabel = expired ? "Vencido" : (s.status ? s.status.charAt(0).toUpperCase() + s.status.slice(1) : "—");
        return {
          Cliente: (s.cliente as any)?.nome || "—",
          Pet: (s.pet as any)?.nome || "—",
          "Plano/Pacote": planName,
          Frequência: s.frequency || "—",
          "Valor (R$)": Number(s.final_price || 0),
          "Desconto (R$)": Number(s.discount_amount || 0),
          Início: s.start_date ? format(parseLocalDate(s.start_date), "dd/MM/yyyy") : "—",
          Fim: s.end_date ? format(parseLocalDate(s.end_date), "dd/MM/yyyy") : "—",
          "Renovação Auto": s.auto_renew ? "Sim" : "Não",
          Status: statusLabel,
        };
      });
      const ws = XLSX.utils.json_to_sheet(rows);
      ws["!cols"] = [
        { wch: 28 }, { wch: 20 }, { wch: 30 }, { wch: 14 },
        { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 12 },
        { wch: 16 }, { wch: 12 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Contratações");
      const filename = `contratacoes_${format(new Date(), "yyyy-MM-dd_HHmm")}.xlsx`;
      XLSX.writeFile(wb, filename);
      toast.success(`${rows.length} contratação(ões) exportadas`);
    } catch (e: any) {
      console.error(e);
      toast.error("Erro ao exportar para Excel");
    }
  }

  function statusBadgeImpl(status: string) {
    const map: Record<string, { className: string; label: string }> = {
      ativo: { className: "bg-emerald-500/15 text-emerald-600 border-0", label: "Ativo" },
      inativo: { className: "bg-muted text-muted-foreground border-0", label: "Inativo" },
      pausado: { className: "bg-amber-500/15 text-amber-600 border-0", label: "Pausado" },
      cancelado: { className: "bg-destructive/15 text-destructive border-0", label: "Cancelado" },
      vencido: { className: "bg-destructive/15 text-destructive border-0", label: "Vencido" },
      arquivado: { className: "bg-muted text-muted-foreground border-0", label: "Arquivado" },
    };
    const s = map[status] || map.ativo;
    return <Badge className={`${s.className} text-xs`}>{s.label}</Badge>;
  }

  return (
    <div className="p-3 md:p-6 space-y-6 max-w-[1400px]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Gift className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-lg font-semibold text-foreground">Planos e Pacotes</h1>
            <p className="text-sm text-muted-foreground">Gerencie planos, pacotes e contratações</p>
          </div>
        </div>
      </div>

      {/* Dashboard Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard title="Planos Ativos" value={String(plans.filter((p: any) => p.status === "ativo").length)} icon={<FileText className="h-4 w-4" strokeWidth={1.5} />} accent="blue" filled />
        <MetricCard title="Pacotes Ativos" value={String(packages.filter((p: any) => p.status === "ativo").length)} icon={<Package className="h-4 w-4" strokeWidth={1.5} />} accent="violet" filled />
        <MetricCard title="Contratações Ativas" value={String(activeSubs.length)} icon={<Users className="h-4 w-4" strokeWidth={1.5} />} accent="emerald" filled />
        <MetricCard title="Vencendo esta Semana" value={String(expiringThisWeek.length)} icon={<BarChart3 className="h-4 w-4" strokeWidth={1.5} />} accent="amber" filled />
        <MetricCard title="Receita Recorrente" value={`R$ ${monthlyRevenue.toFixed(2)}`} icon={<Gift className="h-4 w-4" strokeWidth={1.5} />} accent="emerald" filled />
      </div>

      <Tabs defaultValue="planos" className="w-full">
        <TabsList className="bg-muted/40 border border-border rounded-xl p-1 h-auto gap-1 flex-wrap w-full justify-start overflow-x-auto">
          {[
            { v: "planos", l: "Planos", i: FileText },
            { v: "pacotes", l: "Pacotes", i: Package },
            { v: "contratações", l: "Contratações", i: ClipboardList },
            { v: "consumo", l: "Consumo", i: Activity },
          ].map(({ v, l, i: Icon }) => (
            <TabsTrigger
              key={v}
              value={v}
              className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-foreground text-muted-foreground px-3 py-1.5 text-xs font-medium gap-1.5 whitespace-nowrap"
            >
              <Icon className="h-3.5 w-3.5" />
              {l}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* PLANOS TAB */}
        <TabsContent value="planos">
          <div className="flex justify-end mt-4 mb-3">
            <Button size="sm" className="gap-1" onClick={() => setNovoPlanoOpen(true)}>
              <Plus className="h-4 w-4" />Novo Plano
            </Button>
          </div>
          {loading ? <LoadingSkeleton /> : plans.length === 0 ? <EmptyState text="Nenhum plano cadastrado" /> : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {plans.map((p: any) => (
                <div key={p.id} className="bg-card rounded-lg shadow-card p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{p.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{p.description || "Sem descrição"}</p>
                    </div>
                    {statusBadge(p.status)}
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-foreground">R$ {Number(p.price).toFixed(2)}</span>
                    <span className="text-xs text-muted-foreground">/{p.recurring_type}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <span>Tipo: {p.type}</span>
                    <span>Renovação auto: {p.auto_renew ? "Sim" : "Não"}</span>
                    
                  </div>
                  <div className="flex gap-2 pt-2 border-t border-border">
                    <Button variant="outline" size="sm" className="flex-1 text-xs h-7" onClick={() => setEditingPlan(p)}>
                      <Pencil className="h-3 w-3 mr-1" />Editar
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 text-xs h-7" onClick={() => setDeleteTarget({ type: "plan", id: p.id, name: p.name })}>
                      <Trash2 className="h-3 w-3 mr-1" />Excluir
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* PACOTES TAB */}
        <TabsContent value="pacotes">
          <div className="flex justify-end mt-4 mb-3">
            <Button size="sm" className="gap-1" onClick={() => setNovoPacoteOpen(true)}>
              <Plus className="h-4 w-4" />Novo Pacote
            </Button>
          </div>
          {loading ? <LoadingSkeleton /> : packages.length === 0 ? <EmptyState text="Nenhum pacote cadastrado" /> : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {packages.map((p: any) => (
                <div key={p.id} className="bg-card rounded-lg shadow-card p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{p.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{p.description || "Sem descrição"}</p>
                    </div>
                    {statusBadge(p.status)}
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-foreground">R$ {Number(p.price).toFixed(2)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <span>Créditos: {p.total_credits}</span>
                    
                  </div>
                  <div className="flex gap-2 pt-2 border-t border-border">
                    <Button variant="outline" size="sm" className="flex-1 text-xs h-7" onClick={() => setEditingPackage(p)}>
                      <Pencil className="h-3 w-3 mr-1" />Editar
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 text-xs h-7" onClick={() => setDeleteTarget({ type: "package", id: p.id, name: p.name })}>
                      <Trash2 className="h-3 w-3 mr-1" />Excluir
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* CONTRATAÇÕES TAB */}
        <TabsContent value="contratações">
          <div className="flex items-center justify-between mt-4 mb-3 gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap flex-1">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar contratação..."
                  value={searchContratacao}
                  onChange={e => setSearchContratacao(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
              <Select value={tipoFilterContratacao} onValueChange={(v: any) => setTipoFilterContratacao(v)}>
                <SelectTrigger className="w-[200px] h-9"><SelectValue placeholder="Tipo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="banho">Pacote de Banho</SelectItem>
                  <SelectItem value="escola">Plano de Escola</SelectItem>
                  <SelectItem value="taxipet">Plano de TaxiPet</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilterContratacao} onValueChange={(v: any) => setStatusFilterContratacao(v)}>
                <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="ativo">Ativos</SelectItem>
                  <SelectItem value="vencendo">Vencendo em 7 dias</SelectItem>
                  <SelectItem value="vencido">Vencidos</SelectItem>
                  <SelectItem value="pausado">Pausados</SelectItem>
                  <SelectItem value="cancelado">Cancelados</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground">{filteredSubscriptions.length} contratação(ões)</span>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="gap-1" onClick={handleExportExcel} disabled={filteredSubscriptions.length === 0}>
                <FileSpreadsheet className="h-4 w-4" />Exportar Excel
              </Button>
              <Button size="sm" className="gap-1" onClick={() => setContratacaoOpen(true)}>
                <Plus className="h-4 w-4" />Nova Contratação
              </Button>
            </div>
          </div>
          {(searchContratacao || tipoFilterContratacao !== "all" || statusFilterContratacao !== "all") && filteredSubscriptions.length > 0 && (
            <div className="mb-3 flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
              <div>
                <p className="text-xs text-muted-foreground">Total filtrado</p>
                <p className="text-xs text-foreground/80">{filteredSubscriptions.length} contratação(ões)</p>
              </div>
              <p className="text-lg font-semibold text-primary tabular-nums">
                R$ {filteredSubscriptions.reduce((acc: number, s: any) => acc + Number(s.final_price || 0), 0).toFixed(2)}
              </p>
            </div>
          )}
          {loading ? <LoadingSkeleton /> : filteredSubscriptions.length === 0 ? <EmptyState text="Nenhuma contratação" /> : (
            <div className="bg-card rounded-lg shadow-card divide-y divide-border">
              {filteredSubscriptions.map((s: any) => {
                const planName = plans.find((p: any) => p.id === s.plan_id)?.name || packages.find((p: any) => p.id === s.package_id)?.name || "—";
                const isExpired = isSubExpired(s.end_date) && s.status === "ativo";
                return (
                  <div key={s.id} className="flex items-center gap-4 px-5 py-3 hover:bg-muted/30 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{(s.cliente as any)?.nome || "—"} {(s.pet as any)?.nome ? `• ${(s.pet as any).nome}` : ""}</p>
                      <p className="text-xs text-muted-foreground">{planName}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-foreground tabular-nums">R$ {Number(s.final_price).toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.start_date && format(new Date(s.start_date + "T00:00:00"), "dd/MM/yy")} — {s.end_date && format(new Date(s.end_date + "T00:00:00"), "dd/MM/yy")}
                      </p>
                    </div>
                    <div className="shrink-0">{isExpired ? statusBadge("vencido") : statusBadge(s.status)}</div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Editar contratação" onClick={() => setEditingSub(s)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Planejar dias" onClick={() => setPlanejamentoSub(s)}>
                        <CalendarDays className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Faturar manual" onClick={() => handleFaturar(s)}>
                        <DollarSign className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Aplicar desconto" onClick={() => { setDiscountTarget(s); setDiscountValue(String(s.discount_amount || 0)); }}>
                        <PercentCircle className="h-3.5 w-3.5" />
                      </Button>
                      {s.status === "ativo" && (
                        <>
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="Pausar" onClick={() => setActionTarget({ action: "pause", id: s.id })}>
                            <Pause className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="Cancelar" onClick={() => setCancelSub(s)}>
                            <XCircle className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                      {(s.status === "pausado" || s.status === "cancelado" || isExpired) && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Reativar" onClick={() => setActionTarget({ action: "reactivate", id: s.id })}>
                          <Play className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {(s.status === "vencido" || isExpired) && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Renovar" onClick={() => handleRenew(s)}>
                          <RefreshCw className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Gerar Contrato" onClick={() => navigate(`/contratos?subscription_id=${s.id}`)}>
                        <FileSignature className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteTarget({ type: "subscription", id: s.id, name: planName })}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* CONSUMO TAB */}
        <TabsContent value="consumo">
          <ConsumoTab />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      {empresaId && <NovoPlanoDialog open={novoPlanoOpen || !!editingPlan} onOpenChange={o => { if (!o) { setNovoPlanoOpen(false); setEditingPlan(null); } }} onSuccess={fetchAll} empresaId={empresaId} editingPlan={editingPlan} />}
      {empresaId && <NovoPacoteDialog open={novoPacoteOpen || !!editingPackage} onOpenChange={o => { if (!o) { setNovoPacoteOpen(false); setEditingPackage(null); } }} onSuccess={fetchAll} empresaId={empresaId} editingPackage={editingPackage} />}
      {empresaId && <ContratacaoDialog open={contratacaoOpen} onOpenChange={setContratacaoOpen} onSuccess={fetchAll} empresaId={empresaId} />}
      {planejamentoSub && <PlanejamentoDiasDialog open={!!planejamentoSub} onOpenChange={o => { if (!o) setPlanejamentoSub(null); }} subscription={planejamentoSub} onSuccess={fetchAll} />}
      {editingSub && (
        <EditarContratacaoDialog
          open={!!editingSub}
          onOpenChange={o => { if (!o) setEditingSub(null); }}
          onSuccess={fetchAll}
          subscription={editingSub}
          planName={plans.find((p: any) => p.id === editingSub.plan_id)?.name || packages.find((p: any) => p.id === editingSub.package_id)?.name || "—"}
        />
      )}
      {cancelSub && (
        <CancelamentoContratacaoDialog
          open={!!cancelSub}
          onOpenChange={o => { if (!o) setCancelSub(null); }}
          onSuccess={fetchAll}
          subscription={cancelSub}
          plan={plans.find((p: any) => p.id === cancelSub.plan_id)}
          pkg={packages.find((p: any) => p.id === cancelSub.package_id)}
          empresaId={empresaId}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={o => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!actionTarget} onOpenChange={o => { if (!o) setActionTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionTarget?.action === "pause" ? "Pausar contratação?" : actionTarget?.action === "cancel" ? "Cancelar contratação?" : "Reativar contratação?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionTarget?.action === "pause" ? "O saldo será congelado até reativação." : actionTarget?.action === "cancel" ? "Novos consumos serão bloqueados." : "A contratação voltará ao status ativo."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={handleAction}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!discountTarget} onOpenChange={o => { if (!o) { setDiscountTarget(null); setDiscountValue(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Aplicar Desconto</DialogTitle></DialogHeader>
          {discountTarget && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Plano: <span className="font-medium text-foreground">{plans.find((p: any) => p.id === discountTarget.plan_id)?.name || packages.find((p: any) => p.id === discountTarget.package_id)?.name || "—"}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Valor original: <span className="font-medium text-foreground">R$ {Number(discountTarget.price_contracted).toFixed(2)}</span>
              </p>
              <div className="space-y-1.5">
                <Label>Desconto (R$)</Label>
                <Input type="number" value={discountValue} onChange={e => setDiscountValue(e.target.value)} placeholder="0.00" />
              </div>
              <p className="text-sm font-semibold text-foreground">
                Valor final: R$ {Math.max(0, Number(discountTarget.price_contracted) - Number(discountValue || 0)).toFixed(2)}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDiscountTarget(null); setDiscountValue(""); }}>Cancelar</Button>
            <Button onClick={handleApplyDiscount}>Aplicar Desconto</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LoadingSkeleton() {
  return <div className="space-y-3 mt-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}</div>;
}

function EmptyState({ text }: { text: string }) {
  return <div className="flex items-center justify-center py-12 text-sm text-muted-foreground bg-card rounded-lg shadow-card mt-4">{text}</div>;
}
