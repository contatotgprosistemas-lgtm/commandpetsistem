import { useMemo, useState } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Agendamento {
  id: string;
  data_hora: string;
  tipo_servico: string;
  status: string;
  subscription_id?: string | null;
  pet: { id: string; nome: string; raca: string | null; especie: string } | null;
  cliente: { id: string; nome: string; whatsapp: string | null } | null;
}

const WEEKDAYS = ["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"];

export function AgendaCalendar({ agendamentos }: { agendamentos: Agendamento[] }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const days: Date[] = [];
    let day = calStart;
    while (day <= calEnd) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [currentMonth]);

  const agendamentosByDay = useMemo(() => {
    const map = new Map<string, Agendamento[]>();
    agendamentos
      .filter(a => a.status !== "cancelado")
      .forEach(a => {
        const key = format(new Date(a.data_hora), "yyyy-MM-dd");
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(a);
      });
    return map;
  }, [agendamentos]);

  return (
    <div className="mt-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-foreground capitalize">
          {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
        </h2>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setCurrentMonth(new Date())}>
            HOJE
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="border border-border rounded-lg overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-7 bg-primary/80">
          {WEEKDAYS.map(d => (
            <div key={d} className="text-center text-xs font-semibold text-primary-foreground py-2 border-r border-primary/30 last:border-r-0">
              {d}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, idx) => {
            const key = format(day, "yyyy-MM-dd");
            const dayItems = agendamentosByDay.get(key) || [];
            const inMonth = isSameMonth(day, currentMonth);
            const today = isToday(day);

            return (
              <div
                key={idx}
                className={cn(
                  "min-h-[120px] border-r border-b border-border last:border-r-0 p-1",
                  !inMonth && "bg-muted/30"
                )}
              >
                <div className={cn(
                  "text-right text-xs font-medium mb-1 pr-1",
                  today ? "text-primary font-bold" : inMonth ? "text-foreground" : "text-muted-foreground/50"
                )}>
                  {format(day, "d")}
                </div>
                <div className="space-y-0.5 overflow-y-auto max-h-[200px]">
                  {dayItems
                    .sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime())
                    .map(item => (
                      <CalendarEvent key={item.id} item={item} />
                    ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CalendarEvent({ item }: { item: Agendamento }) {
  const hora = format(new Date(item.data_hora), "HH");
  const petName = item.pet?.nome ?? "Pet";
  const petBreed = item.pet?.raca;
  const clientName = item.cliente?.nome;

  return (
    <div className="bg-primary/70 text-primary-foreground rounded px-1.5 py-1 text-[10px] leading-tight cursor-default hover:bg-primary/90 transition-colors">
      <div className="font-bold">
        <span>{hora}</span>{" "}
        <span>{petName}</span>
        {petBreed && <span> - {petBreed}</span>}
      </div>
      {clientName && (
        <div className="opacity-80 truncate">({clientName})</div>
      )}
      <div className="opacity-70">{item.tipo_servico}</div>
    </div>
  );
}
