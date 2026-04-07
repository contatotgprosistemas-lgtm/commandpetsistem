import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, differenceInMonths } from "date-fns";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSuccess: () => void;
  subscription: any;
  plan: any;
  pkg: any;
  empresaId: string;
}

export function CancelamentoContratacaoDialog({ open, onOpenChange, onSuccess, subscription, plan, pkg, empresaId }: Props) {
  const [saving, setSaving] = useState(false);
  const [cobrarMulta, setCobrarMulta] = useState(true);
  const [motivo, setMotivo] = useState("");

  const planOrPkg = plan || pkg;
  const planName = planOrPkg?.name || "Plano/Pacote";
  const cancellationFeePercent = plan?.cancellation_fee || 0;
  const contractDurationMonths = plan?.contract_duration_months || 0;
  const monthlyPrice = Number(subscription?.final_price || 0);

  // Calculate remaining months
  const today = new Date();
  const startDate = subscription?.contract_date || subscription?.start_date;
  let mesesUtilizados = 0;
  if (startDate) {
    mesesUtilizados = Math.max(0, differenceInMonths(today, new Date(startDate)));
  }
  const mesesRestantes = Math.max(0, contractDurationMonths - mesesUtilizados);
  const valorRestante = mesesRestantes * monthlyPrice;
  const valorMulta = Math.round(valorRestante * (cancellationFeePercent / 100) * 100) / 100;

  const hasContractInfo = contractDurationMonths > 0 && cancellationFeePercent > 0;

  async function handleConfirm() {
    setSaving(true);
    try {
      // 1. Delete all linked appointments
      await supabase.from("agendamentos").delete().eq("subscription_id", subscription.id);

      // 2. Update subscription status
      await supabase.from("customer_pet_subscriptions" as any).update({ status: "cancelado" }).eq("id", subscription.id);

      // 2. Log event
      await supabase.from("subscription_events" as any).insert({
        empresa_id: empresaId,
        subscription_id: subscription.id,
        event_type: "cancel",
        description: `Cancelamento${cobrarMulta && hasContractInfo ? ` com multa de R$ ${valorMulta.toFixed(2)}` : " sem multa"}. ${motivo ? `Motivo: ${motivo}` : ""}`
      });

      // 3. Generate penalty invoice if applicable
      if (cobrarMulta && hasContractInfo && valorMulta > 0) {
        await supabase.from("contas_receber").insert({
          empresa_id: empresaId,
          cliente_id: subscription.cliente_id,
          descricao: `Multa cancelamento: ${planName} (${cancellationFeePercent}% de ${mesesRestantes} meses restantes)`,
          valor: valorMulta,
          vencimento: format(today, "yyyy-MM-dd"),
          status: "pendente",
          categoria: "Multas e Penalidades",
        });

        // 4. Notify client
        await supabase.from("customer_notifications").insert({
          empresa_id: empresaId,
          cliente_id: subscription.cliente_id,
          title: "Contratação cancelada - Multa gerada",
          message: `Sua contratação do ${planName} foi cancelada. Uma multa de R$ ${valorMulta.toFixed(2)} (${cancellationFeePercent}% sobre ${mesesRestantes} meses restantes) foi gerada.`,
          type: "financeiro",
        });
      }

      toast.success(cobrarMulta && hasContractInfo && valorMulta > 0
        ? `Contratação cancelada. Multa de R$ ${valorMulta.toFixed(2)} gerada.`
        : "Contratação cancelada com sucesso.");
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      toast.error("Erro ao cancelar contratação");
    }
    setSaving(false);
  }

  if (!subscription) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Cancelar Contratação
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info */}
          <div className="rounded-md bg-muted p-3 space-y-1">
            <p className="text-xs text-muted-foreground">Cliente: <span className="font-medium text-foreground">{subscription.cliente?.nome || "—"}</span></p>
            <p className="text-xs text-muted-foreground">Pet: <span className="font-medium text-foreground">{subscription.pet?.nome || "—"}</span></p>
            <p className="text-xs text-muted-foreground">Plano/Pacote: <span className="font-medium text-foreground">{planName}</span></p>
            <p className="text-xs text-muted-foreground">Valor mensal: <span className="font-medium text-foreground">R$ {monthlyPrice.toFixed(2)}</span></p>
          </div>

          {/* Contract calculation */}
          {hasContractInfo ? (
            <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-3 space-y-2">
              <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                Cálculo da Multa
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <span className="text-muted-foreground">Duração do contrato:</span>
                <span className="font-medium text-foreground">{contractDurationMonths} meses</span>
                <span className="text-muted-foreground">Meses utilizados:</span>
                <span className="font-medium text-foreground">{mesesUtilizados} meses</span>
                <span className="text-muted-foreground">Meses restantes:</span>
                <span className="font-medium text-foreground">{mesesRestantes} meses</span>
                <span className="text-muted-foreground">Valor restante:</span>
                <span className="font-medium text-foreground">R$ {valorRestante.toFixed(2)}</span>
                <span className="text-muted-foreground">Percentual multa:</span>
                <span className="font-medium text-foreground">{cancellationFeePercent}%</span>
              </div>
              <div className="pt-2 border-t border-amber-200 dark:border-amber-800">
                <p className="text-sm font-bold text-foreground">
                  Multa: R$ {valorMulta.toFixed(2)}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  ({cancellationFeePercent}% × {mesesRestantes} meses × R$ {monthlyPrice.toFixed(2)})
                </p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Switch checked={cobrarMulta} onCheckedChange={setCobrarMulta} />
                <Label className="text-xs">Cobrar multa de cancelamento</Label>
              </div>
            </div>
          ) : (
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">
                Este plano não possui multa de cancelamento configurada (sem duração de contrato ou percentual de multa definido).
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Motivo do cancelamento</Label>
            <Textarea value={motivo} onChange={e => setMotivo(e.target.value)} rows={2} placeholder="Opcional..." />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Voltar</Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Confirmar Cancelamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
