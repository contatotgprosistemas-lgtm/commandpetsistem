import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSuccess: () => void;
  subscription: any;
  planName: string;
}

export function EditarContratacaoDialog({ open, onOpenChange, onSuccess, subscription, planName }: Props) {
  const [saving, setSaving] = useState(false);
  const [priceContracted, setPriceContracted] = useState("");
  const [discountAmount, setDiscountAmount] = useState("");
  const [autoRenew, setAutoRenew] = useState(false);
  const [notes, setNotes] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [contractDate, setContractDate] = useState("");
  const [contractEndDate, setContractEndDate] = useState("");

  useEffect(() => {
    if (!subscription) return;
    setPriceContracted(String(subscription.price_contracted || 0));
    setDiscountAmount(String(subscription.discount_amount || 0));
    setAutoRenew(subscription.auto_renew || false);
    setNotes(subscription.notes || "");
    setStartDate(subscription.start_date || "");
    setEndDate(subscription.end_date || "");
    setContractDate(subscription.contract_date || "");
    setContractEndDate(subscription.contract_end_date || "");
  }, [subscription]);

  const finalPrice = Math.max(0, Number(priceContracted || 0) - Number(discountAmount || 0));

  async function handleSave() {
    setSaving(true);
    const { error } = await supabase.from("customer_pet_subscriptions" as any).update({
      price_contracted: Number(priceContracted || 0),
      discount_amount: Number(discountAmount || 0),
      final_price: finalPrice,
      auto_renew: autoRenew,
      notes,
      start_date: startDate || null,
      end_date: endDate || null,
      contract_date: contractDate || null,
      contract_end_date: contractEndDate || null,
    }).eq("id", subscription.id);

    if (error) {
      toast.error("Erro ao salvar alterações");
    } else {
      toast.success("Contratação atualizada com sucesso");
      onSuccess();
      onOpenChange(false);
    }
    setSaving(false);
  }

  if (!subscription) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Contratação</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-md bg-muted p-3">
            <p className="text-xs text-muted-foreground">Cliente: <span className="font-medium text-foreground">{subscription.cliente?.nome || "—"}</span></p>
            <p className="text-xs text-muted-foreground">Pet: <span className="font-medium text-foreground">{subscription.pet?.nome || "—"}</span></p>
            <p className="text-xs text-muted-foreground">Plano/Pacote: <span className="font-medium text-foreground">{planName}</span></p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Valor Contratado (R$)</Label>
              <Input type="number" value={priceContracted} onChange={e => setPriceContracted(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Desconto (R$)</Label>
              <Input type="number" value={discountAmount} onChange={e => setDiscountAmount(e.target.value)} />
            </div>
          </div>

          <div className="rounded-md bg-muted p-3">
            <p className="text-sm font-semibold text-foreground">Valor Final: R$ {finalPrice.toFixed(2)}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Data Contrato</Label>
              <Input type="date" value={contractDate} onChange={e => setContractDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Fim Contrato</Label>
              <Input type="date" value={contractEndDate} onChange={e => setContractEndDate(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Data Início</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Data Fim</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={autoRenew} onCheckedChange={setAutoRenew} />
            <Label>Renovação automática</Label>
          </div>

          <div className="space-y-1.5">
            <Label>Observações</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
