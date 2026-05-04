import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  conta: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditarContaPagarDialog({ conta, open, onOpenChange, onSuccess }: Props) {
  const [form, setForm] = useState({
    fornecedor: "",
    descricao: "",
    categoria: "",
    valor: "",
    desconto: "",
    vencimento: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (conta) {
      setForm({
        fornecedor: conta.fornecedor || "",
        descricao: conta.descricao || "",
        categoria: conta.categoria || "",
        valor: String(conta.valor ?? ""),
        desconto: String(conta.desconto ?? ""),
        vencimento: conta.vencimento || "",
      });
    }
  }, [conta]);

  const handleSave = async () => {
    if (!conta) return;
    setSaving(true);
    const valorBruto = parseFloat(form.valor) || 0;
    const desconto = parseFloat(form.desconto) || 0;
    const valorLiquido = Math.max(0, valorBruto - desconto);
    const { error } = await supabase.from("contas_pagar").update({
      fornecedor: form.fornecedor,
      descricao: form.descricao,
      categoria: form.categoria || null,
      valor: valorLiquido,
      desconto: desconto,
      vencimento: form.vencimento,
    }).eq("id", conta.id);
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
      return;
    }
    toast.success("Conta atualizada");
    onOpenChange(false);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar Conta a Pagar</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Fornecedor</Label>
            <Input value={form.fornecedor} onChange={e => setForm({ ...form, fornecedor: e.target.value })} />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} rows={2} />
          </div>
          <div>
            <Label>Categoria</Label>
            <Input value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Valor</Label>
              <Input type="number" step="0.01" value={form.valor} onChange={e => setForm({ ...form, valor: e.target.value })} />
            </div>
            <div>
              <Label>Vencimento</Label>
              <Input type="date" value={form.vencimento} onChange={e => setForm({ ...form, vencimento: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Desconto (R$)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.desconto}
              onChange={e => setForm({ ...form, desconto: e.target.value })}
              placeholder="0,00"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Valor a abater do total da conta. Líquido: {((parseFloat(form.valor) || 0) - (parseFloat(form.desconto) || 0)).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </p>
          </div>
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
