import { useState, useEffect } from "react";
import { Calculator, PawPrint, Phone, MessageCircle, Pencil, LogIn, Trash2 } from "lucide-react";
import { format, isToday, isAfter, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { NovoAgendamentoDialog } from "@/components/NovoAgendamentoDialog";
import { AgendaCalendar } from "@/components/agenda/AgendaCalendar";
import { OrcamentoDialog } from "@/components/OrcamentoDialog";
import { EditarAgendamentoDialog } from "@/components/EditarAgendamentoDialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Agendamento {
  id: string;
  data_hora: string;
  tipo_servico: string;
  status: string;
  notas: string | null;
  valor: number | null;
  duracao_min: number | null;
  data_saida_provavel: string | null;
  hora_saida_provavel: string | null;
  baia: string | null;
  forma_pagamento: string | null;
  empresa_id: string;
  cliente_id: string;
  pet_id: string;
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
  const [editingAgendamento, setEditingAgendamento] = useState<Agendamento | null>(null);

  async function handleDelete(id: string) {
    // Find the agendamento to get cliente_id and date for matching contas_receber
    const agendamento = agendamentos.find(a => a.id === id);
    
    // Delete related historico_servicos
    await supabase.from("historico_servicos").delete().eq("agendamento_id", id);
    
    // Delete related checklist/manejo
    await supabase.from("checklist_registros").delete().eq("agendamento_id", id);
    await supabase.from("manejo_registros").delete().eq("agendamento_id", id);
    
    // Delete related contas_receber (matched by cliente_id + descricao containing tipo_servico)
    if (agendamento) {
      const petName = agendamento.pet?.nome || "";
      const searchDesc = `${agendamento.tipo_servico} — ${petName}`;
      await supabase
        .from("contas_receber")
        .delete()
        .eq("cliente_id", agendamento.cliente_id)
        .eq("descricao", searchDesc);
    }
    
    const { error } = await supabase.from("agendamentos").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir: " + error.message);
      return;
    }
    toast.success("Reserva e faturas relacionadas excluídas com sucesso.");
    fetchAgendamentos();
  }

  async function fetchAgendamentos() {
    setLoading(true);
    const { data } = await supabase
      .from("agendamentos")
      .select("id, data_hora, tipo_servico, status, notas, valor, duracao_min, data_saida_provavel, hora_saida_provavel, baia, forma_pagamento, empresa_id, cliente_id, pet_id, pet:pets(id, nome, raca, especie), cliente:clientes(id, nome, whatsapp)")
      .order("data_hora", { ascending: true });

    if (data) setAgendamentos(data as any);
    setLoading(false);
  }

  useEffect(() => { fetchAgendamentos(); }, []);

  // Auto-refresh at midnight
  useEffect(() => {
    const scheduleRefresh = () => {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      const ms = midnight.getTime() - now.getTime();
      return setTimeout(() => {
        fetchAgendamentos();
        // Schedule next midnight refresh
        const id = scheduleRefresh();
        return id;
      }, ms);
    };
    const timerId = scheduleRefresh();
    return () => clearTimeout(timerId);
  }, []);

  async function handleCheckin(item: Agendamento) {
    const now = new Date();
    const horaEntrada = format(now, "HH:mm");
    // Update status to confirmado and record entry time
    const { error } = await supabase.from("agendamentos").update({
      status: "confirmado",
      data_entrada: now.toISOString(),
      hora_entrada: horaEntrada,
    }).eq("id", item.id);
    if (error) {
      toast.error("Erro ao fazer check-in: " + error.message);
      return;
    }

    // Save to service history
    await supabase.from("historico_servicos" as any).insert({
      empresa_id: item.empresa_id,
      cliente_id: item.cliente_id,
      pet_id: item.pet_id,
      tipo_servico: item.tipo_servico,
      valor: item.valor,
      data_servico: item.data_hora,
      agendamento_id: item.id,
      notas: `Check-in realizado em ${format(now, "dd/MM/yyyy")} às ${horaEntrada}`,
    } as any);

    toast.success("Check-in realizado! Pet aparecerá no Dashboard.");
    fetchAgendamentos();
  }

  const today = startOfDay(new Date());

  const reservaHoje = agendamentos.filter(a => {
    const d = new Date(a.data_hora);
    return isToday(d) && a.status !== "cancelado" && a.status !== "confirmado" && a.status !== "concluido";
  });

  const proximasReservas = agendamentos.filter(a => {
    const d = startOfDay(new Date(a.data_hora));
    return isAfter(d, today) && a.status !== "cancelado";
  });

  const todayFormatted = format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  return (
    <div className="p-6 space-y-5 max-w-[1400px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
            AÇÕES DE HOJE
            <span className="text-sm font-normal text-muted-foreground">Todos</span>
          </h1>
          <p className="text-xs text-muted-foreground capitalize">{todayFormatted}</p>
        </div>
        <div className="flex items-center gap-2">
          <OrcamentoDialog />
          <NovoAgendamentoDialog onSuccess={fetchAgendamentos} />
        </div>
      </div>

      <Tabs defaultValue="hoje" className="w-full">
        <TabsList className="bg-transparent border-b border-border rounded-none p-0 h-auto gap-4">
          <TabsTrigger value="hoje" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-2 text-sm">
            Reserva Hoje ({reservaHoje.length})
          </TabsTrigger>
          <TabsTrigger value="proximas" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-2 text-sm">
            Próximas Reservas ({proximasReservas.length})
          </TabsTrigger>
          <TabsTrigger value="calendario" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-2 text-sm">
            Calendário
          </TabsTrigger>
        </TabsList>

        <TabsContent value="hoje">
          <AgendamentoList items={reservaHoje} loading={loading} showCheckin onCheckin={handleCheckin} onEdit={setEditingAgendamento} />
        </TabsContent>
        <TabsContent value="proximas">
          <AgendamentoList items={proximasReservas} loading={loading} onEdit={setEditingAgendamento} showDelete onDelete={handleDelete} />
        </TabsContent>
        <TabsContent value="calendario">
          <AgendaCalendar agendamentos={agendamentos} />
        </TabsContent>
      </Tabs>

      <EditarAgendamentoDialog
        agendamento={editingAgendamento}
        open={!!editingAgendamento}
        onOpenChange={(o) => { if (!o) setEditingAgendamento(null); }}
        onSuccess={() => { setEditingAgendamento(null); fetchAgendamentos(); }}
      />
    </div>
  );
}

function AgendamentoList({ items, loading, showCheckin, onCheckin, onEdit, showDelete, onDelete }: { items: Agendamento[]; loading: boolean; showCheckin?: boolean; onCheckin?: (item: Agendamento) => void; onEdit?: (a: Agendamento) => void; showDelete?: boolean; onDelete?: (id: string) => void }) {
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
        <AgendamentoRow key={item.id} item={item} showCheckin={showCheckin} onCheckin={onCheckin} onEdit={onEdit} showDelete={showDelete} onDelete={onDelete} />
      ))}
    </div>
  );
}

function AgendamentoRow({ item, showCheckin, onCheckin, onEdit, showDelete, onDelete }: { item: Agendamento; showCheckin?: boolean; onCheckin?: (item: Agendamento) => void; onEdit?: (a: Agendamento) => void; showDelete?: boolean; onDelete?: (id: string) => void }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const petName = item.pet?.nome ?? "Pet";
  const petBreed = item.pet?.raca;
  const clientName = item.cliente?.nome ?? "—";
  const clientWhatsapp = item.cliente?.whatsapp;
  const dataHora = new Date(item.data_hora);
  const initials = petName.slice(0, 2).toUpperCase();

  return (
    <div className="flex items-center gap-4 px-5 py-3 hover:bg-muted/30 transition-colors">
      <Avatar className="h-11 w-11 border border-border">
        <AvatarFallback className="bg-accent text-accent-foreground text-xs font-semibold">
          {initials}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-foreground truncate">{petName}</span>
          {petBreed && (
            <span className="text-xs text-muted-foreground">({petBreed})</span>
          )}
          <button onClick={() => onEdit?.(item)} className="h-5 w-5 rounded hover:bg-primary/10 flex items-center justify-center text-muted-foreground/50 hover:text-primary transition-colors" title="Editar">
            <Pencil className="h-3 w-3" />
          </button>
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

      <div className="text-right shrink-0">
        <p className="text-sm font-medium text-foreground tabular-nums">
          {format(dataHora, "dd/MM/yyyy HH:mm")}
        </p>
        {item.notas && (
          <p className="text-xs text-muted-foreground truncate max-w-[180px]">{item.notas}</p>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0 ml-2">
        <StatusDot status={item.status} />
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {showCheckin && item.status !== "confirmado" && item.status !== "concluido" && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1 text-xs"
            onClick={() => onCheckin?.(item)}
          >
            <LogIn className="h-3.5 w-3.5" />
            Check-in
          </Button>
        )}
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
        {showDelete && (
          <>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" title="Excluir" onClick={() => setConfirmOpen(true)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
            <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Excluir reserva?</DialogTitle>
                  <DialogDescription>
                    Esta ação não poderá ser desfeita. A exclusão também irá apagar faturas e registros de serviço relacionados a este agendamento.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancelar</Button>
                  <Button variant="destructive" onClick={() => { setConfirmOpen(false); onDelete?.(item.id); }}>
                    Excluir
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>
    </div>
  );
}
