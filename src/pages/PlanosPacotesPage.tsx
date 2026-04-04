import { useState, useEffect } from "react";
import { Gift, Plus, Package, Users, BarChart3, FileText, Trash2, Pause, Play, XCircle, RefreshCw, CalendarDays, DollarSign, Pencil, FileSignature, PercentCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MetricCard } from "@/components/MetricCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format, isPast, differenceInDays, addDays } from "date-fns";
import { useNavigate } from "react-router-dom";
import { NovoPlanoDialog } from "@/components/planos/NovoPlanoDialog";
import { NovoPacoteDialog } from "@/components/planos/NovoPacoteDialog";
import { ContratacaoDialog } from "@/components/planos/ContratacaoDialog";
import { PlanejamentoDiasDialog } from "@/components/planos/PlanejamentoDiasDialog";
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
  const [discountValue, setDiscountValue] = useState("");

  async function fetchAll() {
    setLoading(true);
    const [plansRes, pkgRes, subsRes, usageRes] = await Promise.all([
      supabase.from("service_plans" as any).select("*").order("created_at", { ascending: false }),
      supabase.from("service_packages" as any).select("*").order("created_at", { ascending: false }),
      supabase.from("customer_pet_subscriptions" as any).select("*, cliente:clientes(nome), pet:pets(nome)").order("created_at", { ascending: false }),
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
    const { error } = await supabase.from("contas_receber").insert({
      empresa_id: empresaId, cliente_id: sub.cliente_id,
      descricao: `Fatura manual: ${planName}`,
      valor: sub.final_price, vencimento: format(new Date(), "yyyy-MM-dd"),
      status: "pendente", categoria: "Planos e Pacotes"
    });
    if (error) { toast.error("Erro ao gerar fatura"); return; }
    toast.success("Fatura gerada com sucesso!");
  }

  // Dashboard metrics
  const activeSubs = subscriptions.filter((s: any) => s.status === "ativo");
  const expiringThisWeek = activeSubs.filter((s: any) => s.end_date && differenceInDays(new Date(s.end_date), new Date()) <= 7 && differenceInDays(new Date(s.end_date), new Date()) >= 0);
  const expiredSubs = subscriptions.filter((s: any) => s.status === "ativo" && s.end_date && isPast(new Date(s.end_date)));
  const monthlyRevenue = activeSubs.reduce((acc: number, s: any) => acc + Number(s.final_price || 0), 0);
  const totalUsage = usageLogs.length;

  function statusBadge(status: string) {
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
    <div className="p-6 space-y-6 max-w-[1400px]">
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
        <MetricCard title="Planos Ativos" value={String(plans.filter((p: any) => p.status === "ativo").length)} change="—" changeType="neutral" icon={<FileText className="h-4 w-4" strokeWidth={1.5} />} />
        <MetricCard title="Pacotes Ativos" value={String(packages.filter((p: any) => p.status === "ativo").length)} change="—" changeType="neutral" icon={<Package className="h-4 w-4" strokeWidth={1.5} />} />
        <MetricCard title="Contratações Ativas" value={String(activeSubs.length)} change="—" changeType="neutral" icon={<Users className="h-4 w-4" strokeWidth={1.5} />} />
        <MetricCard title="Vencendo esta Semana" value={String(expiringThisWeek.length)} change="—" changeType="neutral" icon={<BarChart3 className="h-4 w-4" strokeWidth={1.5} />} />
        <MetricCard title="Receita Recorrente" value={`R$ ${monthlyRevenue.toFixed(2)}`} change="—" changeType="neutral" icon={<Gift className="h-4 w-4" strokeWidth={1.5} />} />
      </div>

      <Tabs defaultValue="planos" className="w-full">
        <TabsList className="bg-transparent border-b border-border rounded-none p-0 h-auto gap-4 flex-wrap">
          {["Planos", "Pacotes", "Contratações", "Consumo"].map(tab => (
            <TabsTrigger key={tab} value={tab.toLowerCase()} className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-2 text-sm">
              {tab}
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
          <div className="flex justify-end mt-4 mb-3">
            <Button size="sm" className="gap-1" onClick={() => setContratacaoOpen(true)}>
              <Plus className="h-4 w-4" />Nova Contratação
            </Button>
          </div>
          {loading ? <LoadingSkeleton /> : subscriptions.length === 0 ? <EmptyState text="Nenhuma contratação" /> : (
            <div className="bg-card rounded-lg shadow-card divide-y divide-border">
              {subscriptions.map((s: any) => {
                const planName = plans.find((p: any) => p.id === s.plan_id)?.name || packages.find((p: any) => p.id === s.package_id)?.name || "—";
                const isExpired = s.end_date && isPast(new Date(s.end_date)) && s.status === "ativo";
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
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Planejar dias" onClick={() => setPlanejamentoSub(s)}>
                        <CalendarDays className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Faturar manual" onClick={() => handleFaturar(s)}>
                        <DollarSign className="h-3.5 w-3.5" />
                      </Button>
                      {s.status === "ativo" && (
                        <>
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="Pausar" onClick={() => setActionTarget({ action: "pause", id: s.id })}>
                            <Pause className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="Cancelar" onClick={() => setActionTarget({ action: "cancel", id: s.id })}>
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
          <div className="mt-4">
            {loading ? <LoadingSkeleton /> : usageLogs.length === 0 ? <EmptyState text="Nenhum consumo registrado" /> : (
              <div className="bg-card rounded-lg shadow-card divide-y divide-border">
                <div className="px-5 py-3 flex items-center text-xs font-medium text-muted-foreground">
                  <span className="flex-1">Serviço</span>
                  <span className="w-20 text-center">Qtd</span>
                  <span className="w-24 text-center">Extra?</span>
                  <span className="w-28 text-right">Data</span>
                </div>
                {usageLogs.map((log: any) => (
                  <div key={log.id} className="flex items-center px-5 py-2.5 text-sm hover:bg-muted/30 transition-colors">
                    <span className="flex-1 text-foreground">{log.service_name}</span>
                    <span className="w-20 text-center text-muted-foreground">{log.quantity_used}</span>
                    <span className="w-24 text-center">
                      {log.was_extra ? <Badge variant="destructive" className="text-xs">Extra</Badge> : <Badge className="bg-emerald-500/15 text-emerald-600 border-0 text-xs">Incluído</Badge>}
                    </span>
                    <span className="w-28 text-right text-xs text-muted-foreground">{format(new Date(log.usage_date), "dd/MM/yy HH:mm")}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      {empresaId && <NovoPlanoDialog open={novoPlanoOpen || !!editingPlan} onOpenChange={o => { if (!o) { setNovoPlanoOpen(false); setEditingPlan(null); } }} onSuccess={fetchAll} empresaId={empresaId} editingPlan={editingPlan} />}
      {empresaId && <NovoPacoteDialog open={novoPacoteOpen || !!editingPackage} onOpenChange={o => { if (!o) { setNovoPacoteOpen(false); setEditingPackage(null); } }} onSuccess={fetchAll} empresaId={empresaId} editingPackage={editingPackage} />}
      {empresaId && <ContratacaoDialog open={contratacaoOpen} onOpenChange={setContratacaoOpen} onSuccess={fetchAll} empresaId={empresaId} />}
      {planejamentoSub && <PlanejamentoDiasDialog open={!!planejamentoSub} onOpenChange={o => { if (!o) setPlanejamentoSub(null); }} subscription={planejamentoSub} onSuccess={fetchAll} />}

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
    </div>
  );
}

function LoadingSkeleton() {
  return <div className="space-y-3 mt-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}</div>;
}

function EmptyState({ text }: { text: string }) {
  return <div className="flex items-center justify-center py-12 text-sm text-muted-foreground bg-card rounded-lg shadow-card mt-4">{text}</div>;
}
