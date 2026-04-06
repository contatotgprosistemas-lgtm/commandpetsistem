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
function parseLocalDate(dateStr: string): Date {
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
