import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

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

export function PlanejamentoDiasDialog({ open, onOpenChange, subscription, onSuccess }: Props) {
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && subscription) {
      const existing = subscription.planned_days || [];
      setSelectedDays(existing);
    }
  }, [open, subscription]);

  function toggleDay(day: number) {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  }

  async function handleSave() {
    setSaving(true);
    const { error } = await supabase
      .from("customer_pet_subscriptions" as any)
      .update({ planned_days: selectedDays })
      .eq("id", subscription.id);

    if (error) {
      toast.error("Erro ao salvar planejamento");
    } else {
      toast.success("Dias planejados salvos!");
      onSuccess();
      onOpenChange(false);
    }
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
