import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, UserCheck, ArrowRightLeft, CheckCircle, Clock, CirclePause, XCircle } from "lucide-react";
import { toast } from "sonner";

interface ConversationActionsProps {
  conversaId: string;
  currentAtendenteId: string | null;
  currentStatus: string;
}

const STATUS_OPTIONS = [
  { key: "novo", label: "Novo", icon: Clock, color: "text-primary" },
  { key: "em_atendimento", label: "Em Atendimento", icon: CheckCircle, color: "text-success" },
  { key: "aguardando", label: "Aguardando", icon: CirclePause, color: "text-warning" },
  { key: "finalizado", label: "Finalizado", icon: XCircle, color: "text-muted-foreground" },
];

export function ConversationActions({ conversaId, currentAtendenteId, currentStatus }: ConversationActionsProps) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const empresaId = profile?.empresa_id;

  const { data: atendentes } = useQuery({
    queryKey: ["atendentes", empresaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, nome, cargo")
        .eq("empresa_id", empresaId!)
        .eq("status", "ativo");
      if (error) throw error;
      return (data ?? []).filter((a: any) => (a.cargo ?? "").toLowerCase() !== "cliente");
    },
    enabled: !!empresaId,
  });

  const updateConversa = useMutation({
    mutationFn: async (updates: { status?: string; atendente_id?: string | null }) => {
      const { error } = await supabase
        .from("conversas")
        .update(updates)
        .eq("id", conversaId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversas"] });
    },
  });

  const handleAssignToMe = () => {
    if (!profile?.id) return;
    updateConversa.mutate(
      { atendente_id: profile.id, status: "em_atendimento" },
      { onSuccess: () => toast.success("Conversa atribuída a você") }
    );
  };

  const handleTransfer = (atendenteId: string, nome: string) => {
    updateConversa.mutate(
      { atendente_id: atendenteId },
      { onSuccess: () => toast.success(`Transferida para ${nome}`) }
    );
  };

  const handleChangeStatus = (status: string) => {
    updateConversa.mutate(
      { status },
      { onSuccess: () => toast.success("Status atualizado") }
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="h-9 w-9 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground">
          <MoreVertical className="h-[18px] w-[18px]" strokeWidth={1.5} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={handleAssignToMe}>
          <UserCheck className="h-4 w-4 mr-2" />
          Atribuir a mim
        </DropdownMenuItem>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <ArrowRightLeft className="h-4 w-4 mr-2" />
            Transferir para
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {atendentes?.filter(a => a.id !== currentAtendenteId).map(a => (
              <DropdownMenuItem key={a.id} onClick={() => handleTransfer(a.id, a.nome)}>
                {a.nome}
                {a.cargo && <span className="ml-auto text-xs text-muted-foreground">{a.cargo}</span>}
              </DropdownMenuItem>
            ))}
            {!atendentes?.length && (
              <DropdownMenuItem disabled>Nenhum atendente disponível</DropdownMenuItem>
            )}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator />

        {STATUS_OPTIONS.map(opt => (
          <DropdownMenuItem
            key={opt.key}
            onClick={() => handleChangeStatus(opt.key)}
            disabled={currentStatus === opt.key}
          >
            <opt.icon className={`h-4 w-4 mr-2 ${opt.color}`} />
            {opt.label}
            {currentStatus === opt.key && <span className="ml-auto text-xs text-muted-foreground">atual</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
