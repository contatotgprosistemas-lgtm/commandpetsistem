import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { addDays, format, getDay, isBefore, startOfDay, lastDayOfMonth, startOfMonth, addMonths } from "date-fns";
import { Check, AlertTriangle } from "lucide-react";
import { cn, roundUpMoney } from "@/lib/utils";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useBanhoAvailability } from "@/hooks/useBanhoAvailability";
import { BanhoTimeSlotPicker } from "./BanhoTimeSlotPicker";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSuccess: () => void;
  empresaId: string;
}

const DIAS_SEMANA = [
  { value: 1, label: "Segunda" },
  { value: 2, label: "Terça" },
  { value: 3, label: "Quarta" },
  { value: 4, label: "Quinta" },
  { value: 5, label: "Sexta" },
  { value: 6, label: "Sábado" },
  { value: 0, label: "Domingo" },
];

function isTaxiPetService(name: string) {
  const lower = (name || "").toLowerCase();
  return lower.includes("taxi") || lower.includes("transport") || lower.includes("leva");
}

function isBanhoService(name: string) {
  const lower = (name || "").toLowerCase();
  return lower.includes("banho") || lower.includes("tosa");
}

function countWeekdaysInRange(start: Date, end: Date, days: number[]): number {
  let count = 0;
  let current = new Date(start);
  while (!isBefore(end, current)) {
    if (days.includes(getDay(current))) count++;
    current = addDays(current, 1);
  }
  return count;
}

function countWeekdaysInMonth(year: number, month: number, days: number[]): number {
  const start = new Date(year, month, 1);
  const end = lastDayOfMonth(start);
  return countWeekdaysInRange(start, end, days);
}

/** ISO week number (1-53). Quinzenal cadence is based on parity of this value. */
function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function getWeekParity(date: Date): "par" | "impar" {
  return getISOWeek(date) % 2 === 0 ? "par" : "impar";
}

/**
 * Generate biweekly dates within the month: every occurrence of plannedDays
 * whose ISO-week parity matches `parity`, starting on or after startDate.
 */
function generateBiweeklyDatesByParity(
  startDate: Date,
  endOfMonth: Date,
  plannedDays: number[],
  parity: "par" | "impar"
): Date[] {
  const dates: Date[] = [];
  if (plannedDays.length === 0) return dates;
  let current = new Date(startDate);
  while (!isBefore(endOfMonth, current)) {
    if (plannedDays.includes(getDay(current)) && getWeekParity(current) === parity) {
      dates.push(new Date(current));
    }
    current = addDays(current, 1);
  }
  return dates;
}

export function ContratacaoDialog({ open, onOpenChange, onSuccess, empresaId }: Props) {
  const [saving, setSaving] = useState(false);
  const [clientes, setClientes] = useState<any[]>([]);
  const [pets, setPets] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);

  const [clienteId, setClienteId] = useState("");
  const [selectedPetIds, setSelectedPetIds] = useState<string[]>([]);
  const [planType, setPlanType] = useState<"plan" | "package">("plan");
  const [selectedId, setSelectedId] = useState("");
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [contractDate, setContractDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [discount, setDiscount] = useState("0");
  const [autoRenew, setAutoRenew] = useState(false);
  const [notes, setNotes] = useState("");
  const [plannedDays, setPlannedDays] = useState<number[]>([]);
  const [horaBuscar, setHoraBuscar] = useState("08:00");
  const [horaLevar, setHoraLevar] = useState("17:00");
  const [transportMode, setTransportMode] = useState<"ambos" | "buscar" | "levar">("ambos");
  const [horaBanhoPorPet, setHoraBanhoPorPet] = useState<Record<string, string>>({});
  const getHoraBanho = (petId?: string) => {
    if (selectedPetIds.length <= 1) return horaBanhoPorPet["_default"] || "09:00";
    return petId ? (horaBanhoPorPet[petId] || "09:00") : "09:00";
  };
  const setHoraBanhoForPet = (petId: string, time: string) => {
    setHoraBanhoPorPet(prev => ({ ...prev, [petId]: time }));
  };
  const setHoraBanhoDefault = (time: string) => {
    setHoraBanhoPorPet(prev => ({ ...prev, _default: time }));
  };
  const [frequency, setFrequency] = useState<"semanal" | "quinzenal">("semanal");
  const currentWeekNumber = getISOWeek(new Date());
  const currentWeekParity: "par" | "impar" = currentWeekNumber % 2 === 0 ? "par" : "impar";
  const [weekParity, setWeekParity] = useState<"par" | "impar">(currentWeekParity);
  const [banhistas, setBanhistas] = useState<any[]>([]);
  const [selectedBanhistaId, setSelectedBanhistaId] = useState("");

  const {
    loading: availLoading,
    availabilityMap,
    checkPlannedDaysAvailability,
    getConflictingDates,
    findBestAvailableTime,
    isTimeAvailableOnAllDates,
  } = useBanhoAvailability(empresaId);

  useEffect(() => {
    if (!open) return;
    supabase.from("clientes").select("id, nome, whatsapp, telefone, dia_vencimento_fatura").is("deleted_at", null).order("nome").then(({ data }) => data && setClientes(data));
    supabase.from("service_plans" as any).select("*").eq("status", "ativo").then(({ data }) => data && setPlans(data));
    supabase.from("service_packages" as any).select("*").eq("status", "ativo").then(({ data }) => data && setPackages(data));
    supabase.from("profiles").select("id, nome, cargo").eq("empresa_id", empresaId).eq("cargo", "banhista").then(({ data }) => data && setBanhistas(data));
  }, [open]);

  useEffect(() => {
    if (!clienteId) { setPets([]); return; }
    supabase.from("pets").select("id, nome").eq("cliente_id", clienteId).then(({ data }) => data && setPets(data));
  }, [clienteId]);

  const selectedPlan = planType === "plan" ? plans.find((p: any) => p.id === selectedId) : packages.find((p: any) => p.id === selectedId);
  const priceContracted = selectedPlan ? Number(selectedPlan.price) : 0;
  const showHorarios = selectedPlan ? isTaxiPetService(selectedPlan.name) : false;
  const showHorarioBanho = selectedPlan ? isBanhoService(selectedPlan.name) : false;
  const showFrequency = planType === "package" && showHorarioBanho;
  const isQuinzenal = showFrequency && frequency === "quinzenal";
  const contractDurationMonths = selectedPlan?.min_loyalty_months ? Number(selectedPlan.min_loyalty_months) : null;

  // Calculate end date as last day of the month of startDate
  const startDateObj = new Date(startDate + "T00:00:00");
  const endOfMonth = lastDayOfMonth(startDateObj);
  const endDate = format(endOfMonth, "yyyy-MM-dd");

  // Biweekly dates calculation
  const biweeklyDates = useMemo(() => {
    if (!isQuinzenal) return [];
    return generateBiweeklyDatesByParity(startDateObj, endOfMonth, plannedDays, weekParity);
  }, [isQuinzenal, startDate, plannedDays, weekParity]);

  const biweeklyCount = isQuinzenal ? biweeklyDates.length : 0;
  const hasThreeOccurrences = isQuinzenal && biweeklyDates.length >= 3;

  // Price per session for biweekly (base price = 2 sessions)
  const pricePerSession = roundUpMoney(priceContracted / 2);

  // Calculate proportional price
  const isFirstDay = startDateObj.getDate() === 1;
  let proportionalPrice = priceContracted;
  let proportionalInfo = "";

  if (isQuinzenal) {
    if (hasThreeOccurrences) {
      proportionalPrice = roundUpMoney(priceContracted + pricePerSession * (biweeklyDates.length - 2));
      proportionalInfo = `${biweeklyDates.length} ocorrências na semana ${weekParity === "par" ? "par" : "ímpar"}: R$ ${priceContracted.toFixed(2)} + R$ ${(pricePerSession * (biweeklyDates.length - 2)).toFixed(2)} extra = R$ ${proportionalPrice.toFixed(2)}`;
    } else {
      proportionalInfo = `${biweeklyDates.length} banho(s) quinzenal(is) na semana ${weekParity === "par" ? "par" : "ímpar"}`;
    }
  } else if (!isFirstDay && plannedDays.length > 0) {
    const totalDaysInMonth = countWeekdaysInMonth(startDateObj.getFullYear(), startDateObj.getMonth(), plannedDays);
    const remainingDays = countWeekdaysInRange(startDateObj, endOfMonth, plannedDays);
    if (totalDaysInMonth > 0) {
      proportionalPrice = roundUpMoney((priceContracted / totalDaysInMonth) * remainingDays);
      proportionalInfo = `Proporcional: ${remainingDays}/${totalDaysInMonth} dias → R$ ${proportionalPrice.toFixed(2)}`;
    }
  }

  const finalPrice = roundUpMoney(Math.max(0, proportionalPrice - Number(discount || 0)));

  function toggleDay(day: number) {
    if (isQuinzenal) {
      // For biweekly, only allow one day
      setPlannedDays(prev => prev.includes(day) ? [] : [day]);
    } else {
      setPlannedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
    }
  }

  // Reset frequency when plan type or selected plan changes
  useEffect(() => {
    setFrequency("semanal");
    setWeekParity(currentWeekParity);
  }, [planType, selectedId]);

  // Check availability when planned days, date, or banho visibility changes
  const relevantDates = useMemo(() => {
    if (!showHorarioBanho || plannedDays.length === 0) return [];
    const dates: string[] = [];
    const today = startOfDay(new Date());
    let current = isBefore(startDateObj, today) ? today : startDateObj;
    while (!isBefore(endOfMonth, current)) {
      if (plannedDays.includes(getDay(current))) {
        dates.push(format(current, "yyyy-MM-dd"));
      }
      current = addDays(current, 1);
    }
    return dates;
  }, [showHorarioBanho, plannedDays, startDate]);

  useEffect(() => {
    if (showHorarioBanho && plannedDays.length > 0 && empresaId) {
      checkPlannedDaysAvailability(startDateObj, endOfMonth, plannedDays);
    }
  }, [showHorarioBanho, plannedDays, startDate, empresaId]);

  // Per-pet conflict checking
  const banhoConflictsPerPet = useMemo(() => {
    if (!showHorarioBanho || relevantDates.length === 0) return {} as Record<string, string[]>;
    const result: Record<string, string[]> = {};
    const petIds = selectedPetIds.length > 1 ? selectedPetIds : ["_default"];
    for (const pid of petIds) {
      const time = getHoraBanho(pid === "_default" ? undefined : pid);
      result[pid] = getConflictingDates(time, relevantDates);
    }
    return result;
  }, [horaBanhoPorPet, availabilityMap, relevantDates, showHorarioBanho, selectedPetIds]);

  const banhoSuggestionsPerPet = useMemo(() => {
    const result: Record<string, string[]> = {};
    const petIds = selectedPetIds.length > 1 ? selectedPetIds : ["_default"];
    for (const pid of petIds) {
      const conflicts = banhoConflictsPerPet[pid] || [];
      if (conflicts.length === 0) { result[pid] = []; continue; }
      const time = getHoraBanho(pid === "_default" ? undefined : pid);
      const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
      const preferred = toMin(time);
      const allSlots = Object.keys(availabilityMap).length > 0
        ? (availabilityMap[Object.keys(availabilityMap)[0]] || []).map(s => s.time)
        : [];
      const sorted = [...allSlots].sort((a, b) =>
        Math.abs(toMin(a) - preferred) - Math.abs(toMin(b) - preferred)
      );
      const suggestions: string[] = [];
      for (const t of sorted) {
        if (t === time) continue;
        if (isTimeAvailableOnAllDates(t, relevantDates)) {
          suggestions.push(t);
          if (suggestions.length >= 3) break;
        }
      }
      result[pid] = suggestions;
    }
    return result;
  }, [banhoConflictsPerPet, horaBanhoPorPet, availabilityMap, relevantDates]);

  async function handleSave() {
    if (!clienteId || !selectedId) { toast.error("Selecione cliente e plano/pacote"); return; }
    if (selectedPetIds.length === 0) { toast.error("Selecione ao menos um pet"); return; }
    if (isQuinzenal && plannedDays.length !== 1) { toast.error("Selecione exatamente 1 dia da semana para quinzenal"); return; }
    if (showHorarioBanho) {
      const hasAnyConflict = Object.values(banhoConflictsPerPet).some(c => c.length > 0);
      if (hasAnyConflict) {
        toast.error("Um ou mais horários selecionados possuem conflito. Escolha horários disponíveis.");
        return;
      }
    }
    setSaving(true);

    const nextMonthStart = format(startOfMonth(addMonths(startDateObj, 1)), "yyyy-MM-dd");

    const contractDateObj = new Date(contractDate + "T00:00:00");
    const contractEndDate = contractDurationMonths
      ? format(addMonths(contractDateObj, contractDurationMonths), "yyyy-MM-dd")
      : null;

    let totalAgendamentos = 0;

    for (const petId of selectedPetIds) {
      const payload: any = {
        empresa_id: empresaId, cliente_id: clienteId, pet_id: petId,
        start_date: startDate, end_date: endDate,
        contract_date: planType === "plan" ? contractDate : null,
        contract_end_date: planType === "plan" ? contractEndDate : null,
        next_renewal_date: autoRenew ? nextMonthStart : null,
        price_contracted: priceContracted, discount_amount: Number(discount || 0),
        final_price: finalPrice, auto_renew: autoRenew,
        notes, status: "ativo", planned_days: plannedDays,
        frequency: isQuinzenal ? "quinzenal" : "semanal",
        extra_session_policy: null,
      };
      if (planType === "plan") payload.plan_id = selectedId;
      else payload.package_id = selectedId;

      const { data: subData, error } = await supabase.from("customer_pet_subscriptions" as any).insert(payload).select("id").single();
      if (error || !subData) { toast.error("Erro ao contratar pet"); continue; }

      const subscriptionId = (subData as any).id;
      const petNome = pets.find(p => p.id === petId)?.nome || "";

      // Calculate vencimento based on client's dia_vencimento_fatura
      const clienteData = clientes.find(c => c.id === clienteId);
      const diaVenc = clienteData?.dia_vencimento_fatura || 10;
      const startObj = new Date(startDate + "T00:00:00");
      let vencMonth = startObj.getMonth();
      let vencYear = startObj.getFullYear();
      if (startObj.getDate() > diaVenc) {
        vencMonth += 1;
        if (vencMonth > 11) { vencMonth = 0; vencYear += 1; }
      }
      const vencimentoDate = new Date(vencYear, vencMonth, diaVenc);
      const vencimentoStr = format(vencimentoDate, "yyyy-MM-dd");

      const descFreq = isQuinzenal ? " (quinzenal)" : "";
      const descProp = !isFirstDay && !isQuinzenal ? " (proporcional)" : "";
      const descExtra = isQuinzenal && hasThreeOccurrences ? ` (+${biweeklyDates.length - 2} sessão(ões) extra)` : "";
      const descricaoFatura = `${planType === "plan" ? "Plano" : "Pacote"}: ${selectedPlan?.name} - ${petNome}${descFreq}${descProp}${descExtra}`;

      // Tenta agrupar com fatura pendente já existente do mesmo cliente/vencimento (Planos e Pacotes)
      const { data: faturaExistente } = await supabase
        .from("contas_receber")
        .select("id, valor, descricao")
        .eq("cliente_id", clienteId)
        .eq("vencimento", vencimentoStr)
        .eq("status", "pendente")
        .eq("categoria", "Planos e Pacotes")
        .limit(1)
        .maybeSingle();

      let faturaId: string | null = null;
      let valorFaturaTotal = finalPrice;
      let descricaoFaturaFinal = descricaoFatura;

      if (faturaExistente?.id) {
        faturaId = faturaExistente.id;
        valorFaturaTotal = Number(faturaExistente.valor) + finalPrice;
        descricaoFaturaFinal = `Faturamento mensal (consolidado)`;
        await supabase.from("contas_receber").update({
          valor: valorFaturaTotal,
          descricao: descricaoFaturaFinal,
          updated_at: new Date().toISOString(),
        }).eq("id", faturaId);
      } else {
        const { data: novaFatura } = await supabase.from("contas_receber").insert({
          empresa_id: empresaId, cliente_id: clienteId,
          descricao: descricaoFatura,
          valor: finalPrice, vencimento: vencimentoStr, status: "pendente", categoria: "Planos e Pacotes"
        }).select("id").single();
        faturaId = novaFatura?.id ?? null;
      }

      // Adiciona o item detalhado
      if (faturaId) {
        await supabase.from("contas_receber_itens" as any).insert({
          conta_receber_id: faturaId,
          empresa_id: empresaId,
          descricao: descricaoFatura,
          valor: finalPrice,
          tipo: "principal",
        });
      }

      // Disparo de notificação WhatsApp (best-effort, não bloqueia)
      // Só envia se for fatura NOVA. Se foi anexada à existente, evita duplicar mensagem.
      try {
        if (!faturaExistente?.id) {
          const cli = clienteData;
          const telefoneContato = cli?.whatsapp ?? cli?.telefone ?? null;
          if (telefoneContato) {
            await supabase.functions.invoke("notificar-fatura-whatsapp", {
              body: {
                empresa_id: empresaId,
                cliente: {
                  id: clienteId,
                  nome: cli.nome,
                  whatsapp: cli.whatsapp ?? null,
                  telefone: cli.telefone ?? null,
                },
                fatura: { id: faturaId, descricao: descricaoFaturaFinal, valor: valorFaturaTotal, vencimento: vencimentoStr },
              },
            }).catch(() => {});
          }
        }
      } catch { /* noop */ }

      // Generate agendamentos
      if (isQuinzenal && plannedDays.length === 1) {
        const today = startOfDay(new Date());
        const tipoServico = selectedPlan?.name || "Pacote";

        // All dates that match the selected week parity
        const datesToSchedule = biweeklyDates;

        const agendamentos: any[] = [];
        for (const date of datesToSchedule) {
          if (isBefore(date, today)) continue;
          const ag: any = {
            empresa_id: empresaId,
            cliente_id: clienteId,
            pet_id: petId,
            tipo_servico: tipoServico,
            data_hora: format(date, "yyyy-MM-dd") + "T" + getHoraBanho(petId) + ":00-03:00",
            status: "agendado",
            subscription_id: subscriptionId,
            notas: "Gerado automaticamente pelo pacote (quinzenal)",
            ...(selectedBanhistaId ? { atendente_id: selectedBanhistaId } : {}),
          };
          if (showHorarios) {
            if (transportMode === "ambos" || transportMode === "buscar") ag.hora_prevista_buscar = horaBuscar;
            if (transportMode === "ambos" || transportMode === "levar") ag.hora_prevista_levar = horaLevar;
          }
          agendamentos.push(ag);
        }

        for (let i = 0; i < agendamentos.length; i += 50) {
          await supabase.from("agendamentos").insert(agendamentos.slice(i, i + 50) as any);
        }
        totalAgendamentos += agendamentos.length;
      } else if (plannedDays.length > 0) {
        const start = startOfDay(startDateObj);
        const end = startOfDay(endOfMonth);
        const today = startOfDay(new Date());
        const tipoServico = selectedPlan?.name || "Plano";

        const agendamentos: any[] = [];
        let current = isBefore(start, today) ? today : start;

        while (!isBefore(end, current)) {
          const weekday = getDay(current);
          if (plannedDays.includes(weekday)) {
            const ag: any = {
              empresa_id: empresaId,
              cliente_id: clienteId,
              pet_id: petId,
              tipo_servico: tipoServico,
              data_hora: format(current, "yyyy-MM-dd") + "T" + (showHorarioBanho ? getHoraBanho(petId) + ":00" : "07:00:00") + "-03:00",
              status: "agendado",
              subscription_id: subscriptionId,
              notas: "Gerado automaticamente pelo plano",
              ...(selectedBanhistaId ? { atendente_id: selectedBanhistaId } : {}),
            };
            if (showHorarios) {
              if (transportMode === "ambos" || transportMode === "buscar") ag.hora_prevista_buscar = horaBuscar;
              if (transportMode === "ambos" || transportMode === "levar") ag.hora_prevista_levar = horaLevar;
            }
            agendamentos.push(ag);
          }
          current = addDays(current, 1);
        }

        for (let i = 0; i < agendamentos.length; i += 50) {
          await supabase.from("agendamentos").insert(agendamentos.slice(i, i + 50) as any);
        }
        totalAgendamentos += agendamentos.length;
      }
    }

    if (totalAgendamentos > 0) {
      toast.success(`Contratação realizada! ${totalAgendamentos} reservas geradas para ${selectedPetIds.length} pet(s).`);
    } else {
      toast.success(`Contratação realizada para ${selectedPetIds.length} pet(s)!`);
    }

    setClienteId("");
    setSelectedPetIds([]);
    setPets([]);
    setPlanType("plan");
    setSelectedId("");
    setStartDate(format(new Date(), "yyyy-MM-dd"));
    setContractDate(format(new Date(), "yyyy-MM-dd"));
    setDiscount("0");
    setAutoRenew(false);
    setNotes("");
    setPlannedDays([]);
    setHoraBuscar("08:00");
    setHoraLevar("17:00");
    setHoraBanhoPorPet({});
    setFrequency("semanal");
    setWeekParity(currentWeekParity);
    setSelectedBanhistaId("");
    setSaving(false); onSuccess(); onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Nova Contratação</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Cliente *</Label>
            <Select value={clienteId} onValueChange={setClienteId}>
              <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
              <SelectContent>{clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {pets.length > 0 && (
            <div className="space-y-2">
              <Label>Pet(s) * {pets.length > 1 && <span className="text-xs text-muted-foreground ml-1">(selecione um ou mais)</span>}</Label>
              {pets.length === 1 ? (
                <div className="flex items-center gap-2 p-2 rounded-md border border-border bg-card">
                  <Checkbox
                    checked={selectedPetIds.includes(pets[0].id)}
                    onCheckedChange={(checked) => {
                      setSelectedPetIds(checked ? [pets[0].id] : []);
                    }}
                  />
                  <span className="text-sm">{pets[0].nome}</span>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {pets.map(p => {
                    const isSelected = selectedPetIds.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedPetIds(prev =>
                          prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id]
                        )}
                        className={cn(
                          "relative flex items-center justify-center rounded-lg border-2 px-3 py-2 text-xs font-medium transition-all min-w-[70px]",
                          isSelected
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-card text-muted-foreground hover:border-primary/50"
                        )}
                      >
                        {isSelected && (
                          <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                            <Check className="h-2.5 w-2.5 text-primary-foreground" />
                          </div>
                        )}
                        {p.nome}
                      </button>
                    );
                  })}
                </div>
              )}
              <p className="text-xs text-muted-foreground">{selectedPetIds.length} pet(s) selecionado(s)</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={planType} onValueChange={v => { setPlanType(v as any); setSelectedId(""); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="plan">Plano</SelectItem>
                  <SelectItem value="package">Pacote</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{planType === "plan" ? "Plano" : "Pacote"} *</Label>
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {(planType === "plan" ? plans : packages).map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{p.name} - R$ {Number(p.price).toFixed(2)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Frequency selector for bath packages */}
          {showFrequency && (
            <div className="space-y-1.5">
              <Label>Frequência</Label>
              <Select value={frequency} onValueChange={v => { setFrequency(v as any); setPlannedDays([]); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="semanal">Semanal</SelectItem>
                  <SelectItem value="quinzenal">Quinzenal (a cada 14 dias)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Week parity selector for quinzenal */}
          {isQuinzenal && (
            <div className="space-y-1.5">
              <Label>Semana do banho quinzenal</Label>
              <p className="text-xs text-muted-foreground">
                Estamos na semana <strong>{currentWeekNumber}</strong> do ano ({currentWeekParity === "par" ? "par" : "ímpar"}). Os banhos quinzenais ocorrerão sempre na semana escolhida.
              </p>
              <RadioGroup
                value={weekParity}
                onValueChange={v => setWeekParity(v as "par" | "impar")}
                className="grid grid-cols-2 gap-2"
              >
                <Label
                  htmlFor="parity-impar"
                  className={cn(
                    "flex items-center gap-2 rounded-md border-2 p-2 cursor-pointer text-xs font-medium transition-all",
                    weekParity === "impar" ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground"
                  )}
                >
                  <RadioGroupItem value="impar" id="parity-impar" />
                  Semana ímpar {currentWeekParity === "impar" && <span className="ml-auto text-[10px] opacity-70">(atual)</span>}
                </Label>
                <Label
                  htmlFor="parity-par"
                  className={cn(
                    "flex items-center gap-2 rounded-md border-2 p-2 cursor-pointer text-xs font-medium transition-all",
                    weekParity === "par" ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground"
                  )}
                >
                  <RadioGroupItem value="par" id="parity-par" />
                  Semana par {currentWeekParity === "par" && <span className="ml-auto text-[10px] opacity-70">(atual)</span>}
                </Label>
              </RadioGroup>
            </div>
          )}

          <div className={planType === "plan" ? "grid grid-cols-2 gap-4" : ""}>
            {planType === "plan" && (
              <div className="space-y-1.5">
                <Label>Data Contrato</Label>
                <Input type="date" value={contractDate} onChange={e => setContractDate(e.target.value)} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Data Início</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
          </div>

          {contractDurationMonths && (
            <div className="rounded-md bg-muted p-3">
              <p className="text-xs font-medium text-muted-foreground">
                Validade do contrato: {contractDurationMonths} meses — Vencimento em{" "}
                {format(addMonths(new Date(contractDate + "T00:00:00"), contractDurationMonths), "dd/MM/yyyy")}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label>{isQuinzenal ? "Dia da semana (quinzenal)" : "Dias de uso na semana"}</Label>
            {isQuinzenal && (
              <p className="text-xs text-muted-foreground">Selecione apenas 1 dia — o banho será a cada 14 dias neste dia da semana</p>
            )}
            <div className="flex flex-wrap gap-2">
              {DIAS_SEMANA.map(dia => {
                const isSelected = plannedDays.includes(dia.value);
                return (
                  <button
                    key={dia.value}
                    type="button"
                    onClick={() => toggleDay(dia.value)}
                    className={cn(
                      "relative flex items-center justify-center rounded-lg border-2 px-3 py-2 text-xs font-medium transition-all min-w-[70px]",
                      isSelected
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground hover:border-primary/50"
                    )}
                  >
                    {isSelected && (
                      <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-2.5 w-2.5 text-primary-foreground" />
                      </div>
                    )}
                    {dia.label}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              {isQuinzenal
                ? `${plannedDays.length} dia selecionado — ${biweeklyDates.length} ocorrência(s) no mês`
                : `${plannedDays.length} dia(s) — reservas serão criadas automaticamente`}
            </p>
          </div>

          {/* Biweekly preview of dates */}
          {isQuinzenal && biweeklyDates.length > 0 && (
            <div className="rounded-md bg-muted p-3 space-y-2">
              <p className="text-xs font-medium text-foreground">Datas previstas:</p>
              <div className="flex flex-wrap gap-2">
                {biweeklyDates.map((d, i) => (
                  <span
                    key={i}
                    className="text-xs px-2 py-1 rounded-md border bg-primary/10 text-primary border-primary/30"
                  >
                    {format(d, "dd/MM")} <span className="opacity-60">(sem. {getISOWeek(d)})</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {hasThreeOccurrences && (
            <div className="rounded-md border border-accent bg-accent/50 p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-foreground mt-0.5 flex-shrink-0" />
              <p className="text-xs text-foreground">
                Este mês possui {biweeklyDates.length} ocorrências na semana {weekParity === "par" ? "par" : "ímpar"} — será cobrada {biweeklyDates.length - 2} sessão(ões) extra de R$ {pricePerSession.toFixed(2)}.
              </p>
            </div>
          )}

          {showHorarioBanho && plannedDays.length > 0 && selectedPetIds.length <= 1 && (
            <div className="space-y-1.5">
              <Label>Horário agendado para o banho (slots de 30 min)</Label>
              <BanhoTimeSlotPicker
                value={getHoraBanho()}
                onChange={setHoraBanhoDefault}
                availabilityMap={availabilityMap}
                relevantDates={relevantDates}
                loading={availLoading}
                conflictingDates={banhoConflictsPerPet["_default"] || []}
                suggestions={banhoSuggestionsPerPet["_default"] || []}
              />
            </div>
          )}

          {showHorarioBanho && plannedDays.length > 0 && selectedPetIds.length > 1 && (
            <div className="space-y-3">
              <Label>Horário agendado para o banho por pet (slots de 30 min)</Label>
              {selectedPetIds.map(petId => {
                const petNome = pets.find(p => p.id === petId)?.nome || petId;
                return (
                  <div key={petId} className="space-y-1.5 rounded-md border border-border p-3">
                    <p className="text-sm font-medium text-foreground">{petNome}</p>
                    <BanhoTimeSlotPicker
                      value={getHoraBanho(petId)}
                      onChange={(time) => setHoraBanhoForPet(petId, time)}
                      availabilityMap={availabilityMap}
                      relevantDates={relevantDates}
                      loading={availLoading}
                      conflictingDates={banhoConflictsPerPet[petId] || []}
                      suggestions={banhoSuggestionsPerPet[petId] || []}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {showHorarios && (
            <div className="space-y-3 rounded-md border border-border p-3">
              <div className="space-y-1.5">
                <Label>Tipo de transporte</Label>
                <RadioGroup
                  value={transportMode}
                  onValueChange={(v: any) => setTransportMode(v)}
                  className="flex flex-wrap gap-4"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="ambos" id="tm-ambos" />
                    <Label htmlFor="tm-ambos" className="cursor-pointer font-normal">Buscar e levar</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="buscar" id="tm-buscar" />
                    <Label htmlFor="tm-buscar" className="cursor-pointer font-normal">Apenas buscar</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="levar" id="tm-levar" />
                    <Label htmlFor="tm-levar" className="cursor-pointer font-normal">Apenas levar</Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {(transportMode === "ambos" || transportMode === "buscar") && (
                  <div className="space-y-1.5">
                    <Label>Hora prevista buscar</Label>
                    <Input type="time" value={horaBuscar} onChange={e => setHoraBuscar(e.target.value)} />
                  </div>
                )}
                {(transportMode === "ambos" || transportMode === "levar") && (
                  <div className="space-y-1.5">
                    <Label>Hora prevista levar</Label>
                    <Input type="time" value={horaLevar} onChange={e => setHoraLevar(e.target.value)} />
                  </div>
                )}
              </div>
            </div>
          )}

          {showHorarioBanho && banhistas.length > 0 && (
            <div className="space-y-1.5">
              <Label>Banhista</Label>
              <Select value={selectedBanhistaId} onValueChange={setSelectedBanhistaId}>
                <SelectTrigger><SelectValue placeholder="Selecione o banhista" /></SelectTrigger>
                <SelectContent>
                  {banhistas.map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {proportionalInfo && (
            <div className="rounded-md bg-muted p-3">
              <p className="text-xs font-medium text-muted-foreground">{proportionalInfo}</p>
              {!isQuinzenal && (
                <p className="text-xs text-muted-foreground mt-1">A partir do próximo mês, o valor será R$ {priceContracted.toFixed(2)} (mês cheio).</p>
              )}
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Preço</Label>
              <Input value={`R$ ${proportionalPrice.toFixed(2)}`} disabled />
            </div>
            <div className="space-y-1.5">
              <Label>Desconto (R$)</Label>
              <Input type="number" value={discount} onChange={e => setDiscount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Valor Final</Label>
              <Input value={`R$ ${finalPrice.toFixed(2)}`} disabled className="font-bold" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={autoRenew} onCheckedChange={setAutoRenew} />
            <Label>Renovação automática</Label>
          </div>
          <div className="space-y-1.5">
            <Label>Observações</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Contratar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
