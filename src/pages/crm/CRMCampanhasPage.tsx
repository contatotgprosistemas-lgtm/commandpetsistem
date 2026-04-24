import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentEmpresa } from "@/lib/useCurrentEmpresa";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Megaphone, Plus, Play, Trash2, Users, CheckCircle2, XCircle, Clock, Send } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const statusMap: Record<string, { label: string; color: string }> = {
  rascunho: { label: "Rascunho", color: "bg-muted text-muted-foreground" },
  agendada: { label: "Agendada", color: "bg-blue-500/15 text-blue-600" },
  enviando: { label: "Enviando", color: "bg-amber-500/15 text-amber-600" },
  concluida: { label: "Concluída", color: "bg-emerald-500/15 text-emerald-600" },
  cancelada: { label: "Cancelada", color: "bg-rose-500/15 text-rose-600" },
};

export default function CRMCampanhasPage() {
  const { data: empresaId } = useCurrentEmpresa();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<any | null>(null);

  const { data: campanhas } = useQuery({
    queryKey: ["crm-campanhas", empresaId],
    enabled: !!empresaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_campanhas").select("*")
        .eq("empresa_id", empresaId!).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: canais } = useQuery({
    queryKey: ["crm-canais-list", empresaId],
    enabled: !!empresaId,
    queryFn: async () => {
      const { data } = await supabase.from("crm_canais").select("id,nome,status").eq("empresa_id", empresaId!);
      return data ?? [];
    },
  });

  const { data: contatos } = useQuery({
    queryKey: ["crm-contatos-count", empresaId],
    enabled: !!empresaId,
    queryFn: async () => {
      const { count } = await supabase.from("crm_contatos").select("*", { count: "exact", head: true })
        .eq("empresa_id", empresaId!);
      return count ?? 0;
    },
  });

  const dispararMutation = useMutation({
    mutationFn: async (campanha_id: string) => {
      const { error } = await supabase.functions.invoke("campanha-disparo", { body: { campanha_id } });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Disparo iniciado");
      qc.invalidateQueries({ queryKey: ["crm-campanhas"] });
    },
    onError: (e: any) => toast.error(e.message || "Erro no disparo"),
  });

  const excluirMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("crm_campanhas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Campanha excluída");
      qc.invalidateQueries({ queryKey: ["crm-campanhas"] });
    },
  });

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Campanhas</h1>
          <p className="text-sm text-muted-foreground">Disparos em massa por WhatsApp.</p>
        </div>
        <Button onClick={() => setOpen(true)} style={{ background: "var(--gradient-brand)" }} className="text-white">
          <Plus className="h-4 w-4 mr-1.5" /> Nova campanha
        </Button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <StatCard icon={Megaphone} label="Total" value={campanhas?.length ?? 0} />
        <StatCard icon={Send} label="Enviando" value={campanhas?.filter((c) => c.status === "enviando").length ?? 0} />
        <StatCard icon={CheckCircle2} label="Concluídas" value={campanhas?.filter((c) => c.status === "concluida").length ?? 0} />
        <StatCard icon={Users} label="Contatos disponíveis" value={contatos ?? 0} />
      </div>

      <Card className="border-border/60 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3">Nome</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Progresso</th>
              <th className="text-left px-4 py-3">Criada</th>
              <th className="text-right px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {campanhas?.map((c) => {
              const total = c.total_destinatarios || 0;
              const pct = total > 0 ? ((c.total_enviados + c.total_falhas) / total) * 100 : 0;
              const s = statusMap[c.status] ?? statusMap.rascunho;
              return (
                <tr key={c.id} className="border-t border-border/60 hover:bg-muted/20 cursor-pointer"
                    onClick={() => setDetail(c)}>
                  <td className="px-4 py-3 font-medium">{c.nome}</td>
                  <td className="px-4 py-3"><Badge className={s.color}>{s.label}</Badge></td>
                  <td className="px-4 py-3 w-64">
                    <div className="flex items-center gap-2">
                      <Progress value={pct} className="h-1.5 flex-1" />
                      <span className="text-xs text-muted-foreground w-20 text-right">
                        {c.total_enviados + c.total_falhas}/{total}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {format(new Date(c.created_at), "dd/MM/yy HH:mm")}
                  </td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    {(c.status === "rascunho" || c.status === "agendada") && (
                      <Button size="sm" variant="ghost"
                              onClick={() => dispararMutation.mutate(c.id)}
                              disabled={dispararMutation.isPending}>
                        <Play className="h-4 w-4 text-emerald-600" />
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => excluirMutation.mutate(c.id)}>
                      <Trash2 className="h-4 w-4 text-rose-600" />
                    </Button>
                  </td>
                </tr>
              );
            })}
            {(!campanhas || campanhas.length === 0) && (
              <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">
                Nenhuma campanha. Clique em "Nova campanha" para começar.
              </td></tr>
            )}
          </tbody>
        </table>
      </Card>

      <NovaCampanhaSheet open={open} onClose={() => setOpen(false)} canais={canais ?? []} empresaId={empresaId} />
      <DetalheCampanhaSheet campanha={detail} onClose={() => setDetail(null)} />
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <Card className="p-4 border-border/60">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-xl font-semibold">{value}</div>
        </div>
      </div>
    </Card>
  );
}

function NovaCampanhaSheet({ open, onClose, canais, empresaId }: any) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    nome: "", mensagem: "", canal_id: "", intervalo: 5,
    publico: "todos" as "todos" | "tag",
    tag_id: "",
  });

  const { data: tags } = useQuery({
    queryKey: ["crm-tags-list", empresaId],
    enabled: !!empresaId && open,
    queryFn: async () => {
      const { data } = await supabase.from("crm_contato_tags").select("id,nome").eq("empresa_id", empresaId);
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!form.nome || !form.mensagem || !form.canal_id) throw new Error("Preencha nome, canal e mensagem");

      // Buscar contatos
      let contatosQuery = supabase.from("crm_contatos").select("id,nome,whatsapp")
        .eq("empresa_id", empresaId).not("whatsapp", "is", null);

      let contatos: any[] = [];
      if (form.publico === "tag" && form.tag_id) {
        const { data: links } = await supabase.from("crm_contato_tag_links")
          .select("contato_id").eq("tag_id", form.tag_id);
        const ids = (links ?? []).map((l) => l.contato_id);
        if (ids.length === 0) throw new Error("Nenhum contato com essa tag");
        const { data } = await contatosQuery.in("id", ids);
        contatos = data ?? [];
      } else {
        const { data } = await contatosQuery;
        contatos = data ?? [];
      }

      if (contatos.length === 0) throw new Error("Nenhum contato com WhatsApp encontrado");

      const { data: { user } } = await supabase.auth.getUser();
      const { data: camp, error } = await supabase.from("crm_campanhas").insert({
        empresa_id: empresaId,
        nome: form.nome,
        mensagem: form.mensagem,
        canal_id: form.canal_id,
        intervalo_segundos: form.intervalo,
        total_destinatarios: contatos.length,
        created_by: user?.id,
        status: "rascunho",
      }).select().single();
      if (error) throw error;

      const dests = contatos.map((c) => ({
        campanha_id: camp.id,
        empresa_id: empresaId,
        contato_id: c.id,
        numero: c.whatsapp,
        nome: c.nome,
      }));
      await supabase.from("crm_campanha_destinatarios").insert(dests);
    },
    onSuccess: () => {
      toast.success("Campanha criada");
      qc.invalidateQueries({ queryKey: ["crm-campanhas"] });
      onClose();
      setForm({ nome: "", mensagem: "", canal_id: "", intervalo: 5, publico: "todos", tag_id: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Nova campanha</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <div>
            <Label>Nome</Label>
            <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </div>

          <div>
            <Label>Canal WhatsApp</Label>
            <Select value={form.canal_id} onValueChange={(v) => setForm({ ...form, canal_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione um canal" /></SelectTrigger>
              <SelectContent>
                {canais.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome} {c.status !== "conectado" && "(desconectado)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Mensagem</Label>
            <Textarea rows={6} value={form.mensagem}
                      onChange={(e) => setForm({ ...form, mensagem: e.target.value })}
                      placeholder="Olá {{nome}}, ..." />
            <p className="text-xs text-muted-foreground mt-1">Use {`{{nome}}`} para personalizar.</p>
          </div>

          <div>
            <Label>Público</Label>
            <Select value={form.publico} onValueChange={(v: any) => setForm({ ...form, publico: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os contatos</SelectItem>
                <SelectItem value="tag">Por tag</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {form.publico === "tag" && (
            <div>
              <Label>Tag</Label>
              <Select value={form.tag_id} onValueChange={(v) => setForm({ ...form, tag_id: v })}>
                <SelectTrigger><SelectValue placeholder="Escolha uma tag" /></SelectTrigger>
                <SelectContent>
                  {(tags ?? []).map((t: any) => (
                    <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>Intervalo entre envios (segundos)</Label>
            <Input type="number" min={2} value={form.intervalo}
                   onChange={(e) => setForm({ ...form, intervalo: Number(e.target.value) })} />
            <p className="text-xs text-muted-foreground mt-1">Recomendado: 5-15s para evitar bloqueio.</p>
          </div>

          <Button className="w-full" onClick={() => create.mutate()} disabled={create.isPending}
                  style={{ background: "var(--gradient-brand)" }}>
            <Megaphone className="h-4 w-4 mr-1.5 text-white" />
            <span className="text-white">Criar campanha</span>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DetalheCampanhaSheet({ campanha, onClose }: any) {
  const { data: dests } = useQuery({
    queryKey: ["crm-campanha-dests", campanha?.id],
    enabled: !!campanha,
    queryFn: async () => {
      const { data } = await supabase.from("crm_campanha_destinatarios")
        .select("*").eq("campanha_id", campanha.id).order("created_at");
      return data ?? [];
    },
    refetchInterval: campanha?.status === "enviando" ? 3000 : false,
  });

  if (!campanha) return null;
  const enviados = dests?.filter((d) => d.status === "enviado").length ?? 0;
  const falhas = dests?.filter((d) => d.status === "falhou").length ?? 0;
  const pendentes = dests?.filter((d) => d.status === "pendente").length ?? 0;

  return (
    <Sheet open={!!campanha} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{campanha.nome}</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <Card className="p-3 bg-muted/30 text-sm whitespace-pre-wrap">{campanha.mensagem}</Card>

          <div className="grid grid-cols-3 gap-2 text-center">
            <Card className="p-3">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 mx-auto mb-1" />
              <div className="text-lg font-semibold">{enviados}</div>
              <div className="text-[10px] text-muted-foreground uppercase">Enviados</div>
            </Card>
            <Card className="p-3">
              <Clock className="h-4 w-4 text-amber-600 mx-auto mb-1" />
              <div className="text-lg font-semibold">{pendentes}</div>
              <div className="text-[10px] text-muted-foreground uppercase">Pendentes</div>
            </Card>
            <Card className="p-3">
              <XCircle className="h-4 w-4 text-rose-600 mx-auto mb-1" />
              <div className="text-lg font-semibold">{falhas}</div>
              <div className="text-[10px] text-muted-foreground uppercase">Falhas</div>
            </Card>
          </div>

          <div className="space-y-1 max-h-96 overflow-y-auto">
            {dests?.map((d) => (
              <div key={d.id} className="flex items-center justify-between text-xs px-3 py-2 rounded-md border border-border/50">
                <div>
                  <div className="font-medium">{d.nome || d.numero}</div>
                  <div className="text-muted-foreground">{d.numero}</div>
                </div>
                <Badge variant="outline" className={
                  d.status === "enviado" ? "border-emerald-500 text-emerald-600" :
                  d.status === "falhou" ? "border-rose-500 text-rose-600" :
                  "border-amber-500 text-amber-600"
                }>{d.status}</Badge>
              </div>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
