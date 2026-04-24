import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentEmpresa } from "@/lib/useCurrentEmpresa";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Bot, Plus, Loader2, Zap, MessageSquare, Tag, Clock, GitBranch,
  Trash2, ArrowDown, Pencil, Power, Play,
} from "lucide-react";
import { toast } from "sonner";

type FlowStep = {
  id: string;
  type: "mensagem" | "espera" | "tag" | "condicao";
  config: any;
};

type Flow = {
  id: string;
  nome: string;
  descricao: string | null;
  gatilho: string;
  gatilho_config: any;
  ativo: boolean;
  definicao: { steps?: FlowStep[]; nodes?: any[]; edges?: any[] };
  updated_at: string;
};

const gatilhos: Record<string, { label: string; icon: any; desc: string }> = {
  mensagem_recebida: { label: "Mensagem recebida", icon: MessageSquare, desc: "Toda nova mensagem recebida" },
  nova_conversa: { label: "Nova conversa", icon: Zap, desc: "Quando uma conversa é aberta" },
  palavra_chave: { label: "Palavra-chave", icon: Tag, desc: "Mensagem contém palavras específicas" },
  manual: { label: "Disparo manual", icon: Play, desc: "Executado sob demanda" },
};

const tiposPasso: Record<string, { label: string; icon: any; color: string }> = {
  mensagem: { label: "Enviar mensagem", icon: MessageSquare, color: "from-blue-500 to-cyan-500" },
  espera: { label: "Aguardar", icon: Clock, color: "from-amber-500 to-orange-500" },
  tag: { label: "Aplicar etiqueta", icon: Tag, color: "from-violet-500 to-fuchsia-500" },
  condicao: { label: "Condição", icon: GitBranch, color: "from-emerald-500 to-teal-500" },
};

export default function CRMAutomacaoPage() {
  const qc = useQueryClient();
  const { data: empresaId } = useCurrentEmpresa();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [openNew, setOpenNew] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novoGatilho, setNovoGatilho] = useState("mensagem_recebida");

  const { data: flows = [], isLoading } = useQuery({
    queryKey: ["crm-flows", empresaId],
    enabled: !!empresaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_flows").select("*")
        .eq("empresa_id", empresaId!).order("updated_at", { ascending: false });
      if (error) throw error;
      return (data as any) as Flow[];
    },
  });

  const selected = flows.find((f) => f.id === selectedId) ?? flows[0];

  const create = useMutation({
    mutationFn: async () => {
      if (!empresaId) throw new Error("empresa");
      const { data, error } = await supabase.from("crm_flows").insert({
        empresa_id: empresaId, nome: novoNome, gatilho: novoGatilho,
        definicao: { steps: [] } as any,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (d: any) => {
      qc.invalidateQueries({ queryKey: ["crm-flows"] });
      setSelectedId(d.id); setOpenNew(false); setNovoNome("");
      toast.success("Fluxo criado");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async (patch: Partial<Flow>) => {
      if (!selected) return;
      const { error } = await supabase.from("crm_flows").update(patch as any).eq("id", selected.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm-flows"] }),
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("crm_flows").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-flows"] });
      setSelectedId(null);
      toast.success("Fluxo removido");
    },
  });

  const steps: FlowStep[] = selected?.definicao?.steps ?? [];

  const addStep = (type: FlowStep["type"]) => {
    if (!selected) return;
    const novo: FlowStep = {
      id: crypto.randomUUID(), type,
      config: type === "mensagem" ? { texto: "" }
        : type === "espera" ? { segundos: 60 }
        : type === "tag" ? { tag: "" }
        : { campo: "mensagem", operador: "contem", valor: "" },
    };
    update.mutate({ definicao: { steps: [...steps, novo] } as any });
  };

  const updateStep = (id: string, config: any) => {
    const novos = steps.map((s) => s.id === id ? { ...s, config } : s);
    update.mutate({ definicao: { steps: novos } as any });
  };

  const removeStep = (id: string) => {
    update.mutate({ definicao: { steps: steps.filter((s) => s.id !== id) } as any });
  };

  return (
    <div className="h-full flex bg-background">
      {/* Lista de fluxos */}
      <aside className="w-[280px] border-r border-border/60 flex flex-col">
        <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">Fluxos</h2>
            <p className="text-[11px] text-muted-foreground">{flows.length} criado(s)</p>
          </div>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setOpenNew(true)}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
          ) : flows.length === 0 ? (
            <div className="text-center py-8 px-3">
              <Bot className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-xs text-muted-foreground">Nenhum fluxo ainda</p>
              <Button size="sm" variant="outline" className="mt-3" onClick={() => setOpenNew(true)}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Criar fluxo
              </Button>
            </div>
          ) : (
            flows.map((f) => {
              const G = gatilhos[f.gatilho]?.icon ?? Zap;
              const active = selected?.id === f.id;
              return (
                <button key={f.id} onClick={() => setSelectedId(f.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg flex items-start gap-2.5 transition-all ${
                    active ? "bg-accent" : "hover:bg-muted/40"
                  }`}>
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shrink-0">
                    <G className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-sm truncate">{f.nome}</span>
                      {f.ativo && <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />}
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">{gatilhos[f.gatilho]?.label}</div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* Editor */}
      {!selected ? (
        <div className="flex-1 flex items-center justify-center text-center px-6">
          <div>
            <Bot className="h-14 w-14 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold">Construa seu primeiro fluxo</h3>
            <p className="text-sm text-muted-foreground max-w-md mt-1">
              Automatize respostas, qualifique leads e dispare ações com base em gatilhos.
            </p>
            <Button className="mt-5" onClick={() => setOpenNew(true)}>
              <Plus className="h-4 w-4 mr-1.5" /> Novo fluxo
            </Button>
          </div>
        </div>
      ) : (
        <main className="flex-1 flex flex-col min-w-0">
          {/* header */}
          <div className="px-6 py-4 border-b border-border/60 flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <Input value={selected.nome}
                onChange={(e) => update.mutate({ nome: e.target.value })}
                className="text-lg font-semibold border-none px-0 h-auto focus-visible:ring-0 shadow-none" />
              <p className="text-xs text-muted-foreground mt-0.5">
                Atualizado {new Date(selected.updated_at).toLocaleString("pt-BR")}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Switch checked={selected.ativo} onCheckedChange={(v) => update.mutate({ ativo: v })} />
                <Label className="text-sm flex items-center gap-1.5">
                  <Power className="h-3.5 w-3.5" /> {selected.ativo ? "Ativo" : "Inativo"}
                </Label>
              </div>
              <Button variant="ghost" size="icon" className="h-9 w-9 text-rose-500"
                onClick={() => { if (confirm(`Remover "${selected.nome}"?`)) remove.mutate(selected.id); }}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Canvas */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-2xl mx-auto space-y-3">
              {/* Gatilho */}
              <Card className="p-4 border-2 border-violet-500/30 bg-gradient-to-br from-violet-500/5 to-fuchsia-500/5">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shrink-0">
                    <Zap className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Quando</div>
                    <Select value={selected.gatilho} onValueChange={(v) => update.mutate({ gatilho: v })}>
                      <SelectTrigger className="mt-1 border-none px-0 h-auto font-semibold text-base focus:ring-0 shadow-none">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(gatilhos).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-0.5">{gatilhos[selected.gatilho]?.desc}</p>
                    {selected.gatilho === "palavra_chave" && (
                      <Input className="mt-3" placeholder="ex: olá, oi, bom dia (separe por vírgula)"
                        defaultValue={selected.gatilho_config?.palavras ?? ""}
                        onBlur={(e) => update.mutate({ gatilho_config: { palavras: e.target.value } as any })} />
                    )}
                  </div>
                </div>
              </Card>

              {/* Steps */}
              {steps.map((step, idx) => {
                const meta = tiposPasso[step.type];
                const Icon = meta.icon;
                return (
                  <div key={step.id}>
                    <div className="flex justify-center py-1">
                      <ArrowDown className="h-4 w-4 text-muted-foreground/40" />
                    </div>
                    <Card className="p-4 group hover:shadow-card-hover transition-shadow">
                      <div className="flex items-start gap-3">
                        <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${meta.color} flex items-center justify-center shrink-0`}>
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Passo {idx + 1}</div>
                              <div className="font-semibold text-sm">{meta.label}</div>
                            </div>
                            <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover:opacity-100 text-rose-500"
                              onClick={() => removeStep(step.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <StepEditor step={step} onChange={(c) => updateStep(step.id, c)} />
                        </div>
                      </div>
                    </Card>
                  </div>
                );
              })}

              {/* Add step */}
              <div className="flex justify-center py-1">
                <ArrowDown className="h-4 w-4 text-muted-foreground/40" />
              </div>
              <Card className="p-4 border-dashed border-2">
                <div className="text-center mb-3">
                  <p className="text-xs text-muted-foreground font-medium">Adicionar passo</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {Object.entries(tiposPasso).map(([k, v]) => {
                    const I = v.icon;
                    return (
                      <button key={k} onClick={() => addStep(k as any)}
                        className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-border/60 hover:border-primary hover:bg-primary/5 transition-all">
                        <div className={`h-9 w-9 rounded-lg bg-gradient-to-br ${v.color} flex items-center justify-center`}>
                          <I className="h-4 w-4 text-white" />
                        </div>
                        <span className="text-[11px] font-medium">{v.label}</span>
                      </button>
                    );
                  })}
                </div>
              </Card>
            </div>
          </div>
        </main>
      )}

      {/* Dialog novo fluxo */}
      <Dialog open={openNew} onOpenChange={setOpenNew}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader><DialogTitle>Novo fluxo</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Nome</Label>
              <Input value={novoNome} onChange={(e) => setNovoNome(e.target.value)} placeholder="Ex: Boas-vindas WhatsApp" />
            </div>
            <div>
              <Label>Gatilho</Label>
              <Select value={novoGatilho} onValueChange={setNovoGatilho}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(gatilhos).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpenNew(false)}>Cancelar</Button>
            <Button onClick={() => create.mutate()} disabled={!novoNome || create.isPending}>
              {create.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StepEditor({ step, onChange }: { step: FlowStep; onChange: (c: any) => void }) {
  if (step.type === "mensagem") {
    return (
      <Textarea rows={3} placeholder="Digite a mensagem que será enviada..."
        defaultValue={step.config.texto ?? ""}
        onBlur={(e) => onChange({ ...step.config, texto: e.target.value })} />
    );
  }
  if (step.type === "espera") {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Aguardar</span>
        <Input type="number" className="w-24" defaultValue={step.config.segundos ?? 60}
          onBlur={(e) => onChange({ ...step.config, segundos: Number(e.target.value) })} />
        <span className="text-sm text-muted-foreground">segundos</span>
      </div>
    );
  }
  if (step.type === "tag") {
    return (
      <Input placeholder="Nome da etiqueta a aplicar"
        defaultValue={step.config.tag ?? ""}
        onBlur={(e) => onChange({ ...step.config, tag: e.target.value })} />
    );
  }
  return (
    <div className="grid grid-cols-3 gap-2">
      <Select value={step.config.campo ?? "mensagem"} onValueChange={(v) => onChange({ ...step.config, campo: v })}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="mensagem">Mensagem</SelectItem>
          <SelectItem value="contato_nome">Nome contato</SelectItem>
        </SelectContent>
      </Select>
      <Select value={step.config.operador ?? "contem"} onValueChange={(v) => onChange({ ...step.config, operador: v })}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="contem">contém</SelectItem>
          <SelectItem value="igual">é igual a</SelectItem>
          <SelectItem value="comeca">começa com</SelectItem>
        </SelectContent>
      </Select>
      <Input placeholder="valor" defaultValue={step.config.valor ?? ""}
        onBlur={(e) => onChange({ ...step.config, valor: e.target.value })} />
    </div>
  );
}