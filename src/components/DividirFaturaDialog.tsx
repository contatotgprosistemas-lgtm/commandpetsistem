import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, SplitSquareVertical, AlertTriangle, CheckCircle2 } from "lucide-react";
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
  const [valores, setValores] = useState<number[]>([]);

  const numParcelas = Math.max(2, parseInt(parcelas) || 2);

  // Reset valores when parcelas change
  useEffect(() => {
    if (!conta) return;
    const valorBase = Math.round((conta.valor / numParcelas) * 100) / 100;
    const diff = Math.round((conta.valor - valorBase * numParcelas) * 100) / 100;
    const novos = Array.from({ length: numParcelas }, (_, i) =>
      i === 0 ? Math.round((valorBase + diff) * 100) / 100 : valorBase
    );
    setValores(novos);
  }, [numParcelas, conta]);

  if (!conta) return null;

  const somaValores = Math.round(valores.reduce((a, b) => a + b, 0) * 100) / 100;
  const diferenca = Math.round((conta.valor - somaValores) * 100) / 100;
  const isValid = Math.abs(diferenca) < 0.01 && valores.every(v => v > 0);

  const handleValorChange = (index: number, val: string) => {
    const num = parseFloat(val) || 0;
    const novos = [...valores];
    novos[index] = Math.round(num * 100) / 100;
    setValores(novos);
  };

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
    if (!isValid) return;
    setSaving(true);
    const vencimentos = gerarVencimentos();

    const inserts = vencimentos.map((venc, i) => ({
      empresa_id: empresaId,
      cliente_id: conta.cliente_id || null,
      descricao: `${conta.descricao} (${i + 1}/${numParcelas})`,
      valor: valores[i],
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
            <Label className="text-xs text-muted-foreground">Parcelas (edite os valores livremente)</Label>
            <div className="border rounded-lg divide-y max-h-56 overflow-y-auto">
              {vencimentos.map((venc, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2 text-sm">
                  <span className="text-muted-foreground w-10 shrink-0">{i + 1}/{numParcelas}</span>
                  <span className="text-muted-foreground text-xs w-20 shrink-0">
                    {format(new Date(venc + "T00:00:00"), "dd/MM/yyyy")}
                  </span>
                  <div className="flex items-center gap-1 flex-1">
                    <span className="text-xs text-muted-foreground">R$</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      className="h-8 text-sm tabular-nums"
                      value={valores[i] ?? 0}
                      onChange={e => handleValorChange(i, e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Soma e validação */}
          <div className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${isValid ? "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400" : "bg-destructive/10 text-destructive"}`}>
            <div className="flex items-center gap-1.5">
              {isValid ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              <span>Soma: R$ {somaValores.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
            </div>
            {!isValid && (
              <span className="text-xs font-medium">
                {diferenca > 0 ? `Faltam R$ ${diferenca.toFixed(2)}` : diferenca < 0 ? `Excede R$ ${Math.abs(diferenca).toFixed(2)}` : "Valores devem ser > 0"}
              </span>
            )}
          </div>

          <Button onClick={handleDividir} disabled={saving || !isValid} className="w-full">
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Dividir em {numParcelas} parcelas
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
