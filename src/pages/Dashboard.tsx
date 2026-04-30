import { useEffect, useState, useMemo } from "react";
import { MetricCard } from "@/components/MetricCard";
import { MessageSquare, PawPrint, Users, LogOut, ClipboardList, Stethoscope, FileText, Pencil, Calculator, Phone, MessageCircle, LogIn, Trash2, FileSignature, Car, XCircle, AlertTriangle, ShowerHead, CheckSquare, TrendingUp, Hotel, GraduationCap, Info, X, UserPlus, HeartPulse, User, Cake, Mail, MapPin, Calendar, DollarSign, Bed, CreditCard, FileSearch, Syringe, AlertCircle } from "lucide-react";

// WhatsApp icon (SVG)
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.002-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
    </svg>
  );
}

function ServicoIcon({ tipo }: { tipo?: string | null }) {
  const t = (tipo || "").toLowerCase();
  if (/hotel|hosped|pernoit|diár|diari/.test(t)) return <Hotel className="h-3.5 w-3.5 text-amber-600 shrink-0" aria-label="Hotel" />;
  if (/escola|daycare|creche|adestr/.test(t)) return <GraduationCap className="h-3.5 w-3.5 text-emerald-600 shrink-0" aria-label="Escola/Daycare" />;
  if (/banho|tosa|estét|estetic/.test(t)) return <ShowerHead className="h-3.5 w-3.5 text-sky-600 shrink-0" aria-label="Banho/Tosa" />;
  return null;
}
import { supabase } from "@/integrations/supabase/client";
import * as Recharts from "recharts";
const AreaChart = Recharts.AreaChart as any;
const Area = Recharts.Area as any;
const XAxis = Recharts.XAxis as any;
const YAxis = Recharts.YAxis as any;
const CartesianGrid = Recharts.CartesianGrid as any;
const Tooltip = Recharts.Tooltip as any;
const ResponsiveContainer = Recharts.ResponsiveContainer as any;
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { format, isToday, isAfter, startOfDay, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ManejoDialog } from "@/components/ManejoDialog";
import { ChecklistDialog } from "@/components/ChecklistDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { EditarAgendamentoDialog } from "@/components/EditarAgendamentoDialog";
import { NovoAgendamentoDialog } from "@/components/NovoAgendamentoDialog";
import { OrcamentoDialog } from "@/components/OrcamentoDialog";
import { EditarClienteDialog } from "@/components/EditarClienteDialog";
import { EditarPetDialog } from "@/components/EditarPetDialog";
import { addToEsteiraIfApplicable } from "@/lib/esteira";
import { EstouChegandoMapDialog } from "@/components/EstouChegandoMapDialog";

import { AgendaCalendar } from "@/components/agenda/AgendaCalendar";
import { FaltaDialog } from "@/components/FaltaDialog";
import { HotelCheckoutDialog, isHotelService } from "@/components/HotelCheckoutDialog";

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
    case "falta": return "bg-destructive";
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
  const [expiringContracts, setExpiringContracts] = useState<any[]>([]);
  const [petsPlanoEscola, setPetsPlanoEscola] = useState(0);
  const [petsPlanoBanho, setPetsPlanoBanho] = useState(0);
  const [capacidadeHotel, setCapacidadeHotel] = useState(0);
  const [massCheckoutOpen, setMassCheckoutOpen] = useState(false);
  const [massCheckoutLoading, setMassCheckoutLoading] = useState(false);
  const [selectedNaEmpresa, setSelectedNaEmpresa] = useState<Set<string>>(new Set());
  const [selectedReservas, setSelectedReservas] = useState<Set<string>>(new Set());
  const [massCheckinLoading, setMassCheckinLoading] = useState(false);
  const [faturamentoData, setFaturamentoData] = useState<{ dia: string; pendente: number; pago: number }[]>([]);
  const [faturamentoTotal, setFaturamentoTotal] = useState({ pendente: 0, pago: 0 });
  const [aniversariantes, setAniversariantes] = useState<{ tipo: "cliente" | "pet"; id: string; nome: string; dia: number; extra?: string }[]>([]);
  const [novosCadastros, setNovosCadastros] = useState<{ id: string; nome: string; pets: string[] }[]>([]);

  async function fetchNovosCadastros() {
    const { data } = await supabase
      .from("clientes")
      .select("id, nome, pets:pets(nome)")
      .eq("origem_cadastro", "publico")
      .eq("notificacao_cadastro_dispensada", false)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(20);
    if (!data) return;
    setNovosCadastros((data as any[]).map((c) => ({
      id: c.id,
      nome: c.nome,
      pets: Array.isArray(c.pets) ? c.pets.map((p: any) => p.nome).filter(Boolean) : [],
    })));
  }

  async function dispensarCadastro(id: string) {
    setNovosCadastros((prev) => prev.filter((c) => c.id !== id));
    await supabase.from("clientes").update({ notificacao_cadastro_dispensada: true } as any).eq("id", id);
  }

  // Pets na empresa state
  const [manejoOpen, setManejoOpen] = useState<Agendamento | null>(null);
  const [checklistOpen, setChecklistOpen] = useState<Agendamento | null>(null);
  const [fichaOpen, setFichaOpen] = useState<Agendamento | null>(null);
  const [editOpen, setEditOpen] = useState<Agendamento | null>(null);
  const [faltaOpen, setFaltaOpen] = useState<Agendamento | null>(null);
  const [hotelCheckoutOpen, setHotelCheckoutOpen] = useState<Agendamento | null>(null);
  const [fichaClienteOpen, setFichaClienteOpen] = useState<any | null>(null);
  const [fichaPetOpen, setFichaPetOpen] = useState<any | null>(null);
  const [fichaDetalhes, setFichaDetalhes] = useState<{ pet: any; cliente: any } | null>(null);
  const [fichaLoading, setFichaLoading] = useState(false);

  // Load complete pet/cliente details when ficha opens
  useEffect(() => {
    if (!fichaOpen) { setFichaDetalhes(null); return; }
    let cancelled = false;
    (async () => {
      setFichaLoading(true);
      const petId = fichaOpen.pet?.id;
      const cliId = fichaOpen.cliente?.id;
      const [{ data: petData }, { data: cliData }] = await Promise.all([
        petId ? supabase.from("pets").select("*").eq("id", petId).maybeSingle() : Promise.resolve({ data: null } as any),
        cliId ? supabase.from("clientes").select("*").eq("id", cliId).maybeSingle() : Promise.resolve({ data: null } as any),
      ]);
      if (!cancelled) {
        setFichaDetalhes({ pet: petData, cliente: cliData });
        setFichaLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [fichaOpen]);

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

  useEffect(() => {
    fetchAgendamentos();
    // Fetch expiring contracts (within 30 days)
    supabase
      .from("customer_pet_subscriptions" as any)
      .select("id, contract_date, contract_end_date, status, cliente:clientes(nome), pet:pets(nome), plan:service_plans(name)")
      .eq("status", "ativo")
      .not("contract_end_date", "is", null)
      .then(({ data }) => {
        if (!data) return;
        const now = new Date();
        const expiring = (data as any[]).filter(sub => {
          const endDate = new Date(sub.contract_end_date);
          const daysLeft = differenceInDays(endDate, now);
          return daysLeft >= 0 && daysLeft <= 30;
        }).map(sub => ({
          ...sub,
          daysLeft: differenceInDays(new Date(sub.contract_end_date), now),
        })).sort((a, b) => a.daysLeft - b.daysLeft);
        setExpiringContracts(expiring);
      });
    // Fetch pets with active escola and banho plans
    supabase
      .from("customer_pet_subscriptions" as any)
      .select("pet_id, plan:service_plans(name), package:service_packages(name)")
      .eq("status", "ativo")
      .then(({ data }) => {
        if (!data) return;
        const escolaKeywords = ["escola", "daycare", "creche", "day_care"];
        const banhoKeywords = ["banho", "tosa", "banho e tosa", "grooming"];
        let escolaSet = new Set<string>();
        let banhoSet = new Set<string>();
        for (const sub of data as any[]) {
          const label = ((sub.plan as any)?.name || (sub.package as any)?.name || "").toLowerCase();
          if (escolaKeywords.some(k => label.includes(k))) {
            if (sub.pet_id) escolaSet.add(sub.pet_id);
          }
          if (banhoKeywords.some(k => label.includes(k))) {
            if (sub.pet_id) banhoSet.add(sub.pet_id);
          }
        }
        setPetsPlanoEscola(escolaSet.size);
        setPetsPlanoBanho(banhoSet.size);
      });
    // Fetch faturamento mensal (contas a receber do mês atual)
    const now = new Date();
    const monthStart = format(new Date(now.getFullYear(), now.getMonth(), 1), "yyyy-MM-dd");
    const monthEnd = format(new Date(now.getFullYear(), now.getMonth() + 1, 0), "yyyy-MM-dd");
    supabase
      .from("contas_receber")
      .select("valor, valor_pago, status, vencimento, data_baixa")
      .gte("vencimento", monthStart)
      .lte("vencimento", monthEnd)
      .then(({ data: faturas }) => {
        if (!faturas) return;
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const dailyMap: Record<string, { pendente: number; pago: number }> = {};
        for (let d = 1; d <= daysInMonth; d++) {
          const key = String(d).padStart(2, "0");
          dailyMap[key] = { pendente: 0, pago: 0 };
        }
        let totalPendente = 0;
        let totalPago = 0;
        for (const f of faturas as any[]) {
          const vencDay = String(new Date(f.vencimento + "T00:00:00").getDate()).padStart(2, "0");
          if (f.status === "pago") {
            const val = Number(f.valor_pago || f.valor || 0);
            const baixaDay = f.data_baixa ? String(new Date(f.data_baixa + "T00:00:00").getDate()).padStart(2, "0") : vencDay;
            if (dailyMap[baixaDay]) dailyMap[baixaDay].pago += val;
            totalPago += val;
          } else {
            const val = Number(f.valor || 0);
            if (dailyMap[vencDay]) dailyMap[vencDay].pendente += val;
            totalPendente += val;
          }
        }
        // Build cumulative data
        let accPendente = 0;
        let accPago = 0;
        const chartData = Object.entries(dailyMap).sort().map(([dia, vals]) => {
          accPendente += vals.pendente;
          accPago += vals.pago;
          return { dia, pendente: accPendente, pago: accPago };
        });
        setFaturamentoData(chartData);
        setFaturamentoTotal({ pendente: totalPendente, pago: totalPago });
      });
    // Fetch aniversariantes do mês (clientes e pets)
    (async () => {
      const mesAtual = new Date().getMonth() + 1; // 1-12
      const mm = String(mesAtual).padStart(2, "0");
      const [{ data: cli }, { data: pets }] = await Promise.all([
        supabase
          .from("clientes")
          .select("id, nome, data_nascimento")
          .not("data_nascimento", "is", null),
        supabase
          .from("pets")
          .select("id, nome, data_nascimento, cliente:clientes(nome)")
          .not("data_nascimento", "is", null),
      ]);
      const lista: { tipo: "cliente" | "pet"; id: string; nome: string; dia: number; extra?: string }[] = [];
      for (const c of (cli ?? []) as any[]) {
        if (!c.data_nascimento) continue;
        const [, m, d] = String(c.data_nascimento).split("-");
        if (m === mm) lista.push({ tipo: "cliente", id: c.id, nome: c.nome, dia: Number(d) });
      }
      for (const p of (pets ?? []) as any[]) {
        if (!p.data_nascimento) continue;
        const [, m, d] = String(p.data_nascimento).split("-");
        if (m === mm) lista.push({ tipo: "pet", id: p.id, nome: p.nome, dia: Number(d), extra: p.cliente?.nome });
      }
      lista.sort((a, b) => a.dia - b.dia);
      setAniversariantes(lista);
    })();
    fetchNovosCadastros();
  }, []);

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

  // Realtime: refetch agendamentos when any change occurs
  useEffect(() => {
    const channel = supabase
      .channel("dashboard-agendamentos-rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "agendamentos" },
        () => { fetchAgendamentos(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Capacidade total de pets do hotel (soma de capacidade_pets das baias ativas)
  useEffect(() => {
    const fetchBaias = async () => {
      const { data } = await supabase
        .from("baias")
        .select("capacidade_pets")
        .eq("ativa", true);
      const total = (data ?? []).reduce(
        (acc, b: any) => acc + Number(b.capacidade_pets || 0),
        0,
      );
      setCapacidadeHotel(total);
    };
    fetchBaias();
    const channel = supabase
      .channel("dashboard-baias-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "baias" }, fetchBaias)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Realtime: refetch novos cadastros públicos
  useEffect(() => {
    const channel = supabase
      .channel("dashboard-novos-cadastros-rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "clientes" },
        () => { fetchNovosCadastros(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
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
    await addToEsteiraIfApplicable({ empresaId: item.empresa_id, agendamentoId: item.id, tipoServico: item.tipo_servico });
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
    // Hotel: if there's a previsão de saída, ask user what to do when antecipated/late
    if (isHotelService(item.tipo_servico) && item.data_saida_provavel) {
      const prev = new Date(item.data_saida_provavel);
      const today = new Date();
      const prevDay = new Date(prev.getFullYear(), prev.getMonth(), prev.getDate());
      const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      if (prevDay.getTime() !== todayDay.getTime()) {
        setHotelCheckoutOpen(item);
        return;
      }
    }
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

  async function handleMassCheckout() {
    const targets = selectedNaEmpresa.size > 0
      ? agendamentos.filter(a => a.status === "na_empresa" && selectedNaEmpresa.has(a.id))
      : agendamentos.filter(a => a.status === "na_empresa");
    if (targets.length === 0) { toast.info("Nenhum pet selecionado para checkout."); return; }
    setMassCheckoutLoading(true);
    const now = new Date();
    const horaSaida = format(now, "HH:mm");
    let successCount = 0;
    for (const item of targets) {
      const { error } = await supabase.from("agendamentos").update({
        status: "concluido", data_saida: now.toISOString(), hora_saida: horaSaida,
      }).eq("id", item.id);
      if (error) { console.error("Erro checkout:", error.message); continue; }
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
      successCount++;
    }
    setMassCheckoutLoading(false);
    setMassCheckoutOpen(false);
    setSelectedNaEmpresa(new Set());
    toast.success(`Check-out em massa concluído: ${successCount} pet(s).`);
    fetchAgendamentos();
  }

  async function handleMassCheckin() {
    const targets = agendamentos.filter(a => selectedReservas.has(a.id));
    if (targets.length === 0) { toast.info("Nenhum pet selecionado para check-in."); return; }
    setMassCheckinLoading(true);
    let successCount = 0;
    for (const item of targets) {
      const now = new Date();
      const horaEntrada = format(now, "HH:mm");
      const { error } = await supabase.from("agendamentos").update({
        status: "na_empresa", data_entrada: now.toISOString(), hora_entrada: horaEntrada,
      }).eq("id", item.id);
      if (error) { console.error("Erro checkin:", error.message); continue; }
      await supabase.from("historico_servicos" as any).insert({
        empresa_id: item.empresa_id, cliente_id: item.cliente_id, pet_id: item.pet_id,
        tipo_servico: item.tipo_servico, valor: item.valor, data_servico: item.data_hora,
        agendamento_id: item.id, notas: `Check-in realizado em ${format(now, "dd/MM/yyyy")} às ${horaEntrada}`,
      } as any);
      successCount++;
    }
    setMassCheckinLoading(false);
    setSelectedReservas(new Set());
    toast.success(`Check-in em massa concluído: ${successCount} pet(s).`);
    fetchAgendamentos();
  }

  const today = startOfDay(new Date());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const sortByPetName = (a: Agendamento, b: Agendamento) => (a.pet?.nome ?? "").localeCompare(b.pet?.nome ?? "");
  const petsNaEmpresa = agendamentos.filter(a => a.status === "na_empresa").sort(sortByPetName);
  const petsHotelNaEmpresa = petsNaEmpresa.filter(a => isHotelService(a.tipo_servico)).length;
  // Hotel na semana: agendamentos de hotel agendados/confirmados nos próximos 7 dias + os já na empresa
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const petsHotelSemana = agendamentos.filter(a => {
    if (!isHotelService(a.tipo_servico)) return false;
    if (a.status === "na_empresa") return true;
    if (["cancelado", "concluido", "falta", "troca"].includes(a.status)) return false;
    const d = startOfDay(new Date(a.data_hora));
    return d >= today && d < weekEnd;
  }).length;
  const ocupacaoHotelPct = capacidadeHotel > 0
    ? Math.min(100, Math.round((petsHotelSemana / capacidadeHotel) * 100))
    : 0;
  const isTransportService = (tipo: string) => {
    const t = tipo.toLowerCase();
    return t.includes("taxi") || t.includes("transporte") || t.includes("leva") || t.includes("busca");
  };
  const reservasHoje = agendamentos.filter(a => {
    const d = startOfDay(new Date(a.data_hora));
    return d >= today && d < tomorrow && a.status !== "cancelado" && a.status !== "na_empresa" && a.status !== "concluido" && a.status !== "falta" && a.status !== "troca" && !isTransportService(a.tipo_servico);
  }).sort(sortByPetName);
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

  // ===== Resumo semanal por categoria (Escola, Hotel, Banho) =====
  const weeklyStats = useMemo(() => {
    // Semana atual (segunda a domingo)
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=dom..6=sab
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = startOfDay(new Date(now));
    weekStart.setDate(weekStart.getDate() + diffToMonday);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const labels = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
    const empty = () => labels.map((l) => ({ label: l, count: 0 }));
    const escola = empty();
    const hotel = empty();
    const banho = empty();

    for (const a of agendamentos) {
      if (a.status === "cancelado" || a.status === "falta" || a.status === "troca") continue;
      const d = new Date(a.data_hora);
      if (d < weekStart || d >= weekEnd) continue;
      const dow = d.getDay();
      const idx = dow === 0 ? 6 : dow - 1; // 0=segunda..6=domingo
      const t = (a.tipo_servico || "").toLowerCase();
      if (/escola|daycare|creche|adestr/.test(t)) escola[idx].count++;
      else if (/hotel|hosped|pernoit|diár|diari/.test(t)) hotel[idx].count++;
      else if (/banho|tosa|estét|estetic/.test(t)) banho[idx].count++;
    }

    const sum = (arr: { count: number }[]) => arr.reduce((acc, x) => acc + x.count, 0);
    return {
      escola: { dias: escola, total: sum(escola) },
      hotel: { dias: hotel, total: sum(hotel) },
      banho: { dias: banho, total: sum(banho) },
    };
  }, [agendamentos]);

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1400px]">
      <div>
        <h1 className="text-lg font-semibold text-foreground tracking-tight">Dashboard</h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">Visão geral do dia — {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}</p>
      </div>

      {novosCadastros.length > 0 && (
        <div className="space-y-2">
          {novosCadastros.map((c) => (
            <div
              key={c.id}
              className="flex items-start gap-3 rounded-md border border-sky-200 bg-sky-50 dark:border-sky-900/50 dark:bg-sky-950/30 px-4 py-2.5"
            >
              <UserPlus className="h-4 w-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
              <div className="flex-1 text-sm text-sky-900 dark:text-sky-100">
                <span className="font-semibold">Novo Cliente:</span>{" "}
                <span className="font-medium">{c.nome}</span> efetuou o cadastro online
                {c.pets.length > 0 && (
                  <>
                    {" "}— Pet{c.pets.length > 1 ? "s" : ""}:{" "}
                    <span className="font-medium">{c.pets.join(", ")}</span>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={() => dispensarCadastro(c.id)}
                className="text-sky-700/70 hover:text-sky-900 dark:text-sky-300/70 dark:hover:text-sky-100 shrink-0"
                aria-label="Dispensar notificação"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          filled
          title="Ocupação do Hotel"
          value={`${ocupacaoHotelPct}%`}
          change={capacidadeHotel > 0
            ? `${petsHotelSemana}/${capacidadeHotel} pets · semana (${petsHotelNaEmpresa} agora)`
            : "Sem baias cadastradas"}
          changeType="neutral"
          icon={<Hotel className="h-4 w-4" strokeWidth={1.5} />}
          accent="blue"
        />
        <MetricCard filled title="Pets na Empresa" value={String(petsNaEmpresa.length)} change="—" changeType="neutral" icon={<PawPrint className="h-4 w-4" strokeWidth={1.5} />} accent="emerald" />
        <MetricCard filled title="Pets Plano Escola" value={String(petsPlanoEscola)} change="—" changeType="neutral" icon={<GraduationCap className="h-4 w-4" strokeWidth={1.5} />} accent="violet" />
        <MetricCard filled title="Pets Plano Banho" value={String(petsPlanoBanho)} change="—" changeType="neutral" icon={<ShowerHead className="h-4 w-4" strokeWidth={1.5} />} accent="amber" />
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
            {petsNaEmpresa.length > 0 && (
              <div className="flex items-center justify-between mt-2 mb-1">
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                  <Checkbox
                    checked={selectedNaEmpresa.size === petsNaEmpresa.length && petsNaEmpresa.length > 0}
                    onCheckedChange={(checked) => {
                      setSelectedNaEmpresa(checked ? new Set(petsNaEmpresa.map(p => p.id)) : new Set());
                    }}
                  />
                  Selecionar todos
                </label>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setMassCheckoutOpen(true)} disabled={selectedNaEmpresa.size === 0}>
                  <LogOut className="h-3.5 w-3.5" /> Check-out Selecionados ({selectedNaEmpresa.size})
                </Button>
              </div>
            )}
            <NaEmpresaList
              items={petsNaEmpresa}
              loading={agendaLoading}
              onEdit={setEditOpen}
              onFicha={setFichaOpen}
              onManejo={setManejoOpen}
              onChecklist={setChecklistOpen}
              onCheckout={handleCheckout}
              onFichaCliente={(c) => setFichaClienteOpen(c)}
              onFichaPet={(p) => setFichaPetOpen(p)}
              selectedIds={selectedNaEmpresa}
              onToggleSelect={(id) => {
                setSelectedNaEmpresa(prev => {
                  const next = new Set(prev);
                  next.has(id) ? next.delete(id) : next.add(id);
                  return next;
                });
              }}
            />
          </TabsContent>
          <TabsContent value="hoje">
            {reservasHoje.length > 0 && (
              <div className="flex items-center justify-between mt-2 mb-1">
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                  <Checkbox
                    checked={selectedReservas.size === reservasHoje.length && reservasHoje.length > 0}
                    onCheckedChange={(checked) => {
                      setSelectedReservas(checked ? new Set(reservasHoje.map(r => r.id)) : new Set());
                    }}
                  />
                  Selecionar todos
                </label>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleMassCheckin} disabled={selectedReservas.size === 0 || massCheckinLoading}>
                  <LogIn className="h-3.5 w-3.5" /> {massCheckinLoading ? "Processando..." : `Check-in Selecionados (${selectedReservas.size})`}
                </Button>
              </div>
            )}
            <AgendamentoList
              items={reservasHoje}
              loading={agendaLoading}
              showCheckin
              onCheckin={handleCheckin}
              onEdit={setEditingAgendamento}
              onFalta={setFaltaOpen}
              selectedIds={selectedReservas}
              onToggleSelect={(id) => {
                setSelectedReservas(prev => {
                  const next = new Set(prev);
                  next.has(id) ? next.delete(id) : next.add(id);
                  return next;
                });
              }}
            />
          </TabsContent>
          <TabsContent value="taxipet">
            <TaxiPetTodayList items={transportHoje} loading={agendaLoading} />
          </TabsContent>
        </Tabs>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl border border-border/60 p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-medium text-foreground">Faturamento Mensal</h2>
              <p className="text-xs text-muted-foreground capitalize">{format(new Date(), "MMMM yyyy", { locale: ptBR })}</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span className="text-muted-foreground">Recebido</span>
                <span className="font-semibold text-foreground">R$ {faturamentoTotal.pago.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
                <span className="text-muted-foreground">Pendente</span>
                <span className="font-semibold text-foreground">R$ {faturamentoTotal.pendente.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
          {faturamentoData.length > 0 ? (
            <FaturamentoChart data={faturamentoData} />
          ) : (
            <div className="flex items-center justify-center h-[220px] text-[13px] text-muted-foreground">Sem dados para exibir</div>
          )}
        </div>
        <div className="bg-card rounded-xl border border-border/60 p-5 shadow-card">
          <h2 className="text-sm font-medium text-foreground mb-4">Atividades Recentes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Contratos a vencer</h3>
              {expiringContracts.length > 0 ? (
                <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                  {expiringContracts.map((c: any) => (
                    <div key={c.id} className="flex items-start gap-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                      <div className="text-xs leading-tight">
                        <p className="font-medium text-foreground">Vence em {c.daysLeft} dia{c.daysLeft !== 1 ? "s" : ""}</p>
                        <p className="text-muted-foreground truncate">{c.cliente?.nome} — {c.pet?.nome}</p>
                        <p className="text-muted-foreground">{format(new Date(c.contract_end_date), "dd/MM/yyyy")}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-[120px] text-[13px] text-muted-foreground">Nenhum contrato a vencer</div>
              )}
            </div>
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                🎂 Aniversariantes do mês
              </h3>
              {aniversariantes.length > 0 ? (
                <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                  {aniversariantes.map((a) => (
                    <div key={`${a.tipo}-${a.id}`} className="flex items-start gap-2 p-2 rounded-lg bg-pink-50 dark:bg-pink-950/30 border border-pink-200 dark:border-pink-800">
                      <span className="text-base leading-none mt-0.5 shrink-0">{a.tipo === "pet" ? "🐾" : "🎉"}</span>
                      <div className="text-xs leading-tight min-w-0 flex-1">
                        <p className="font-medium text-foreground truncate">
                          {a.nome} <span className="text-muted-foreground font-normal">· dia {String(a.dia).padStart(2, "0")}</span>
                        </p>
                        <p className="text-muted-foreground truncate">
                          {a.tipo === "pet" ? `Pet${a.extra ? ` • Tutor: ${a.extra}` : ""}` : "Cliente"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-[120px] text-[13px] text-muted-foreground">Nenhum aniversariante este mês</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Resumo semanal — 1 card por dia, com totais por serviço (tempo real) */}
      <WeeklyDaysSummary weeklyStats={weeklyStats} />

      {/* Mass checkout confirmation */}
      <Dialog open={massCheckoutOpen} onOpenChange={setMassCheckoutOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Check-out em Massa</DialogTitle>
            <DialogDescription>
              Deseja realizar o check-out de <strong>{selectedNaEmpresa.size}</strong> pet(s) selecionado(s)?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMassCheckoutOpen(false)} disabled={massCheckoutLoading}>Cancelar</Button>
            <Button onClick={handleMassCheckout} disabled={massCheckoutLoading}>
              {massCheckoutLoading ? "Processando..." : "Confirmar Check-out"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
      <HotelCheckoutDialog
        agendamento={hotelCheckoutOpen}
        open={!!hotelCheckoutOpen}
        onOpenChange={(o) => { if (!o) setHotelCheckoutOpen(null); }}
        onCompleted={() => { setHotelCheckoutOpen(null); fetchAgendamentos(); }}
      />
    </div>
  );
}

/* Agenda sub-components */
function AgendamentoList({ items, loading, showCheckin, onCheckin, onEdit, showDelete, onDelete, onFalta, selectedIds, onToggleSelect }: { items: Agendamento[]; loading: boolean; showCheckin?: boolean; onCheckin?: (item: Agendamento) => void; onEdit?: (a: Agendamento) => void; showDelete?: boolean; onDelete?: (id: string) => void; onFalta?: (item: Agendamento) => void; selectedIds?: Set<string>; onToggleSelect?: (id: string) => void }) {
  if (loading) return <div className="space-y-3 mt-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}</div>;
  if (items.length === 0) return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <PawPrint className="h-10 w-10 text-muted-foreground/30 mb-3" strokeWidth={1.5} />
      <p className="text-sm text-muted-foreground">Nenhum agendamento encontrado</p>
    </div>
  );
  return (
    <div className="bg-card rounded-xl border border-border/60 shadow-card mt-4 divide-y divide-border/60">
      {items.map(item => <AgendamentoRow key={item.id} item={item} showCheckin={showCheckin} onCheckin={onCheckin} onEdit={onEdit} showDelete={showDelete} onDelete={onDelete} onFalta={onFalta} selected={selectedIds?.has(item.id)} onToggleSelect={onToggleSelect ? () => onToggleSelect(item.id) : undefined} />)}
    </div>
  );
}

function AgendamentoRow({ item, showCheckin, onCheckin, onEdit, showDelete, onDelete, onFalta, selected, onToggleSelect }: { item: Agendamento; showCheckin?: boolean; onCheckin?: (item: Agendamento) => void; onEdit?: (a: Agendamento) => void; showDelete?: boolean; onDelete?: (id: string) => void; onFalta?: (item: Agendamento) => void; selected?: boolean; onToggleSelect?: () => void }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const petName = item.pet?.nome ?? "Pet";
  const petBreed = item.pet?.raca;
  const clientName = item.cliente?.nome ?? "—";
  const clientWhatsapp = item.cliente?.whatsapp;
  const dataHora = new Date(item.data_hora);
  const initials = petName.slice(0, 2).toUpperCase();

  return (
    <div className="flex items-center gap-4 px-5 py-3 hover:bg-muted/30 transition-colors">
      {onToggleSelect && (
        <Checkbox checked={!!selected} onCheckedChange={onToggleSelect} className="shrink-0" />
      )}
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
          <ServicoIcon tipo={item.tipo_servico} />
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

function NaEmpresaList({ items, loading, onEdit, onFicha, onManejo, onChecklist, onCheckout, selectedIds, onToggleSelect }: {
  items: Agendamento[]; loading: boolean;
  onEdit: (a: Agendamento) => void; onFicha: (a: Agendamento) => void;
  onManejo: (a: Agendamento) => void; onChecklist: (a: Agendamento) => void;
  onCheckout: (a: Agendamento) => void;
  selectedIds?: Set<string>; onToggleSelect?: (id: string) => void;
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
            {onToggleSelect && (
              <Checkbox checked={selectedIds?.has(item.id) ?? false} onCheckedChange={() => onToggleSelect(item.id)} className="shrink-0" />
            )}
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
                <ServicoIcon tipo={item.tipo_servico} />
                <span className="font-semibold text-sm text-foreground truncate">{petName}</span>
                {(() => {
                  const tipo = (item.tipo_servico || "").toLowerCase();
                  const jaBanho = /banho|tosa|estét|estetic/.test(tipo);
                  const temBanhoExtra = !jaBanho && /banho|tosa/i.test(item.notas || "");
                  return temBanhoExtra ? (
                    <span title="Inclui banho como serviço adicional" className="inline-flex items-center gap-0.5 rounded-full bg-sky-100 dark:bg-sky-900/40 px-1.5 py-0.5">
                      <ShowerHead className="h-3 w-3 text-sky-600 dark:text-sky-300" />
                      <span className="text-[9px] font-semibold text-sky-700 dark:text-sky-200">+Banho</span>
                    </span>
                  ) : null;
                })()}
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
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Saída prevista</p>
              <p className="text-sm font-medium text-foreground tabular-nums">
                {(() => {
                  if (!item.data_saida_provavel) return "—";
                  try {
                    const dateStr = item.data_saida_provavel.includes("T")
                      ? item.data_saida_provavel
                      : item.data_saida_provavel + "T00:00:00";
                    const d = new Date(dateStr);
                    if (isNaN(d.getTime())) return "—";
                    const hora = item.hora_saida_provavel ? ` ${item.hora_saida_provavel.slice(0, 5)}` : "";
                    return `${format(d, "dd/MM/yyyy")}${hora}`;
                  } catch {
                    return "—";
                  }
                })()}
              </p>
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

function FaturamentoChart({ data }: { data: { dia: string; pendente: number; pago: number }[] }) {

  const formatCurrency = (value: number) => {
    if (value >= 1000) return `R$${(value / 1000).toFixed(1)}k`;
    return `R$${value.toFixed(0)}`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-popover border border-border rounded-lg shadow-lg p-3 text-xs">
        <p className="font-medium text-foreground mb-1.5">Dia {label}</p>
        {payload.map((entry: any, i: number) => (
          <div key={i} className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-semibold text-foreground">
              R$ {Number(entry.value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="gradPago" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradPendente" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="dia" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} interval={4} />
          <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} tickFormatter={formatCurrency} />
          <Tooltip content={<CustomTooltip />} />
          <Area type="monotone" dataKey="pago" name="Recebido" stroke="#10b981" strokeWidth={2} fill="url(#gradPago)" />
          <Area type="monotone" dataKey="pendente" name="Pendente" stroke="#0ea5e9" strokeWidth={2} fill="url(#gradPendente)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/* Resumo semanal — um card por dia da semana, com totais por serviço */
function WeeklyDaysSummary({
  weeklyStats,
}: {
  weeklyStats: {
    escola: { dias: { label: string; count: number }[]; total: number };
    hotel: { dias: { label: string; count: number }[]; total: number };
    banho: { dias: { label: string; count: number }[]; total: number };
  };
}) {
  const labels = weeklyStats.escola.dias.map((d) => d.label);
  const todayIdx = (() => {
    const dow = new Date().getDay();
    return dow === 0 ? 6 : dow - 1;
  })();

  return (
    <div className="bg-card rounded-xl border border-border/60 p-4 shadow-card">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Resumo da Semana</h2>
        <span className="text-xs text-muted-foreground">atualizado em tempo real</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {labels.map((label, idx) => {
          const escola = weeklyStats.escola.dias[idx].count;
          const hotel = weeklyStats.hotel.dias[idx].count;
          const banho = weeklyStats.banho.dias[idx].count;
          const total = escola + hotel + banho;
          const isToday = idx === todayIdx;
          return (
            <div
              key={label}
              className={`rounded-lg border p-3 bg-background/50 ${
                isToday ? "border-primary/60 ring-1 ring-primary/30" : "border-border/60"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-semibold uppercase tracking-wide ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                  {label}
                </span>
                <span className="text-xs font-semibold text-foreground">{total}</span>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[12px]">
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <GraduationCap className="h-3.5 w-3.5 text-emerald-600" strokeWidth={1.75} />
                    Escola
                  </span>
                  <span className="font-semibold text-foreground tabular-nums">{escola}</span>
                </div>
                <div className="flex items-center justify-between text-[12px]">
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <Hotel className="h-3.5 w-3.5 text-amber-600" strokeWidth={1.75} />
                    Hotel
                  </span>
                  <span className="font-semibold text-foreground tabular-nums">{hotel}</span>
                </div>
                <div className="flex items-center justify-between text-[12px]">
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <ShowerHead className="h-3.5 w-3.5 text-sky-600" strokeWidth={1.75} />
                    Banho
                  </span>
                  <span className="font-semibold text-foreground tabular-nums">{banho}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
