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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

// 🔥 VERSÃO BLINDADA

const TIPOS_SERVICO = ["Daycare", "Hotel", "TaxiDog", "Banho e Tosa"];

const ServicosPage = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const empresaId = profile?.empresa_id;

  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);

  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [tipo, setTipo] = useState("");

  // 🔒 QUERY BLINDADA
  const {
    data: servicos,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["servicos", empresaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("servicos")
        .select("*")
        .eq("empresa_id", empresaId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!empresaId,
  });

  // 🔒 ADD
  const addMutation = useMutation({
    mutationFn: async () => {
      try {
        const { error } = await supabase.from("servicos").insert({
          empresa_id: empresaId!,
          descricao,
          valor: parseFloat(valor) || 0,
          tipo,
        });

        if (error) throw error;
      } catch (err) {
        console.error(err);
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["servicos"] });
      toast.success("Serviço adicionado!");
      resetForm();
    },
    onError: () => toast.error("Erro ao adicionar serviço."),
  });

  // 🔒 EDIT
  const editMutation = useMutation({
    mutationFn: async () => {
      try {
        const { error } = await supabase
          .from("servicos")
          .update({
            descricao,
            valor: parseFloat(valor) || 0,
            tipo,
          })
          .eq("id", editId!);

        if (error) throw error;
      } catch (err) {
        console.error(err);
        throw err;
      }
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
      try {
        const { error } = await supabase.from("servicos").delete().eq("id", id);

        if (error) throw error;
      } catch (err) {
        console.error(err);
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["servicos"] });
      toast.success("Serviço excluído!");
      setDeleteId(null);
    },
    onError: () => toast.error("Erro ao excluir serviço."),
  });

  const resetForm = () => {
    setDescricao("");
    setValor("");
    setTipo("");
    setOpen(false);
    setEditId(null);
  };

  const openEdit = (s: any) => {
    setEditId(s.id);
    setDescricao(s.descricao);
    setValor(String(s.valor));
    setTipo(s.tipo);
    setEditOpen(true);
  };

  return (
    <div className="p-6 space-y-6 notranslate">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Serviços</h1>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Adicionar Serviço</Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Serviço</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descrição" />

              <Input type="number" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="Valor" />

              {/* 🔥 SELECT NATIVO (BLINDADO) */}
              <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="w-full border rounded-md p-2">
                <option value="">Selecione</option>
                {TIPOS_SERVICO.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>

              <Button onClick={() => addMutation.mutate()} disabled={!descricao || !tipo || addMutation.isPending}>
                {addMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* 🔒 ESTADOS */}
      {isLoading && <p>Carregando...</p>}
      {error && <p className="text-red-500">Erro ao carregar dados</p>}

      {!isLoading && (!servicos || servicos.length === 0) && <p>Nenhum serviço cadastrado.</p>}

      {servicos && servicos.length > 0 && (
        <div className="space-y-2">
          {servicos.map((s) => (
            <div key={s.id} className="flex justify-between border p-3 rounded-md">
              <div>
                <p>{s.descricao}</p>
                <p className="text-sm text-muted-foreground">{s.tipo}</p>
              </div>

              <div className="flex gap-2">
                <Button onClick={() => openEdit(s)}>Editar</Button>
                <Button variant="destructive" onClick={() => deleteMutation.mutate(s.id)}>
                  Excluir
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={(o) => { setEditOpen(o); if (!o) resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Serviço</DialogTitle>
            <DialogDescription>Atualize as informações do serviço</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Descrição</Label>
              <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descrição" />
            </div>
            <div>
              <Label>Valor</Label>
              <Input type="number" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="Valor" />
            </div>
            <div>
              <Label>Tipo</Label>
              <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="w-full border rounded-md p-2">
                <option value="">Selecione</option>
                {TIPOS_SERVICO.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditOpen(false); resetForm(); }}>Cancelar</Button>
            <Button onClick={() => editMutation.mutate()} disabled={!descricao || !tipo || editMutation.isPending}>
              {editMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ServicosPage;
