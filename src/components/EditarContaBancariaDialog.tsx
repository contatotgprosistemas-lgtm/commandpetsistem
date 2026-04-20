import { useState, useEffect } from "react";
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
  conta: { id: string; titular: string; banco: string; agencia: string | null; conta: string | null; saldo_inicial: number } | null;
}

export function EditarContaBancariaDialog({ open, onOpenChange, onSuccess, conta }: Props) {
  const [titular, setTitular] = useState("");
  const [banco, setBanco] = useState("");
  const [agencia, setAgencia] = useState("");
  const [contaNum, setContaNum] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (conta) {
      setTitular(conta.titular || "");
      setBanco(conta.banco || "");
      setAgencia(conta.agencia || "");
      setContaNum(conta.conta || "");
    }
  }, [conta]);

  async function handleSave() {
    if (!conta) return;
    if (!titular.trim() || !banco.trim()) { toast.error("Preencha titular e banco"); return; }
    setSaving(true);
    const { error } = await supabase.from("contas_bancarias").update({
      titular: titular.trim(),
      banco: banco.trim(),
      agencia: agencia.trim() || null,
      conta: contaNum.trim() || null,
    }).eq("id", conta.id);
    setSaving(false);
    if (error) { toast.error("Erro ao salvar"); return; }
    toast.success("Conta atualizada!");
    onSuccess();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Editar Conta Bancária</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Titular</Label><Input value={titular} onChange={e => setTitular(e.target.value)} /></div>
          <div><Label>Banco</Label><Input value={banco} onChange={e => setBanco(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Agência</Label><Input value={agencia} onChange={e => setAgencia(e.target.value)} /></div>
            <div><Label>Conta</Label><Input value={contaNum} onChange={e => setContaNum(e.target.value)} /></div>
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
