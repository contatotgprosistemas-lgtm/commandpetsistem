import { useEffect, useState } from "react";
import { MetricCard } from "@/components/MetricCard";
import { MessageSquare, PawPrint, DollarSign, Users, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format } from "date-fns";

interface PetNaEmpresa {
  id: string;
  tipo_servico: string;
  data_hora: string;
  baia: string | null;
  pet: { id: string; nome: string; raca: string | null; especie: string } | null;
  cliente: { id: string; nome: string; whatsapp: string | null } | null;
}

export default function Dashboard() {
  const [petsNaEmpresa, setPetsNaEmpresa] = useState<PetNaEmpresa[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchPetsNaEmpresa() {
    const { data } = await supabase
      .from("agendamentos")
      .select("id, tipo_servico, data_hora, baia, pet:pets(id, nome, raca, especie), cliente:clientes(id, nome, whatsapp)")
      .eq("status", "confirmado")
      .order("data_hora", { ascending: true });
    setPetsNaEmpresa((data as any) ?? []);
    setLoading(false);
  }

  useEffect(() => { fetchPetsNaEmpresa(); }, []);

  async function handleCheckout(id: string) {
    const { error } = await supabase.from("agendamentos").update({ status: "concluido" }).eq("id", id);
    if (error) {
      toast.error("Erro ao fazer checkout: " + error.message);
    } else {
      toast.success("Checkout realizado!");
      fetchPetsNaEmpresa();
    }
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
                  <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => handleCheckout(item.id)}>
                    <LogOut className="h-3.5 w-3.5" />
                    Checkout
                  </Button>
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
    </div>
  );
}