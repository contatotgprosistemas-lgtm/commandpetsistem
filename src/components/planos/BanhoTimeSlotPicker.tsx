import { useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertCircle, CheckCircle2 } from "lucide-react";
import { BANHO_TIME_SLOTS, type SlotAvailability } from "@/hooks/useBanhoAvailability";
import { format } from "date-fns";

interface Props {
  value: string;
  onChange: (time: string) => void;
  availabilityMap: Record<string, SlotAvailability[]>;
  relevantDates: string[];
  loading?: boolean;
  conflictingDates?: string[];
  suggestions?: string[];
}

export function BanhoTimeSlotPicker({
  value,
  onChange,
  availabilityMap,
  relevantDates,
  loading,
  conflictingDates = [],
  suggestions = [],
}: Props) {
  const hasConflict = conflictingDates.length > 0;

  // Check if a time is available on all relevant dates
  function isAvailableOnAll(time: string): boolean {
    return relevantDates.every(d => {
      const slots = availabilityMap[d];
      if (!slots) return true;
      const slot = slots.find(s => s.time === time);
      return slot ? slot.available : true;
    });
  }

  // Count how many dates have the slot occupied
  function conflictCount(time: string): number {
    return relevantDates.filter(d => {
      const slots = availabilityMap[d];
      if (!slots) return false;
      const slot = slots.find(s => s.time === time);
      return slot ? !slot.available : false;
    }).length;
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
        <Clock className="h-3 w-3 animate-spin" />
        Verificando disponibilidade...
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {BANHO_TIME_SLOTS.map(time => {
          const available = isAvailableOnAll(time);
          const conflicts = conflictCount(time);
          const isSelected = value === time;
          const isSuggestion = suggestions.includes(time);

          return (
            <button
              key={time}
              type="button"
              onClick={() => onChange(time)}
              className={cn(
                "relative px-2.5 py-1.5 text-xs font-medium rounded-md border transition-all",
                isSelected && available
                  ? "border-primary bg-primary text-primary-foreground"
                  : isSelected && !available
                    ? "border-destructive bg-destructive/10 text-destructive ring-2 ring-destructive/30"
                    : available
                      ? "border-border bg-card text-foreground hover:border-primary/50 hover:bg-primary/5"
                      : "border-border bg-muted/50 text-muted-foreground/50 line-through cursor-not-allowed",
                isSuggestion && !isSelected && available && "ring-2 ring-primary/40 bg-primary/5"
              )}
              disabled={!available && !isSelected}
            >
              {time}
              {conflicts > 0 && !isSelected && (
                <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-destructive text-[8px] text-white flex items-center justify-center">
                  {conflicts}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {hasConflict && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-2.5 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
            <span className="text-xs font-medium text-destructive">
              Horário {value} indisponível em {conflictingDates.length} data(s)
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            {conflictingDates.slice(0, 5).map(d => (
              <Badge key={d} variant="outline" className="text-[10px] border-destructive/30 text-destructive">
                {d.substring(8, 10)}/{d.substring(5, 7)}
              </Badge>
            ))}
            {conflictingDates.length > 5 && (
              <Badge variant="outline" className="text-[10px] border-destructive/30 text-destructive">
                +{conflictingDates.length - 5}
              </Badge>
            )}
          </div>
          {suggestions.length > 0 && (
            <div className="pt-1">
              <p className="text-[10px] text-muted-foreground mb-1">Sugestões próximas:</p>
              <div className="flex gap-1.5">
                {suggestions.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => onChange(s)}
                    className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!hasConflict && value && relevantDates.length > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-emerald-600">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Horário {value} disponível em todas as datas
        </div>
      )}
    </div>
  );
}
