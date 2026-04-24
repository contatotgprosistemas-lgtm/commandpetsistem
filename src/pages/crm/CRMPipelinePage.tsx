import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentEmpresa } from "@/lib/useCurrentEmpresa";
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, closestCorners,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDroppable } from "@dnd-kit/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Loader2, GripVertical, GitBranch, DollarSign, User, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Pipeline = { id: string; nome: string; cor: string; is_padrao: boolean };
type Etapa = { id: string; pipeline_id: string; nome: string; cor: string; ordem: number; probabilidade: number };
type Lead = {
  id: string; titulo: string; valor: number | null; etapa_id: string;
  contato_id: string; ordem: number; status: string;
  crm_contatos?: { nome: string } | null;
};

export default function CRMPipelinePage() {
  const qc = useQueryClient();
  const { data: empresaId } = useCurrentEmpresa();
  const [pipelineId, setPipelineId] = useState<string | null>(null);
  const [openNovoLead, setOpenNovoLead] = useState<{ etapaId: string } | null>(null);
  const [openNovoPipeline, setOpenNovoPipeline] = useState(false);
  const [activeLead, setActiveLead] = useState<Lead | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  // Pipelines
  const { data: pipelines = [], isLoading: loadingPipelines } = useQuery({
    queryKey: ["crm-pipelines", empresaId],
    enabled: !!empresaId,
    queryFn: async () => {
      const { data, error } = await supabase.from("crm_pipelines").select("*").eq("empresa_id", empresaId!).eq("ativo", true).order("ordem");
      if (error) throw error;
      return (data ?? []) as Pipeline[];
    },
  });

  useEffect(() => {
    if (!pipelineId && pipelines.length > 0) {
      setPipelineId(pipelines.find((p) => p.is_padrao)?.id ?? pipelines[0].id);
    }
  }, [pipelines, pipelineId]);

  // Auto-create default pipeline if none
  const createDefault = useMutation({
    mutationFn: async () => {
      const { data: pipe, error } = await supabase.from("crm_pipelines")
        .insert({ empresa_id: empresaId, nome: "Vendas", is_padrao: true, cor: "#8B5CF6" })
        .select().single();
      if (error) throw error;
      const stages = [
        { nome: "Novo lead", cor: "#94A3B8", ordem: 0, probabilidade: 10 },
        { nome: "Contato feito", cor: "#3B82F6", ordem: 1, probabilidade: 25 },
        { nome: "Proposta enviada", cor: "#F59E0B", ordem: 2, probabilidade: 50 },
        { nome: "Negociação", cor: "#EC4899", ordem: 3, probabilidade: 75 },
        { nome: "Ganho", cor: "#10B981", ordem: 4, probabilidade: 100, is_ganho: true },
      ];
      await supabase.from("crm_pipeline_etapas").insert(
        stages.map((s) => ({ ...s, empresa_id: empresaId, pipeline_id: pipe.id })),
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm-pipelines"] }),
  });

  useEffect(() => {
    if (!loadingPipelines && empresaId && pipelines.length === 0 && !createDefault.isPending) {
      createDefault.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingPipelines, pipelines.length, empresaId]);

  // Etapas
  const { data: etapas = [] } = useQuery({
    queryKey: ["crm-etapas", pipelineId],
    enabled: !!pipelineId,
    queryFn: async () => {
      const { data, error } = await supabase.from("crm_pipeline_etapas").select("*").eq("pipeline_id", pipelineId!).order("ordem");
      if (error) throw error;
      return (data ?? []) as Etapa[];
    },
  });

  // Leads
  const { data: leads = [] } = useQuery({
    queryKey: ["crm-leads", pipelineId],
    enabled: !!pipelineId,
    queryFn: async () => {
      const { data, error } = await supabase.from("crm_leads")
        .select("*, crm_contatos(nome)")
        .eq("pipeline_id", pipelineId!)
        .eq("status", "aberto")
        .order("ordem");
      if (error) throw error;
      return (data ?? []) as Lead[];
    },
  });

  const leadsByEtapa = useMemo(() => {
    const map: Record<string, Lead[]> = {};
    etapas.forEach((e) => (map[e.id] = []));
    leads.forEach((l) => {
      if (!map[l.etapa_id]) map[l.etapa_id] = [];
      map[l.etapa_id].push(l);
    });
    return map;
  }, [etapas, leads]);

  const move = useMutation({
    mutationFn: async ({ leadId, etapaId, ordem }: { leadId: string; etapaId: string; ordem: number }) => {
      const { error } = await supabase.from("crm_leads").update({ etapa_id: etapaId, ordem }).eq("id", leadId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm-leads", pipelineId] }),
  });

  const onDragStart = (e: DragStartEvent) => {
    const lead = leads.find((l) => l.id === e.active.id);
    setActiveLead(lead ?? null);
  };

  const onDragEnd = (e: DragEndEvent) => {
    setActiveLead(null);
    const { active, over } = e;
    if (!over) return;
    const leadId = String(active.id);
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;

    const overId = String(over.id);
    let targetEtapa = etapas.find((et) => et.id === overId)?.id;
    if (!targetEtapa) {
      const overLead = leads.find((l) => l.id === overId);
      targetEtapa = overLead?.etapa_id;
    }
    if (!targetEtapa) return;
    if (targetEtapa === lead.etapa_id) return;

    const newOrder = (leadsByEtapa[targetEtapa]?.length ?? 0);
    move.mutate({ leadId, etapaId: targetEtapa, ordem: newOrder });
  };

  if (loadingPipelines) {
    return <div className="h-full flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl font-semibold">Pipeline</h1>
            <p className="text-xs text-muted-foreground">Funil de vendas — arraste cards entre as etapas</p>
          </div>
          {pipelines.length > 0 && pipelineId && (
            <Select value={pipelineId} onValueChange={setPipelineId}>
              <SelectTrigger className="w-56 h-9 ml-4"><SelectValue /></SelectTrigger>
              <SelectContent>
                {pipelines.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: p.cor }} />{p.nome}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setOpenNovoPipeline(true)} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Pipeline
          </Button>
        </div>
      </div>

      {/* Board */}
      {etapas.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <GitBranch className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">Configurando pipeline padrão...</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onDragEnd}>
            <div className="h-full flex gap-3 p-4 min-w-max">
              {etapas.map((etapa) => {
                const items = leadsByEtapa[etapa.id] ?? [];
                const total = items.reduce((s, l) => s + Number(l.valor ?? 0), 0);
                return (
                  <Column key={etapa.id} etapa={etapa} count={items.length} total={total} onAdd={() => setOpenNovoLead({ etapaId: etapa.id })}>
                    <SortableContext items={items.map((l) => l.id)} strategy={verticalListSortingStrategy}>
                      <div className="flex flex-col gap-2">
                        {items.map((lead) => <LeadCard key={lead.id} lead={lead} />)}
                      </div>
                    </SortableContext>
                  </Column>
                );
              })}
            </div>
            <DragOverlay>{activeLead ? <LeadCardView lead={activeLead} dragging /> : null}</DragOverlay>
          </DndContext>
        </div>
      )}

      {openNovoLead && pipelineId && (
        <NovoLeadDialog
          open={!!openNovoLead}
          onClose={() => setOpenNovoLead(null)}
          empresaId={empresaId!}
          pipelineId={pipelineId}
          etapaId={openNovoLead.etapaId}
        />
      )}
      {openNovoPipeline && (
        <NovoPipelineDialog open={openNovoPipeline} onClose={() => setOpenNovoPipeline(false)} empresaId={empresaId!} />
      )}
    </div>
  );
}

function Column({ etapa, count, total, children, onAdd }: { etapa: Etapa; count: number; total: number; children: React.ReactNode; onAdd: () => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: etapa.id });
  return (
    <div className="w-[280px] shrink-0 flex flex-col rounded-xl bg-muted/40 border">
      <div className="px-3 py-2.5 border-b flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: etapa.cor }} />
        <h3 className="text-sm font-semibold flex-1 truncate">{etapa.nome}</h3>
        <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">{count}</Badge>
        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={onAdd}><Plus className="h-3.5 w-3.5" /></Button>
      </div>
      {total > 0 && (
        <div className="px-3 py-1.5 text-[11px] text-muted-foreground border-b bg-background/40">
          R$ {total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
        </div>
      )}
      <div ref={setNodeRef} className={`flex-1 overflow-y-auto p-2 transition-colors ${isOver ? "bg-primary/5" : ""}`}>
        {children}
      </div>
    </div>
  );
}

function LeadCard({ lead }: { lead: Lead }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: lead.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <LeadCardView lead={lead} />
    </div>
  );
}

function LeadCardView({ lead, dragging }: { lead: Lead; dragging?: boolean }) {
  return (
    <div className={`bg-card border rounded-lg p-2.5 cursor-grab active:cursor-grabbing transition-all ${dragging ? "shadow-lg scale-105" : "hover:shadow-md hover:-translate-y-0.5"}`}>
      <div className="flex items-start gap-1.5">
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium leading-snug truncate">{lead.titulo}</div>
          {lead.crm_contatos?.nome && (
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-1">
              <User className="h-3 w-3" />
              <span className="truncate">{lead.crm_contatos.nome}</span>
            </div>
          )}
          {lead.valor && Number(lead.valor) > 0 && (
            <div className="flex items-center gap-1 text-[11px] font-semibold text-success mt-1">
              <DollarSign className="h-3 w-3" />
              R$ {Number(lead.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NovoLeadDialog({ open, onClose, empresaId, pipelineId, etapaId }: { open: boolean; onClose: () => void; empresaId: string; pipelineId: string; etapaId: string }) {
  const qc = useQueryClient();
  const [titulo, setTitulo] = useState("");
  const [valor, setValor] = useState("");
  const [contatoId, setContatoId] = useState<string>("");
  const [descricao, setDescricao] = useState("");

  const { data: contatos = [] } = useQuery({
    queryKey: ["crm-contatos-quick", empresaId],
    queryFn: async () => {
      const { data } = await supabase.from("crm_contatos").select("id, nome").eq("empresa_id", empresaId).order("nome").limit(200);
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!titulo) throw new Error("Título obrigatório");
      if (!contatoId) throw new Error("Selecione um contato");
      const { error } = await supabase.from("crm_leads").insert({
        empresa_id: empresaId, pipeline_id: pipelineId, etapa_id: etapaId,
        contato_id: contatoId, titulo, descricao: descricao || null,
        valor: valor ? parseFloat(valor) : 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lead criado");
      qc.invalidateQueries({ queryKey: ["crm-leads", pipelineId] });
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo lead</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>Título *</Label>
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex: Plano premium - João" />
          </div>
          <div className="space-y-1.5">
            <Label>Contato *</Label>
            <Select value={contatoId} onValueChange={setContatoId}>
              <SelectTrigger><SelectValue placeholder={contatos.length ? "Selecione" : "Cadastre contatos primeiro"} /></SelectTrigger>
              <SelectContent>
                {contatos.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Valor (R$)</Label>
            <Input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Textarea rows={2} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => create.mutate()} disabled={create.isPending}>
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Criar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NovoPipelineDialog({ open, onClose, empresaId }: { open: boolean; onClose: () => void; empresaId: string }) {
  const qc = useQueryClient();
  const [nome, setNome] = useState("");

  const create = useMutation({
    mutationFn: async () => {
      if (!nome) throw new Error("Informe o nome");
      const { data: pipe, error } = await supabase.from("crm_pipelines").insert({ empresa_id: empresaId, nome, cor: "#8B5CF6" }).select().single();
      if (error) throw error;
      const stages = [
        { nome: "Novo", cor: "#94A3B8", ordem: 0, probabilidade: 10 },
        { nome: "Em andamento", cor: "#3B82F6", ordem: 1, probabilidade: 50 },
        { nome: "Ganho", cor: "#10B981", ordem: 2, probabilidade: 100, is_ganho: true },
      ];
      await supabase.from("crm_pipeline_etapas").insert(stages.map((s) => ({ ...s, empresa_id: empresaId, pipeline_id: pipe.id })));
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["crm-pipelines"] }); toast.success("Pipeline criado"); onClose(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo pipeline</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>Nome *</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Vendas, Pós-venda..." />
          </div>
          <p className="text-xs text-muted-foreground">3 etapas padrão serão criadas (Novo, Em andamento, Ganho).</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => create.mutate()} disabled={create.isPending}>
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Criar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
