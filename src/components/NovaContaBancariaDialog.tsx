import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSuccess: () => void;
}

export function NovaContaBancariaDialog({ open, onOpenChange, onSuccess }: Props) {
  const [titular, setTitular] = useState("");
  const [banco, setBanco] = useState("");
  const [agencia, setAgencia] = useState("");
  const [conta, setConta] = useState("");
  const [saldoInicial, setSaldoInicial] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!titular.trim() || !banco.trim()) {
      toast.error("Preencha titular e banco");
      return;
    }
    setSaving(true);
    const { data: profile } = await supabase.from("profiles").select("empresa_id").single();
    if (!profile?.empresa_id) { setSaving(false); toast.error("Empresa não encontrada"); return; }

    const saldo = parseFloat(saldoInicial.replace(",", ".")) || 0;
    const { error } = await supabase.from("contas_bancarias" as any).insert({
      empresa_id: profile.empresa_id,
      titular: titular.trim(),
      banco: banco.trim(),
      agencia: agencia.trim() || null,
      conta: conta.trim() || null,
      saldo_inicial: saldo,
      saldo_atual: saldo,
    } as any);

    setSaving(false);
    if (error) { toast.error("Erro ao criar conta"); return; }
    toast.success("Conta bancária criada!");
    setTitular(""); setBanco(""); setAgencia(""); setConta(""); setSaldoInicial("");
    onSuccess();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Conta Bancária</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Titular</Label>
            <Input value={titular} onChange={e => setTitular(e.target.value)} placeholder="Nome do titular" />
          </div>
          <div>
            <Label>Banco</Label>
            <Input value={banco} onChange={e => setBanco(e.target.value)} placeholder="Ex: Nubank, Itaú, Caixa" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Agência</Label>
              <Input value={agencia} onChange={e => setAgencia(e.target.value)} placeholder="0001" />
            </div>
            <div>
              <Label>Conta</Label>
              <Input value={conta} onChange={e => setConta(e.target.value)} placeholder="12345-6" />
            </div>
          </div>
          <div>
            <Label>Saldo Inicial</Label>
            <Input value={saldoInicial} onChange={e => setSaldoInicial(e.target.value)} placeholder="0,00" />
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
