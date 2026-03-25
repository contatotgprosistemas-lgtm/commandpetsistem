import { useState } from "react";
import { ShoppingBag, Plus, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

const TIPOS_SERVICO = ["Daycare", "Hotel", "TaxiDog", "Banho e Tosa"];

const ProdutosPage = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [tipo, setTipo] = useState("");

  const empresaId = profile?.empresa_id;

  const { data: produtos, isLoading } = useQuery({
    queryKey: ["produtos", empresaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("produtos")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!empresaId,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("produtos").insert({
        empresa_id: empresaId!,
        descricao,
        valor: parseFloat(valor) || 0,
        tipo,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["produtos"] });
      toast.success("Produto adicionado!");
      resetForm();
    },
    onError: () => toast.error("Erro ao adicionar produto."),
  });

  const resetForm = () => {
    setDescricao("");
    setValor("");
    setTipo("");
    setOpen(false);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShoppingBag className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Produtos</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Adicionar Produto</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Produto</DialogTitle>
              <DialogDescription>Preencha os dados do produto.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descrição do produto" />
              </div>
              <div className="space-y-2">
                <Label>Valor (R$)</Label>
                <Input type="number" min="0" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" />
              </div>
              <div className="space-y-2">
                <Label>Tipo do Serviço</Label>
                <Select value={tipo} onValueChange={setTipo}>
                  <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                  <SelectContent>
                    {TIPOS_SERVICO.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={() => addMutation.mutate()} disabled={!descricao || !tipo || addMutation.isPending}>
                {addMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <p className="text-muted-foreground">Gerencie os produtos disponíveis na sua empresa.</p>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : produtos && produtos.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Descrição</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {produtos.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{p.descricao}</TableCell>
                <TableCell>{p.tipo}</TableCell>
                <TableCell className="text-right">R$ {Number(p.valor).toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <p className="text-center text-muted-foreground py-8">Nenhum produto cadastrado.</p>
      )}
    </div>
  );
};

export default ProdutosPage;
