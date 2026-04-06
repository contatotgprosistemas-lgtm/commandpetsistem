import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { addDays, format, getDay, isBefore, startOfDay } from "date-fns";

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

  useEffect(() => {
    if (open && subscription) {
      setSelectedDays(subscription.planned_days || []);
      checkServiceType();
    }
  }, [open, subscription]);

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

  async function handleSave() {
    if (!subscription) return;
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
            data_hora: format(current, "yyyy-MM-dd") + "T" + (showHorarioBanho ? horaBanho : "08:00") + ":00",
            status: "agendado",
            subscription_id: subscription.id,
            notas: "Gerado automaticamente pelo plano",
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
