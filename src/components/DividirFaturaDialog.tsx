import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, SplitSquareVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

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
  } | null;
  empresaId: string;
}

export function DividirFaturaDialog({ open, onOpenChange, onSuccess, conta, empresaId }: Props) {
  const [saving, setSaving] = useState(false);
  const [parcelas, setParcelas] = useState("2");
  const [intervalo, setIntervalo] = useState("semanal");

  if (!conta) return null;

  const numParcelas = Math.max(2, parseInt(parcelas) || 2);
  const valorParcela = Math.round((conta.valor / numParcelas) * 100) / 100;
  const diff = Math.round((conta.valor - valorParcela * numParcelas) * 100) / 100;

  const gerarVencimentos = () => {
    const vencimentos: string[] = [];
    for (let i = 0; i < numParcelas; i++) {
      const venc = new Date(conta.vencimento + "T00:00:00");
      if (intervalo === "semanal") venc.setDate(venc.getDate() + i * 7);
      else if (intervalo === "quinzenal") venc.setDate(venc.getDate() + i * 15);
      else if (intervalo === "mensal") venc.setMonth(venc.getMonth() + i);
      vencimentos.push(format(venc, "yyyy-MM-dd"));
    }
    return vencimentos;
  };

  const handleDividir = async () => {
    setSaving(true);
    const vencimentos = gerarVencimentos();

    const inserts = vencimentos.map((venc, i) => ({
      empresa_id: empresaId,
      cliente_id: conta.cliente_id || null,
      descricao: `${conta.descricao} (${i + 1}/${numParcelas})`,
      valor: i === 0 ? valorParcela + diff : valorParcela,
      vencimento: venc,
      categoria: conta.categoria || null,
      banco: conta.banco || null,
      status: "pendente",
    }));

    const { error: insertError } = await supabase.from("contas_receber").insert(inserts);
    if (insertError) {
      toast.error("Erro ao criar parcelas: " + insertError.message);
      setSaving(false);
      return;
    }

    const { error: deleteError } = await supabase.from("contas_receber").delete().eq("id", conta.id);
    if (deleteError) {
      toast.error("Parcelas criadas, mas erro ao remover fatura original: " + deleteError.message);
    } else {
      toast.success(`Fatura dividida em ${numParcelas} parcelas com sucesso!`);
    }

    setSaving(false);
    onOpenChange(false);
    onSuccess();
  };

  const vencimentos = gerarVencimentos();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SplitSquareVertical className="h-5 w-5" />
            Dividir Fatura
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="bg-muted/50 rounded-lg p-3 space-y-1">
            <p className="text-sm font-medium">{conta.descricao}</p>
            <p className="text-lg font-bold">R$ {conta.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
            <p className="text-xs text-muted-foreground">
              Vencimento: {format(new Date(conta.vencimento + "T00:00:00"), "dd/MM/yyyy")}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Parcelas</Label>
              <Input
                type="number"
                min="2"
                max="52"
                value={parcelas}
                onChange={e => setParcelas(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Intervalo</Label>
              <Select value={intervalo} onValueChange={setIntervalo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="semanal">Semanal</SelectItem>
                  <SelectItem value="quinzenal">Quinzenal</SelectItem>
                  <SelectItem value="mensal">Mensal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Prévia das parcelas</Label>
            <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
              {vencimentos.map((venc, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span className="text-muted-foreground">{i + 1}/{numParcelas}</span>
                  <span>{format(new Date(venc + "T00:00:00"), "dd/MM/yyyy")}</span>
                  <span className="font-medium tabular-nums">
                    R$ {(i === 0 ? valorParcela + diff : valorParcela).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <Button onClick={handleDividir} disabled={saving} className="w-full">
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Dividir em {numParcelas} parcelas
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
