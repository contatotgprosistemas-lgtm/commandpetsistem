import { useState } from "react";
import { Package, Plus, Loader2, Pencil, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

const ServicosPage = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const empresaId = profile?.empresa_id;

  // Serviços state
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [tipo, setTipo] = useState("");
  const [considerarDia, setConsiderarDia] = useState(false);
  const [diaria24h, setDiaria24h] = useState(false);
  const [pernoite, setPernoite] = useState(false);

  // Tipos state
  const [tipoOpen, setTipoOpen] = useState(false);
  const [tipoEditOpen, setTipoEditOpen] = useState(false);
  const [tipoEditId, setTipoEditId] = useState<string | null>(null);
  const [tipoNome, setTipoNome] = useState("");

  // Queries
  const { data: servicos, isLoading } = useQuery({
    queryKey: ["servicos", empresaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("servicos")
        .select("*")
        .eq("empresa_id", empresaId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!empresaId,
  });

  const { data: tiposServico, isLoading: tiposLoading } = useQuery({
    queryKey: ["tipos_servico", empresaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tipos_servico" as any)
        .select("*")
        .eq("empresa_id", empresaId!)
        .order("nome");
      if (error) throw error;
      return data as any[];
    },
    enabled: !!empresaId,
  });

  const tiposList = (tiposServico || []).filter((t: any) => t.ativo).map((t: any) => t.nome);

  // Serviço mutations
  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("servicos").insert({
        empresa_id: empresaId!,
        descricao,
        valor: parseFloat(valor) || 0,
        tipo,
        considerar_dia: considerarDia,
        diaria_24h: diaria24h,
        pernoite: pernoite,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["servicos"] });
      toast.success("Serviço adicionado!");
      resetForm();
    },
    onError: () => toast.error("Erro ao adicionar serviço."),
  });

  const editMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("servicos")
        .update({ descricao, valor: parseFloat(valor) || 0, tipo, considerar_dia: considerarDia, diaria_24h: diaria24h, pernoite: pernoite } as any)
        .eq("id", editId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["servicos"] });
      toast.success("Serviço atualizado!");
      resetForm();
      setEditOpen(false);
    },
    onError: () => toast.error("Erro ao atualizar serviço."),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("servicos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["servicos"] });
      toast.success("Serviço excluído!");
    },
    onError: () => toast.error("Erro ao excluir serviço."),
  });

  // Tipo mutations
  const addTipoMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("tipos_servico" as any).insert({
        empresa_id: empresaId!,
        nome: tipoNome,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tipos_servico"] });
      toast.success("Tipo de serviço criado!");
      setTipoNome("");
      setTipoOpen(false);
    },
    onError: () => toast.error("Erro ao criar tipo de serviço."),
  });

  const editTipoMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("tipos_servico" as any)
        .update({ nome: tipoNome } as any)
        .eq("id", tipoEditId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tipos_servico"] });
      toast.success("Tipo atualizado!");
      setTipoNome("");
      setTipoEditId(null);
      setTipoEditOpen(false);
    },
    onError: () => toast.error("Erro ao atualizar tipo."),
  });

  const deleteTipoMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tipos_servico" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tipos_servico"] });
      toast.success("Tipo excluído!");
    },
    onError: () => toast.error("Erro ao excluir tipo."),
  });

  const resetForm = () => {
    setDescricao("");
    setValor("");
    setTipo("");
    setConsiderarDia(false);
    setDiaria24h(false);
    setPernoite(false);
    setOpen(false);
    setEditId(null);
  };

  const openEdit = (s: any) => {
    setEditId(s.id);
    setDescricao(s.descricao);
    setValor(String(s.valor));
    setTipo(s.tipo);
    setConsiderarDia((s as any).considerar_dia ?? false);
    setDiaria24h((s as any).diaria_24h ?? false);
    setPernoite((s as any).pernoite ?? false);
    setEditOpen(true);
  };

  const openEditTipo = (t: any) => {
    setTipoEditId(t.id);
    setTipoNome(t.nome);
    setTipoEditOpen(true);
  };

  return (
    <div className="p-3 md:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Package className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Serviços</h1>
      </div>

      <Tabs defaultValue="servicos" className="w-full">
        <TabsList>
          <TabsTrigger value="servicos">Serviços</TabsTrigger>
          <TabsTrigger value="tipos">Tipos de Serviço</TabsTrigger>
        </TabsList>

        {/* ─── Serviços Tab ─── */}
        <TabsContent value="servicos" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" />Adicionar Serviço</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Novo Serviço</DialogTitle>
                  <DialogDescription>Preencha os dados do serviço</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Descrição</Label>
                    <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descrição do serviço" />
                  </div>
                  <div>
                    <Label>Valor (R$)</Label>
                    <Input type="number" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" />
                  </div>
                  <div>
                    <Label>Tipo</Label>
                    <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="w-full border border-border rounded-md p-2 bg-background text-foreground">
                      <option value="">Selecione</option>
                      {tiposList.map((t: string) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  {/hotel|hospedagem|hotelzinho|pensão|pens[aã]o|pernoite|estadia/i.test(tipo) && (
                  <div className="flex gap-6">
                    <div className="flex items-center gap-2">
                      <Checkbox id="new-considerar-dia" checked={considerarDia} onCheckedChange={(v) => { setConsiderarDia(!!v); if (v) { setDiaria24h(false); setPernoite(false); } }} />
                      <Label htmlFor="new-considerar-dia" className="text-sm font-normal">Considerar o Dia</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox id="new-diaria-24h" checked={diaria24h} onCheckedChange={(v) => { setDiaria24h(!!v); if (v) { setConsiderarDia(false); setPernoite(false); } }} />
                      <Label htmlFor="new-diaria-24h" className="text-sm font-normal">Diária de 24 Horas</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox id="new-pernoite" checked={pernoite} onCheckedChange={(v) => { setPernoite(!!v); if (v) { setConsiderarDia(false); setDiaria24h(false); } }} />
                      <Label htmlFor="new-pernoite" className="text-sm font-normal">Pernoite (18h às 8h)</Label>
                    </div>
                  </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                  <Button onClick={() => addMutation.mutate()} disabled={!descricao || !tipo || addMutation.isPending}>
                    {addMutation.isPending ? "Salvando..." : "Salvar"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : servicos && servicos.length > 0 ? (
            <div className="space-y-2">
              {servicos.map((s) => (
                <div key={s.id} className="flex items-center justify-between border border-border p-3 rounded-lg bg-card">
                  <div>
                    <p className="font-medium text-foreground">{s.descricao}</p>
                    <p className="text-sm text-muted-foreground">{s.tipo} — R$ {Number(s.valor).toFixed(2)}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEdit(s)}>
                      <Pencil className="h-3.5 w-3.5 mr-1" />Editar
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => deleteMutation.mutate(s.id)}>
                      <Trash2 className="h-3.5 w-3.5 mr-1" />Excluir
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">Nenhum serviço cadastrado.</p>
          )}
        </TabsContent>

        {/* ─── Tipos de Serviço Tab ─── */}
        <TabsContent value="tipos" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={tipoOpen} onOpenChange={setTipoOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" />Novo Tipo</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Novo Tipo de Serviço</DialogTitle>
                  <DialogDescription>Crie um tipo de serviço personalizado</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Nome</Label>
                    <Input value={tipoNome} onChange={(e) => setTipoNome(e.target.value)} placeholder="Ex: Daycare, Hotel, Banho e Tosa..." />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setTipoOpen(false)}>Cancelar</Button>
                  <Button onClick={() => addTipoMutation.mutate()} disabled={!tipoNome || addTipoMutation.isPending}>
                    {addTipoMutation.isPending ? "Salvando..." : "Salvar"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {tiposLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : tiposServico && tiposServico.length > 0 ? (
            <div className="space-y-2">
              {tiposServico.map((t: any) => (
                <div key={t.id} className="flex items-center justify-between border border-border p-3 rounded-lg bg-card">
                  <p className="font-medium text-foreground">{t.nome}</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEditTipo(t)}>
                      <Pencil className="h-3.5 w-3.5 mr-1" />Editar
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => deleteTipoMutation.mutate(t.id)}>
                      <Trash2 className="h-3.5 w-3.5 mr-1" />Excluir
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">Nenhum tipo de serviço cadastrado. Crie o primeiro!</p>
          )}
        </TabsContent>

      </Tabs>

      {/* Edit Serviço Dialog */}
      <Dialog open={editOpen} onOpenChange={(o) => { setEditOpen(o); if (!o) resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Serviço</DialogTitle>
            <DialogDescription>Atualize as informações do serviço</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Descrição</Label>
              <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} />
            </div>
            <div>
              <Label>Valor (R$)</Label>
              <Input type="number" value={valor} onChange={(e) => setValor(e.target.value)} />
            </div>
            <div>
              <Label>Tipo</Label>
              <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="w-full border border-border rounded-md p-2 bg-background text-foreground">
                <option value="">Selecione</option>
                {tiposList.map((t: string) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            {/hotel|hospedagem|hotelzinho|pensão|pens[aã]o|pernoite|estadia/i.test(tipo) && (
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <Checkbox id="edit-considerar-dia" checked={considerarDia} onCheckedChange={(v) => { setConsiderarDia(!!v); if (v) { setDiaria24h(false); setPernoite(false); } }} />
                <Label htmlFor="edit-considerar-dia" className="text-sm font-normal">Considerar o Dia</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="edit-diaria-24h" checked={diaria24h} onCheckedChange={(v) => { setDiaria24h(!!v); if (v) { setConsiderarDia(false); setPernoite(false); } }} />
                <Label htmlFor="edit-diaria-24h" className="text-sm font-normal">Diária de 24 Horas</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="edit-pernoite" checked={pernoite} onCheckedChange={(v) => { setPernoite(!!v); if (v) { setConsiderarDia(false); setDiaria24h(false); } }} />
                <Label htmlFor="edit-pernoite" className="text-sm font-normal">Pernoite (18h às 8h)</Label>
              </div>
            </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditOpen(false); resetForm(); }}>Cancelar</Button>
            <Button onClick={() => editMutation.mutate()} disabled={!descricao || !tipo || editMutation.isPending}>
              {editMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Tipo Dialog */}
      <Dialog open={tipoEditOpen} onOpenChange={(o) => { setTipoEditOpen(o); if (!o) { setTipoNome(""); setTipoEditId(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Tipo de Serviço</DialogTitle>
            <DialogDescription>Atualize o nome do tipo</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input value={tipoNome} onChange={(e) => setTipoNome(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setTipoEditOpen(false); setTipoNome(""); setTipoEditId(null); }}>Cancelar</Button>
            <Button onClick={() => editTipoMutation.mutate()} disabled={!tipoNome || editTipoMutation.isPending}>
              {editTipoMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default ServicosPage;
