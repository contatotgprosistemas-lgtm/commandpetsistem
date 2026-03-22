import { format, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DateSeparatorProps {
  date: string;
}

export function DateSeparator({ date }: DateSeparatorProps) {
  const d = new Date(date);
  let label: string;

  if (isToday(d)) {
    label = "Hoje";
  } else if (isYesterday(d)) {
    label = "Ontem";
  } else {
    label = format(d, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  }

  return (
    <div className="flex items-center justify-center my-3">
      <span className="px-3 py-1 rounded-lg bg-muted text-[11px] font-medium text-muted-foreground shadow-sm">
        {label}
      </span>
    </div>
  );
}
