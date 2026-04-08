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

interface BaixaContaDialogProps {
  conta: { id: string; descricao: string; valor: number } | null;
  contaIds?: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function BaixaContaDialog({ conta, contaIds, open, onOpenChange, onSuccess }: BaixaContaDialogProps) {
  const [dataBaixa, setDataBaixa] = useState(format(new Date(), "yyyy-MM-dd"));
  const [banco, setBanco] = useState("");
  const [valorPago, setValorPago] = useState("");
  const [valorJuros, setValorJuros] = useState("");
  const [valorDescontoRaw, setValorDescontoRaw] = useState("");
  const [observacao, setObservacao] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("");
  const [saving, setSaving] = useState(false);
  const [contasBancarias, setContasBancarias] = useState<{ id: string; banco: string; titular: string }[]>([]);
  const [formasPagamento, setFormasPagamento] = useState<{ id: string; nome: string; codigo: string }[]>([]);

  const isBatch = contaIds && contaIds.length > 1;

  useEffect(() => {
    if (open) {
      supabase.from("contas_bancarias").select("id, banco, titular").then(({ data }) => {
        if (data) setContasBancarias(data);
      });
      supabase.from("formas_pagamento").select("id, nome, codigo").eq("ativo", true).order("nome").then(({ data }) => {
        if (data) setFormasPagamento(data as any);
      });
      if (conta) {
        setDataBaixa(format(new Date(), "yyyy-MM-dd"));
        setBanco("");
        setValorPago(conta.valor.toFixed(2));
        setValorJuros("");
        setValorDesconto("");
        setObservacao(conta.descricao);
        setFormaPagamento("");
      }
    }
  }, [open, conta]);

  const handleOpen = (o: boolean) => {
    onOpenChange(o);
  };

  const handleSubmit = async () => {
    if (!conta) return;
    if (!banco) {
      toast.error("Selecione o banco/forma de pagamento");
      return;
    }

    const selectedBank = contasBancarias.find(cb => `${cb.banco} - ${cb.titular}` === banco);
    if (!selectedBank) {
      toast.error("Banco não encontrado");
      return;
    }

    setSaving(true);

    if (isBatch) {
      // Batch: call efetuar_baixa for each invoice individually
      const vJuros = parseFloat(valorJuros) || 0;
      const vDesconto = parseFloat(valorDesconto) || 0;
      let hasError = false;

      for (const contaId of contaIds!) {
        // Get the individual invoice value
        const { data: invoiceData } = await supabase
          .from("contas_receber")
          .select("id, valor, descricao")
          .eq("id", contaId)
          .single();

        if (!invoiceData) continue;

        const { data, error } = await supabase.rpc("efetuar_baixa", {
          p_conta_id: contaId,
          p_data_baixa: dataBaixa,
          p_banco_id: selectedBank.id,
          p_banco_nome: banco,
          p_valor_pago: invoiceData.valor,
          p_valor_juros: 0,
          p_valor_desconto: 0,
          p_observacao: observacao || null,
          p_forma_pagamento: formaPagamento || null,
        });

        if (error) {
          toast.error(`Erro na fatura ${invoiceData.descricao}: ${error.message}`);
          hasError = true;
          break;
        }

        const result = data as any;
        if (result && !result.success) {
          toast.error(result.error);
          hasError = true;
          break;
        }
      }

      setSaving(false);
      if (!hasError) {
        toast.success(`${contaIds!.length} faturas baixadas com sucesso!`);
        onOpenChange(false);
        onSuccess();
      }
    } else {
      // Single invoice
      const vPago = parseFloat(valorPago) || 0;
      const vJuros = parseFloat(valorJuros) || 0;
      const vDesconto = parseFloat(valorDesconto) || 0;
      const valorLiquido = vPago + vJuros - vDesconto;

      if (valorLiquido > conta.valor) {
        toast.error("Valor da baixa maior que o valor da fatura. Corrija o valor na fatura primeiro.");
        setSaving(false);
        return;
      }

      const { data, error } = await supabase.rpc("efetuar_baixa", {
        p_conta_id: conta.id,
        p_data_baixa: dataBaixa,
        p_banco_id: selectedBank.id,
        p_banco_nome: banco,
        p_valor_pago: vPago,
        p_valor_juros: vJuros,
        p_valor_desconto: vDesconto,
        p_observacao: observacao || null,
        p_forma_pagamento: formaPagamento || null,
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

      if (result?.valor_restante > 0.01) {
        toast.success(`Baixa parcial efetuada! Saldo restante de R$ ${Number(result.valor_restante).toFixed(2)} mantido em aberto.`);
      } else {
        toast.success("Baixa efetuada com sucesso!");
      }
      onOpenChange(false);
      onSuccess();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isBatch ? `Baixa em Lote (${contaIds!.length} faturas)` : "Dados da Baixa"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {isBatch && (
            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <p className="font-medium">Total das faturas selecionadas:</p>
              <p className="text-lg font-bold text-foreground">
                R$ {Number(conta?.valor || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{contaIds!.length} faturas serão baixadas individualmente com seus respectivos valores</p>
            </div>
          )}

          <div>
            <Label>Data de Baixa</Label>
            <Input type="date" value={dataBaixa} onChange={e => setDataBaixa(e.target.value)} />
          </div>

          <div>
            <Label>
              Banco <span className="text-destructive">*</span>
            </Label>
            <Select value={banco} onValueChange={setBanco}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
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
            <Label>Forma de Pagamento</Label>
            <Select value={formaPagamento} onValueChange={setFormaPagamento}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione (opcional)" />
              </SelectTrigger>
              <SelectContent>
                {formasPagamento.map(fp => (
                  <SelectItem key={fp.id} value={fp.codigo}>{fp.nome}</SelectItem>
                ))}
                {formasPagamento.length === 0 && (
                  <SelectItem value="_none" disabled>Nenhuma forma cadastrada</SelectItem>
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">Se houver taxa configurada, será lançada automaticamente como despesa</p>
          </div>

          {!isBatch && (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Valor Pago</Label>
                <Input type="number" step="0.01" value={valorPago} onChange={e => setValorPago(e.target.value)} />
              </div>
              <div>
                <Label>Valor Juros</Label>
                <Input type="number" step="0.01" value={valorJuros} onChange={e => setValorJuros(e.target.value)} />
              </div>
              <div>
                <Label>Valor Desconto</Label>
                <Input type="number" step="0.01" value={valorDesconto} onChange={e => setValorDesconto(e.target.value)} />
              </div>
            </div>
          )}

          <div>
            <Label>Observação da baixa</Label>
            <Textarea value={observacao} onChange={e => setObservacao(e.target.value)} rows={2} />
          </div>

          <Button onClick={handleSubmit} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            {saving ? "Processando..." : isBatch ? `Baixar ${contaIds!.length} Faturas` : "Efetuar Baixa"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
