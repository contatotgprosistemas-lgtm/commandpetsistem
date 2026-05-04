import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CalendarIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { usePlanoContasItens } from "@/hooks/usePlanoContasItens";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  conta: {
    id: string;
    descricao: string;
    valor: number;
    vencimento: string;
    categoria: string | null;
    status: string;
    cliente_id?: string | null;
    banco?: string | null;
    desconto?: number | null;
  } | null;
}

export function EditarContaReceberDialog({ open, onOpenChange, onSuccess, conta }: Props) {
  const { profile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [clientes, setClientes] = useState<any[]>([]);
  const [bancos, setBancos] = useState<any[]>([]);
  const planoContasItens = usePlanoContasItens(profile?.empresa_id, open);
  const planoContasReceita = planoContasItens.filter((p) => p.tipo === "receita");

  const [form, setForm] = useState({
    cliente_id: "",
    descricao: "",
    valor: "",
    desconto: "",
    vencimento: "",
    categoria: "",
    banco: "",
    status: "pendente",
  });

  useEffect(() => {
    if (!open || !profile?.empresa_id) return;
    supabase.from("clientes").select("id, nome").eq("empresa_id", profile.empresa_id).order("nome").then(({ data }) => setClientes(data || []));
    supabase.from("contas_bancarias").select("id, banco, titular").eq("empresa_id", profile.empresa_id).order("banco").then(({ data }) => setBancos((data as any) || []));
  }, [open, profile?.empresa_id]);

  useEffect(() => {
    if (conta && open) {
      setForm({
        cliente_id: conta.cliente_id || "",
        descricao: conta.descricao || "",
        valor: String(conta.valor),
        desconto: String(conta.desconto ?? ""),
        vencimento: conta.vencimento || "",
        categoria: conta.categoria || "",
        banco: conta.banco || "",
        status: conta.status || "pendente",
      });
    }
  }, [conta, open]);

  const handleSave = async () => {
    if (!conta || !form.vencimento || !form.valor) {
      toast.error("Preencha os campos obrigatórios: Valor e Vencimento");
      return;
    }
    setSaving(true);

    const { error } = await supabase
      .from("contas_receber")
      .update({
        cliente_id: form.cliente_id || null,
        descricao: form.descricao || "Conta a receber",
        valor: parseFloat(form.valor),
        desconto: parseFloat(form.desconto) || 0,
        vencimento: form.vencimento,
        categoria: form.categoria || null,
        banco: form.banco || null,
        status: form.status,
      })
      .eq("id", conta.id);

    setSaving(false);
    if (error) { toast.error("Erro ao atualizar: " + error.message); return; }
    toast.success("Fatura atualizada com sucesso!");
    onOpenChange(false);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Conta a Receber</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1">
            <Label>Cliente</Label>
            <Select value={form.cliente_id} onValueChange={v => setForm({ ...form, cliente_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Descrição</Label>
            <Textarea value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} rows={2} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Valor <span className="text-destructive">*</span></Label>
              <Input type="number" step="0.01" value={form.valor} onChange={e => setForm({ ...form, valor: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Vencimento <span className="text-destructive">*</span></Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !form.vencimento && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {form.vencimento ? format(new Date(form.vencimento + "T00:00:00"), "dd/MM/yyyy") : "Selecione"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={form.vencimento ? new Date(form.vencimento + "T00:00:00") : undefined}
                    onSelect={(date) => date && setForm({ ...form, vencimento: format(date, "yyyy-MM-dd") })}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Desconto (R$)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.desconto}
              onChange={e => setForm({ ...form, desconto: e.target.value })}
              placeholder="0,00"
            />
            <p className="text-xs text-muted-foreground">
              Líquido: {((parseFloat(form.valor) || 0) - (parseFloat(form.desconto) || 0)).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Plano de Contas</Label>
              <Select value={form.categoria} onValueChange={v => setForm({ ...form, categoria: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {planoContasReceita.length === 0 ? (
                    <div className="px-2 py-3 text-xs text-muted-foreground text-center">
                      Nenhuma conta de receita cadastrada. Cadastre em Financeiro › Plano de Contas.
                    </div>
                  ) : (
                    <>
                      {form.categoria && !planoContasReceita.some(p => p.nome === form.categoria) && (
                        <SelectItem value={form.categoria}>{form.categoria} (atual)</SelectItem>
                      )}
                      {planoContasReceita.map(p => (
                        <SelectItem key={p.nome} value={p.nome}>{p.nome}</SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
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
            <Label>Status</Label>
            <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="pago">Pago</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Salvar Alterações
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
