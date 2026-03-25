import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOperationalAuth } from "@/hooks/useOperationalAuth";
import { AgendaCalendar } from "@/components/agenda/AgendaCalendar";
import { NovoAgendamentoDialog } from "@/components/NovoAgendamentoDialog";
import { EditarAgendamentoDialog } from "@/components/EditarAgendamentoDialog";
import { Skeleton } from "@/components/ui/skeleton";

export default function OperacionalAgendaPage() {
  const { user } = useOperationalAuth();
  const [agendamentos, setAgendamentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAgendamento, setEditingAgendamento] = useState<any>(null);

  const fetchAgendamentos = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("agendamentos")
      .select("id, data_hora, tipo_servico, status, notas, valor, empresa_id, cliente_id, pet_id, data_entrada, hora_entrada, data_saida_provavel, hora_saida_provavel, baia, forma_pagamento, duracao_min, subscription_id, pet:pets(id, nome, raca, especie, foto_url), cliente:clientes(id, nome, whatsapp, foto_url)")
      .eq("empresa_id", user.empresa_id)
      .order("data_hora", { ascending: true });
    setAgendamentos(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchAgendamentos(); }, [user]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[400px] rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 md:pb-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Agenda</h1>
        <NovoAgendamentoDialog onSuccess={fetchAgendamentos} />
      </div>

      <AgendaCalendar
        agendamentos={agendamentos}
        onEditAgendamento={(a) => setEditingAgendamento(a)}
      />

      <EditarAgendamentoDialog
        agendamento={editingAgendamento}
        open={!!editingAgendamento}
        onOpenChange={(o) => { if (!o) setEditingAgendamento(null); }}
        onSuccess={() => { setEditingAgendamento(null); fetchAgendamentos(); }}
      />
    </div>
  );
}
