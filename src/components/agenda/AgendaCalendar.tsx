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
import { ChevronLeft, ChevronRight, Filter, X, Clock, PawPrint, User, Phone, MessageCircle, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface Agendamento {
  id: string;
  data_hora: string;
  tipo_servico: string;
  status: string;
  notas?: string | null;
  valor?: number | null;
  baia?: string | null;
  subscription_id?: string | null;
  pet: { id: string; nome: string; raca: string | null; especie: string; foto_url?: string | null } | null;
  cliente: { id: string; nome: string; whatsapp: string | null; foto_url?: string | null } | null;
}

interface AgendaCalendarProps {
  agendamentos: Agendamento[];
  onEditAgendamento?: (agendamento: Agendamento) => void;
  /** If provided, only show agendamentos whose tipo_servico matches one of these keywords (case-insensitive partial match) */
  serviceKeywords?: string[];
}

const WEEKDAYS = ["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"];

const SERVICE_COLORS: Record<string, string> = {
  "Banho": "bg-sky-500/80 text-white",
  "Tosa": "bg-violet-500/80 text-white",
  "Banho e Tosa": "bg-indigo-500/80 text-white",
  "Hotel": "bg-amber-500/80 text-white",
  "Hospedagem": "bg-amber-500/80 text-white",
  "Creche": "bg-emerald-500/80 text-white",
  "Daycare": "bg-emerald-500/80 text-white",
  "Escola": "bg-emerald-500/80 text-white",
  "Veterinário": "bg-red-500/80 text-white",
  "Adestramento": "bg-orange-500/80 text-white",
  "Passeio": "bg-teal-500/80 text-white",
};

// Cores diferenciadas para agendamentos vindos de planos/pacotes (match por palavra-chave)
const PLAN_COLOR_RULES: { keywords: string[]; color: string }[] = [
  { keywords: ["escola", "creche", "daycare"], color: "bg-blue-500/80 text-white" },
  { keywords: ["hotel", "hospedagem"], color: "bg-lime-500/80 text-white" },
  { keywords: ["banho", "tosa"], color: "bg-fuchsia-500/80 text-white" },
];

function getPlanColor(tipo: string): string {
  const lower = tipo.toLowerCase();
  for (const rule of PLAN_COLOR_RULES) {
    if (rule.keywords.some(k => lower.includes(k))) return rule.color;
  }
  return "bg-fuchsia-500/80 text-white";
}

function getServiceColor(tipo: string, isFromPlan = false, status?: string) {
  // Check-in (na_empresa) or check-out (concluido) → light green
  if (status === "na_empresa") return "bg-emerald-400/80 text-white";
  if (status === "concluido") return "bg-green-500/80 text-white";

  if (isFromPlan) {
    return getPlanColor(tipo);
  }
  return SERVICE_COLORS[tipo] || "bg-violet-500/80 text-white";
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    pendente: "Pendente",
    confirmado: "Confirmado",
    na_empresa: "Na Empresa",
    concluido: "Concluído",
    cancelado: "Cancelado",
  };
  return map[status] || status;
}

function statusBadgeColor(status: string) {
  switch (status) {
    case "confirmado": return "bg-emerald-100 text-emerald-800";
    case "pendente": return "bg-amber-100 text-amber-800";
    case "na_empresa": return "bg-sky-100 text-sky-800";
    case "concluido": return "bg-primary/10 text-primary";
    case "cancelado": return "bg-red-100 text-red-800";
    default: return "bg-muted text-muted-foreground";
  }
}

export function AgendaCalendar({ agendamentos, onEditAgendamento, serviceKeywords }: AgendaCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const serviceTypes = useMemo(() => {
    const base = serviceKeywords?.length
      ? agendamentos.filter(a => {
          const lower = a.tipo_servico.toLowerCase();
          return serviceKeywords.some(kw => lower.includes(kw.toLowerCase()));
        })
      : agendamentos;
    const types = new Set<string>();
    base.forEach(a => {
      if (a.status !== "cancelado") types.add(a.tipo_servico);
    });
    return Array.from(types).sort();
  }, [agendamentos, serviceKeywords]);

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

  const keywordFiltered = useMemo(() => {
    if (!serviceKeywords || serviceKeywords.length === 0) return agendamentos;
    return agendamentos.filter(a => {
      const lower = a.tipo_servico.toLowerCase();
      return serviceKeywords.some(kw => lower.includes(kw.toLowerCase()));
    });
  }, [agendamentos, serviceKeywords]);

  const filteredAgendamentos = useMemo(() => {
    return keywordFiltered.filter(a => {
      if (a.status === "cancelado") return false;
      if (selectedFilter && a.tipo_servico !== selectedFilter) return false;
      return true;
    });
  }, [keywordFiltered, selectedFilter]);

  const agendamentosByDay = useMemo(() => {
    const map = new Map<string, Agendamento[]>();
    filteredAgendamentos.forEach(a => {
      const key = format(new Date(a.data_hora), "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    });
    return map;
  }, [filteredAgendamentos]);

  const selectedDayItems = useMemo(() => {
    if (!selectedDay) return [];
    const key = format(selectedDay, "yyyy-MM-dd");
    return (agendamentosByDay.get(key) || []).sort(
      (a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime()
    );
  }, [selectedDay, agendamentosByDay]);

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
          Todos ({keywordFiltered.filter(a => a.status !== "cancelado").length})
        </Button>
        {serviceTypes.map(tipo => {
          const count = keywordFiltered.filter(a => a.tipo_servico === tipo && a.status !== "cancelado").length;
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
        <div className="grid grid-cols-7 bg-primary/80">
          {WEEKDAYS.map(d => (
            <div key={d} className="text-center text-xs font-semibold text-primary-foreground py-2 border-r border-primary/30 last:border-r-0">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {calendarDays.map((day, idx) => {
            const key = format(day, "yyyy-MM-dd");
            const dayItems = agendamentosByDay.get(key) || [];
            const inMonth = isSameMonth(day, currentMonth);
            const today = isToday(day);
            const isSelected = selectedDay && isSameDay(day, selectedDay);

            return (
              <div
                key={idx}
                onClick={() => setSelectedDay(isSelected ? null : day)}
                className={cn(
                  "min-h-[120px] border-r border-b border-border last:border-r-0 p-1 cursor-pointer transition-colors",
                  !inMonth && "bg-muted/30",
                  today && !isSelected && "bg-primary/5",
                  isSelected && "bg-primary/10 ring-2 ring-primary ring-inset"
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
                  {dayItems.map(item => (
                    <CalendarEvent key={item.id} item={item} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Day detail panel */}
      {selectedDay && (
        <div className="border border-border rounded-lg bg-card shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground capitalize">
              {format(selectedDay, "EEEE, dd 'de' MMMM", { locale: ptBR })}
              <span className="ml-2 text-muted-foreground font-normal">
                ({selectedDayItems.length} {selectedDayItems.length === 1 ? "agendamento" : "agendamentos"})
              </span>
            </h3>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedDay(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {selectedDayItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <PawPrint className="h-8 w-8 text-muted-foreground/30 mb-2" strokeWidth={1.5} />
              <p className="text-sm text-muted-foreground">Nenhum agendamento neste dia</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {selectedDayItems.map(item => (
                <DayListItem key={item.id} item={item} onEdit={onEditAgendamento} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DayListItem({ item, onEdit }: { item: Agendamento; onEdit?: (a: Agendamento) => void }) {
  const hora = format(new Date(item.data_hora), "HH:mm");
  const petName = item.pet?.nome ?? "Pet";
  const petBreed = item.pet?.raca;
  const clientName = item.cliente?.nome ?? "—";
  const clientWhatsapp = item.cliente?.whatsapp;
  const initials = petName.slice(0, 2).toUpperCase();
  const isFromPlan = !!item.subscription_id;
  const colorClass = getServiceColor(item.tipo_servico, isFromPlan, item.status);

  return (
    <div
      className="flex items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer"
      onClick={() => onEdit?.(item)}
    >
      {/* Avatars */}
      <div className="flex items-center -space-x-2 shrink-0">
        <Avatar className="h-10 w-10 border-2 border-card z-10">
          {item.pet?.foto_url && <AvatarImage src={item.pet.foto_url} alt={petName} />}
          <AvatarFallback className="bg-accent text-accent-foreground text-xs font-semibold">{initials}</AvatarFallback>
        </Avatar>
        <Avatar className="h-7 w-7 border-2 border-card">
          {item.cliente?.foto_url && <AvatarImage src={item.cliente.foto_url} alt={clientName} />}
          <AvatarFallback className="bg-primary/10 text-primary text-[9px] font-semibold">{clientName.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-foreground truncate">{petName}</span>
          {petBreed && <span className="text-xs text-muted-foreground">({petBreed})</span>}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
          <Clock className="h-3 w-3 shrink-0" />
          <span>{hora}</span>
          <span>|</span>
          <span className="truncate">{clientName}</span>
          {clientWhatsapp && <MessageCircle className="h-3 w-3 text-emerald-500 shrink-0" />}
        </div>
      </div>

      {/* Service badge */}
      <Badge className={cn("text-[10px] shrink-0", colorClass)}>{item.tipo_servico}{isFromPlan ? " (Pacote)" : ""}</Badge>

      {/* Status */}
      <Badge className={cn("text-[10px] shrink-0", statusBadgeColor(item.status))}>
        {statusLabel(item.status)}
      </Badge>

      {/* Value */}
      {item.valor != null && (
        <span className="text-sm font-medium text-foreground tabular-nums shrink-0">
          R$ {item.valor.toFixed(2)}
        </span>
      )}

      {/* Edit icon */}
      <Pencil className="h-3.5 w-3.5 text-muted-foreground/50 hover:text-primary shrink-0" />
    </div>
  );
}

function CalendarEvent({ item }: { item: Agendamento }) {
  const hora = format(new Date(item.data_hora), "HH:mm");
  const petName = item.pet?.nome ?? "Pet";
  const isFromPlan = !!item.subscription_id;
  const colorClass = getServiceColor(item.tipo_servico, isFromPlan, item.status);

  return (
    <div
      className={cn(
        "rounded px-1.5 py-0.5 text-[10px] leading-tight transition-colors",
        colorClass,
        isFromPlan && "ring-1 ring-fuchsia-400/50"
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="font-bold flex items-center gap-1">
        <span>{hora}</span>
        <span className="truncate">{petName}</span>
        {isFromPlan && <span className="opacity-70">📋</span>}
      </div>
      <div className="opacity-70 truncate">{isFromPlan ? `${item.tipo_servico} (Pacote)` : item.tipo_servico}</div>
    </div>
  );
}
