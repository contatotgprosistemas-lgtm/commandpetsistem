import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { addDays, format, getDay, isBefore, startOfDay, lastDayOfMonth } from "date-fns";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSuccess: () => void;
  subscription: any;
  planName: string;
}

const DIAS_SEMANA = [
  { value: 1, label: "Segunda" },
  { value: 2, label: "Terça" },
  { value: 3, label: "Quarta" },
  { value: 4, label: "Quinta" },
  { value: 5, label: "Sexta" },
  { value: 6, label: "Sábado" },
  { value: 0, label: "Domingo" },
];

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}
function getWeekParity(date: Date): "par" | "impar" {
  return getISOWeek(date) % 2 === 0 ? "par" : "impar";
}

export function EditarContratacaoDialog({ open, onOpenChange, onSuccess, subscription, planName }: Props) {
  const [saving, setSaving] = useState(false);
  const [priceContracted, setPriceContracted] = useState("");
  const [discountAmount, setDiscountAmount] = useState("");
  const [autoRenew, setAutoRenew] = useState(false);
  const [notes, setNotes] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [contractDate, setContractDate] = useState("");
  const [contractEndDate, setContractEndDate] = useState("");
  const [frequency, setFrequency] = useState<"semanal" | "quinzenal">("semanal");
  const [weekParity, setWeekParity] = useState<"par" | "impar">("impar");
  const [plannedDays, setPlannedDays] = useState<number[]>([]);
  const [regenerate, setRegenerate] = useState(false);

  useEffect(() => {
    if (!subscription) return;
    setPriceContracted(String(subscription.price_contracted || 0));
    setDiscountAmount(String(subscription.discount_amount || 0));
    setAutoRenew(subscription.auto_renew || false);
    setNotes(subscription.notes || "");
    setStartDate(subscription.start_date || "");
    setEndDate(subscription.end_date || "");
    setContractDate(subscription.contract_date || "");
    setContractEndDate(subscription.contract_end_date || "");
    setFrequency((subscription.frequency as any) || "semanal");
    setWeekParity((subscription.week_parity as any) || (getWeekParity(new Date())));
    setPlannedDays(Array.isArray(subscription.planned_days) ? subscription.planned_days : []);
    setRegenerate(false);
  }, [subscription]);

  const isQuinzenal = frequency === "quinzenal";
  const finalPrice = Math.max(0, Number(priceContracted || 0) - Number(discountAmount || 0));

  const currentWeekParity = getWeekParity(new Date());

  // Preview dates if regenerating quinzenal
  const previewDates = useMemo(() => {
    if (!isQuinzenal || !regenerate || plannedDays.length !== 1) return [];
    const today = startOfDay(new Date());
    const eom = lastDayOfMonth(today);
    const dates: Date[] = [];
    let cur = new Date(today);
    while (!isBefore(eom, cur)) {
      if (plannedDays.includes(getDay(cur)) && getWeekParity(cur) === weekParity) {
        dates.push(new Date(cur));
      }
      cur = addDays(cur, 1);
    }
    return dates;
  }, [isQuinzenal, regenerate, plannedDays, weekParity]);

  function toggleDay(d: number) {
    if (isQuinzenal) {
      setPlannedDays([d]);
    } else {
      setPlannedDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
    }
  }

  async function handleSave() {
    if (isQuinzenal && regenerate && plannedDays.length !== 1) {
      toast.error("Para quinzenal selecione exatamente 1 dia da semana.");
      return;
    }
    setSaving(true);

    const updates: any = {
      price_contracted: Number(priceContracted || 0),
      discount_amount: Number(discountAmount || 0),
      final_price: finalPrice,
      auto_renew: autoRenew,
      notes,
      start_date: startDate || null,
      end_date: endDate || null,
      contract_date: contractDate || null,
      contract_end_date: contractEndDate || null,
      frequency,
      week_parity: isQuinzenal ? weekParity : null,
      planned_days: plannedDays,
    };

    const { error } = await supabase
      .from("customer_pet_subscriptions" as any)
      .update(updates)
      .eq("id", subscription.id);

    if (error) {
      toast.error("Erro ao salvar alterações");
      setSaving(false);
      return;
    }

    // Regenerate future agendamentos
    if (regenerate) {
      try {
        const todayStr = format(startOfDay(new Date()), "yyyy-MM-dd");

        // Delete future, non-finalized agendamentos linked to this subscription
        const { error: delErr } = await supabase
          .from("agendamentos")
          .delete()
          .eq("subscription_id", subscription.id)
          .gte("data_hora", todayStr + "T00:00:00")
          .in("status", ["agendado", "pendente"]);

        if (delErr) {
          toast.error("Não foi possível remover agendamentos futuros: " + delErr.message);
        }

        // Recreate
        const tipoServico = planName || "Plano";
        const today = startOfDay(new Date());
        const eom = lastDayOfMonth(today);
        const horaBase = "07:00";
        const novos: any[] = [];

        if (isQuinzenal && plannedDays.length === 1) {
          for (const d of previewDates) {
            if (isBefore(d, today)) continue;
            novos.push({
              empresa_id: subscription.empresa_id,
              cliente_id: subscription.cliente_id,
              pet_id: subscription.pet_id,
              tipo_servico: tipoServico,
              data_hora: format(d, "yyyy-MM-dd") + "T" + horaBase + ":00-03:00",
              status: "agendado",
              subscription_id: subscription.id,
              notas: "Regerado pela edição da contratação (quinzenal)",
            });
          }
        } else if (!isQuinzenal && plannedDays.length > 0) {
          let cur = new Date(today);
          while (!isBefore(eom, cur)) {
            if (plannedDays.includes(getDay(cur))) {
              novos.push({
                empresa_id: subscription.empresa_id,
                cliente_id: subscription.cliente_id,
                pet_id: subscription.pet_id,
                tipo_servico: tipoServico,
                data_hora: format(cur, "yyyy-MM-dd") + "T" + horaBase + ":00-03:00",
                status: "agendado",
                subscription_id: subscription.id,
                notas: "Regerado pela edição da contratação",
              });
            }
            cur = addDays(cur, 1);
          }
        }

        for (let i = 0; i < novos.length; i += 50) {
          await supabase.from("agendamentos").insert(novos.slice(i, i + 50) as any);
        }

        toast.success(`Contratação atualizada — ${novos.length} agendamento(s) regerado(s)`);
      } catch (e: any) {
        toast.error("Erro ao regerar agendamentos: " + (e?.message || ""));
      }
    } else {
      toast.success("Contratação atualizada com sucesso");
    }

    onSuccess();
    onOpenChange(false);
    setSaving(false);
  }

  if (!subscription) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Contratação</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-md bg-muted p-3">
            <p className="text-xs text-muted-foreground">Cliente: <span className="font-medium text-foreground">{subscription.cliente?.nome || "—"}</span></p>
            <p className="text-xs text-muted-foreground">Pet: <span className="font-medium text-foreground">{subscription.pet?.nome || "—"}</span></p>
            <p className="text-xs text-muted-foreground">Plano/Pacote: <span className="font-medium text-foreground">{planName}</span></p>
            <p className="text-xs text-muted-foreground">Frequência: <span className="font-medium text-foreground capitalize">{frequency}</span></p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Valor Contratado (R$)</Label>
              <Input type="number" value={priceContracted} onChange={e => setPriceContracted(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Desconto (R$)</Label>
              <Input type="number" value={discountAmount} onChange={e => setDiscountAmount(e.target.value)} />
            </div>
          </div>

          <div className="rounded-md bg-muted p-3">
            <p className="text-sm font-semibold text-foreground">Valor Final: R$ {finalPrice.toFixed(2)}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Data Contrato</Label>
              <Input type="date" value={contractDate} onChange={e => setContractDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Fim Contrato</Label>
              <Input type="date" value={contractEndDate} onChange={e => setContractEndDate(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Data Início</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Data Fim</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>

          {isQuinzenal && (
            <div className="space-y-2 rounded-md border border-border p-3">
              <Label className="text-sm font-semibold">Regra Quinzenal</Label>
              <p className="text-[11px] text-muted-foreground">
                Estamos na semana {currentWeekParity === "par" ? "par" : "ímpar"}.
                Ajuste a paridade e o dia da semana se desejar mudar a cadência deste cliente.
              </p>

              <div className="space-y-1.5">
                <Label className="text-xs">Semana do banho quinzenal</Label>
                <RadioGroup
                  value={weekParity}
                  onValueChange={v => setWeekParity(v as "par" | "impar")}
                  className="grid grid-cols-2 gap-2"
                >
                  <Label
                    htmlFor="edit-parity-impar"
                    className={cn(
                      "flex items-center gap-2 rounded-md border p-2 text-xs cursor-pointer transition-colors",
                      weekParity === "impar" ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground"
                    )}
                  >
                    <RadioGroupItem value="impar" id="edit-parity-impar" />
                    Semana ímpar {currentWeekParity === "impar" && <span className="ml-auto text-[10px] opacity-70">(atual)</span>}
                  </Label>
                  <Label
                    htmlFor="edit-parity-par"
                    className={cn(
                      "flex items-center gap-2 rounded-md border p-2 text-xs cursor-pointer transition-colors",
                      weekParity === "par" ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground"
                    )}
                  >
                    <RadioGroupItem value="par" id="edit-parity-par" />
                    Semana par {currentWeekParity === "par" && <span className="ml-auto text-[10px] opacity-70">(atual)</span>}
                  </Label>
                </RadioGroup>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Dia da semana</Label>
                <div className="grid grid-cols-4 gap-1.5">
                  {DIAS_SEMANA.map(d => (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => toggleDay(d.value)}
                      className={cn(
                        "rounded-md border p-1.5 text-[11px] transition-colors",
                        plannedDays.includes(d.value)
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-card text-muted-foreground"
                      )}
                    >
                      {d.label.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {!isQuinzenal && (
            <div className="space-y-1.5 rounded-md border border-border p-3">
              <Label className="text-xs">Dias da semana</Label>
              <div className="grid grid-cols-4 gap-1.5">
                {DIAS_SEMANA.map(d => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => toggleDay(d.value)}
                    className={cn(
                      "rounded-md border p-1.5 text-[11px] transition-colors",
                      plannedDays.includes(d.value)
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground"
                    )}
                  >
                    {d.label.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/5 p-3">
            <Switch checked={regenerate} onCheckedChange={setRegenerate} />
            <div className="space-y-0.5">
              <Label className="text-sm">Regerar agendamentos futuros</Label>
              <p className="text-[11px] text-muted-foreground">
                Remove agendamentos futuros (não finalizados) desta contratação até o fim do mês e recria conforme a regra acima.
              </p>
              {regenerate && isQuinzenal && previewDates.length > 0 && (
                <p className="text-[11px] text-foreground mt-1">
                  Serão criados <strong>{previewDates.length}</strong> agendamento(s):{" "}
                  {previewDates.map(d => format(d, "dd/MM")).join(", ")}
                </p>
              )}
            </div>
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
          <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
