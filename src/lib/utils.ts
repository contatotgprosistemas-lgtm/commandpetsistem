import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Parse a date string (date-only "YYYY-MM-DD" or ISO timestamp) into a
 * local Date object so that formatting always shows the correct day in
 * the user's timezone (Brazil).
 */
export function parseLocalDate(dateStr: string): Date {
  const datePart = dateStr.split("T")[0];
  const [y, m, d] = datePart.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Format a date-only or ISO string as "dd/mm/aaaa" (pt-BR). */
export function formatDateBR(dateStr: string): string {
  return parseLocalDate(dateStr).toLocaleDateString("pt-BR");
}

/** Format a date-only or ISO string with custom options (pt-BR). */
export function formatDateBRCustom(
  dateStr: string,
  options: Intl.DateTimeFormatOptions,
): string {
  return parseLocalDate(dateStr).toLocaleDateString("pt-BR", options);
}

/**
 * Extrai "HH:mm" de uma string ISO/timestamptz preservando o horário
 * salvo no banco (UTC-3 / BRT). Evita o uso de `new Date(iso)` que pode
 * deslocar o horário em fusos diferentes ou em SSR.
 * Aceita: "2026-05-29T10:00:00+00:00", "2026-05-29 10:00:00+00",
 *         "2026-05-29T07:00:00-03:00", "2026-05-29T07:00:00".
 */
export function extractTimeBR(ts: string | null | undefined): string {
  if (!ts) return "";
  const s = ts.replace(" ", "T");
  const m = s.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::\d{2})?(?:\.\d+)?(Z|[+-]\d{2}:?\d{2})?$/,
  );
  if (!m) return s.split("T")[1]?.slice(0, 5) || "";
  const [, , , , hhStr, mmStr, off] = m;
  let hh = parseInt(hhStr, 10);
  const mm = parseInt(mmStr, 10);
  if (off && off !== "") {
    let offMin = 0;
    if (off === "Z") offMin = 0;
    else {
      const om = off.match(/([+-])(\d{2}):?(\d{2})/);
      if (om) {
        const sign = om[1] === "-" ? -1 : 1;
        offMin = sign * (parseInt(om[2], 10) * 60 + parseInt(om[3], 10));
      }
    }
    // Converte horário gravado para UTC e em seguida para -03:00 (BRT)
    const totalMin = hh * 60 + mm - offMin + -3 * 60;
    const norm = ((totalMin % 1440) + 1440) % 1440;
    hh = Math.floor(norm / 60);
    const mmF = norm % 60;
    return `${String(hh).padStart(2, "0")}:${String(mmF).padStart(2, "0")}`;
  }
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

/** Formata "DD/MM/AAAA HH:mm" a partir de ISO/timestamptz preservando BRT. */
export function formatDateTimeBR(ts: string | null | undefined): string {
  if (!ts) return "";
  return `${formatDateBR(ts)} ${extractTimeBR(ts)}`;
}

/**
 * Arredonda um valor monetário para 2 casas decimais, sempre para cima
 * (teto), evitando casas residuais em cálculos proporcionais.
 * Ex.: 12.341 -> 12.35, 12.340 -> 12.34, 12.3401 -> 12.35
 */
export function roundUpMoney(value: number): number {
  if (!isFinite(value)) return 0;
  return Math.ceil((value + Number.EPSILON) * 100) / 100;
}
