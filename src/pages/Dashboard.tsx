import { useEffect, useState } from "react";
import { MetricCard } from "@/components/MetricCard";
import { MessageSquare, PawPrint, DollarSign, Users, LogOut, ClipboardList, Stethoscope, FileText, Pencil, Calculator, Phone, MessageCircle, LogIn, Trash2, FileSignature, Car, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { format, isToday, isAfter, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ManejoDialog } from "@/components/ManejoDialog";
import { ChecklistDialog } from "@/components/ChecklistDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { EditarAgendamentoDialog } from "@/components/EditarAgendamentoDialog";
import { NovoAgendamentoDialog } from "@/components/NovoAgendamentoDialog";
import { OrcamentoDialog } from "@/components/OrcamentoDialog";
import { EstouChegandoMapDialog } from "@/components/EstouChegandoMapDialog";
import { GerarContratoButton } from "@/components/contracts/GerarContratoButton";
import { AgendaCalendar } from "@/components/agenda/AgendaCalendar";
import { FaltaDialog } from "@/components/FaltaDialog";

interface Agendamento {
  id: string;
  data_hora: string;
  tipo_servico: string;
  status: string;
  notas: string | null;
  valor: number | null;
  duracao_min: number | null;
  data_saida_provavel: string | null;
  hora_saida_provavel: string | null;
  baia: string | null;
  forma_pagamento: string | null;
  empresa_id: string;
  cliente_id: string;
  pet_id: string;
  subscription_id: string | null;
  data_entrada: string | null;
  hora_entrada: string | null;
  pet: { id: string; nome: string; raca: string | null; especie: string; foto_url: string | null } | null;
  cliente: { id: string; nome: string; whatsapp: string | null; foto_url: string | null } | null;
}

function statusColor(status: string) {
  switch (status) {
    case "confirmado": return "bg-emerald-500";
    case "pendente": return "bg-amber-500";
    case "cancelado": return "bg-destructive";
    case "concluido": return "bg-primary";
    default: return "bg-muted-foreground";
  }
}

function StatusDot({ status }: { status: string }) {
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${statusColor(status)}`} title={status} />;
}

export default function Dashboard() {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [agendaLoading, setAgendaLoading] = useState(true);
  const [editingAgendamento, setEditingAgendamento] = useState<Agendamento | null>(null);
  const [transportBookings, setTransportBookings] = useState<any[]>([]);

  // Pets na empresa state
  const [manejoOpen, setManejoOpen] = useState<Agendamento | null>(null);
  const [checklistOpen, setChecklistOpen] = useState<Agendamento | null>(null);
  const [fichaOpen, setFichaOpen] = useState<Agendamento | null>(null);
  const [editOpen, setEditOpen] = useState<Agendamento | null>(null);
  const [faltaOpen, setFaltaOpen] = useState<Agendamento | null>(null);

  async function fetchAgendamentos() {
    setAgendaLoading(true);
    const [{ data }, { data: bookings }] = await Promise.all([
      supabase
        .from("agendamentos")
        .select("id, data_hora, tipo_servico, status, notas, valor, duracao_min, data_saida_provavel, hora_saida_provavel, baia, forma_pagamento, empresa_id, cliente_id, pet_id, subscription_id, data_entrada, hora_entrada, pet:pets(id, nome, raca, especie, foto_url), cliente:clientes(id, nome, whatsapp, foto_url)")
        .order("data_hora", { ascending: true }),
      supabase
        .from("transport_bookings")
        .select("*, pet:pets(id, nome, raca, especie, foto_url), cliente:clientes(id, nome, whatsapp, foto_url), transport_type:transport_types(name, color), driver:drivers(name)")
        .order("scheduled_date", { ascending: true }),
    ]);
    if (data) setAgendamentos(data as any);
    setTransportBookings(bookings ?? []);
    setAgendaLoading(false);
  }

  useEffect(() => { fetchAgendamentos(); }, []);

  // Auto-refresh at midnight
  useEffect(() => {
    const scheduleRefresh = () => {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      const ms = midnight.getTime() - now.getTime();
      return setTimeout(() => { fetchAgendamentos(); scheduleRefresh(); }, ms);
    };
    const timerId = scheduleRefresh();
    return () => clearTimeout(timerId);
  }, []);

  async function handleCheckin(item: Agendamento) {
    const now = new Date();
    const horaEntrada = format(now, "HH:mm");
    const { error } = await supabase.from("agendamentos").update({
      status: "na_empresa",
      data_entrada: now.toISOString(),
      hora_entrada: horaEntrada,
    }).eq("id", item.id);
    if (error) { toast.error("Erro ao fazer check-in: " + error.message); return; }
    await supabase.from("historico_servicos" as any).insert({
      empresa_id: item.empresa_id, cliente_id: item.cliente_id, pet_id: item.pet_id,
      tipo_servico: item.tipo_servico, valor: item.valor, data_servico: item.data_hora,
      agendamento_id: item.id, notas: `Check-in realizado em ${format(now, "dd/MM/yyyy")} às ${horaEntrada}`,
    } as any);
    toast.success("Check-in realizado!");
    fetchAgendamentos();
  }

  async function handleDelete(id: string) {
    const agendamento = agendamentos.find(a => a.id === id);
    await supabase.from("historico_servicos").delete().eq("agendamento_id", id);
    await supabase.from("checklist_registros").delete().eq("agendamento_id", id);
    await supabase.from("manejo_registros").delete().eq("agendamento_id", id);
    if (agendamento) {
      const petName = agendamento.pet?.nome || "";
      const searchDesc = `${agendamento.tipo_servico} — ${petName}`;
      await supabase.from("contas_receber").delete().eq("cliente_id", agendamento.cliente_id).eq("descricao", searchDesc);
    }
    const { error } = await supabase.from("agendamentos").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir: " + error.message); return; }
    toast.success("Reserva e faturas relacionadas excluídas com sucesso.");
    fetchAgendamentos();
  }

  async function handleCheckout(item: Agendamento) {
    const now = new Date();
    const horaSaida = format(now, "HH:mm");
    const { error } = await supabase.from("agendamentos").update({
      status: "concluido", data_saida: now.toISOString(), hora_saida: horaSaida,
    }).eq("id", item.id);
    if (error) { toast.error("Erro ao fazer checkout: " + error.message); return; }
    const { data: existing } = await supabase.from("historico_servicos").select("id").eq("agendamento_id", item.id).maybeSingle();
    if (existing) {
      await supabase.from("historico_servicos").update({
        notas: `Check-in: ${item.data_entrada ? format(new Date(item.data_entrada), "dd/MM/yyyy") : "—"} ${item.hora_entrada ?? ""} | Check-out: ${format(now, "dd/MM/yyyy")} ${horaSaida}`,
      } as any).eq("id", existing.id);
    } else {
      await supabase.from("historico_servicos" as any).insert({
        empresa_id: item.empresa_id, cliente_id: item.cliente_id, pet_id: item.pet_id,
        tipo_servico: item.tipo_servico, valor: item.valor, data_servico: item.data_hora,
        agendamento_id: item.id, notas: `Check-out: ${format(now, "dd/MM/yyyy")} ${horaSaida}`,
      } as any);
    }
    toast.success("Checkout realizado!");
    fetchAgendamentos();
  }

  const today = startOfDay(new Date());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const petsNaEmpresa = agendamentos.filter(a => a.status === "na_empresa");
  const isTransportService = (tipo: string) => {
    const t = tipo.toLowerCase();
    return t.includes("taxi") || t.includes("transporte") || t.includes("leva") || t.includes("busca");
  };
  const reservasHoje = agendamentos.filter(a => {
    const d = startOfDay(new Date(a.data_hora));
    return d >= today && d < tomorrow && a.status !== "cancelado" && a.status !== "na_empresa" && a.status !== "concluido" && !isTransportService(a.tipo_servico);
  });
  const agendamentosTransporteHoje = agendamentos.filter(a => {
    const d = startOfDay(new Date(a.data_hora));
    return d >= today && d < tomorrow && a.status !== "cancelado" && isTransportService(a.tipo_servico);
  });
  const transportBookingsHoje = transportBookings.filter(b => {
    const d = startOfDay(new Date(b.scheduled_date + "T00:00:00"));
    return d >= today && d < tomorrow && b.status !== "cancelado";
  });
  const transportHoje = [...transportBookingsHoje, ...agendamentosTransporteHoje.map(a => ({
    id: a.id, scheduled_date: format(new Date(a.data_hora), "yyyy-MM-dd"),
    scheduled_pickup_time: format(new Date(a.data_hora), "HH:mm"), trip_type: a.tipo_servico,
    status: a.status, final_price: a.valor || 0, cliente_nome: a.cliente?.nome || "—",
    pet_nome: a.pet?.nome || "—", driver_nome: null, type_nome: a.tipo_servico, source: "agendamento",
  }))];
  const todayFormatted = format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1400px]">
      <div>
        <h1 className="text-lg font-semibold text-foreground tracking-tight">Dashboard</h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">Visão geral do dia — {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Chats Ativos" value="0" change="—" changeType="neutral" icon={<MessageSquare className="h-4 w-4" strokeWidth={1.5} />} />
        <MetricCard title="Pets na Empresa" value={String(petsNaEmpresa.length)} change="—" changeType="neutral" icon={<PawPrint className="h-4 w-4" strokeWidth={1.5} />} />
        <MetricCard title="Faturamento Hoje" value="R$ 0" change="—" changeType="neutral" icon={<DollarSign className="h-4 w-4" strokeWidth={1.5} />} />
        <MetricCard title="Contas Pendentes" value="0" change="—" changeType="neutral" icon={<Users className="h-4 w-4" strokeWidth={1.5} />} />
      </div>

      {/* Agenda section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              AÇÕES DE HOJE
              <span className="text-sm font-normal text-muted-foreground">Todos</span>
            </h2>
            <p className="text-xs text-muted-foreground capitalize">{todayFormatted}</p>
          </div>
          <div className="flex items-center gap-2">
            <EstouChegandoMapDialog />
            <OrcamentoDialog />
            <NovoAgendamentoDialog onSuccess={fetchAgendamentos} />
          </div>
        </div>

        <Tabs defaultValue="na_empresa" className="w-full">
          <TabsList className="bg-transparent border-b border-border rounded-none p-0 h-auto gap-6">
            <TabsTrigger value="na_empresa" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-2 text-sm">
              Na Empresa ({petsNaEmpresa.length})
            </TabsTrigger>
            <TabsTrigger value="hoje" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-2 text-sm">
              Reservas Hoje ({reservasHoje.length})
            </TabsTrigger>
            <TabsTrigger value="taxipet" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-2 text-sm">
              <Car className="h-3.5 w-3.5 mr-1" /> TaxiPet ({transportHoje.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="na_empresa">
            <NaEmpresaList
              items={petsNaEmpresa}
              loading={agendaLoading}
              onEdit={setEditOpen}
              onFicha={setFichaOpen}
              onManejo={setManejoOpen}
              onChecklist={setChecklistOpen}
              onCheckout={handleCheckout}
            />
          </TabsContent>
          <TabsContent value="hoje">
            <AgendamentoList items={reservasHoje} loading={agendaLoading} showCheckin onCheckin={handleCheckin} onEdit={setEditingAgendamento} onFalta={setFaltaOpen} />
          </TabsContent>
          <TabsContent value="taxipet">
            <TaxiPetTodayList items={transportHoje} loading={agendaLoading} />
          </TabsContent>
        </Tabs>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-card rounded-xl border border-border/60 p-5 shadow-card">
          <h2 className="text-sm font-medium text-foreground mb-4">Faturamento Semanal</h2>
          <div className="flex items-center justify-center h-[220px] text-[13px] text-muted-foreground">Sem dados para exibir</div>
        </div>
        <div className="bg-card rounded-xl border border-border/60 p-5 shadow-card">
          <h2 className="text-sm font-medium text-foreground mb-4">Atividades Recentes</h2>
          <div className="flex items-center justify-center h-[160px] text-[13px] text-muted-foreground">Nenhuma atividade recente</div>
        </div>
      </div>

      {/* Dialogs */}
      {manejoOpen && (
        <ManejoDialog open={!!manejoOpen} onOpenChange={() => setManejoOpen(null)} agendamentoId={manejoOpen.id} petId={manejoOpen.pet?.id ?? ""} petName={manejoOpen.pet?.nome ?? "Pet"} />
      )}
      {checklistOpen && (
        <ChecklistDialog open={!!checklistOpen} onOpenChange={() => setChecklistOpen(null)} agendamentoId={checklistOpen.id} petId={checklistOpen.pet?.id ?? ""} petName={checklistOpen.pet?.nome ?? "Pet"} />
      )}
      <Dialog open={!!fichaOpen} onOpenChange={() => setFichaOpen(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Ficha do Serviço</DialogTitle></DialogHeader>
          {fichaOpen && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-muted-foreground text-xs">Pet</p><p className="font-medium text-foreground">{fichaOpen.pet?.nome ?? "—"}</p></div>
                <div><p className="text-muted-foreground text-xs">Espécie / Raça</p><p className="font-medium text-foreground">{fichaOpen.pet?.especie ?? "—"} {fichaOpen.pet?.raca ? `· ${fichaOpen.pet.raca}` : ""}</p></div>
                <div><p className="text-muted-foreground text-xs">Tutor</p><p className="font-medium text-foreground">{fichaOpen.cliente?.nome ?? "—"}</p></div>
                <div><p className="text-muted-foreground text-xs">WhatsApp</p><p className="font-medium text-foreground">{fichaOpen.cliente?.whatsapp ?? "—"}</p></div>
                <div><p className="text-muted-foreground text-xs">Serviço</p><p className="font-medium text-foreground">{fichaOpen.tipo_servico}</p></div>
                <div><p className="text-muted-foreground text-xs">Valor</p><p className="font-medium text-foreground">{fichaOpen.valor != null ? `R$ ${Number(fichaOpen.valor).toFixed(2)}` : "—"}</p></div>
                <div><p className="text-muted-foreground text-xs">Baia</p><p className="font-medium text-foreground">{fichaOpen.baia ?? "—"}</p></div>
                <div><p className="text-muted-foreground text-xs">Forma de Pagamento</p><p className="font-medium text-foreground">{fichaOpen.forma_pagamento ?? "—"}</p></div>
                <div><p className="text-muted-foreground text-xs">Entrada</p><p className="font-medium text-foreground">{fichaOpen.data_entrada ? format(new Date(fichaOpen.data_entrada), "dd/MM/yyyy") : "—"}{fichaOpen.hora_entrada ? ` às ${fichaOpen.hora_entrada}` : ""}</p></div>
                <div><p className="text-muted-foreground text-xs">Saída Provável</p><p className="font-medium text-foreground">{fichaOpen.data_saida_provavel ? format(new Date(fichaOpen.data_saida_provavel), "dd/MM/yyyy") : "—"}{fichaOpen.hora_saida_provavel ? ` às ${fichaOpen.hora_saida_provavel}` : ""}</p></div>
              </div>
              {fichaOpen.notas && (
                <div><p className="text-muted-foreground text-xs mb-1">Observações</p><p className="text-foreground bg-muted/50 rounded-md p-2 whitespace-pre-wrap">{fichaOpen.notas}</p></div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
      <EditarAgendamentoDialog
        agendamento={editingAgendamento ?? editOpen}
        open={!!editingAgendamento || !!editOpen}
        onOpenChange={(o) => { if (!o) { setEditingAgendamento(null); setEditOpen(null); } }}
        onSuccess={() => { setEditingAgendamento(null); setEditOpen(null); fetchAgendamentos(); }}
      />
      {faltaOpen && (
        <FaltaDialog
          open={!!faltaOpen}
          onOpenChange={(o) => { if (!o) setFaltaOpen(null); }}
          agendamento={faltaOpen}
          empresaId={faltaOpen.empresa_id}
          allowsReplacement={true}
          onSuccess={fetchAgendamentos}
        />
      )}
    </div>
  );
}

/* Agenda sub-components */
function AgendamentoList({ items, loading, showCheckin, onCheckin, onEdit, showDelete, onDelete, onFalta }: { items: Agendamento[]; loading: boolean; showCheckin?: boolean; onCheckin?: (item: Agendamento) => void; onEdit?: (a: Agendamento) => void; showDelete?: boolean; onDelete?: (id: string) => void; onFalta?: (item: Agendamento) => void }) {
  if (loading) return <div className="space-y-3 mt-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}</div>;
  if (items.length === 0) return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <PawPrint className="h-10 w-10 text-muted-foreground/30 mb-3" strokeWidth={1.5} />
      <p className="text-sm text-muted-foreground">Nenhum agendamento encontrado</p>
    </div>
  );
  return (
    <div className="bg-card rounded-xl border border-border/60 shadow-card mt-4 divide-y divide-border/60">
      {items.map(item => <AgendamentoRow key={item.id} item={item} showCheckin={showCheckin} onCheckin={onCheckin} onEdit={onEdit} showDelete={showDelete} onDelete={onDelete} onFalta={onFalta} />)}
    </div>
  );
}

function AgendamentoRow({ item, showCheckin, onCheckin, onEdit, showDelete, onDelete, onFalta }: { item: Agendamento; showCheckin?: boolean; onCheckin?: (item: Agendamento) => void; onEdit?: (a: Agendamento) => void; showDelete?: boolean; onDelete?: (id: string) => void; onFalta?: (item: Agendamento) => void }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const petName = item.pet?.nome ?? "Pet";
  const petBreed = item.pet?.raca;
  const clientName = item.cliente?.nome ?? "—";
  const clientWhatsapp = item.cliente?.whatsapp;
  const dataHora = new Date(item.data_hora);
  const initials = petName.slice(0, 2).toUpperCase();

  return (
    <div className="flex items-center gap-4 px-5 py-3 hover:bg-muted/30 transition-colors">
      <div className="flex items-center gap-1 -space-x-2">
        <Avatar className="h-11 w-11 border-2 border-card z-10">
          {item.pet?.foto_url && <AvatarImage src={item.pet.foto_url} alt={petName} />}
          <AvatarFallback className="bg-accent text-accent-foreground text-xs font-semibold">{initials}</AvatarFallback>
        </Avatar>
        <Avatar className="h-8 w-8 border-2 border-card">
          {item.cliente?.foto_url && <AvatarImage src={item.cliente.foto_url} alt={clientName} />}
          <AvatarFallback className="bg-primary/10 text-primary text-[9px] font-semibold">{clientName.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-foreground truncate">{petName}</span>
          {petBreed && <span className="text-xs text-muted-foreground">({petBreed})</span>}
          <button onClick={() => onEdit?.(item)} className="h-5 w-5 rounded hover:bg-primary/10 flex items-center justify-center text-muted-foreground/50 hover:text-primary transition-colors" title="Editar">
            <Pencil className="h-3 w-3" />
          </button>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
          <span>{item.tipo_servico}</span>
          {item.subscription_id && <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">Plano</Badge>}
          <span>|</span>
          <span className="truncate">{clientName}</span>
          {clientWhatsapp && <MessageCircle className="h-3 w-3 text-emerald-500 shrink-0" />}
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-medium text-foreground tabular-nums">{format(dataHora, "dd/MM/yyyy HH:mm")}</p>
        {item.notas && <p className="text-xs text-muted-foreground truncate max-w-[180px]">{item.notas}</p>}
      </div>
      <div className="flex items-center gap-1 shrink-0 ml-2"><StatusDot status={item.status} /></div>
      <div className="flex items-center gap-1 shrink-0">
        {showCheckin && item.status !== "na_empresa" && item.status !== "concluido" && item.status !== "falta" && !["taxipet", "taxi pet", "transporte", "taxi-pet"].includes(item.tipo_servico.toLowerCase()) && (
          <>
            <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => onCheckin?.(item)}>
              <LogIn className="h-3.5 w-3.5" />Check-in
            </Button>
            <Button variant="outline" size="sm" className="h-7 gap-1 text-xs text-destructive hover:text-destructive" onClick={() => onFalta?.(item)}>
              <XCircle className="h-3.5 w-3.5" />Falta
            </Button>
          </>
        )}
        {clientWhatsapp && (
          <Button variant="ghost" size="icon" className="h-7 w-7" title="WhatsApp" onClick={() => window.open(`https://wa.me/${clientWhatsapp.replace(/\D/g, "")}`, "_blank")}>
            <Phone className="h-3.5 w-3.5 text-emerald-600" />
          </Button>
        )}
        <GerarContratoButton agendamento={item} />
        {showDelete && (
          <>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" title="Excluir" onClick={() => setConfirmOpen(true)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
            <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Excluir reserva?</DialogTitle>
                  <DialogDescription>Esta ação não poderá ser desfeita. A exclusão também irá apagar faturas e registros de serviço relacionados a este agendamento.</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancelar</Button>
                  <Button variant="destructive" onClick={() => { setConfirmOpen(false); onDelete?.(item.id); }}>Excluir</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>
    </div>
  );
}

function NaEmpresaList({ items, loading, onEdit, onFicha, onManejo, onChecklist, onCheckout }: {
  items: Agendamento[]; loading: boolean;
  onEdit: (a: Agendamento) => void; onFicha: (a: Agendamento) => void;
  onManejo: (a: Agendamento) => void; onChecklist: (a: Agendamento) => void;
  onCheckout: (a: Agendamento) => void;
}) {
  if (loading) return <div className="space-y-3 mt-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}</div>;
  if (items.length === 0) return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <PawPrint className="h-10 w-10 text-muted-foreground/30 mb-3" strokeWidth={1.5} />
      <p className="text-sm text-muted-foreground">Nenhum pet na empresa no momento</p>
    </div>
  );
  return (
    <div className="bg-card rounded-xl border border-border/60 shadow-card mt-4 divide-y divide-border/60">
      {items.map(item => {
        const petName = item.pet?.nome ?? "Pet";
        const initials = petName.slice(0, 2).toUpperCase();
        const clientWhatsapp = item.cliente?.whatsapp;
        return (
          <div key={item.id} className="flex items-center gap-4 px-5 py-3 hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-1 -space-x-2">
              <Avatar className="h-11 w-11 border-2 border-card z-10">
                {item.pet?.foto_url && <AvatarImage src={item.pet.foto_url} alt={petName} />}
                <AvatarFallback className="bg-accent text-accent-foreground text-xs font-semibold">{initials}</AvatarFallback>
              </Avatar>
              <Avatar className="h-8 w-8 border-2 border-card">
                {item.cliente?.foto_url && <AvatarImage src={item.cliente.foto_url} alt={item.cliente?.nome || ""} />}
                <AvatarFallback className="bg-primary/10 text-primary text-[9px] font-semibold">{(item.cliente?.nome || "—").slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-foreground truncate">{petName}</span>
                {item.pet?.raca && <span className="text-xs text-muted-foreground">({item.pet.raca})</span>}
                {item.subscription_id && <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">Plano</Badge>}
                <button onClick={() => onEdit(item)} className="h-5 w-5 rounded hover:bg-primary/10 flex items-center justify-center text-muted-foreground/50 hover:text-primary transition-colors" title="Editar">
                  <Pencil className="h-3 w-3" />
                </button>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                <span>{item.tipo_servico}</span>
                <span>|</span>
                <span className="truncate">{item.cliente?.nome ?? "—"}</span>
                {clientWhatsapp && <MessageCircle className="h-3 w-3 text-emerald-500 shrink-0" />}
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-medium text-foreground tabular-nums">{format(new Date(item.data_hora), "dd/MM/yyyy HH:mm")}</p>
              
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {clientWhatsapp && (
                <Button variant="ghost" size="icon" className="h-7 w-7" title="WhatsApp" onClick={() => window.open(`https://wa.me/${clientWhatsapp.replace(/\D/g, "")}`, "_blank")}>
                  <Phone className="h-3.5 w-3.5 text-emerald-600" />
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-7 w-7" title="Ficha do Serviço" onClick={() => onFicha(item)}>
                <FileText className="h-3.5 w-3.5 text-primary" />
              </Button>
              <GerarContratoButton agendamento={item} />
              <Button variant="ghost" size="icon" className="h-7 w-7" title="Manejo" onClick={() => onManejo(item)}>
                <Stethoscope className="h-3.5 w-3.5 text-primary" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" title="Checklist" onClick={() => onChecklist(item)}>
                <ClipboardList className="h-3.5 w-3.5 text-primary" />
              </Button>
              <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => onCheckout(item)}>
                <LogOut className="h-3.5 w-3.5" />
                Checkout
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TaxiPetTodayList({ items, loading }: { items: any[]; loading: boolean }) {
  if (loading) return <div className="space-y-3 mt-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}</div>;
  if (items.length === 0) return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Car className="h-10 w-10 text-muted-foreground/30 mb-3" strokeWidth={1.5} />
      <p className="text-sm text-muted-foreground">Nenhuma corrida TaxiPet para hoje</p>
    </div>
  );

  const statusMap: Record<string, { label: string; color: string }> = {
    agendado: { label: "Agendado", color: "bg-amber-100 text-amber-800" },
    confirmado: { label: "Confirmado", color: "bg-emerald-100 text-emerald-800" },
    em_transito: { label: "Em Trânsito", color: "bg-sky-100 text-sky-800" },
    concluido: { label: "Concluído", color: "bg-primary/10 text-primary" },
    cancelado: { label: "Cancelado", color: "bg-red-100 text-red-800" },
  };

  return (
    <div className="bg-card rounded-xl border border-border/60 shadow-card mt-4 divide-y divide-border/60">
      {items.map(item => {
        const petName = item.pet?.nome ?? "Pet";
        const initials = petName.slice(0, 2).toUpperCase();
        const clientName = item.cliente?.nome ?? "—";
        const clientWhatsapp = item.cliente?.whatsapp;
        const tripLabel = item.trip_type === "ida" ? "Ida" : item.trip_type === "volta" ? "Volta" : "Ida e Volta";
        const st = statusMap[item.status] || { label: item.status, color: "bg-muted text-muted-foreground" };

        return (
          <div key={item.id} className="flex items-center gap-4 px-5 py-3 hover:bg-muted/30 transition-colors">
            <div className="flex items-center -space-x-2">
              <Avatar className="h-11 w-11 border-2 border-card z-10">
                {item.pet?.foto_url && <AvatarImage src={item.pet.foto_url} alt={petName} />}
                <AvatarFallback className="bg-accent text-accent-foreground text-xs font-semibold">{initials}</AvatarFallback>
              </Avatar>
              <Avatar className="h-8 w-8 border-2 border-card">
                {item.cliente?.foto_url && <AvatarImage src={item.cliente.foto_url} alt={clientName} />}
                <AvatarFallback className="bg-primary/10 text-primary text-[9px] font-semibold">{clientName.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-foreground truncate">{petName}</span>
                {item.pet?.raca && <span className="text-xs text-muted-foreground">({item.pet.raca})</span>}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                <Car className="h-3 w-3 shrink-0" />
                <span>{item.transport_type?.name ?? "Transporte"}</span>
                <span>·</span>
                <span>{tripLabel}</span>
                <span>|</span>
                <span className="truncate">{clientName}</span>
                {clientWhatsapp && <MessageCircle className="h-3 w-3 text-emerald-500 shrink-0" />}
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-medium text-foreground tabular-nums">
                {item.scheduled_pickup_time ? item.scheduled_pickup_time.slice(0, 5) : "—"}
              </p>
              {item.driver?.name && <p className="text-xs text-muted-foreground">{item.driver.name}</p>}
            </div>
            <Badge className={`text-[10px] shrink-0 ${st.color}`}>{st.label}</Badge>
            {item.final_price > 0 && (
              <span className="text-sm font-medium text-foreground tabular-nums shrink-0">
                R$ {Number(item.final_price).toFixed(2)}
              </span>
            )}
            {clientWhatsapp && (
              <Button variant="ghost" size="icon" className="h-7 w-7" title="WhatsApp" onClick={() => window.open(`https://wa.me/${clientWhatsapp.replace(/\D/g, "")}`, "_blank")}>
                <Phone className="h-3.5 w-3.5 text-emerald-600" />
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}
