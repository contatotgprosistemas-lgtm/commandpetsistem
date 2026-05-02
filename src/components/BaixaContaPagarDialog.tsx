import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface Props {
  conta: { id: string; descricao: string; valor: number } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function BaixaContaPagarDialog({ conta, open, onOpenChange, onSuccess }: Props) {
  const [dataBaixa, setDataBaixa] = useState(format(new Date(), "yyyy-MM-dd"));
  const [banco, setBanco] = useState("");
  const [valorPago, setValorPago] = useState("");
  const [observacao, setObservacao] = useState("");
  const [saving, setSaving] = useState(false);
  const [contasBancarias, setContasBancarias] = useState<{ id: string; banco: string; titular: string }[]>([]);

  useEffect(() => {
    if (open) {
      supabase.from("contas_bancarias").select("id, banco, titular").then(({ data }) => {
        if (data) setContasBancarias(data);
      });
      if (conta) {
        setDataBaixa(format(new Date(), "yyyy-MM-dd"));
        setBanco("");
        setValorPago(conta.valor.toFixed(2));
        setObservacao(conta.descricao);
      }
    }
  }, [open, conta]);

  const handleSubmit = async () => {
    if (!conta) return;
    if (!banco) {
      toast.error("Selecione o banco");
      return;
    }
    const selectedBank = contasBancarias.find(cb => `${cb.banco} - ${cb.titular}` === banco);
    if (!selectedBank) {
      toast.error("Banco não encontrado");
      return;
    }

    setSaving(true);
    const { data, error } = await supabase.rpc("efetuar_baixa_conta_pagar" as any, {
      p_conta_id: conta.id,
      p_data_baixa: dataBaixa,
      p_banco_id: selectedBank.id,
      p_banco_nome: banco,
      p_valor_pago: parseFloat(valorPago) || 0,
      p_observacao: observacao || null,
    });
    setSaving(false);

    if (error) {
      toast.error("Erro ao efetuar baixa: " + error.message);
      return;
    }
    const result = data as any;
    if (result && !result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Baixa efetuada com sucesso!");
    onOpenChange(false);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Dados da Baixa (Conta a Pagar)</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Data de Baixa</Label>
            <Input type="date" value={dataBaixa} onChange={e => setDataBaixa(e.target.value)} />
          </div>
          <div>
            <Label>Banco <span className="text-destructive">*</span></Label>
            <Select value={banco} onValueChange={setBanco}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {contasBancarias.map(cb => (
                  <SelectItem key={cb.id} value={`${cb.banco} - ${cb.titular}`}>
                    {cb.banco} - {cb.titular}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Valor Pago</Label>
            <Input type="number" step="0.01" value={valorPago} onChange={e => setValorPago(e.target.value)} />
          </div>
          <div>
            <Label>Observação</Label>
            <Textarea value={observacao} onChange={e => setObservacao(e.target.value)} rows={2} />
          </div>
          <Button onClick={handleSubmit} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            {saving ? "Processando..." : "Efetuar Baixa"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
