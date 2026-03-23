import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { addDays, format } from "date-fns";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSuccess: () => void;
  empresaId: string;
}

export function ContratacaoDialog({ open, onOpenChange, onSuccess, empresaId }: Props) {
  const [saving, setSaving] = useState(false);
  const [clientes, setClientes] = useState<any[]>([]);
  const [pets, setPets] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);

  const [clienteId, setClienteId] = useState("");
  const [petId, setPetId] = useState("");
  const [planType, setPlanType] = useState<"plan" | "package">("plan");
  const [selectedId, setSelectedId] = useState("");
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [discount, setDiscount] = useState("0");
  const [autoRenew, setAutoRenew] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("pix");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    supabase.from("clientes").select("id, nome").order("nome").then(({ data }) => data && setClientes(data));
    supabase.from("service_plans" as any).select("*").eq("status", "ativo").then(({ data }) => data && setPlans(data));
    supabase.from("service_packages" as any).select("*").eq("status", "ativo").then(({ data }) => data && setPackages(data));
  }, [open]);

  useEffect(() => {
    if (!clienteId) { setPets([]); return; }
    supabase.from("pets").select("id, nome").eq("cliente_id", clienteId).then(({ data }) => data && setPets(data));
  }, [clienteId]);

  const selectedPlan = planType === "plan" ? plans.find((p: any) => p.id === selectedId) : packages.find((p: any) => p.id === selectedId);
  const priceContracted = selectedPlan ? Number(selectedPlan.price) : 0;
  const finalPrice = Math.max(0, priceContracted - Number(discount || 0));
  const validityDays = selectedPlan?.validity_days || 30;
  const endDate = format(addDays(new Date(startDate), validityDays), "yyyy-MM-dd");

  async function handleSave() {
    if (!clienteId || !selectedId) { toast.error("Selecione cliente e plano/pacote"); return; }
    setSaving(true);

    const payload: any = {
      empresa_id: empresaId, cliente_id: clienteId, pet_id: petId || null,
      start_date: startDate, end_date: endDate,
      next_renewal_date: autoRenew ? endDate : null,
      price_contracted: priceContracted, discount_amount: Number(discount || 0),
      final_price: finalPrice, auto_renew: autoRenew, payment_method: paymentMethod,
      notes, status: "ativo"
    };
    if (planType === "plan") payload.plan_id = selectedId;
    else payload.package_id = selectedId;

    const { error } = await supabase.from("customer_pet_subscriptions" as any).insert(payload);
    if (error) { toast.error("Erro ao contratar"); setSaving(false); return; }

    // Generate receivable
    await supabase.from("contas_receber").insert({
      empresa_id: empresaId, cliente_id: clienteId,
      descricao: `${planType === "plan" ? "Plano" : "Pacote"}: ${selectedPlan?.name}`,
      valor: finalPrice, vencimento: startDate, status: "pendente", categoria: "Planos e Pacotes"
    });

    toast.success("Contratação realizada com sucesso!");
    setSaving(false); onSuccess(); onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Nova Contratação</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Cliente *</Label>
            <Select value={clienteId} onValueChange={setClienteId}>
              <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
              <SelectContent>{clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {pets.length > 0 && (
            <div className="space-y-1.5">
              <Label>Pet</Label>
              <Select value={petId} onValueChange={setPetId}>
                <SelectTrigger><SelectValue placeholder="Selecione o pet (opcional)" /></SelectTrigger>
                <SelectContent>{pets.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={planType} onValueChange={v => { setPlanType(v as any); setSelectedId(""); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="plan">Plano</SelectItem>
                  <SelectItem value="package">Pacote</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{planType === "plan" ? "Plano" : "Pacote"} *</Label>
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {(planType === "plan" ? plans : packages).map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{p.name} - R$ {Number(p.price).toFixed(2)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Data Início</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Data Fim</Label>
              <Input type="date" value={endDate} disabled />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Preço</Label>
              <Input value={`R$ ${priceContracted.toFixed(2)}`} disabled />
            </div>
            <div className="space-y-1.5">
              <Label>Desconto (R$)</Label>
              <Input type="number" value={discount} onChange={e => setDiscount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Valor Final</Label>
              <Input value={`R$ ${finalPrice.toFixed(2)}`} disabled className="font-bold" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Forma de Pagamento</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pix">PIX</SelectItem>
                <SelectItem value="cartao">Cartão</SelectItem>
                <SelectItem value="dinheiro">Dinheiro</SelectItem>
                <SelectItem value="boleto">Boleto</SelectItem>
                <SelectItem value="recorrencia">Recorrência</SelectItem>
              </SelectContent>
            </Select>
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
          <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Contratar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
