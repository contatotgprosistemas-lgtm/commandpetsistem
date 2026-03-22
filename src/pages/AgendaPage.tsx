import { useState, useEffect } from "react";
import { CalendarPlus, Calculator, PawPrint, Phone, MessageCircle, Pencil } from "lucide-react";
import { format, isToday, isAfter, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { NovoAgendamentoDialog } from "@/components/NovoAgendamentoDialog";
import { AgendaCalendar } from "@/components/agenda/AgendaCalendar";
import { supabase } from "@/integrations/supabase/client";

interface Agendamento {
  id: string;
  data_hora: string;
  tipo_servico: string;
  status: string;
  notas: string | null;
  valor: number | null;
  duracao_min: number | null;
  pet: { id: string; nome: string; raca: string | null; especie: string } | null;
  cliente: { id: string; nome: string; whatsapp: string | null } | null;
}

function statusColor(status: string) {
  switch (status) {
    case "confirmado": return "bg-emerald-500";
    case "pendente": return "bg-amber-500";
    case "cancelado": return "bg-destructive";
    case "concluido": return "bg-primary";
    default: return "bg-muted-foreground";
  }
}

function StatusDot({ status }: { status: string }) {
  return (
    <span className={`inline-block h-2.5 w-2.5 rounded-full ${statusColor(status)}`} title={status} />
  );
}

export default function AgendaPage() {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchAgendamentos() {
    setLoading(true);
    const { data } = await supabase
      .from("agendamentos")
      .select("id, data_hora, tipo_servico, status, notas, valor, duracao_min, pet:pets(id, nome, raca, especie), cliente:clientes(id, nome, whatsapp)")
      .order("data_hora", { ascending: true });

    if (data) setAgendamentos(data as any);
    setLoading(false);
  }

  useEffect(() => { fetchAgendamentos(); }, []);

  const today = startOfDay(new Date());

  const reservaHoje = agendamentos.filter(a => {
    const d = new Date(a.data_hora);
    return isToday(d) && a.status !== "cancelado";
  });

  const proximasReservas = agendamentos.filter(a => {
    const d = startOfDay(new Date(a.data_hora));
    return isAfter(d, today) && a.status !== "cancelado";
  });

  const todayFormatted = format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  return (
    <div className="p-6 space-y-5 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
            AÇÕES DE HOJE
            <span className="text-sm font-normal text-muted-foreground">Todos</span>
          </h1>
          <p className="text-xs text-muted-foreground capitalize">{todayFormatted}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Calculator className="h-4 w-4" strokeWidth={1.5} />
            Orçar
          </Button>
          <NovoAgendamentoDialog onSuccess={fetchAgendamentos} />
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="hoje" className="w-full">
        <TabsList className="bg-transparent border-b border-border rounded-none p-0 h-auto gap-4">
          <TabsTrigger
            value="hoje"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-2 text-sm"
          >
            Reserva Hoje ({reservaHoje.length})
          </TabsTrigger>
          <TabsTrigger
            value="proximas"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-2 text-sm"
          >
            Próximas Reservas ({proximasReservas.length})
          </TabsTrigger>
          <TabsTrigger
            value="calendario"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-2 text-sm"
          >
            Calendário
          </TabsTrigger>
        </TabsList>

        <TabsContent value="hoje">
          <AgendamentoList items={reservaHoje} loading={loading} />
        </TabsContent>
        <TabsContent value="proximas">
          <AgendamentoList items={proximasReservas} loading={loading} />
        </TabsContent>
        <TabsContent value="calendario">
          <AgendaCalendar agendamentos={agendamentos} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AgendamentoList({ items, loading }: { items: Agendamento[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="space-y-3 mt-4">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <PawPrint className="h-10 w-10 text-muted-foreground/30 mb-3" strokeWidth={1.5} />
        <p className="text-sm text-muted-foreground">Nenhum agendamento encontrado</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg shadow-card mt-4 divide-y divide-border">
      {items.map(item => (
        <AgendamentoRow key={item.id} item={item} />
      ))}
    </div>
  );
}

function AgendamentoRow({ item }: { item: Agendamento }) {
  const petName = item.pet?.nome ?? "Pet";
  const petBreed = item.pet?.raca;
  const clientName = item.cliente?.nome ?? "—";
  const clientWhatsapp = item.cliente?.whatsapp;
  const dataHora = new Date(item.data_hora);
  const initials = petName.slice(0, 2).toUpperCase();

  return (
    <div className="flex items-center gap-4 px-5 py-3 hover:bg-muted/30 transition-colors">
      {/* Avatar */}
      <Avatar className="h-11 w-11 border border-border">
        <AvatarFallback className="bg-accent text-accent-foreground text-xs font-semibold">
          {initials}
        </AvatarFallback>
      </Avatar>

      {/* Pet & Client info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-foreground truncate">{petName}</span>
          {petBreed && (
            <span className="text-xs text-muted-foreground">({petBreed})</span>
          )}
          <Pencil className="h-3 w-3 text-muted-foreground/50 shrink-0" />
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
          <span>{item.tipo_servico}</span>
          <span>|</span>
          <span className="truncate">{clientName}</span>
          {clientWhatsapp && (
            <MessageCircle className="h-3 w-3 text-emerald-500 shrink-0" />
          )}
        </div>
      </div>

      {/* Date & Notes */}
      <div className="text-right shrink-0">
        <p className="text-sm font-medium text-foreground tabular-nums">
          {format(dataHora, "dd/MM/yyyy HH:mm")}
        </p>
        {item.notas && (
          <p className="text-xs text-muted-foreground truncate max-w-[180px]">{item.notas}</p>
        )}
      </div>

      {/* Status dots */}
      <div className="flex items-center gap-1 shrink-0 ml-2">
        <StatusDot status={item.status} />
      </div>

      {/* Quick actions */}
      <div className="flex items-center gap-1 shrink-0">
        {clientWhatsapp && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="WhatsApp"
            onClick={() => window.open(`https://wa.me/${clientWhatsapp.replace(/\D/g, "")}`, "_blank")}
          >
            <Phone className="h-3.5 w-3.5 text-emerald-600" />
          </Button>
        )}
      </div>
    </div>
  );
}
