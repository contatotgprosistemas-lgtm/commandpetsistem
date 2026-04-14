import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface NovaMovimentacaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function NovaMovimentacaoDialog({ open, onOpenChange, onSuccess }: NovaMovimentacaoDialogProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [bancos, setBancos] = useState<{ id: string; label: string }[]>([]);

  const [dataMov, setDataMov] = useState(() => new Date().toISOString().split("T")[0]);
  const [planoContas, setPlanoContas] = useState("");
  const [pessoa, setPessoa] = useState("");
  const [complemento, setComplemento] = useState("");
  const [contaBancariaId, setContaBancariaId] = useState("");
  const [valor, setValor] = useState("");
  const [tipoValor, setTipoValor] = useState<"entrada" | "saida">("entrada");

  useEffect(() => {
    if (!open || !profile?.empresa_id) return;
    supabase
      .from("contas_bancarias")
      .select("id, banco, titular")
      .eq("empresa_id", profile.empresa_id)
      .order("created_at")
      .then(({ data }) => {
        if (data) setBancos(data.map((b: any) => ({ id: b.id, label: `${b.banco} - ${b.titular}` })));
      });
  }, [open, profile?.empresa_id]);

  const resetForm = () => {
    setDataMov(new Date().toISOString().split("T")[0]);
    setPlanoContas("");
    setPessoa("");
    setComplemento("");
    setContaBancariaId("");
    setValor("");
    setTipoValor("entrada");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.empresa_id) return;
    const numValor = parseFloat(valor);
    if (!dataMov || !numValor) {
      toast.error("Preencha data e valor.");
      return;
    }

    setLoading(true);
    const bancoLabel = bancos.find(b => b.id === contaBancariaId)?.label || null;
    const finalValor = tipoValor === "saida" ? -Math.abs(numValor) : Math.abs(numValor);

    const { error } = await supabase.from("movimentacoes").insert({
      empresa_id: profile.empresa_id,
      data_movimentacao: dataMov,
      plano_contas: planoContas || null,
      pessoa: pessoa || null,
      complemento: complemento || null,
      banco: bancoLabel,
      conta_bancaria_id: contaBancariaId || null,
      valor: finalValor,
      tipo: "avulso",
    });

    if (error) {
      toast.error("Erro ao criar movimentação: " + error.message);
      setLoading(false);
      return;
    }

    // Sync bank balance if a bank was selected
    if (contaBancariaId) {
      await supabase.rpc("sincronizar_saldo_bancario", { p_conta_bancaria_id: contaBancariaId });
    }

    toast.success("Movimentação criada com sucesso!");
    setLoading(false);
    resetForm();
    onOpenChange(false);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Movimentação</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Data</Label>
              <Input type="date" value={dataMov} onChange={e => setDataMov(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo</Label>
              <Select value={tipoValor} onValueChange={(v) => setTipoValor(v as "entrada" | "saida")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">Entrada</SelectItem>
                  <SelectItem value="saida">Saída</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Plano de Contas</Label>
            <Input value={planoContas} onChange={e => setPlanoContas(e.target.value)} placeholder="Ex: Receita de Serviços" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Pessoa</Label>
            <Input value={pessoa} onChange={e => setPessoa(e.target.value)} placeholder="Nome da pessoa" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Complemento</Label>
            <Input value={complemento} onChange={e => setComplemento(e.target.value)} placeholder="Descrição adicional" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Conta Bancária</Label>
            <Select value={contaBancariaId} onValueChange={setContaBancariaId}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {bancos.map(b => (
                  <SelectItem key={b.id} value={b.id}>{b.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Valor (R$)</Label>
            <Input type="number" step="0.01" min="0.01" value={valor} onChange={e => setValor(e.target.value)} placeholder="0,00" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
