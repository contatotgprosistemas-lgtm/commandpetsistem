import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSuccess: () => void;
  empresaId: string;
  editingPlan?: any;
}

interface PlanItem {
  service_name: string;
  quantity_included: number;
  usage_period: string;
  extra_unit_price: number;
  limit_per_month: number | null;
}

export function NovoPlanoDialog({ open, onOpenChange, onSuccess, empresaId, editingPlan }: Props) {
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("mensal");
  const [recurringType, setRecurringType] = useState("mensal");
  const [price, setPrice] = useState("");
  const [validityDays, setValidityDays] = useState("30");
  const [autoRenew, setAutoRenew] = useState(false);
  const [rollover, setRollover] = useState(false);
  const [minLoyalty, setMinLoyalty] = useState("0");
  const [cancellationFee, setCancellationFee] = useState("0");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<PlanItem[]>([
    { service_name: "", quantity_included: 1, usage_period: "mensal", extra_unit_price: 0, limit_per_month: null }
  ]);

  function reset() {
    setName(""); setDescription(""); setType("mensal"); setRecurringType("mensal");
    setPrice(""); setValidityDays("30"); setAutoRenew(false); setRollover(false);
    setMinLoyalty("0"); setCancellationFee("0"); setNotes("");
    setItems([{ service_name: "", quantity_included: 1, usage_period: "mensal", extra_unit_price: 0, limit_per_month: null }]);
  }

  useEffect(() => {
    if (editingPlan) {
      setName(editingPlan.name || "");
      setDescription(editingPlan.description || "");
      setType(editingPlan.type || "mensal");
      setRecurringType(editingPlan.recurring_type || "mensal");
      setPrice(String(editingPlan.price || ""));
      setValidityDays(String(editingPlan.validity_days || "30"));
      setAutoRenew(editingPlan.auto_renew || false);
      setRollover(editingPlan.rollover_enabled || false);
      setMinLoyalty(String(editingPlan.min_loyalty_months || "0"));
      setCancellationFee(String(editingPlan.cancellation_fee || "0"));
      setNotes(editingPlan.notes || "");
    } else {
      reset();
    }
  }, [editingPlan]);

  async function handleSave() {
    if (!name || !price) { toast.error("Preencha nome e preço"); return; }
    setSaving(true);

    const payload = {
      empresa_id: empresaId, name, description, type, recurring_type: recurringType,
      price: Number(price), validity_days: Number(validityDays), auto_renew: autoRenew,
      rollover_enabled: rollover, min_loyalty_months: Number(minLoyalty),
      cancellation_fee: Number(cancellationFee), notes, status: "ativo"
    };

    let plan: any;
    let error: any;

    if (editingPlan) {
      const res = await supabase.from("service_plans" as any).update(payload).eq("id", editingPlan.id).select().single();
      plan = res.data; error = res.error;
    } else {
      const res = await supabase.from("service_plans" as any).insert(payload).select().single();
      plan = res.data; error = res.error;
    }

    if (error || !plan) { toast.error("Erro ao salvar plano"); setSaving(false); return; }

    const validItems = items.filter(i => i.service_name.trim());
    if (editingPlan) {
      await supabase.from("service_plan_items" as any).delete().eq("plan_id", editingPlan.id);
    }
    if (validItems.length > 0) {
      await supabase.from("service_plan_items" as any).insert(
        validItems.map(i => ({
          empresa_id: empresaId, plan_id: (plan as any).id, service_name: i.service_name,
          quantity_included: i.quantity_included, usage_period: i.usage_period,
          extra_unit_price: i.extra_unit_price, limit_per_month: i.limit_per_month
        }))
      );
    }

    toast.success(editingPlan ? "Plano atualizado" : "Plano criado com sucesso");
    reset(); setSaving(false); onSuccess(); onOpenChange(false);
  }

  const addItem = () => setItems([...items, { service_name: "", quantity_included: 1, usage_period: "mensal", extra_unit_price: 0, limit_per_month: null }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: string, value: any) => {
    const newItems = [...items];
    (newItems[i] as any)[field] = value;
    setItems(newItems);
  };

  const [serviceOptions, setServiceOptions] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    supabase
      .from("servicos")
      .select("descricao")
      .eq("empresa_id", empresaId)
      .eq("ativo", true)
      .order("descricao")
      .then(({ data }) => {
        if (data) setServiceOptions(data.map((s: any) => s.descricao));
      });
  }, [open, empresaId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editingPlan ? "Editar Plano" : "Novo Plano"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Nome do Plano *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Daycare Mensal Premium" />
            </div>
            <div className="space-y-1.5">
              <Label>Preço (R$) *</Label>
              <Input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Descrição do plano..." rows={2} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensal">Mensal</SelectItem>
                  <SelectItem value="quinzenal">Quinzenal</SelectItem>
                  <SelectItem value="semanal">Semanal</SelectItem>
                  <SelectItem value="avulso">Avulso</SelectItem>
                  <SelectItem value="pacote_fechado">Pacote Fechado</SelectItem>
                  <SelectItem value="assinatura">Assinatura Recorrente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Recorrência</Label>
              <Select value={recurringType} onValueChange={setRecurringType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensal">Mensal</SelectItem>
                  <SelectItem value="quinzenal">Quinzenal</SelectItem>
                  <SelectItem value="semanal">Semanal</SelectItem>
                  <SelectItem value="anual">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Validade (dias)</Label>
              <Input type="number" value={validityDays} onChange={e => setValidityDays(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Fidelidade mínima (meses)</Label>
              <Input type="number" value={minLoyalty} onChange={e => setMinLoyalty(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Taxa cancelamento (%)</Label>
              <Input type="number" min="0" max="100" value={cancellationFee} onChange={e => setCancellationFee(e.target.value)} placeholder="0" />
            </div>
          </div>
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <Switch checked={autoRenew} onCheckedChange={setAutoRenew} />
              <Label>Renovação automática</Label>
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm font-semibold">Serviços Incluídos</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}><Plus className="h-3.5 w-3.5 mr-1" />Adicionar</Button>
            </div>
            {items.map((item, i) => (
              <div key={i} className="grid grid-cols-[1fr_80px_100px_32px] gap-2 mb-2 items-end">
                <div>
                  {i === 0 && <Label className="text-xs text-muted-foreground">Serviço</Label>}
                  <Select value={item.service_name} onValueChange={v => updateItem(i, "service_name", v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{serviceOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  {i === 0 && <Label className="text-xs text-muted-foreground">Qtd</Label>}
                  <Input type="number" value={item.quantity_included} onChange={e => updateItem(i, "quantity_included", Number(e.target.value))} />
                </div>
                <div>
                  {i === 0 && <Label className="text-xs text-muted-foreground">Período</Label>}
                  <Select value={item.usage_period} onValueChange={v => updateItem(i, "usage_period", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mensal">Mensal</SelectItem>
                      <SelectItem value="semanal">Semanal</SelectItem>
                      <SelectItem value="total">Total</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => removeItem(i)} disabled={items.length === 1}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label>Observações internas</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Criar Plano"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
