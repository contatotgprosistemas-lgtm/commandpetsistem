import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentEmpresa } from "@/lib/useCurrentEmpresa";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus, Loader2, ListChecks, Phone, Mail, Calendar as CalendarIcon,
  MessageCircle, CheckCircle2, Clock, AlertCircle, Trash2, Search,
} from "lucide-react";
import { toast } from "sonner";
import { format, isPast, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";

type Tarefa = {
  id: string;
  titulo: string;
  descricao: string | null;
  tipo: string;
  prioridade: string;
  status: string;
  prazo: string | null;
  concluida_em: string | null;
  contato_id: string | null;
  lead_id: string | null;
  created_at: string;
  crm_contatos?: { nome: string } | null;
};

const tipoIcon: Record<string, any> = {
  tarefa: ListChecks,
  ligacao: Phone,
  email: Mail,
  reuniao: CalendarIcon,
  whatsapp: MessageCircle,
};

const prioridadeColor: Record<string, string> = {
  baixa: "bg-muted text-muted-foreground",
  media: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  alta: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
};

export default function CRMTarefasPage() {
  const qc = useQueryClient();
  const { data: empresaId } = useCurrentEmpresa();
  const [filtro, setFiltro] = useState<"todas" | "pendente" | "hoje" | "atrasadas" | "concluidas">("todas");
  const [busca, setBusca] = useState("");
  const [editing, setEditing] = useState<Partial<Tarefa> | null>(null);
  const [open, setOpen] = useState(false);

  const { data: tarefas = [], isLoading } = useQuery({
    queryKey: ["crm-tarefas", empresaId],
    enabled: !!empresaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_tarefas")
        .select("*, crm_contatos(nome)")
        .eq("empresa_id", empresaId!)
        .order("prazo", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as any) as Tarefa[];
    },
  });

  const { data: contatos = [] } = useQuery({
    queryKey: ["crm-contatos-mini", empresaId],
    enabled: !!empresaId,
    queryFn: async () => {
      const { data } = await supabase
        .from("crm_contatos")
        .select("id, nome")
        .eq("empresa_id", empresaId!)
        .order("nome");
      return data ?? [];
    },
  });

  const filtradas = useMemo(() => {
    return tarefas.filter((t) => {
      if (busca && !t.titulo.toLowerCase().includes(busca.toLowerCase())) return false;
      if (filtro === "pendente") return t.status !== "concluida" && t.status !== "cancelada";
      if (filtro === "concluidas") return t.status === "concluida";
      if (filtro === "hoje") return t.prazo && isToday(new Date(t.prazo)) && t.status !== "concluida";
      if (filtro === "atrasadas") return t.prazo && isPast(new Date(t.prazo)) && !isToday(new Date(t.prazo)) && t.status !== "concluida";
      return true;
    });
  }, [tarefas, filtro, busca]);

  const counts = useMemo(() => ({
    pendente: tarefas.filter((t) => t.status !== "concluida" && t.status !== "cancelada").length,
    hoje: tarefas.filter((t) => t.prazo && isToday(new Date(t.prazo)) && t.status !== "concluida").length,
    atrasadas: tarefas.filter((t) => t.prazo && isPast(new Date(t.prazo)) && !isToday(new Date(t.prazo)) && t.status !== "concluida").length,
    concluidas: tarefas.filter((t) => t.status === "concluida").length,
  }), [tarefas]);

  const upsert = useMutation({
    mutationFn: async (t: Partial<Tarefa>) => {
      if (!empresaId) throw new Error("empresa");
      if (t.id) {
        const { error } = await supabase.from("crm_tarefas").update({
          titulo: t.titulo, descricao: t.descricao, tipo: t.tipo, prioridade: t.prioridade,
          status: t.status, prazo: t.prazo, contato_id: t.contato_id || null,
        }).eq("id", t.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("crm_tarefas").insert({
          empresa_id: empresaId,
          titulo: t.titulo!, descricao: t.descricao, tipo: t.tipo || "tarefa",
          prioridade: t.prioridade || "media", status: "pendente",
          prazo: t.prazo, contato_id: t.contato_id || null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-tarefas"] });
      setOpen(false); setEditing(null);
      toast.success("Tarefa salva");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async (t: Tarefa) => {
      const novo = t.status === "concluida" ? "pendente" : "concluida";
      const { error } = await supabase.from("crm_tarefas").update({
        status: novo,
        concluida_em: novo === "concluida" ? new Date().toISOString() : null,
      }).eq("id", t.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm-tarefas"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("crm_tarefas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-tarefas"] });
      toast.success("Tarefa removida");
    },
  });

  const openNew = () => {
    setEditing({ tipo: "tarefa", prioridade: "media", status: "pendente" });
    setOpen(true);
  };

  return (
    <div className="h-full flex flex-col bg-background">
      <header className="px-6 py-4 border-b border-border/60 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Tarefas</h1>
          <p className="text-xs text-muted-foreground">Follow-ups, ligações, e-mails e atividades comerciais.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8 h-9 w-56" placeholder="Buscar..." value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
          <Button size="sm" onClick={openNew}>
            <Plus className="h-4 w-4 mr-1.5" /> Nova tarefa
          </Button>
        </div>
      </header>

      {/* Tabs filtros */}
      <div className="px-6 pt-4">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {[
            { key: "todas", label: "Todas", count: tarefas.length, icon: ListChecks },
            { key: "pendente", label: "Pendentes", count: counts.pendente, icon: Clock },
            { key: "hoje", label: "Para hoje", count: counts.hoje, icon: CalendarIcon },
            { key: "atrasadas", label: "Atrasadas", count: counts.atrasadas, icon: AlertCircle },
            { key: "concluidas", label: "Concluídas", count: counts.concluidas, icon: CheckCircle2 },
          ].map((f) => {
            const Icon = f.icon;
            const active = filtro === f.key;
            return (
              <button key={f.key} onClick={() => setFiltro(f.key as any)}
                className={`flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-all ${
                  active ? "border-primary bg-primary/5 text-foreground" : "border-border/60 text-muted-foreground hover:bg-muted/40"
                }`}>
                <span className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  {f.label}
                </span>
                <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">{f.count}</Badge>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : filtradas.length === 0 ? (
          <Card className="p-12 text-center border-dashed">
            <ListChecks className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">Nenhuma tarefa encontrada</p>
            <Button size="sm" variant="outline" className="mt-4" onClick={openNew}>
              <Plus className="h-4 w-4 mr-1.5" /> Criar tarefa
            </Button>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtradas.map((t) => {
              const Icon = tipoIcon[t.tipo] ?? ListChecks;
              const concluida = t.status === "concluida";
              const atrasada = t.prazo && isPast(new Date(t.prazo)) && !isToday(new Date(t.prazo)) && !concluida;
              return (
                <Card key={t.id} className={`p-3 flex items-center gap-3 hover:shadow-card-hover transition-shadow ${concluida ? "opacity-60" : ""}`}>
                  <Checkbox checked={concluida} onCheckedChange={() => toggle.mutate(t)} />
                  <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`font-medium text-sm truncate ${concluida ? "line-through" : ""}`}>{t.titulo}</div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                      {t.crm_contatos?.nome && <span className="truncate">{t.crm_contatos.nome}</span>}
                      {t.prazo && (
                        <span className={`flex items-center gap-1 ${atrasada ? "text-rose-500 font-medium" : ""}`}>
                          <CalendarIcon className="h-3 w-3" />
                          {format(new Date(t.prazo), "dd MMM HH:mm", { locale: ptBR })}
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge className={`text-[10px] ${prioridadeColor[t.prioridade] ?? prioridadeColor.media}`} variant="secondary">
                    {t.prioridade}
                  </Badge>
                  <Button size="icon" variant="ghost" className="h-8 w-8"
                    onClick={() => { setEditing(t); setOpen(true); }}>
                    <span className="sr-only">Editar</span>
                    <ListChecks className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-500 hover:text-rose-600"
                    onClick={() => { if (confirm("Remover tarefa?")) remove.mutate(t.id); }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Dialog CRUD */}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Editar tarefa" : "Nova tarefa"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Título</Label>
              <Input value={editing?.titulo ?? ""} onChange={(e) => setEditing({ ...editing, titulo: e.target.value })} />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea rows={3} value={editing?.descricao ?? ""} onChange={(e) => setEditing({ ...editing, descricao: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo</Label>
                <Select value={editing?.tipo ?? "tarefa"} onValueChange={(v) => setEditing({ ...editing, tipo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tarefa">Tarefa</SelectItem>
                    <SelectItem value="ligacao">Ligação</SelectItem>
                    <SelectItem value="email">E-mail</SelectItem>
                    <SelectItem value="reuniao">Reunião</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Prioridade</Label>
                <Select value={editing?.prioridade ?? "media"} onValueChange={(v) => setEditing({ ...editing, prioridade: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Prazo</Label>
              <Input type="datetime-local"
                value={editing?.prazo ? new Date(editing.prazo).toISOString().slice(0, 16) : ""}
                onChange={(e) => setEditing({ ...editing, prazo: e.target.value ? new Date(e.target.value).toISOString() : null })} />
            </div>
            <div>
              <Label>Contato</Label>
              <Select value={editing?.contato_id ?? "none"} onValueChange={(v) => setEditing({ ...editing, contato_id: v === "none" ? null : v })}>
                <SelectTrigger><SelectValue placeholder="Sem contato" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Nenhum —</SelectItem>
                  {contatos.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => upsert.mutate(editing!)} disabled={!editing?.titulo || upsert.isPending}>
              {upsert.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}