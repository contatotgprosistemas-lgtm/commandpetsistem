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
import { ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

const SERVICE_COLORS: Record<string, string> = {
  "Banho": "bg-sky-500/80 text-white",
  "Tosa": "bg-violet-500/80 text-white",
  "Banho e Tosa": "bg-indigo-500/80 text-white",
  "Hotel": "bg-amber-500/80 text-white",
  "Creche": "bg-emerald-500/80 text-white",
  "Daycare": "bg-emerald-500/80 text-white",
  "Veterinário": "bg-red-500/80 text-white",
  "Adestramento": "bg-orange-500/80 text-white",
  "Passeio": "bg-teal-500/80 text-white",
};

function getServiceColor(tipo: string) {
  return SERVICE_COLORS[tipo] || "bg-primary/70 text-primary-foreground";
}

export function AgendaCalendar({ agendamentos }: { agendamentos: Agendamento[] }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);

  // Extract unique service types
  const serviceTypes = useMemo(() => {
    const types = new Set<string>();
    agendamentos.forEach(a => {
      if (a.status !== "cancelado") types.add(a.tipo_servico);
    });
    return Array.from(types).sort();
  }, [agendamentos]);

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

  const filteredAgendamentos = useMemo(() => {
    return agendamentos.filter(a => {
      if (a.status === "cancelado") return false;
      if (selectedFilter && a.tipo_servico !== selectedFilter) return false;
      return true;
    });
  }, [agendamentos, selectedFilter]);

  const agendamentosByDay = useMemo(() => {
    const map = new Map<string, Agendamento[]>();
    filteredAgendamentos.forEach(a => {
      const key = format(new Date(a.data_hora), "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    });
    return map;
  }, [filteredAgendamentos]);

  return (
    <div className="mt-4 space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Button
          variant={selectedFilter === null ? "default" : "outline"}
          size="sm"
          className="h-7 text-xs"
          onClick={() => setSelectedFilter(null)}
        >
          Todos ({agendamentos.filter(a => a.status !== "cancelado").length})
        </Button>
        {serviceTypes.map(tipo => {
          const count = agendamentos.filter(a => a.tipo_servico === tipo && a.status !== "cancelado").length;
          return (
            <Button
              key={tipo}
              variant={selectedFilter === tipo ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => setSelectedFilter(selectedFilter === tipo ? null : tipo)}
            >
              <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", getServiceColor(tipo).split(" ")[0])} />
              {tipo} ({count})
            </Button>
          );
        })}
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between">
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
                  !inMonth && "bg-muted/30",
                  today && "bg-primary/5"
                )}
              >
                <div className={cn(
                  "text-right text-xs font-medium mb-1 pr-1",
                  today ? "text-primary font-bold" : inMonth ? "text-foreground" : "text-muted-foreground/50"
                )}>
                  {today && <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px]">{format(day, "d")}</span>}
                  {!today && format(day, "d")}
                  {dayItems.length > 0 && (
                    <span className="ml-1 text-[9px] text-muted-foreground">({dayItems.length})</span>
                  )}
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
  const hora = format(new Date(item.data_hora), "HH:mm");
  const petName = item.pet?.nome ?? "Pet";
  const petBreed = item.pet?.raca;
  const clientName = item.cliente?.nome;

  const isFromPlan = !!item.subscription_id;
  const colorClass = getServiceColor(item.tipo_servico);

  return (
    <div className={cn(
      "rounded px-1.5 py-1 text-[10px] leading-tight cursor-default transition-colors",
      isFromPlan
        ? "border border-primary/30 " + colorClass
        : colorClass
    )}>
      <div className="font-bold flex items-center gap-1">
        <span>{hora}</span>
        <span className="truncate">{petName}</span>
        {isFromPlan && <span className="opacity-70">📋</span>}
      </div>
      {clientName && (
        <div className="opacity-80 truncate">{clientName}</div>
      )}
      <div className="opacity-70 truncate">{item.tipo_servico}</div>
    </div>
  );
}
