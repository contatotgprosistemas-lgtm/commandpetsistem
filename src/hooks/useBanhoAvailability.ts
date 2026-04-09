import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays, getDay, isBefore, startOfDay } from "date-fns";

// 30-min slots from 08:00 to 16:30
export const BANHO_TIME_SLOTS: string[] = [];
for (let h = 8; h <= 16; h++) {
  BANHO_TIME_SLOTS.push(`${String(h).padStart(2, "0")}:00`);
  if (h < 16 || h === 16) {
    BANHO_TIME_SLOTS.push(`${String(h).padStart(2, "0")}:30`);
  }
}
// Remove 17:00 — last slot is 16:30
// Actually we want 08:00..16:30, so filter
const filtered: string[] = [];
for (let h = 8; h <= 16; h++) {
  filtered.push(`${String(h).padStart(2, "0")}:00`);
  if (h < 17) filtered.push(`${String(h).padStart(2, "0")}:30`);
}
// Overwrite
BANHO_TIME_SLOTS.length = 0;
filtered.filter(t => t <= "16:30").forEach(t => BANHO_TIME_SLOTS.push(t));

export interface SlotAvailability {
  time: string;
  available: boolean;
}

/**
 * Given a list of dates and an empresa_id, checks which 30-min slots
 * are already booked (status != cancelado) for bath services.
 * Returns a map: dateStr -> SlotAvailability[]
 */
export function useBanhoAvailability(empresaId: string) {
  const [loading, setLoading] = useState(false);
  const [availabilityMap, setAvailabilityMap] = useState<Record<string, SlotAvailability[]>>({});

  const checkAvailability = useCallback(async (dates: string[]) => {
    if (!empresaId || dates.length === 0) {
      setAvailabilityMap({});
      return {};
    }

    setLoading(true);

    // Fetch all agendamentos for these dates (bath-related, not cancelled)
    const minDate = dates.sort()[0];
    const maxDate = dates.sort()[dates.length - 1];

    const { data: existing } = await supabase
      .from("agendamentos")
      .select("data_hora, status")
      .eq("empresa_id", empresaId)
      .gte("data_hora", minDate + "T00:00:00")
      .lte("data_hora", maxDate + "T23:59:59")
      .neq("status", "cancelado");

    // Build a set of occupied slots per date: "YYYY-MM-DD|HH:mm"
    const occupied = new Set<string>();
    (existing || []).forEach((ag: any) => {
      if (ag.data_hora) {
        const dateStr = ag.data_hora.substring(0, 10);
        const timeStr = ag.data_hora.substring(11, 16);
        occupied.add(`${dateStr}|${timeStr}`);
      }
    });

    const result: Record<string, SlotAvailability[]> = {};
    for (const dateStr of dates) {
      result[dateStr] = BANHO_TIME_SLOTS.map(time => ({
        time,
        available: !occupied.has(`${dateStr}|${time}`),
      }));
    }

    setAvailabilityMap(result);
    setLoading(false);
    return result;
  }, [empresaId]);

  /**
   * Given a preferred time and a date, returns the closest available slots.
   */
  function suggestAlternatives(dateStr: string, preferredTime: string, count = 3): string[] {
    const slots = availabilityMap[dateStr];
    if (!slots) return [];

    const available = slots.filter(s => s.available);
    if (available.length === 0) return [];

    // Sort by distance from preferred time
    return available
      .sort((a, b) => {
        const distA = Math.abs(timeToMinutes(a.time) - timeToMinutes(preferredTime));
        const distB = Math.abs(timeToMinutes(b.time) - timeToMinutes(preferredTime));
        return distA - distB;
      })
      .slice(0, count)
      .map(s => s.time);
  }

  /**
   * For planned days within a date range, generates all dates and checks availability.
   */
  async function checkPlannedDaysAvailability(
    startDate: Date,
    endDate: Date,
    plannedDays: number[],
    excludeSubscriptionId?: string
  ) {
    const dates: string[] = [];
    let current = isBefore(startDate, startOfDay(new Date())) ? startOfDay(new Date()) : startDate;

    while (!isBefore(endDate, current)) {
      if (plannedDays.includes(getDay(current))) {
        dates.push(format(current, "yyyy-MM-dd"));
      }
      current = addDays(current, 1);
    }

    if (dates.length === 0) return {};

    setLoading(true);

    const minDate = dates[0];
    const maxDate = dates[dates.length - 1];

    let query = supabase
      .from("agendamentos")
      .select("data_hora, status, subscription_id")
      .eq("empresa_id", empresaId)
      .gte("data_hora", minDate + "T00:00:00")
      .lte("data_hora", maxDate + "T23:59:59")
      .neq("status", "cancelado");

    if (excludeSubscriptionId) {
      query = query.neq("subscription_id", excludeSubscriptionId);
    }

    const { data: existing } = await query;

    const occupied = new Set<string>();
    (existing || []).forEach((ag: any) => {
      if (ag.data_hora) {
        const dateStr = ag.data_hora.substring(0, 10);
        const timeStr = ag.data_hora.substring(11, 16);
        occupied.add(`${dateStr}|${timeStr}`);
      }
    });

    const result: Record<string, SlotAvailability[]> = {};
    for (const dateStr of dates) {
      result[dateStr] = BANHO_TIME_SLOTS.map(time => ({
        time,
        available: !occupied.has(`${dateStr}|${time}`),
      }));
    }

    setAvailabilityMap(result);
    setLoading(false);
    return result;
  }

  /**
   * Check if a specific time is available on ALL given dates.
   */
  function isTimeAvailableOnAllDates(time: string, dates: string[]): boolean {
    return dates.every(d => {
      const slots = availabilityMap[d];
      if (!slots) return true;
      const slot = slots.find(s => s.time === time);
      return slot ? slot.available : true;
    });
  }

  /**
   * Get conflicting dates for a specific time.
   */
  function getConflictingDates(time: string, dates: string[]): string[] {
    return dates.filter(d => {
      const slots = availabilityMap[d];
      if (!slots) return false;
      const slot = slots.find(s => s.time === time);
      return slot ? !slot.available : false;
    });
  }

  /**
   * Find the best available time across all dates (closest to preferred).
   */
  function findBestAvailableTime(preferredTime: string, dates: string[]): string | null {
    for (const slot of BANHO_TIME_SLOTS.sort((a, b) => {
      const distA = Math.abs(timeToMinutes(a) - timeToMinutes(preferredTime));
      const distB = Math.abs(timeToMinutes(b) - timeToMinutes(preferredTime));
      return distA - distB;
    })) {
      if (isTimeAvailableOnAllDates(slot, dates)) return slot;
    }
    return null;
  }

  return {
    loading,
    availabilityMap,
    checkAvailability,
    checkPlannedDaysAvailability,
    suggestAlternatives,
    isTimeAvailableOnAllDates,
    getConflictingDates,
    findBestAvailableTime,
    BANHO_TIME_SLOTS,
  };
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}
