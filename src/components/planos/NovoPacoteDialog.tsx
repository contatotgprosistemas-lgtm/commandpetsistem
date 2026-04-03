import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSuccess: () => void;
  empresaId: string;
  editingPackage?: any;
}

interface PackageItem {
  service_name: string;
  quantity_included: number;
  extra_unit_price: number;
}

export function NovoPacoteDialog({ open, onOpenChange, onSuccess, empresaId, editingPackage }: Props) {
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [validityDays, setValidityDays] = useState("90");
  const [totalCredits, setTotalCredits] = useState("1");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<PackageItem[]>([
    { service_name: "", quantity_included: 1, extra_unit_price: 0 }
  ]);

  function reset() {
    setName(""); setDescription(""); setPrice(""); setValidityDays("90");
    setTotalCredits("1"); setNotes("");
    setItems([{ service_name: "", quantity_included: 1, extra_unit_price: 0 }]);
  }

  useEffect(() => {
    if (editingPackage) {
      setName(editingPackage.name || "");
      setDescription(editingPackage.description || "");
      setPrice(String(editingPackage.price || ""));
      setValidityDays(String(editingPackage.validity_days || "90"));
      setTotalCredits(String(editingPackage.total_credits || "1"));
      setNotes(editingPackage.notes || "");
    } else {
      reset();
    }
  }, [editingPackage]);

  async function handleSave() {
    if (!name || !price) { toast.error("Preencha nome e preço"); return; }
    setSaving(true);

    const payload = {
      empresa_id: empresaId, name, description, price: Number(price),
      validity_days: Number(validityDays), total_credits: Number(totalCredits), notes, status: "ativo"
    };

    let pkg: any;
    let error: any;

    if (editingPackage) {
      const res = await supabase.from("service_packages" as any).update(payload).eq("id", editingPackage.id).select().single();
      pkg = res.data; error = res.error;
    } else {
      const res = await supabase.from("service_packages" as any).insert(payload).select().single();
      pkg = res.data; error = res.error;
    }

    if (error || !pkg) { toast.error("Erro ao salvar pacote"); setSaving(false); return; }

    const validItems = items.filter(i => i.service_name.trim());
    if (editingPackage) {
      await supabase.from("service_package_items" as any).delete().eq("package_id", editingPackage.id);
    }
    if (validItems.length > 0) {
      await supabase.from("service_package_items" as any).insert(
        validItems.map(i => ({
          empresa_id: empresaId, package_id: (pkg as any).id,
          service_name: i.service_name, quantity_included: i.quantity_included,
          extra_unit_price: i.extra_unit_price
        }))
      );
    }

    toast.success(editingPackage ? "Pacote atualizado" : "Pacote criado com sucesso");
    reset(); setSaving(false); onSuccess(); onOpenChange(false);
  }

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
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Novo Pacote</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Nome do Pacote *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Pacote 10 Banhos" />
            </div>
            <div className="space-y-1.5">
              <Label>Preço (R$) *</Label>
              <Input type="number" value={price} onChange={e => setPrice(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Validade (dias)</Label>
              <Input type="number" value={validityDays} onChange={e => setValidityDays(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Total de Créditos</Label>
              <Input type="number" value={totalCredits} onChange={e => setTotalCredits(e.target.value)} />
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm font-semibold">Serviços Incluídos</Label>
              <Button type="button" variant="outline" size="sm" onClick={() => setItems([...items, { service_name: "", quantity_included: 1, extra_unit_price: 0 }])}>
                <Plus className="h-3.5 w-3.5 mr-1" />Adicionar
              </Button>
            </div>
            {items.map((item, i) => (
              <div key={i} className="grid grid-cols-[1fr_80px_32px] gap-2 mb-2 items-end">
                <div>
                  {i === 0 && <Label className="text-xs text-muted-foreground">Serviço</Label>}
                  <Select value={item.service_name} onValueChange={v => { const n = [...items]; n[i].service_name = v; setItems(n); }}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{serviceOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  {i === 0 && <Label className="text-xs text-muted-foreground">Qtd</Label>}
                  <Input type="number" value={item.quantity_included} onChange={e => { const n = [...items]; n[i].quantity_included = Number(e.target.value); setItems(n); }} />
                </div>
                <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setItems(items.filter((_, idx) => idx !== i))} disabled={items.length === 1}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label>Observações</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Criar Pacote"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
