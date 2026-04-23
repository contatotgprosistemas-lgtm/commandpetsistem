import { useMemo, useState } from "react";
import { ComercialLayout } from "@/components/comercial/ComercialLayout";
import { useComercialPipeline, type ComercialDeal, type ComercialStage } from "@/hooks/comercial/useComercialPipeline";
import { DndContext, type DragEndEvent, DragOverlay, type DragStartEvent, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import { Loader2, Plus, Search, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export default function ComercialPipeline() {
  const { stages, deals, loading, moveDeal, createDeal } = useComercialPipeline();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const filtered = useMemo(
    () => deals.filter((d) => q.trim() === "" ? true : `${d.titulo} ${d.responsavel_nome ?? ""}`.toLowerCase().includes(q.toLowerCase())),
    [deals, q],
  );

  const byStage = useMemo(() => {
    const map = new Map<string, ComercialDeal[]>();
    stages.forEach((s) => map.set(s.id, []));
    filtered.forEach((d) => { if (d.stage_id && map.has(d.stage_id)) map.get(d.stage_id)!.push(d); });
    return map;
  }, [filtered, stages]);

  const totals = useMemo(() => {
    const total = deals.reduce((s, d) => s + Number(d.valor ?? 0), 0);
    const ponderado = deals.reduce((s, d) => s + (Number(d.valor ?? 0) * (d.probabilidade ?? 0)) / 100, 0);
    return { total, ponderado };
  }, [deals]);

  const activeDeal = activeId ? deals.find((d) => d.id === activeId) ?? null : null;

  async function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const dealId = String(active.id);
    const newStage = String(over.id);
    const deal = deals.find((d) => d.id === dealId);
    if (!deal || deal.stage_id === newStage) return;
    try { await moveDeal(dealId, newStage); } catch (err: any) { toast.error(err?.message ?? "Falha"); }
  }

  async function handleCreate() {
    if (stages.length === 0) return toast.error("Etapas carregando");
    setCreating(true);
    try {
      await createDeal({ titulo: "Nova oportunidade", stage_id: stages[0].id, valor: 0, probabilidade: 10, tags: [], canal: "WhatsApp", dias_no_estagio: 0 });
      toast.success("Deal criado");
    } catch (err: any) { toast.error(err?.message ?? "Falha"); } finally { setCreating(false); }
  }

  if (loading) {
    return <ComercialLayout title="Pipeline" subtitle="Carregando..."><div className="flex h-64 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div></ComercialLayout>;
  }

  return (
    <ComercialLayout title="Pipeline de Vendas" subtitle="Arraste cards entre etapas" noPadding>
      <div className="flex h-full flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar deal..." className="pl-9" />
          </div>
          <div className="flex items-center gap-3">
            <Card className="px-3 py-1.5 text-xs"><span className="text-muted-foreground">Total: </span><span className="font-semibold">{fmt(totals.total)}</span></Card>
            <Card className="px-3 py-1.5 text-xs"><span className="text-muted-foreground">Ponderado: </span><span className="font-semibold text-primary">{fmt(totals.ponderado)}</span></Card>
            <Button onClick={handleCreate} disabled={creating} className="gap-1.5">{creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}Novo deal</Button>
          </div>
        </div>

        <DndContext sensors={sensors} onDragStart={(e: DragStartEvent) => setActiveId(String(e.active.id))} onDragEnd={onDragEnd}>
          <div className="flex-1 overflow-x-auto pb-2">
            <div className="flex h-full min-h-[60vh] gap-3">
              {stages.map((stage) => {
                const list = byStage.get(stage.id) ?? [];
                const sum = list.reduce((s, d) => s + Number(d.valor ?? 0), 0);
                return (
                  <Column key={stage.id} stage={stage}>
                    <div className="mb-3 flex items-center justify-between px-1">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ background: stage.cor }} />
                        <h3 className="text-xs font-semibold uppercase tracking-wider">{stage.nome}</h3>
                        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">{list.length}</span>
                      </div>
                      <span className="text-[10px] font-medium text-muted-foreground">{fmt(sum)}</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      {list.map((d) => <DealCard key={d.id} deal={d} dragging={d.id === activeId} />)}
                      {list.length === 0 && <div className="rounded-lg border border-dashed border-border py-8 text-center text-[11px] text-muted-foreground">Solte aqui</div>}
                    </div>
                  </Column>
                );
              })}
            </div>
          </div>
          <DragOverlay>{activeDeal && <div className="rotate-2"><DealCard deal={activeDeal} overlay /></div>}</DragOverlay>
        </DndContext>
      </div>
    </ComercialLayout>
  );
}

function Column({ stage, children }: { stage: ComercialStage; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  return (
    <div ref={setNodeRef} className={cn("flex w-72 shrink-0 flex-col rounded-xl border bg-muted/30 p-3 transition-colors", isOver ? "border-primary bg-primary/5" : "border-border")}>
      {children}
    </div>
  );
}

function DealCard({ deal, dragging, overlay }: { deal: ComercialDeal; dragging?: boolean; overlay?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: deal.id, disabled: overlay });
  const style: React.CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: dragging || isDragging ? 0.4 : 1,
  };
  return (
    <div ref={overlay ? undefined : setNodeRef} style={overlay ? undefined : style} {...(overlay ? {} : attributes)} {...(overlay ? {} : listeners)} className={cn("group cursor-grab rounded-lg border border-border bg-card p-3 shadow-[var(--shadow-sm)] transition-all hover:border-primary/40 hover:shadow-md active:cursor-grabbing", overlay && "shadow-lg ring-1 ring-primary/40")}>
      <div className="flex items-start justify-between gap-2">
        <h4 className="line-clamp-1 text-sm font-semibold">{deal.titulo}</h4>
        <span className="shrink-0 rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">{deal.probabilidade ?? 0}%</span>
      </div>
      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{deal.responsavel_nome ?? "—"}</p>
      <div className="mt-2 flex items-center gap-1.5">
        {(deal.tags ?? []).slice(0, 2).map((t) => <span key={t} className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">{t}</span>)}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-bold"><TrendingUp className="h-3 w-3 text-success" />{fmt(Number(deal.valor ?? 0))}</div>
        <span className="text-[10px] text-muted-foreground">{deal.dias_no_estagio ?? 0}d</span>
      </div>
    </div>
  );
}