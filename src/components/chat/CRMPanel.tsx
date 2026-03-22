import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  User, TrendingUp, DollarSign,
  Phone, Mail, MapPin, Tag, ChevronRight,
  Plus, Calendar,
  CheckCircle2, Circle,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const FUNNEL_STAGES = [
  { key: "novo_lead", label: "Novo Lead", color: "bg-muted text-muted-foreground" },
  { key: "contato_iniciado", label: "Contato Iniciado", color: "bg-primary/10 text-primary" },
  { key: "qualificacao", label: "Qualificação", color: "bg-primary/10 text-primary" },
  { key: "proposta", label: "Proposta", color: "bg-warning/10 text-warning" },
  { key: "negociacao", label: "Negociação", color: "bg-warning/10 text-warning" },
  { key: "fechado_ganho", label: "Fechado Ganho", color: "bg-success/10 text-success" },
  { key: "fechado_perdido", label: "Fechado Perdido", color: "bg-destructive/10 text-destructive" },
];

const PRIORITY_CONFIG: Record<string, { icon: string }> = {
  alta: { icon: "🔴" },
  media: { icon: "🟡" },
  baixa: { icon: "🟢" },
};

type Task = { id: string; title: string; description: string | null; due_date: string | null; priority: string; status: string; assigned: { nome: string } | null };

interface CRMPanelProps {
  clienteId: string | null;
  telefone?: string;
}

export function CRMPanel({ clienteId, telefone }: CRMPanelProps) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const empresaId = profile?.empresa_id;
  const [newNote, setNewNote] = useState("");
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskDue, setTaskDue] = useState("");
  const [taskPriority, setTaskPriority] = useState("media");

  const { data: cliente, isLoading } = useQuery({
    queryKey: ["crm-cliente", clienteId],
    queryFn: async () => {
      if (!clienteId) return null;
      const { data, error } = await supabase.from("clientes").select("*").eq("id", clienteId).single();
      if (error) throw error;
      return data;
    },
    enabled: !!clienteId,
  });

  const { data: funil } = useQuery({
    queryKey: ["crm-funil", clienteId],
    queryFn: async () => {
      if (!clienteId) return null;
      const { data } = await supabase.from("funil_vendas").select("*").eq("cliente_id", clienteId).order("updated_at", { ascending: false }).limit(1).maybeSingle();
      return data;
    },
    enabled: !!clienteId,
  });

  const { data: notas } = useQuery({
    queryKey: ["crm-notas", clienteId],
    queryFn: async () => {
      if (!clienteId) return [];
      const { data } = await supabase.from("notas_contato").select("*, profiles:autor_id(nome)").eq("cliente_id", clienteId).order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!clienteId,
  });

  const { data: tasks } = useQuery({
    queryKey: ["crm-tasks", clienteId],
    queryFn: async () => {
      if (!clienteId) return [];
      const { data } = await (supabase as any).from("contact_tasks").select("*, assigned:assigned_user_id(nome)").eq("cliente_id", clienteId).order("due_date", { ascending: true });
      return (data ?? []) as Task[];
    },
    enabled: !!clienteId,
  });

  const { data: historico } = useQuery({
    queryKey: ["crm-historico", clienteId],
    queryFn: async () => {
      if (!clienteId) return [];
      const { data } = await supabase.from("historico_interacoes").select("*, profiles:user_id(nome)").eq("cliente_id", clienteId).order("created_at", { ascending: false }).limit(50);
      return data ?? [];
    },
    enabled: !!clienteId,
  });

  const addNote = useMutation({
    mutationFn: async (conteudo: string) => {
      if (!clienteId || !empresaId) throw new Error("Missing data");
      await supabase.from("notas_contato").insert({ cliente_id: clienteId, empresa_id: empresaId, conteudo, autor_id: profile?.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-notas", clienteId] });
      setNewNote("");
      toast.success("Nota adicionada");
    },
  });

  const updateFunnel = useMutation({
    mutationFn: async ({ estagio, valor_estimado }: { estagio?: string; valor_estimado?: number }) => {
      if (!clienteId || !empresaId) throw new Error("Missing");
      const updateData: Record<string, unknown> = {};
      if (estagio !== undefined) updateData.estagio = estagio;
      if (valor_estimado !== undefined) updateData.valor_estimado = valor_estimado;

      if (funil) {
        await supabase.from("funil_vendas").update(updateData).eq("id", funil.id);
      } else {
        await supabase.from("funil_vendas").insert({
          cliente_id: clienteId, empresa_id: empresaId,
          estagio: estagio || "novo_lead",
          valor_estimado: valor_estimado ?? 0,
        });
      }
      if (estagio) {
        await supabase.from("historico_interacoes").insert({
          cliente_id: clienteId, empresa_id: empresaId, tipo: "funil",
          descricao: `Movido para: ${FUNNEL_STAGES.find(s => s.key === estagio)?.label}`, user_id: profile?.id,
        });
      }
      if (valor_estimado !== undefined) {
        await supabase.from("historico_interacoes").insert({
          cliente_id: clienteId, empresa_id: empresaId, tipo: "funil",
          descricao: `Valor da negociação: R$ ${valor_estimado.toFixed(2)}`, user_id: profile?.id,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-funil", clienteId] });
      queryClient.invalidateQueries({ queryKey: ["crm-historico", clienteId] });
      queryClient.invalidateQueries({ queryKey: ["kanban-funil"] });
      toast.success("Funil atualizado");
    },
  });

  const addTask = useMutation({
    mutationFn: async () => {
      if (!clienteId || !empresaId) throw new Error("Missing");
      await (supabase as any).from("contact_tasks").insert({
        cliente_id: clienteId, empresa_id: empresaId, title: taskTitle,
        description: taskDesc || null, due_date: taskDue || null,
        priority: taskPriority, assigned_user_id: profile?.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-tasks", clienteId] });
      setTaskDialogOpen(false);
      setTaskTitle(""); setTaskDesc(""); setTaskDue(""); setTaskPriority("media");
      toast.success("Tarefa criada");
    },
  });

  const toggleTask = useMutation({
    mutationFn: async ({ id, currentStatus }: { id: string; currentStatus: string }) => {
      const newStatus = currentStatus === "concluida" ? "pendente" : "concluida";
      await (supabase as any).from("contact_tasks").update({ status: newStatus }).eq("id", id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["crm-tasks", clienteId] }),
  });

  if (!clienteId) return null;

  if (isLoading) {
    return (
      <div className="w-80 border-l border-border bg-card p-4 space-y-4 shrink-0">
        <Skeleton className="h-12 w-12 rounded-full mx-auto" />
        <Skeleton className="h-4 w-32 mx-auto" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const currentStageIndex = FUNNEL_STAGES.findIndex(s => s.key === (funil?.estagio || "novo_lead"));

  return (
    <div className="w-80 border-l border-border bg-card flex flex-col shrink-0">
      {/* Header */}
      <div className="p-4 border-b border-border text-center">
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
          <User className="h-5 w-5 text-primary" strokeWidth={1.5} />
        </div>
        <h3 className="text-sm font-semibold text-foreground">{cliente?.nome}</h3>
        <p className="text-xs text-muted-foreground">{cliente?.telefone || cliente?.whatsapp || telefone}</p>
        {funil && (
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mt-2 ${
            FUNNEL_STAGES.find(s => s.key === funil.estagio)?.color
          }`}>
            {FUNNEL_STAGES.find(s => s.key === funil.estagio)?.label}
          </span>
        )}
      </div>

      <Tabs defaultValue="contato" className="flex-1 flex flex-col min-h-0">
        <TabsList className="mx-2 mt-2 grid grid-cols-5">
          <TabsTrigger value="contato" className="text-xs px-1">Contato</TabsTrigger>
          <TabsTrigger value="funil" className="text-xs px-1">Funil</TabsTrigger>
          <TabsTrigger value="notas" className="text-xs px-1">Notas</TabsTrigger>
          <TabsTrigger value="tarefas" className="text-xs px-1">Tarefas</TabsTrigger>
          <TabsTrigger value="historico" className="text-xs px-1">Hist.</TabsTrigger>
        </TabsList>

        {/* Contato */}
        <TabsContent value="contato" className="flex-1 m-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-3">
              {[
                { icon: Phone, label: "Telefone", value: cliente?.telefone || "—" },
                { icon: Phone, label: "WhatsApp", value: cliente?.whatsapp || "—" },
                { icon: Mail, label: "Email", value: cliente?.email || "—" },
                { icon: MapPin, label: "Endereço", value: cliente?.endereco || "—" },
                { icon: Calendar, label: "Cliente desde", value: cliente?.created_at ? format(new Date(cliente.created_at), "dd/MM/yyyy", { locale: ptBR }) : "—" },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-2 text-xs">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" strokeWidth={1.5} />
                  <div>
                    <p className="text-muted-foreground">{label}</p>
                    <p className="text-foreground font-medium">{value}</p>
                  </div>
                </div>
              ))}
              {cliente?.como_conheceu && (
                <div className="flex items-start gap-2 text-xs">
                  <TrendingUp className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" strokeWidth={1.5} />
                  <div>
                    <p className="text-muted-foreground">Origem</p>
                    <p className="text-foreground font-medium">{cliente.como_conheceu}</p>
                  </div>
                </div>
              )}
              {cliente?.tags && cliente.tags.length > 0 && (
                <div className="flex items-start gap-2 text-xs">
                  <Tag className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" strokeWidth={1.5} />
                  <div>
                    <p className="text-muted-foreground">Tags</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {cliente.tags.map((tag: string) => (
                        <span key={tag} className="px-1.5 py-0.5 bg-primary/10 text-primary rounded text-[10px] font-medium">{tag}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Funil */}
        <TabsContent value="funil" className="flex-1 m-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-2">
              <p className="text-xs text-muted-foreground mb-3">Mover contato no funil:</p>
              {FUNNEL_STAGES.map((stage, idx) => {
                const isActive = stage.key === (funil?.estagio || "novo_lead");
                const isPast = idx < currentStageIndex;
                return (
                  <button
                    key={stage.key}
                    onClick={() => updateFunnel.mutate(stage.key)}
                    disabled={updateFunnel.isPending}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-md text-left text-xs transition-colors ${
                      isActive ? "bg-primary/10 border border-primary/30 text-primary font-medium"
                      : isPast ? "bg-muted/50 text-muted-foreground"
                      : "hover:bg-muted/50 text-foreground"
                    }`}
                  >
                    <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      isActive ? "bg-primary text-primary-foreground" : isPast ? "bg-muted-foreground/30 text-muted-foreground" : "bg-muted text-muted-foreground"
                    }`}>{idx + 1}</div>
                    <span>{stage.label}</span>
                    {isActive && <ChevronRight className="h-3.5 w-3.5 ml-auto" />}
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Notas */}
        <TabsContent value="notas" className="flex-1 m-0 flex flex-col">
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-3">
              {!notas?.length ? (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhuma nota</p>
              ) : (
                notas.map((nota: any) => (
                  <div key={nota.id} className="bg-muted/50 rounded-md p-3">
                    <p className="text-xs text-foreground">{nota.conteudo}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] text-muted-foreground">{nota.profiles?.nome || "Sistema"}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">{format(new Date(nota.created_at), "dd/MM HH:mm", { locale: ptBR })}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
          <div className="p-3 border-t border-border">
            <Textarea value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Adicionar nota..." className="min-h-[60px] text-xs resize-none" />
            <Button size="sm" className="w-full mt-2" disabled={!newNote.trim() || addNote.isPending} onClick={() => addNote.mutate(newNote.trim())}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar Nota
            </Button>
          </div>
        </TabsContent>

        {/* Tarefas */}
        <TabsContent value="tarefas" className="flex-1 m-0 flex flex-col">
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-2">
              {!tasks?.length ? (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhuma tarefa</p>
              ) : (
                tasks.map((task) => (
                  <div key={task.id} className={`flex items-start gap-2 p-2.5 rounded-md border border-border ${task.status === "concluida" ? "opacity-60" : ""}`}>
                    <button onClick={() => toggleTask.mutate({ id: task.id, currentStatus: task.status })} className="mt-0.5 shrink-0">
                      {task.status === "concluida" ? <CheckCircle2 className="h-4 w-4 text-success" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium ${task.status === "concluida" ? "line-through text-muted-foreground" : "text-foreground"}`}>{task.title}</p>
                      {task.description && <p className="text-[10px] text-muted-foreground mt-0.5">{task.description}</p>}
                      <div className="flex items-center gap-2 mt-1">
                        {task.due_date && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(task.due_date), "dd/MM", { locale: ptBR })}
                          </span>
                        )}
                        <span className="text-[10px]">{PRIORITY_CONFIG[task.priority]?.icon}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
          <div className="p-3 border-t border-border">
            <Button size="sm" variant="outline" className="w-full" onClick={() => setTaskDialogOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Nova Tarefa
            </Button>
          </div>

          <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
            <DialogContent className="max-w-sm">
              <DialogHeader><DialogTitle>Nova Tarefa</DialogTitle></DialogHeader>
              <div className="space-y-3 pt-2">
                <Input value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="Título" />
                <Textarea value={taskDesc} onChange={e => setTaskDesc(e.target.value)} placeholder="Descrição (opcional)" className="min-h-[60px]" />
                <Input type="date" value={taskDue} onChange={e => setTaskDue(e.target.value)} />
                <Select value={taskPriority} onValueChange={setTaskPriority}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alta">🔴 Alta</SelectItem>
                    <SelectItem value="media">🟡 Média</SelectItem>
                    <SelectItem value="baixa">🟢 Baixa</SelectItem>
                  </SelectContent>
                </Select>
                <Button className="w-full" disabled={!taskTitle.trim() || addTask.isPending} onClick={() => addTask.mutate()}>Criar Tarefa</Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Histórico */}
        <TabsContent value="historico" className="flex-1 m-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-3">
              {!historico?.length ? (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhuma interação</p>
              ) : (
                historico.map((item: any) => (
                  <div key={item.id} className="border-l-2 border-border pl-3 py-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                        item.tipo === "funil" ? "bg-warning" : item.tipo === "nota" ? "bg-primary" : "bg-muted-foreground"
                      }`} />
                      <span className="text-xs font-medium text-foreground">{item.tipo}</span>
                      <span className="text-[10px] text-muted-foreground ml-auto font-mono">
                        {format(new Date(item.created_at), "dd/MM HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.descricao}</p>
                    {item.profiles?.nome && (
                      <p className="text-[10px] text-muted-foreground/70 mt-0.5">por {item.profiles.nome}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
