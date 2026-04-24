import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { addDays, format, getDay, isBefore, startOfDay } from "date-fns";
import { useBanhoAvailability } from "@/hooks/useBanhoAvailability";
import { BanhoTimeSlotPicker } from "./BanhoTimeSlotPicker";

const DIAS_SEMANA = [
  { value: 1, label: "Segunda" },
  { value: 2, label: "Terça" },
  { value: 3, label: "Quarta" },
  { value: 4, label: "Quinta" },
  { value: 5, label: "Sexta" },
  { value: 6, label: "Sábado" },
  { value: 0, label: "Domingo" },
];

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  subscription: any;
  onSuccess: () => void;
}

function isTaxiPetService(name: string) {
  const lower = (name || "").toLowerCase();
  return lower.includes("taxi") || lower.includes("transport") || lower.includes("leva");
}

function isBanhoService(name: string) {
  const lower = (name || "").toLowerCase();
  return lower.includes("banho") || lower.includes("tosa");
}

export function PlanejamentoDiasDialog({ open, onOpenChange, subscription, onSuccess }: Props) {
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [horaBuscar, setHoraBuscar] = useState("08:00");
  const [horaLevar, setHoraLevar] = useState("17:00");
  const [horaBanho, setHoraBanho] = useState("10:00");
  const [showHorarios, setShowHorarios] = useState(false);
  const [showHorarioBanho, setShowHorarioBanho] = useState(false);
  const [banhistas, setBanhistas] = useState<any[]>([]);
  const [selectedBanhistaId, setSelectedBanhistaId] = useState("");

  const empresaId = subscription?.empresa_id || "";
  const {
    loading: availLoading,
    availabilityMap,
    checkPlannedDaysAvailability,
    getConflictingDates,
    isTimeAvailableOnAllDates,
  } = useBanhoAvailability(empresaId);

  useEffect(() => {
    if (open && subscription) {
      setSelectedDays(subscription.planned_days || []);
      checkServiceType();
      loadExistingTimes();
      loadBanhistas();
      loadExistingBanhista();
    }
  }, [open, subscription]);

  async function loadBanhistas() {
    if (!subscription?.empresa_id) return;
    const { data } = await supabase.from("profiles").select("id, nome, cargo").eq("empresa_id", subscription.empresa_id).eq("cargo", "banhista");
    if (data) setBanhistas(data);
  }

  async function loadExistingBanhista() {
    if (!subscription?.id) return;
    const { data: ag } = await supabase
      .from("agendamentos")
      .select("atendente_id")
      .eq("subscription_id", subscription.id)
      .not("atendente_id", "is", null)
      .limit(1);
    if (ag && ag.length > 0 && ag[0].atendente_id) {
      setSelectedBanhistaId(ag[0].atendente_id);
    }
  }

  async function loadExistingTimes() {
    if (!subscription?.id) return;
    // Load the first existing agendamento to get the scheduled time
    const { data: ag } = await supabase
      .from("agendamentos")
      .select("data_hora, hora_prevista_buscar, hora_prevista_levar")
      .eq("subscription_id", subscription.id)
      .order("data_hora", { ascending: true })
      .limit(1);

    if (ag && ag.length > 0) {
      const existing = ag[0] as any;
      // Extract time from data_hora (format: "YYYY-MM-DDTHH:mm:ss")
      if (existing.data_hora) {
        const timePart = existing.data_hora.split("T")[1]?.substring(0, 5);
        if (timePart && timePart !== "08:00") {
          setHoraBanho(timePart);
        }
      }
      if (existing.hora_prevista_buscar) setHoraBuscar(existing.hora_prevista_buscar);
      if (existing.hora_prevista_levar) setHoraLevar(existing.hora_prevista_levar);
    }
  }

  async function checkServiceType() {
    let name = "";
    if (subscription.plan_id) {
      const { data } = await supabase.from("service_plans" as any).select("name").eq("id", subscription.plan_id).single();
      if (data) name = (data as any).name;
    } else if (subscription.package_id) {
      const { data } = await supabase.from("service_packages" as any).select("name").eq("id", subscription.package_id).single();
      if (data) name = (data as any).name;
    }
    setShowHorarios(isTaxiPetService(name));
    setShowHorarioBanho(isBanhoService(name));
  }

  function toggleDay(day: number) {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  }

  // Availability check
  const relevantDates = useMemo(() => {
    if (!showHorarioBanho || selectedDays.length === 0 || !subscription?.start_date || !subscription?.end_date) return [];
    const startDate = startOfDay(new Date(subscription.start_date + "T00:00:00"));
    const endDate = startOfDay(new Date(subscription.end_date + "T00:00:00"));
    const today = startOfDay(new Date());
    const dates: string[] = [];
    let current = isBefore(startDate, today) ? today : startDate;
    while (!isBefore(endDate, current)) {
      if (selectedDays.includes(getDay(current))) {
        dates.push(format(current, "yyyy-MM-dd"));
      }
      current = addDays(current, 1);
    }
    return dates;
  }, [showHorarioBanho, selectedDays, subscription?.start_date, subscription?.end_date]);

  useEffect(() => {
    if (showHorarioBanho && selectedDays.length > 0 && subscription?.start_date && subscription?.end_date && empresaId) {
      const startDate = startOfDay(new Date(subscription.start_date + "T00:00:00"));
      const endDate = startOfDay(new Date(subscription.end_date + "T00:00:00"));
      checkPlannedDaysAvailability(startDate, endDate, selectedDays, subscription.id);
    }
  }, [showHorarioBanho, selectedDays, subscription?.start_date, subscription?.end_date, empresaId]);

  const banhoConflicts = useMemo(() => {
    if (!showHorarioBanho || relevantDates.length === 0) return [];
    return getConflictingDates(horaBanho, relevantDates);
  }, [horaBanho, availabilityMap, relevantDates, showHorarioBanho]);

  const banhoSuggestions = useMemo(() => {
    if (banhoConflicts.length === 0) return [];
    const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
    const preferred = toMin(horaBanho);
    const allSlots = Object.keys(availabilityMap).length > 0
      ? (availabilityMap[Object.keys(availabilityMap)[0]] || []).map(s => s.time)
      : [];
    const sorted = [...allSlots].sort((a, b) =>
      Math.abs(toMin(a) - preferred) - Math.abs(toMin(b) - preferred)
    );
    const suggestions: string[] = [];
    for (const t of sorted) {
      if (t === horaBanho) continue;
      if (isTimeAvailableOnAllDates(t, relevantDates)) {
        suggestions.push(t);
        if (suggestions.length >= 3) break;
      }
    }
    return suggestions;
  }, [banhoConflicts, horaBanho, availabilityMap, relevantDates]);

  async function handleSave() {
    if (!subscription) return;
    if (showHorarioBanho && banhoConflicts.length > 0) {
      toast.error("O horário selecionado possui conflito. Escolha outro horário disponível.");
      return;
    }
    setSaving(true);

    const { error } = await supabase
      .from("customer_pet_subscriptions" as any)
      .update({ planned_days: selectedDays })
      .eq("id", subscription.id);

    if (error) {
      toast.error("Erro ao salvar planejamento");
      setSaving(false);
      return;
    }

    await (supabase.from("agendamentos") as any)
      .delete()
      .eq("subscription_id", subscription.id)
      .neq("status", "na_empresa")
      .neq("status", "concluido");

    if (selectedDays.length > 0 && subscription.start_date && subscription.end_date) {
      const startDate = startOfDay(new Date(subscription.start_date + "T00:00:00"));
      const endDate = startOfDay(new Date(subscription.end_date + "T00:00:00"));
      const today = startOfDay(new Date());

      let tipoServico = "Plano";
      if (subscription.plan_id) {
        const { data: plan } = await supabase.from("service_plans" as any).select("name").eq("id", subscription.plan_id).single();
        if (plan) tipoServico = (plan as any).name;
      } else if (subscription.package_id) {
        const { data: pkg } = await supabase.from("service_packages" as any).select("name").eq("id", subscription.package_id).single();
        if (pkg) tipoServico = (pkg as any).name;
      }

      const agendamentos: any[] = [];
      let current = isBefore(startDate, today) ? today : startDate;

      while (!isBefore(endDate, current)) {
        const weekday = getDay(current);
        if (selectedDays.includes(weekday)) {
          const ag: any = {
            empresa_id: subscription.empresa_id,
            cliente_id: subscription.cliente_id,
            pet_id: subscription.pet_id,
            tipo_servico: tipoServico,
            // IMPORTANT: append -03:00 (Brasília) so Postgres does not interpret as UTC and shift -3h
            data_hora: format(current, "yyyy-MM-dd") + "T" + (showHorarioBanho ? horaBanho : "08:00") + ":00-03:00",
            status: "agendado",
            subscription_id: subscription.id,
            notas: "Gerado automaticamente pelo plano",
            ...(selectedBanhistaId ? { atendente_id: selectedBanhistaId } : {}),
          };
          if (showHorarios) {
            ag.hora_prevista_buscar = horaBuscar;
            ag.hora_prevista_levar = horaLevar;
          }
          agendamentos.push(ag);
        }
        current = addDays(current, 1);
      }

      if (agendamentos.length > 0) {
        for (let i = 0; i < agendamentos.length; i += 50) {
          await supabase.from("agendamentos").insert(agendamentos.slice(i, i + 50) as any);
        }
      }

      toast.success(`Dias planejados salvos! ${agendamentos.length} reservas geradas.`);
    } else {
      toast.success("Dias planejados salvos!");
    }

    onSuccess();
    onOpenChange(false);
    setSaving(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Planejar Dias de Uso</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Selecione os dias da semana que o pet utilizará o plano:
        </p>
        <div className="flex flex-wrap gap-2 py-4">
          {DIAS_SEMANA.map(dia => {
            const isSelected = selectedDays.includes(dia.value);
            return (
              <button
                key={dia.value}
                type="button"
                onClick={() => toggleDay(dia.value)}
                className={cn(
                  "relative flex flex-col items-center justify-center rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all min-w-[90px]",
                  isSelected
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:border-primary/50"
                )}
              >
                {isSelected && (
                  <div className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </div>
                )}
                {dia.label}
              </button>
            );
          })}
        </div>

        {showHorarios && (
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Hora prevista buscar</Label>
              <Input type="time" value={horaBuscar} onChange={e => setHoraBuscar(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Hora prevista levar</Label>
              <Input type="time" value={horaLevar} onChange={e => setHoraLevar(e.target.value)} />
            </div>
          </div>
        )}

        {showHorarioBanho && selectedDays.length > 0 && (
          <div className="py-2 space-y-1.5">
            <Label>Horário agendado para o banho (slots de 30 min)</Label>
            <BanhoTimeSlotPicker
              value={horaBanho}
              onChange={setHoraBanho}
              availabilityMap={availabilityMap}
              relevantDates={relevantDates}
              loading={availLoading}
              conflictingDates={banhoConflicts}
              suggestions={banhoSuggestions}
            />
          </div>
        )}

        {showHorarioBanho && banhistas.length > 0 && (
          <div className="py-2 space-y-1.5">
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

        <p className="text-xs text-muted-foreground">
          {selectedDays.length} dia(s) selecionado(s)
        </p>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Salvar Informações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
