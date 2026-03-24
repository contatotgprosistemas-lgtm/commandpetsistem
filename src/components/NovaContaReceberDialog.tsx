import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function NovaContaReceberDialog({ open, onOpenChange, onSuccess }: Props) {
  const { profile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [clientes, setClientes] = useState<any[]>([]);
  const [bancos, setBancos] = useState<any[]>([]);

  const [form, setForm] = useState({
    numero: "",
    data_emissao: format(new Date(), "yyyy-MM-dd"),
    numero_documento: "",
    cliente_id: "",
    tipo_documento: "",
    plano_contas: "",
    banco: "",
    descricao: "",
    valor: "",
    parcelas: "1",
    vencimento: "",
    intervalo: "mensal",
    recorrente: false,
  });

  useEffect(() => {
    if (!open || !profile?.empresa_id) return;
    supabase.from("clientes").select("id, nome").eq("empresa_id", profile.empresa_id).order("nome").then(({ data }) => setClientes(data || []));
    supabase.from("contas_bancarias").select("id, banco, titular").eq("empresa_id", profile.empresa_id).order("banco").then(({ data }) => setBancos((data as any) || []));
  }, [open, profile?.empresa_id]);

  const resetForm = () => setForm({
    numero: "", data_emissao: format(new Date(), "yyyy-MM-dd"), numero_documento: "",
    cliente_id: "", tipo_documento: "", plano_contas: "", banco: "", descricao: "",
    valor: "", parcelas: "1", vencimento: "", intervalo: "mensal", recorrente: false,
  });

  const handleSave = async () => {
    if (!profile?.empresa_id || !form.cliente_id || !form.vencimento || !form.valor) {
      toast.error("Preencha os campos obrigatórios: Cliente, Valor e Vencimento");
      return;
    }
    setSaving(true);
    const parcelas = Math.max(1, parseInt(form.parcelas) || 1);
    const valorTotal = parseFloat(form.valor);
    const valorParcela = valorTotal / parcelas;

    const inserts = [];
    for (let i = 0; i < parcelas; i++) {
      const venc = new Date(form.vencimento + "T00:00:00");
      if (form.intervalo === "mensal") venc.setMonth(venc.getMonth() + i);
      else if (form.intervalo === "quinzenal") venc.setDate(venc.getDate() + i * 15);
      else if (form.intervalo === "semanal") venc.setDate(venc.getDate() + i * 7);

      inserts.push({
        empresa_id: profile.empresa_id,
        cliente_id: form.cliente_id,
        descricao: parcelas > 1 ? `${form.descricao || "Conta a receber"} (${i + 1}/${parcelas})` : (form.descricao || "Conta a receber"),
        valor: Math.round(valorParcela * 100) / 100,
        vencimento: format(venc, "yyyy-MM-dd"),
        categoria: form.plano_contas || null,
        status: "pendente",
      });
    }

    const { error } = await supabase.from("contas_receber").insert(inserts);
    setSaving(false);
    if (error) { toast.error("Erro ao cadastrar: " + error.message); return; }
    toast.success(`${parcelas} fatura(s) criada(s) com sucesso!`);
    resetForm();
    onOpenChange(false);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cadastro de Conta a Receber</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label>Número</Label>
              <Input value={form.numero} onChange={e => setForm({ ...form, numero: e.target.value })} placeholder="Auto" />
            </div>
            <div className="space-y-1">
              <Label>Data Emissão <span className="text-destructive">*</span></Label>
              <Input type="date" value={form.data_emissao} onChange={e => setForm({ ...form, data_emissao: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Número Documento</Label>
              <Input value={form.numero_documento} onChange={e => setForm({ ...form, numero_documento: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Cliente <span className="text-destructive">*</span></Label>
              <Select value={form.cliente_id} onValueChange={v => setForm({ ...form, cliente_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Tipo Documento <span className="text-destructive">*</span></Label>
              <Select value={form.tipo_documento} onValueChange={v => setForm({ ...form, tipo_documento: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fatura">Fatura</SelectItem>
                  <SelectItem value="nota_fiscal">Nota Fiscal</SelectItem>
                  <SelectItem value="recibo">Recibo</SelectItem>
                  <SelectItem value="boleto">Boleto</SelectItem>
                  <SelectItem value="outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Plano de Contas <span className="text-destructive">*</span></Label>
              <Input value={form.plano_contas} onChange={e => setForm({ ...form, plano_contas: e.target.value })} placeholder="Ex: Serviços, Vendas..." />
            </div>
            <div className="space-y-1">
              <Label>Banco</Label>
              <Select value={form.banco} onValueChange={v => setForm({ ...form, banco: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {bancos.map((b: any) => <SelectItem key={b.id} value={b.banco}>{b.banco} - {b.titular}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Descrição</Label>
            <Textarea value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} rows={2} />
          </div>

          <div className="grid grid-cols-5 gap-4 items-end">
            <div className="space-y-1">
              <Label>Valor Total <span className="text-destructive">*</span></Label>
              <Input type="number" step="0.01" value={form.valor} onChange={e => setForm({ ...form, valor: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Parcelas</Label>
              <Input type="number" min="1" value={form.parcelas} onChange={e => setForm({ ...form, parcelas: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Vencimento <span className="text-destructive">*</span></Label>
              <Input type="date" value={form.vencimento} onChange={e => setForm({ ...form, vencimento: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Intervalo</Label>
              <Select value={form.intervalo} onValueChange={v => setForm({ ...form, intervalo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="semanal">Semanal</SelectItem>
                  <SelectItem value="quinzenal">Quinzenal</SelectItem>
                  <SelectItem value="mensal">Mensal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Label>Recorrente</Label>
              <Switch checked={form.recorrente} onCheckedChange={v => setForm({ ...form, recorrente: v })} />
              <span className="text-xs text-muted-foreground">{form.recorrente ? "Sim" : "Não"}</span>
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
