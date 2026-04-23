import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Plus, User, DollarSign, GripVertical, Phone, Mail, MessageCircle, Pencil, Trash2, MoreVertical, Building2, Tag, StickyNote } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const STAGE_COLOR_OPTIONS = [
  { label: "Azul", value: "border-t-blue-500" },
  { label: "Ciano", value: "border-t-cyan-500" },
  { label: "Âmbar", value: "border-t-amber-500" },
  { label: "Laranja", value: "border-t-orange-500" },
  { label: "Roxo", value: "border-t-purple-500" },
  { label: "Verde", value: "border-t-emerald-500" },
  { label: "Vermelho", value: "border-t-red-500" },
  { label: "Rosa", value: "border-t-pink-500" },
  { label: "Cinza", value: "border-t-slate-500" },
];

type Stage = {
  id: string;
  key: string;
  label: string;
  color: string;
  ordem: number;
  is_default: boolean;
};

type FunilItem = {
  id: string;
  cliente_id: string | null;
  crm_contato_id: string | null;
  estagio: string;
  valor_estimado: number | null;
  notas: string | null;
  updated_at: string;
  cliente?: { id: string; nome: string; email: string | null; whatsapp: string | null } | null;
  crm_contato?: { id: string; nome: string; telefone: string | null; email: string | null; empresa: string | null; origem: string | null } | null;
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
  const [editItem, setEditItem] = useState<FunilItem | null>(null);
  const [editValor, setEditValor] = useState("");
  const [editEstagio, setEditEstagio] = useState("novo_lead");
  const [editNotas, setEditNotas] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<FunilItem | null>(null);
  const [stageDialogOpen, setStageDialogOpen] = useState(false);
  const [editStage, setEditStage] = useState<Stage | null>(null);
  const [stageForm, setStageForm] = useState({ label: "", color: "border-t-blue-500" });
  const [deleteStageConfirm, setDeleteStageConfirm] = useState<Stage | null>(null);

  // Fetch stages
  const { data: stages } = useQuery({
    queryKey: ["funil-estagios", empresaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("funil_estagios")
        .select("*")
        .eq("empresa_id", empresaId!)
        .order("ordem", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Stage[];
    },
    enabled: !!empresaId,
  });

  const KANBAN_STAGES = stages ?? [];

  // Fetch funnel items with client data
  const { data: funilItems, isLoading } = useQuery({
    queryKey: ["kanban-funil", empresaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("funil_vendas")
        .select("*, cliente:cliente_id(id, nome, email, whatsapp), crm_contato:crm_contato_id(id, nome, telefone, email, empresa, origem)")
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

  // Edit funnel item mutation
  const updateItem = useMutation({
    mutationFn: async () => {
      if (!editItem) throw new Error("Item não encontrado");
      const { error } = await supabase
        .from("funil_vendas")
        .update({
          estagio: editEstagio,
          valor_estimado: editValor ? parseFloat(editValor) : 0,
          notas: editNotas || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editItem.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kanban-funil"] });
      setEditItem(null);
      toast.success("Card atualizado");
    },
    onError: () => toast.error("Erro ao atualizar card"),
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("funil_vendas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kanban-funil"] });
      setEditItem(null);
      toast.success("Card removido");
    },
    onError: () => toast.error("Erro ao remover card"),
  });

  // Stage mutations
  const saveStage = useMutation({
    mutationFn: async () => {
      if (!empresaId) throw new Error("Sem empresa");
      if (!stageForm.label.trim()) throw new Error("Nome obrigatório");
      if (editStage) {
        const { error } = await supabase
          .from("funil_estagios")
          .update({ label: stageForm.label.trim(), color: stageForm.color })
          .eq("id", editStage.id);
        if (error) throw error;
      } else {
        const key = stageForm.label.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/(^_|_$)/g, "") + "_" + Date.now().toString(36);
        const maxOrdem = (stages ?? []).reduce((m, s) => Math.max(m, s.ordem), 0);
        const { error } = await supabase.from("funil_estagios").insert({
          empresa_id: empresaId,
          key,
          label: stageForm.label.trim(),
          color: stageForm.color,
          ordem: maxOrdem + 1,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["funil-estagios"] });
      setStageDialogOpen(false);
      setEditStage(null);
      setStageForm({ label: "", color: "border-t-blue-500" });
      toast.success("Etapa salva");
    },
    onError: (e: Error) => toast.error(e.message || "Erro ao salvar etapa"),
  });

  const deleteStage = useMutation({
    mutationFn: async (stage: Stage) => {
      const itemsInStage = (funilItems ?? []).filter(f => f.estagio === stage.key);
      if (itemsInStage.length > 0) {
        throw new Error(`Existem ${itemsInStage.length} card(s) nesta etapa. Mova-os antes de excluir.`);
      }
      const { error } = await supabase.from("funil_estagios").delete().eq("id", stage.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["funil-estagios"] });
      setDeleteStageConfirm(null);
      toast.success("Etapa removida");
    },
    onError: (e: Error) => toast.error(e.message || "Erro ao remover etapa"),
  });

  const openEditStage = (stage: Stage) => {
    setEditStage(stage);
    setStageForm({ label: stage.label, color: stage.color });
    setStageDialogOpen(true);
  };

  const openNewStage = () => {
    setEditStage(null);
    setStageForm({ label: "", color: "border-t-blue-500" });
    setStageDialogOpen(true);
  };

  const openEdit = (item: FunilItem) => {
    setEditItem(item);
    setEditValor(item.valor_estimado ? String(item.valor_estimado) : "");
    setEditEstagio(item.estagio);
    setEditNotas(item.notas ?? "");
  };

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
                        {c.nome} {c.whatsapp ? `(${c.whatsapp})` : ""}
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
                  <div className="flex items-center justify-between gap-1">
                    <h3 className="text-xs font-semibold text-foreground truncate flex-1">{stage.label}</h3>
                    <span className="min-w-[22px] h-[22px] flex items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                      {count}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          title="Opções da etapa"
                        >
                          <MoreVertical className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem onSelect={() => openEditStage(stage)}>
                          <Pencil className="h-3.5 w-3.5 mr-2" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onSelect={() => setDeleteStageConfirm(stage)}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {total > 0 && (
                    <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                      {formatCurrency(total)}
                    </p>
                  )}
                </div>

                {/* Cards */}
                <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[100px]">
                  {items.map(item => {
                    const displayName = item.cliente?.nome ?? item.crm_contato?.nome ?? "Sem nome";
                    const displayPhone = item.cliente?.whatsapp ?? item.crm_contato?.telefone ?? null;
                    const displayEmail = item.cliente?.email ?? item.crm_contato?.email ?? null;
                    const displayCompany = item.crm_contato?.empresa ?? null;
                    const displayOrigem = item.crm_contato?.origem ?? null;
                    const isCrmOnly = !item.cliente_id && !!item.crm_contato_id;
                    return (
                    <div
                      key={item.id}
                      className={`rounded-md border border-border bg-card p-3 shadow-sm hover:shadow-md transition-all group ${
                        draggedItem === item.id ? "opacity-40 scale-95" : ""
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <div
                          draggable
                          onDragStart={e => handleDragStart(e, item.id)}
                          onDragEnd={handleDragEnd}
                          className="cursor-grab active:cursor-grabbing pt-0.5 shrink-0"
                          title="Arraste para mover"
                        >
                          <GripVertical className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <User className="h-3 w-3 text-primary" />
                            </div>
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-foreground truncate leading-tight">
                                  {displayName}
                                </div>
                                {isCrmOnly && (
                                  <div className="text-[9px] uppercase tracking-wide text-amber-600 dark:text-amber-400 font-semibold">
                                    Lead CRM
                                  </div>
                                )}
                                {!isCrmOnly && item.cliente_id && (
                                  <div className="text-[9px] uppercase tracking-wide text-emerald-600 dark:text-emerald-400 font-semibold">
                                    Cliente
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-0.5 shrink-0">
                              {displayPhone && (
                                <button
                                  type="button"
                                  onClick={() => navigate(`/crm?phone=${encodeURIComponent(displayPhone)}`)}
                                  className="h-7 w-7 rounded-full flex items-center justify-center hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                                  title="Abrir conversa no CRM"
                                >
                                  <MessageCircle className="h-3.5 w-3.5" />
                                </button>
                              )}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    title="Mais ações"
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-40">
                                  <DropdownMenuItem onSelect={() => openEdit(item)}>
                                    <Pencil className="h-3.5 w-3.5 mr-2" /> Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onSelect={() => setDeleteConfirm(item)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>

                          {displayPhone && (
                            <div className="flex items-center gap-1 mt-1.5">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              <a
                                href={`https://wa.me/${displayPhone.replace(/\D/g, "")}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[11px] text-muted-foreground hover:text-primary font-mono truncate"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {displayPhone}
                              </a>
                            </div>
                          )}
                          {displayEmail && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <Mail className="h-3 w-3 text-muted-foreground" />
                              <span className="text-[11px] text-muted-foreground truncate">{displayEmail}</span>
                            </div>
                          )}
                          {displayCompany && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <Building2 className="h-3 w-3 text-muted-foreground" />
                              <span className="text-[11px] text-muted-foreground truncate">{displayCompany}</span>
                            </div>
                          )}
                          {displayOrigem && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <Tag className="h-3 w-3 text-muted-foreground" />
                              <span className="text-[11px] text-muted-foreground truncate">{displayOrigem}</span>
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
                            <div className="flex items-start gap-1 mt-1.5">
                              <StickyNote className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
                              <p className="text-[10px] text-muted-foreground line-clamp-2">{item.notas}</p>
                            </div>
                          )}

                          <p className="text-[10px] text-muted-foreground/50 mt-1.5 font-mono">
                            Atualizado {format(new Date(item.updated_at), "dd/MM HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                    </div>
                    );
                  })}

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

      {/* Edit Card Dialog */}
      <Dialog open={!!editItem} onOpenChange={(o) => !o && setEditItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Card • {editItem?.cliente?.nome ?? editItem?.crm_contato?.nome ?? ""}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Etapa</label>
              <Select value={editEstagio} onValueChange={setEditEstagio}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
                value={editValor}
                onChange={e => setEditValor(e.target.value)}
                placeholder="0,00"
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Notas</label>
              <Textarea
                value={editNotas}
                onChange={e => setEditNotas(e.target.value)}
                placeholder="Anotações sobre este lead..."
                rows={3}
              />
            </div>
            <div className="flex items-center justify-between gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => editItem && deleteItem.mutate(editItem.id)}
                disabled={deleteItem.isPending}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Remover
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditItem(null)}>Cancelar</Button>
                <Button size="sm" onClick={() => updateItem.mutate()} disabled={updateItem.isPending}>
                  Salvar
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(o) => !o && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir card?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o card de <strong>{deleteConfirm?.cliente?.nome ?? deleteConfirm?.crm_contato?.nome ?? "este lead"}</strong> do funil? Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteConfirm) deleteItem.mutate(deleteConfirm.id);
                setDeleteConfirm(null);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
