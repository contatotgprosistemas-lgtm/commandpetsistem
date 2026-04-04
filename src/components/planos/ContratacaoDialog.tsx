import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { addDays, format, getDay, isBefore, startOfDay, lastDayOfMonth, startOfMonth, addMonths } from "date-fns";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSuccess: () => void;
  empresaId: string;
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

function isTaxiPetService(name: string) {
  const lower = (name || "").toLowerCase();
  return lower.includes("taxi") || lower.includes("transport") || lower.includes("leva");
}

function countWeekdaysInRange(start: Date, end: Date, days: number[]): number {
  let count = 0;
  let current = new Date(start);
  while (!isBefore(end, current)) {
    if (days.includes(getDay(current))) count++;
    current = addDays(current, 1);
  }
  return count;
}

function countWeekdaysInMonth(year: number, month: number, days: number[]): number {
  const start = new Date(year, month, 1);
  const end = lastDayOfMonth(start);
  return countWeekdaysInRange(start, end, days);
}

export function ContratacaoDialog({ open, onOpenChange, onSuccess, empresaId }: Props) {
  const [saving, setSaving] = useState(false);
  const [clientes, setClientes] = useState<any[]>([]);
  const [pets, setPets] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);

  const [clienteId, setClienteId] = useState("");
  const [selectedPetIds, setSelectedPetIds] = useState<string[]>([]);
  const [planType, setPlanType] = useState<"plan" | "package">("plan");
  const [selectedId, setSelectedId] = useState("");
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [contractDate, setContractDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [discount, setDiscount] = useState("0");
  const [autoRenew, setAutoRenew] = useState(false);
  const [notes, setNotes] = useState("");
  const [plannedDays, setPlannedDays] = useState<number[]>([]);
  const [horaBuscar, setHoraBuscar] = useState("08:00");
  const [horaLevar, setHoraLevar] = useState("17:00");

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
  const showHorarios = selectedPlan ? isTaxiPetService(selectedPlan.name) : false;
  const contractDurationMonths = selectedPlan?.min_loyalty_months ? Number(selectedPlan.min_loyalty_months) : null;

  // Calculate end date as last day of the month of startDate
  const startDateObj = new Date(startDate + "T00:00:00");
  const endOfMonth = lastDayOfMonth(startDateObj);
  const endDate = format(endOfMonth, "yyyy-MM-dd");

  // Calculate proportional price if not starting on the 1st
  const isFirstDay = startDateObj.getDate() === 1;
  let proportionalPrice = priceContracted;
  let proportionalInfo = "";

  if (!isFirstDay && plannedDays.length > 0) {
    const totalDaysInMonth = countWeekdaysInMonth(startDateObj.getFullYear(), startDateObj.getMonth(), plannedDays);
    const remainingDays = countWeekdaysInRange(startDateObj, endOfMonth, plannedDays);
    if (totalDaysInMonth > 0) {
      proportionalPrice = (priceContracted / totalDaysInMonth) * remainingDays;
      proportionalInfo = `Proporcional: ${remainingDays}/${totalDaysInMonth} dias → R$ ${proportionalPrice.toFixed(2)}`;
    }
  }

  const finalPrice = Math.max(0, proportionalPrice - Number(discount || 0));

  function toggleDay(day: number) {
    setPlannedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  }

  async function handleSave() {
    if (!clienteId || !selectedId) { toast.error("Selecione cliente e plano/pacote"); return; }
    if (selectedPetIds.length === 0) { toast.error("Selecione ao menos um pet"); return; }
    setSaving(true);

    const nextMonthStart = format(startOfMonth(addMonths(startDateObj, 1)), "yyyy-MM-dd");

    const contractDateObj = new Date(contractDate + "T00:00:00");
    const contractEndDate = contractDurationMonths
      ? format(addMonths(contractDateObj, contractDurationMonths), "yyyy-MM-dd")
      : null;

    let totalAgendamentos = 0;

    for (const petId of selectedPetIds) {
      const payload: any = {
        empresa_id: empresaId, cliente_id: clienteId, pet_id: petId,
        start_date: startDate, end_date: endDate,
        contract_date: contractDate,
        contract_end_date: contractEndDate,
        next_renewal_date: autoRenew ? nextMonthStart : null,
        price_contracted: priceContracted, discount_amount: Number(discount || 0),
        final_price: finalPrice, auto_renew: autoRenew,
        notes, status: "ativo", planned_days: plannedDays
      };
      if (planType === "plan") payload.plan_id = selectedId;
      else payload.package_id = selectedId;

      const { data: subData, error } = await supabase.from("customer_pet_subscriptions" as any).insert(payload).select("id").single();
      if (error || !subData) { toast.error("Erro ao contratar pet"); continue; }

      const subscriptionId = (subData as any).id;
      const petNome = pets.find(p => p.id === petId)?.nome || "";

      await supabase.from("contas_receber").insert({
        empresa_id: empresaId, cliente_id: clienteId,
        descricao: `${planType === "plan" ? "Plano" : "Pacote"}: ${selectedPlan?.name} - ${petNome}${!isFirstDay ? " (proporcional)" : ""}`,
        valor: finalPrice, vencimento: startDate, status: "pendente", categoria: "Planos e Pacotes"
      });

      if (plannedDays.length > 0) {
        const start = startOfDay(startDateObj);
        const end = startOfDay(endOfMonth);
        const today = startOfDay(new Date());
        const tipoServico = selectedPlan?.name || "Plano";

        const agendamentos: any[] = [];
        let current = isBefore(start, today) ? today : start;

        while (!isBefore(end, current)) {
          const weekday = getDay(current);
          if (plannedDays.includes(weekday)) {
            const ag: any = {
              empresa_id: empresaId,
              cliente_id: clienteId,
              pet_id: petId,
              tipo_servico: tipoServico,
              data_hora: format(current, "yyyy-MM-dd") + "T07:00:00-03:00",
              status: "agendado",
              subscription_id: subscriptionId,
              notas: "Gerado automaticamente pelo plano",
            };
            if (showHorarios) {
              ag.hora_prevista_buscar = horaBuscar;
              ag.hora_prevista_levar = horaLevar;
            }
            agendamentos.push(ag);
          }
          current = addDays(current, 1);
        }

        for (let i = 0; i < agendamentos.length; i += 50) {
          await supabase.from("agendamentos").insert(agendamentos.slice(i, i + 50) as any);
        }
        totalAgendamentos += agendamentos.length;
      }
    }

    if (totalAgendamentos > 0) {
      toast.success(`Contratação realizada! ${totalAgendamentos} reservas geradas para ${selectedPetIds.length} pet(s).`);
    } else {
      toast.success(`Contratação realizada para ${selectedPetIds.length} pet(s)!`);
    }

    setClienteId("");
    setSelectedPetIds([]);
    setPets([]);
    setPlanType("plan");
    setSelectedId("");
    setStartDate(format(new Date(), "yyyy-MM-dd"));
    setContractDate(format(new Date(), "yyyy-MM-dd"));
    setDiscount("0");
    setAutoRenew(false);
    setNotes("");
    setPlannedDays([]);
    setHoraBuscar("08:00");
    setHoraLevar("17:00");
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
            <div className="space-y-2">
              <Label>Pet(s) * {pets.length > 1 && <span className="text-xs text-muted-foreground ml-1">(selecione um ou mais)</span>}</Label>
              {pets.length === 1 ? (
                <div className="flex items-center gap-2 p-2 rounded-md border border-border bg-card">
                  <Checkbox
                    checked={selectedPetIds.includes(pets[0].id)}
                    onCheckedChange={(checked) => {
                      setSelectedPetIds(checked ? [pets[0].id] : []);
                    }}
                  />
                  <span className="text-sm">{pets[0].nome}</span>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {pets.map(p => {
                    const isSelected = selectedPetIds.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedPetIds(prev =>
                          prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id]
                        )}
                        className={cn(
                          "relative flex items-center justify-center rounded-lg border-2 px-3 py-2 text-xs font-medium transition-all min-w-[70px]",
                          isSelected
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-card text-muted-foreground hover:border-primary/50"
                        )}
                      >
                        {isSelected && (
                          <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                            <Check className="h-2.5 w-2.5 text-primary-foreground" />
                          </div>
                        )}
                        {p.nome}
                      </button>
                    );
                  })}
                </div>
              )}
              <p className="text-xs text-muted-foreground">{selectedPetIds.length} pet(s) selecionado(s)</p>
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
              <Label>Data Contrato</Label>
              <Input type="date" value={contractDate} onChange={e => setContractDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Data Início</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
          </div>

          {contractDurationMonths && (
            <div className="rounded-md bg-muted p-3">
              <p className="text-xs font-medium text-muted-foreground">
                Validade do contrato: {contractDurationMonths} meses — Vencimento em{" "}
                {format(addMonths(new Date(contractDate + "T00:00:00"), contractDurationMonths), "dd/MM/yyyy")}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Dias de uso na semana</Label>
            <div className="flex flex-wrap gap-2">
              {DIAS_SEMANA.map(dia => {
                const isSelected = plannedDays.includes(dia.value);
                return (
                  <button
                    key={dia.value}
                    type="button"
                    onClick={() => toggleDay(dia.value)}
                    className={cn(
                      "relative flex items-center justify-center rounded-lg border-2 px-3 py-2 text-xs font-medium transition-all min-w-[70px]",
                      isSelected
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground hover:border-primary/50"
                    )}
                  >
                    {isSelected && (
                      <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-2.5 w-2.5 text-primary-foreground" />
                      </div>
                    )}
                    {dia.label}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">{plannedDays.length} dia(s) — reservas serão criadas automaticamente</p>
          </div>

          {showHorarios && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Hora prevista buscar</Label>
                <Input type="time" value={horaBuscar} onChange={e => setHoraBuscar(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Hora prevista levar</Label>
                <Input type="time" value={horaLevar} onChange={e => setHoraLevar(e.target.value)} />
              </div>
            </div>
          )}

          {proportionalInfo && (
            <div className="rounded-md bg-muted p-3">
              <p className="text-xs font-medium text-muted-foreground">{proportionalInfo}</p>
              <p className="text-xs text-muted-foreground mt-1">A partir do próximo mês, o valor será R$ {priceContracted.toFixed(2)} (mês cheio).</p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Preço</Label>
              <Input value={`R$ ${proportionalPrice.toFixed(2)}`} disabled />
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
