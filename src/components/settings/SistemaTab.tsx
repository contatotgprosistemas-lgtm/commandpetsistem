import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { BedDouble, Stethoscope, ClipboardCheck, Plus, Pencil, Trash2, Loader2 } from "lucide-react";

/* ─────────── BAIAS ─────────── */
function BaiasSection() {
  const { profile } = useAuth();
  const empresaId = profile?.empresa_id;
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [tamanho, setTamanho] = useState("");
  const [capacidade, setCapacidade] = useState("1");

  const { data: baias, isLoading } = useQuery({
    queryKey: ["baias", empresaId],
    queryFn: async () => {
      const { data, error } = await supabase.from("baias").select("*").eq("empresa_id", empresaId!).order("nome");
      if (error) throw error;
      return data;
    },
    enabled: !!empresaId,
  });

  const reset = () => { setNome(""); setTamanho(""); setCapacidade("1"); setEditId(null); setOpen(false); };

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload: any = { empresa_id: empresaId!, nome, tamanho, capacidade_pets: parseInt(capacidade) || 1 };
      if (editId) {
        const { error } = await supabase.from("baias").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("baias").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["baias"] }); toast.success(editId ? "Baia atualizada!" : "Baia criada!"); reset(); },
    onError: () => toast.error("Erro ao salvar baia."),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("baias").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["baias"] }); toast.success("Baia excluída!"); },
    onError: () => toast.error("Erro ao excluir baia."),
  });

  const openEdit = (b: any) => { setEditId(b.id); setNome(b.nome); setTamanho(b.tamanho || ""); setCapacidade(String(b.capacidade_pets || 1)); setOpen(true); };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">Baias / Quartos</CardTitle>
          <CardDescription>Cadastre baias para uso em hospedagem e reservas.</CardDescription>
        </div>
        <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); setOpen(v); }}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Nova Baia</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editId ? "Editar Baia" : "Nova Baia"}</DialogTitle>
              <DialogDescription>Cadastre uma baia com tamanho e capacidade.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div><Label>Nome *</Label><Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Baia 1, Suíte Premium" /></div>
              <div><Label>Tamanho</Label><Input value={tamanho} onChange={(e) => setTamanho(e.target.value)} placeholder="Ex: 2m x 3m, Grande" /></div>
              <div><Label>Capacidade de Pets</Label><Input type="number" min="1" value={capacidade} onChange={(e) => setCapacidade(e.target.value)} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={reset}>Cancelar</Button>
              <Button onClick={() => saveMut.mutate()} disabled={!nome || saveMut.isPending}>{saveMut.isPending ? "Salvando..." : "Salvar"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : baias && baias.length > 0 ? (
          <div className="space-y-2">
            {baias.map((b: any) => (
              <div key={b.id} className="flex items-center justify-between border border-border p-3 rounded-lg bg-card">
                <div>
                  <p className="font-medium text-foreground">{b.nome}</p>
                  <p className="text-xs text-muted-foreground">{b.tamanho || "—"} · Capacidade: {b.capacidade_pets || 1}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(b)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button variant="destructive" size="sm" onClick={() => delMut.mutate(b.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-6 text-sm">Nenhuma baia cadastrada.</p>
        )}
      </CardContent>
    </Card>
  );
}

/* ─────────── PERGUNTAS DE MANEJO POR TIPO DE SERVIÇO ─────────── */
function PerguntasManejoSection() {
  const { profile } = useAuth();
  const empresaId = profile?.empresa_id;
  const qc = useQueryClient();
  const [tipoId, setTipoId] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [pergunta, setPergunta] = useState("");
  const [tipo, setTipo] = useState<string>("sim_nao");
  const [opcoes, setOpcoes] = useState("");

  const { data: tipos } = useQuery({
    queryKey: ["tipos_servico", empresaId],
    queryFn: async () => {
      const { data, error } = await supabase.from("tipos_servico" as any).select("*").eq("empresa_id", empresaId!).eq("ativo", true).order("nome");
      if (error) throw error;
      return data as any[];
    },
    enabled: !!empresaId,
  });

  const { data: perguntas, isLoading } = useQuery({
    queryKey: ["perguntas_manejo", tipoId],
    queryFn: async () => {
      const { data, error } = await supabase.from("tipo_servico_perguntas_manejo" as any).select("*").eq("tipo_servico_id", tipoId).order("ordem");
      if (error) throw error;
      return data as any[];
    },
    enabled: !!tipoId,
  });

  const reset = () => { setPergunta(""); setTipo("sim_nao"); setOpcoes(""); setEditId(null); setOpen(false); };

  const saveMut = useMutation({
    mutationFn: async () => {
      const opcoesArr = tipo === "select" ? opcoes.split(",").map(s => s.trim()).filter(Boolean) : [];
      const payload: any = { empresa_id: empresaId!, tipo_servico_id: tipoId, pergunta, tipo, opcoes: opcoesArr };
      if (editId) {
        const { error } = await supabase.from("tipo_servico_perguntas_manejo" as any).update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("tipo_servico_perguntas_manejo" as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["perguntas_manejo"] }); toast.success("Pergunta salva!"); reset(); },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tipo_servico_perguntas_manejo" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["perguntas_manejo"] }); toast.success("Pergunta excluída!"); },
  });

  const openEdit = (p: any) => {
    setEditId(p.id); setPergunta(p.pergunta); setTipo(p.tipo);
    setOpcoes(Array.isArray(p.opcoes) ? p.opcoes.join(", ") : "");
    setOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><Stethoscope className="h-4 w-4 text-primary" /> Perguntas do Boletim Diário (Manejo)</CardTitle>
        <CardDescription>Crie perguntas personalizadas para cada tipo de serviço (Hotel, Escola, Banho, etc).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end gap-3">
          <div className="flex-1 space-y-1">
            <Label>Tipo de Serviço</Label>
            <Select value={tipoId} onValueChange={setTipoId}>
              <SelectTrigger><SelectValue placeholder="Selecione um tipo" /></SelectTrigger>
              <SelectContent>
                {tipos?.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); setOpen(v); }}>
            <DialogTrigger asChild>
              <Button disabled={!tipoId}><Plus className="h-4 w-4 mr-1" />Nova Pergunta</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editId ? "Editar Pergunta" : "Nova Pergunta"}</DialogTitle>
                <DialogDescription>Define como a pergunta aparece no boletim.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div><Label>Pergunta *</Label><Input value={pergunta} onChange={(e) => setPergunta(e.target.value)} placeholder="Ex: Comeu toda a ração?" /></div>
                <div>
                  <Label>Tipo de Resposta</Label>
                  <Select value={tipo} onValueChange={setTipo}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sim_nao">Sim / Não</SelectItem>
                      <SelectItem value="select">Seleção (opções)</SelectItem>
                      <SelectItem value="texto">Texto livre</SelectItem>
                      <SelectItem value="numero">Número</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {tipo === "select" && (
                  <div>
                    <Label>Opções (separadas por vírgula)</Label>
                    <Input value={opcoes} onChange={(e) => setOpcoes(e.target.value)} placeholder="Sim, Não, Parcial" />
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={reset}>Cancelar</Button>
                <Button onClick={() => saveMut.mutate()} disabled={!pergunta || saveMut.isPending}>{saveMut.isPending ? "Salvando..." : "Salvar"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {!tipoId ? (
          <p className="text-center text-muted-foreground py-6 text-sm">Selecione um tipo de serviço para gerenciar suas perguntas.</p>
        ) : isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : perguntas && perguntas.length > 0 ? (
          <div className="space-y-2">
            {perguntas.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between border border-border p-3 rounded-lg bg-card">
                <div className="flex-1">
                  <p className="font-medium text-foreground text-sm">{p.pergunta}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-[10px]">{p.tipo}</Badge>
                    {p.tipo === "select" && Array.isArray(p.opcoes) && p.opcoes.length > 0 && (
                      <span className="text-xs text-muted-foreground">{p.opcoes.join(", ")}</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(p)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button variant="destructive" size="sm" onClick={() => delMut.mutate(p.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-6 text-sm">Nenhuma pergunta cadastrada para este tipo de serviço.</p>
        )}
      </CardContent>
    </Card>
  );
}

/* ─────────── PERGUNTAS DE CHECKLIST POR TIPO DE SERVIÇO ─────────── */
function PerguntasChecklistSection() {
  const { profile } = useAuth();
  const empresaId = profile?.empresa_id;
  const qc = useQueryClient();
  const [tipoId, setTipoId] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [pergunta, setPergunta] = useState("");

  const { data: tipos } = useQuery({
    queryKey: ["tipos_servico", empresaId],
    queryFn: async () => {
      const { data, error } = await supabase.from("tipos_servico" as any).select("*").eq("empresa_id", empresaId!).eq("ativo", true).order("nome");
      if (error) throw error;
      return data as any[];
    },
    enabled: !!empresaId,
  });

  const { data: perguntas, isLoading } = useQuery({
    queryKey: ["perguntas_checklist", tipoId],
    queryFn: async () => {
      const { data, error } = await supabase.from("tipo_servico_perguntas_checklist" as any).select("*").eq("tipo_servico_id", tipoId).order("ordem");
      if (error) throw error;
      return data as any[];
    },
    enabled: !!tipoId,
  });

  const reset = () => { setPergunta(""); setEditId(null); setOpen(false); };

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload: any = { empresa_id: empresaId!, tipo_servico_id: tipoId, pergunta };
      if (editId) {
        const { error } = await supabase.from("tipo_servico_perguntas_checklist" as any).update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("tipo_servico_perguntas_checklist" as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["perguntas_checklist"] }); toast.success("Pergunta salva!"); reset(); },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tipo_servico_perguntas_checklist" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["perguntas_checklist"] }); toast.success("Pergunta excluída!"); },
  });

  const openEdit = (p: any) => { setEditId(p.id); setPergunta(p.pergunta); setOpen(true); };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><ClipboardCheck className="h-4 w-4 text-primary" /> Perguntas do Checklist</CardTitle>
        <CardDescription>Crie itens de checklist personalizados para cada tipo de serviço.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end gap-3">
          <div className="flex-1 space-y-1">
            <Label>Tipo de Serviço</Label>
            <Select value={tipoId} onValueChange={setTipoId}>
              <SelectTrigger><SelectValue placeholder="Selecione um tipo" /></SelectTrigger>
              <SelectContent>
                {tipos?.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); setOpen(v); }}>
            <DialogTrigger asChild>
              <Button disabled={!tipoId}><Plus className="h-4 w-4 mr-1" />Nova Pergunta</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editId ? "Editar Pergunta" : "Nova Pergunta"}</DialogTitle>
                <DialogDescription>Item do checklist (resposta Sim/Não).</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div><Label>Pergunta *</Label><Input value={pergunta} onChange={(e) => setPergunta(e.target.value)} placeholder="Ex: Olhos Ok?" /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={reset}>Cancelar</Button>
                <Button onClick={() => saveMut.mutate()} disabled={!pergunta || saveMut.isPending}>{saveMut.isPending ? "Salvando..." : "Salvar"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {!tipoId ? (
          <p className="text-center text-muted-foreground py-6 text-sm">Selecione um tipo de serviço para gerenciar suas perguntas.</p>
        ) : isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : perguntas && perguntas.length > 0 ? (
          <div className="space-y-2">
            {perguntas.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between border border-border p-3 rounded-lg bg-card">
                <p className="font-medium text-foreground text-sm">{p.pergunta}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(p)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button variant="destructive" size="sm" onClick={() => delMut.mutate(p.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-6 text-sm">Nenhuma pergunta cadastrada para este tipo de serviço.</p>
        )}
      </CardContent>
    </Card>
  );
}

export function SistemaTab() {
  return (
    <Tabs defaultValue="baias" className="w-full">
      <TabsList>
        <TabsTrigger value="baias" className="gap-1.5"><BedDouble className="h-3.5 w-3.5" /> Baias</TabsTrigger>
        <TabsTrigger value="manejo" className="gap-1.5"><Stethoscope className="h-3.5 w-3.5" /> Boletim Diário</TabsTrigger>
        <TabsTrigger value="checklist" className="gap-1.5"><ClipboardCheck className="h-3.5 w-3.5" /> Checklist</TabsTrigger>
      </TabsList>
      <TabsContent value="baias" className="mt-4"><BaiasSection /></TabsContent>
      <TabsContent value="manejo" className="mt-4"><PerguntasManejoSection /></TabsContent>
      <TabsContent value="checklist" className="mt-4"><PerguntasChecklistSection /></TabsContent>
    </Tabs>
  );
}