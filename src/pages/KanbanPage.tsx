import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Plus, User, DollarSign, GripVertical, Phone, Mail, MessageCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const KANBAN_STAGES = [
  { key: "novo_lead", label: "Novo Lead", color: "border-t-blue-500", bg: "bg-blue-500/10" },
  { key: "contato_iniciado", label: "Contato Iniciado", color: "border-t-cyan-500", bg: "bg-cyan-500/10" },
  { key: "qualificacao", label: "Qualificação", color: "border-t-amber-500", bg: "bg-amber-500/10" },
  { key: "proposta", label: "Proposta", color: "border-t-orange-500", bg: "bg-orange-500/10" },
  { key: "negociacao", label: "Negociação", color: "border-t-purple-500", bg: "bg-purple-500/10" },
  { key: "fechado_ganho", label: "Fechado Ganho", color: "border-t-emerald-500", bg: "bg-emerald-500/10" },
  { key: "fechado_perdido", label: "Fechado Perdido", color: "border-t-red-500", bg: "bg-red-500/10" },
];

type FunilItem = {
  id: string;
  cliente_id: string;
  estagio: string;
  valor_estimado: number | null;
  notas: string | null;
  updated_at: string;
  cliente?: { id: string; nome: string; email: string | null; whatsapp: string | null } | null;
};

export default function KanbanPage() {
  const { profile } = useAuth();
  const empresaId = profile?.empresa_id;
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedClienteId, setSelectedClienteId] = useState("");
  const [valorEstimado, setValorEstimado] = useState("");
  const [estagio, setEstagio] = useState("novo_lead");

  // Fetch funnel items with client data
  const { data: funilItems, isLoading } = useQuery({
    queryKey: ["kanban-funil", empresaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("funil_vendas")
        .select("*, cliente:cliente_id(id, nome, email, whatsapp)")
        .eq("empresa_id", empresaId!)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as FunilItem[];
    },
    enabled: !!empresaId,
  });

  // Fetch clients for add dialog
  const { data: clientes } = useQuery({
    queryKey: ["clientes-kanban", empresaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clientes")
        .select("id, nome, whatsapp")
        .eq("empresa_id", empresaId!)
        .order("nome");
      if (error) throw error;
      return data;
    },
    enabled: !!empresaId,
  });

  // Move item mutation
  const moveItem = useMutation({
    mutationFn: async ({ id, estagio }: { id: string; estagio: string }) => {
      const { error } = await supabase
        .from("funil_vendas")
        .update({ estagio, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;

      // Log interaction
      const item = funilItems?.find(f => f.id === id);
      if (item) {
        await supabase.from("historico_interacoes").insert({
          cliente_id: item.cliente_id,
          empresa_id: empresaId!,
          tipo: "funil",
          descricao: `Movido para: ${KANBAN_STAGES.find(s => s.key === estagio)?.label}`,
          user_id: profile?.id,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kanban-funil"] });
    },
    onError: () => toast.error("Erro ao mover lead"),
  });

  // Add to funnel mutation
  const addToFunnel = useMutation({
    mutationFn: async () => {
      if (!selectedClienteId || !empresaId) throw new Error("Dados faltando");
      const { error } = await supabase.from("funil_vendas").insert({
        cliente_id: selectedClienteId,
        empresa_id: empresaId,
        estagio,
        valor_estimado: valorEstimado ? parseFloat(valorEstimado) : 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kanban-funil"] });
      setAddDialogOpen(false);
      setSelectedClienteId("");
      setValorEstimado("");
      setEstagio("novo_lead");
      toast.success("Lead adicionado ao funil");
    },
    onError: () => toast.error("Erro ao adicionar lead"),
  });

  const getItemsByStage = (stage: string) =>
    funilItems?.filter(item => item.estagio === stage) ?? [];

  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    setDraggedItem(itemId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", itemId);
  };

  const handleDragOver = (e: React.DragEvent, stage: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverStage(stage);
  };

  const handleDragLeave = () => {
    setDragOverStage(null);
  };

  const handleDrop = (e: React.DragEvent, stage: string) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData("text/plain");
    if (itemId && draggedItem) {
      const item = funilItems?.find(f => f.id === itemId);
      if (item && item.estagio !== stage) {
        moveItem.mutate({ id: itemId, estagio: stage });
      }
    }
    setDraggedItem(null);
    setDragOverStage(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverStage(null);
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  // Totals per stage
  const getStageTotals = (stage: string) => {
    const items = getItemsByStage(stage);
    const total = items.reduce((sum, item) => sum + (item.valor_estimado || 0), 0);
    return { count: items.length, total };
  };

  // Clients not yet in funnel
  const clientesDisponiveis = clientes?.filter(
    c => !funilItems?.some(f => f.cliente_id === c.id)
  );

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="h-14 px-6 flex items-center justify-between border-b border-border bg-card shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Pipeline de Vendas</h1>
          <p className="text-xs text-muted-foreground">
            {funilItems?.length ?? 0} leads • {formatCurrency(funilItems?.reduce((s, i) => s + (i.valor_estimado || 0), 0) ?? 0)} total
          </p>
        </div>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Novo Lead
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Lead ao Funil</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Cliente</label>
                <Select value={selectedClienteId} onValueChange={setSelectedClienteId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientesDisponiveis?.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome} {c.telefone ? `(${c.telefone})` : ""}
                      </SelectItem>
                    ))}
                    {!clientesDisponiveis?.length && (
                      <SelectItem value="_none" disabled>Nenhum cliente disponível</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Etapa</label>
                <Select value={estagio} onValueChange={setEstagio}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {KANBAN_STAGES.map(s => (
                      <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Valor Estimado (R$)</label>
                <Input
                  type="number"
                  value={valorEstimado}
                  onChange={e => setValorEstimado(e.target.value)}
                  placeholder="0,00"
                  min="0"
                  step="0.01"
                />
              </div>
              <Button
                className="w-full"
                disabled={!selectedClienteId || addToFunnel.isPending}
                onClick={() => addToFunnel.mutate()}
              >
                Adicionar ao Funil
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto p-4">
        <div className="flex gap-4 h-full min-w-max">
          {KANBAN_STAGES.map(stage => {
            const { count, total } = getStageTotals(stage.key);
            const items = getItemsByStage(stage.key);
            const isOver = dragOverStage === stage.key;

            return (
              <div
                key={stage.key}
                className={`w-[260px] flex flex-col rounded-lg border border-border bg-muted/30 shrink-0 transition-colors ${
                  isOver ? "bg-primary/5 border-primary/30" : ""
                }`}
                onDragOver={e => handleDragOver(e, stage.key)}
                onDragLeave={handleDragLeave}
                onDrop={e => handleDrop(e, stage.key)}
              >
                {/* Column header */}
                <div className={`px-3 py-2.5 border-t-[3px] rounded-t-lg ${stage.color}`}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-foreground">{stage.label}</h3>
                    <span className="min-w-[22px] h-[22px] flex items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                      {count}
                    </span>
                  </div>
                  {total > 0 && (
                    <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                      {formatCurrency(total)}
                    </p>
                  )}
                </div>

                {/* Cards */}
                <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[100px]">
                  {items.map(item => (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={e => handleDragStart(e, item.id)}
                      onDragEnd={handleDragEnd}
                      className={`rounded-md border border-border bg-card p-3 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-all group ${
                        draggedItem === item.id ? "opacity-40 scale-95" : ""
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground/30 mt-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <User className="h-3 w-3 text-primary" />
                            </div>
                              <span className="text-sm font-medium text-foreground truncate">
                                {item.cliente?.nome ?? "Sem nome"}
                              </span>
                            </div>
                            {(item.cliente?.telefone || item.cliente?.whatsapp) && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const phone = item.cliente?.whatsapp || item.cliente?.telefone || "";
                                  navigate(`/crm?phone=${encodeURIComponent(phone)}`);
                                }}
                                className="shrink-0 h-6 w-6 rounded-full flex items-center justify-center hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                                title="Abrir conversa no CRM"
                              >
                                <MessageCircle className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>

                          {item.cliente?.telefone && (
                            <div className="flex items-center gap-1 mt-1.5">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              <span className="text-[11px] text-muted-foreground font-mono">{item.cliente.telefone}</span>
                            </div>
                          )}
                          {item.cliente?.email && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <Mail className="h-3 w-3 text-muted-foreground" />
                              <span className="text-[11px] text-muted-foreground truncate">{item.cliente.email}</span>
                            </div>
                          )}

                          {(item.valor_estimado ?? 0) > 0 && (
                            <div className="flex items-center gap-1 mt-1.5">
                              <DollarSign className="h-3 w-3 text-emerald-500" />
                              <span className="text-xs font-semibold text-emerald-600">
                                {formatCurrency(item.valor_estimado!)}
                              </span>
                            </div>
                          )}

                          {item.notas && (
                            <p className="text-[10px] text-muted-foreground mt-1.5 line-clamp-2">{item.notas}</p>
                          )}

                          <p className="text-[10px] text-muted-foreground/50 mt-1.5 font-mono">
                            {format(new Date(item.updated_at), "dd/MM HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}

                  {items.length === 0 && !isLoading && (
                    <div className="flex items-center justify-center py-8">
                      <p className="text-[11px] text-muted-foreground/50">Arraste leads aqui</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
