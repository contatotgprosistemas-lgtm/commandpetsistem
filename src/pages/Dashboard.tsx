import { useEffect, useState } from "react";
import { MetricCard } from "@/components/MetricCard";
import { MessageSquare, PawPrint, DollarSign, Users, LogOut, ClipboardList, Stethoscope, FileText, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format } from "date-fns";
import { ManejoDialog } from "@/components/ManejoDialog";
import { ChecklistDialog } from "@/components/ChecklistDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EditarAgendamentoDialog } from "@/components/EditarAgendamentoDialog";

interface PetNaEmpresa {
  id: string;
  tipo_servico: string;
  data_hora: string;
  baia: string | null;
  valor: number | null;
  empresa_id: string;
  cliente_id: string;
  pet_id: string;
  notas: string | null;
  forma_pagamento: string | null;
  data_entrada: string | null;
  data_saida_provavel: string | null;
  hora_entrada: string | null;
  hora_saida_provavel: string | null;
  pet: { id: string; nome: string; raca: string | null; especie: string } | null;
  cliente: { id: string; nome: string; whatsapp: string | null } | null;
}

export default function Dashboard() {
  const [petsNaEmpresa, setPetsNaEmpresa] = useState<PetNaEmpresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [manejoOpen, setManejoOpen] = useState<PetNaEmpresa | null>(null);
  const [checklistOpen, setChecklistOpen] = useState<PetNaEmpresa | null>(null);
  const [fichaOpen, setFichaOpen] = useState<PetNaEmpresa | null>(null);
  const [editOpen, setEditOpen] = useState<PetNaEmpresa | null>(null);

  async function fetchPetsNaEmpresa() {
    const { data } = await supabase
      .from("agendamentos")
      .select("id, tipo_servico, data_hora, baia, valor, empresa_id, cliente_id, pet_id, notas, forma_pagamento, data_entrada, data_saida_provavel, hora_entrada, hora_saida_provavel, pet:pets(id, nome, raca, especie), cliente:clientes(id, nome, whatsapp)")
      .eq("status", "confirmado")
      .order("data_hora", { ascending: true });
    setPetsNaEmpresa((data as any) ?? []);
    setLoading(false);
  }

  useEffect(() => { fetchPetsNaEmpresa(); }, []);

  async function handleCheckout(item: PetNaEmpresa) {
    const now = new Date();
    const horaSaida = format(now, "HH:mm");
    // Update status to concluido and record exit time
    const { error } = await supabase.from("agendamentos").update({
      status: "concluido",
      data_saida: now.toISOString(),
      hora_saida: horaSaida,
    }).eq("id", item.id);
    if (error) {
      toast.error("Erro ao fazer checkout: " + error.message);
      return;
    }

    // Update existing history record with checkout info, or insert new one
    const { data: existing } = await supabase
      .from("historico_servicos")
      .select("id")
      .eq("agendamento_id", item.id)
      .maybeSingle();

    if (existing) {
      await supabase.from("historico_servicos").update({
        notas: `Check-in: ${item.data_entrada ? format(new Date(item.data_entrada), "dd/MM/yyyy") : "—"} ${item.hora_entrada ?? ""} | Check-out: ${format(now, "dd/MM/yyyy")} ${horaSaida}`,
      } as any).eq("id", existing.id);
    } else {
      await supabase.from("historico_servicos" as any).insert({
        empresa_id: item.empresa_id,
        cliente_id: item.cliente_id,
        pet_id: item.pet_id,
        tipo_servico: item.tipo_servico,
        valor: item.valor,
        data_servico: item.data_hora,
        agendamento_id: item.id,
        notas: `Check-out: ${format(now, "dd/MM/yyyy")} ${horaSaida}`,
      } as any);
    }

    toast.success("Checkout realizado!");
    fetchPetsNaEmpresa();
  }

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral do dia — {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Chats Ativos" value="0" change="—" changeType="neutral" icon={<MessageSquare className="h-4 w-4" strokeWidth={1.5} />} />
        <MetricCard title="Pets na Empresa" value={String(petsNaEmpresa.length)} change="—" changeType="neutral" icon={<PawPrint className="h-4 w-4" strokeWidth={1.5} />} />
        <MetricCard title="Faturamento Hoje" value="R$ 0" change="—" changeType="neutral" icon={<DollarSign className="h-4 w-4" strokeWidth={1.5} />} />
        <MetricCard title="Contas Pendentes" value="0" change="—" changeType="neutral" icon={<Users className="h-4 w-4" strokeWidth={1.5} />} />
      </div>

      <div className="bg-card rounded-lg shadow-card">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-medium text-foreground">Pets na Empresa ({petsNaEmpresa.length})</h2>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">Carregando...</div>
        ) : petsNaEmpresa.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            Nenhum pet na empresa no momento
          </div>
        ) : (
          <div className="divide-y divide-border">
            {petsNaEmpresa.map(item => {
              const petName = item.pet?.nome ?? "Pet";
              const initials = petName.slice(0, 2).toUpperCase();
              return (
                <div key={item.id} className="flex items-center gap-4 px-5 py-3 hover:bg-muted/30 transition-colors">
                  <Avatar className="h-10 w-10 border border-border">
                    <AvatarFallback className="bg-accent text-accent-foreground text-xs font-semibold">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{petName} {item.pet?.raca ? `(${item.pet.raca})` : ""}</p>
                    <p className="text-xs text-muted-foreground">{item.tipo_servico} · Tutor: {item.cliente?.nome ?? "—"} {item.baia ? `· Baia: ${item.baia}` : ""}</p>
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums">{format(new Date(item.data_hora), "HH:mm")}</span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title="Ficha do Serviço"
                      onClick={() => setFichaOpen(item)}
                    >
                      <FileText className="h-3.5 w-3.5 text-primary" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title="Manejo (Boletim Diário)"
                      onClick={() => setManejoOpen(item)}
                    >
                      <Stethoscope className="h-3.5 w-3.5 text-primary" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title="Checklist"
                      onClick={() => setChecklistOpen(item)}
                    >
                      <ClipboardList className="h-3.5 w-3.5 text-primary" />
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => handleCheckout(item)}>
                      <LogOut className="h-3.5 w-3.5" />
                      Checkout
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-card rounded-lg p-5 shadow-card">
          <h2 className="text-sm font-medium text-foreground mb-4">Faturamento Semanal</h2>
          <div className="flex items-center justify-center h-[220px] text-sm text-muted-foreground">
            Sem dados para exibir
          </div>
        </div>

        <div className="bg-card rounded-lg p-5 shadow-card">
          <h2 className="text-sm font-medium text-foreground mb-4">Atividades Recentes</h2>
          <div className="flex items-center justify-center h-[160px] text-sm text-muted-foreground">
            Nenhuma atividade recente
          </div>
        </div>
      </div>

      {manejoOpen && (
        <ManejoDialog
          open={!!manejoOpen}
          onOpenChange={() => setManejoOpen(null)}
          agendamentoId={manejoOpen.id}
          petId={manejoOpen.pet?.id ?? ""}
          petName={manejoOpen.pet?.nome ?? "Pet"}
        />
      )}
      {checklistOpen && (
        <ChecklistDialog
          open={!!checklistOpen}
          onOpenChange={() => setChecklistOpen(null)}
          agendamentoId={checklistOpen.id}
          petId={checklistOpen.pet?.id ?? ""}
          petName={checklistOpen.pet?.nome ?? "Pet"}
        />
      )}

      <Dialog open={!!fichaOpen} onOpenChange={() => setFichaOpen(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ficha do Serviço</DialogTitle>
          </DialogHeader>
          {fichaOpen && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-muted-foreground text-xs">Pet</p>
                  <p className="font-medium text-foreground">{fichaOpen.pet?.nome ?? "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Espécie / Raça</p>
                  <p className="font-medium text-foreground">{fichaOpen.pet?.especie ?? "—"} {fichaOpen.pet?.raca ? `· ${fichaOpen.pet.raca}` : ""}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Tutor</p>
                  <p className="font-medium text-foreground">{fichaOpen.cliente?.nome ?? "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">WhatsApp</p>
                  <p className="font-medium text-foreground">{fichaOpen.cliente?.whatsapp ?? "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Serviço</p>
                  <p className="font-medium text-foreground">{fichaOpen.tipo_servico}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Valor</p>
                  <p className="font-medium text-foreground">{fichaOpen.valor != null ? `R$ ${Number(fichaOpen.valor).toFixed(2)}` : "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Baia</p>
                  <p className="font-medium text-foreground">{fichaOpen.baia ?? "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Forma de Pagamento</p>
                  <p className="font-medium text-foreground">{fichaOpen.forma_pagamento ?? "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Entrada</p>
                  <p className="font-medium text-foreground">
                    {fichaOpen.data_entrada ? format(new Date(fichaOpen.data_entrada), "dd/MM/yyyy") : "—"}
                    {fichaOpen.hora_entrada ? ` às ${fichaOpen.hora_entrada}` : ""}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Saída Provável</p>
                  <p className="font-medium text-foreground">
                    {fichaOpen.data_saida_provavel ? format(new Date(fichaOpen.data_saida_provavel), "dd/MM/yyyy") : "—"}
                    {fichaOpen.hora_saida_provavel ? ` às ${fichaOpen.hora_saida_provavel}` : ""}
                  </p>
                </div>
              </div>
              {fichaOpen.notas && (
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Observações</p>
                  <p className="text-foreground bg-muted/50 rounded-md p-2 whitespace-pre-wrap">{fichaOpen.notas}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
