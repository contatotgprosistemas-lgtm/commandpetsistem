import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, differenceInCalendarDays } from "date-fns";
import { AlertTriangle, Hotel } from "lucide-react";

interface HotelCheckoutDialogProps {
  agendamento: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted: () => void;
}

type AntecipadoAcao = "devolver" | "manter" | "credito";
type AtrasadoAcao = "fatura_diferenca" | "sem_fatura";

function isHotelService(tipo: string | null | undefined) {
  const t = (tipo || "").toLowerCase();
  return /hotel|hosped|pernoit|diár|diari/.test(t);
}

export function HotelCheckoutDialog({ agendamento, open, onOpenChange, onCompleted }: HotelCheckoutDialogProps) {
  const [loading, setLoading] = useState(false);
  const [acaoAntecipado, setAcaoAntecipado] = useState<AntecipadoAcao>("manter");
  const [acaoAtrasado, setAcaoAtrasado] = useState<AtrasadoAcao>("fatura_diferenca");
  const [valorAjuste, setValorAjuste] = useState<string>("");
  const [obs, setObs] = useState("");

  const info = useMemo(() => {
    if (!agendamento) return null;
    const isHotel = isHotelService(agendamento.tipo_servico);
    const entradaDate = agendamento.data_entrada
      ? new Date(agendamento.data_entrada)
      : new Date(agendamento.data_hora);
    const saidaPrevDate = agendamento.data_saida_provavel
      ? new Date(agendamento.data_saida_provavel)
      : null;
    const hoje = new Date();
    const diariasPrevistas = saidaPrevDate
      ? Math.max(0, differenceInCalendarDays(saidaPrevDate, entradaDate))
      : 0;
    const diariasReais = saidaPrevDate
      ? Math.max(0, differenceInCalendarDays(hoje, entradaDate))
      : 0;
    const diasDiff = saidaPrevDate ? differenceInCalendarDays(hoje, saidaPrevDate) : 0;
    const valorTotal = Number(agendamento.valor || 0);
    const valorDiaria = diariasPrevistas > 0 ? valorTotal / diariasPrevistas : 0;
    const sugestaoAjuste = valorDiaria * Math.abs(diasDiff);
    return {
      isHotel,
      saidaPrevDate,
      diariasPrevistas,
      diariasReais,
      diasDiff, // negativo = antecipado, positivo = atrasado, 0 = no prazo
      valorTotal,
      valorDiaria,
      sugestaoAjuste,
    };
  }, [agendamento]);

  const tipo: "antecipado" | "atrasado" | "no_prazo" | "n_a" = useMemo(() => {
    if (!info?.isHotel || !info?.saidaPrevDate) return "n_a";
    if (info.diasDiff < 0) return "antecipado";
    if (info.diasDiff > 0) return "atrasado";
    return "no_prazo";
  }, [info]);

  useEffect(() => {
    if (open && info) {
      setValorAjuste(info.sugestaoAjuste > 0 ? info.sugestaoAjuste.toFixed(2) : "");
      setAcaoAntecipado("manter");
      setAcaoAtrasado("fatura_diferenca");
      setObs("");
    }
  }, [open, info]);

  if (!agendamento || !info) return null;

  const petNome = agendamento.pet?.nome || "Pet";
  const clienteNome = agendamento.cliente?.nome || "Cliente";
  const valorAjusteNum = Number(valorAjuste.replace(",", ".")) || 0;

  const finalizarCheckout = async (extras: { obs: string }) => {
    const now = new Date();
    const horaSaida = format(now, "HH:mm");
    const { error } = await supabase
      .from("agendamentos")
      .update({
        status: "concluido",
        data_saida: now.toISOString(),
        hora_saida: horaSaida,
        checkout_obs: extras.obs,
      } as any)
      .eq("id", agendamento.id);
    if (error) throw error;

    const { data: existing } = await supabase
      .from("historico_servicos")
      .select("id")
      .eq("agendamento_id", agendamento.id)
      .maybeSingle();
    const notas = `Check-in: ${
      agendamento.data_entrada ? format(new Date(agendamento.data_entrada), "dd/MM/yyyy") : "—"
    } ${agendamento.hora_entrada ?? ""} | Check-out: ${format(now, "dd/MM/yyyy")} ${horaSaida}${
      extras.obs ? ` | ${extras.obs}` : ""
    }`;
    if (existing) {
      await supabase.from("historico_servicos").update({ notas } as any).eq("id", existing.id);
    } else {
      await supabase.from("historico_servicos" as any).insert({
        empresa_id: agendamento.empresa_id,
        cliente_id: agendamento.cliente_id,
        pet_id: agendamento.pet_id,
        tipo_servico: agendamento.tipo_servico,
        valor: agendamento.valor,
        data_servico: agendamento.data_hora,
        agendamento_id: agendamento.id,
        notas,
      } as any);
    }
  };

  // Find existing fatura for this agendamento (by descricao convention)
  const findFatura = async () => {
    const searchDesc = `${agendamento.tipo_servico} — ${petNome}`;
    const { data } = await supabase
      .from("contas_receber")
      .select("id, valor, status, valor_pago")
      .eq("cliente_id", agendamento.cliente_id)
      .eq("descricao", searchDesc)
      .order("created_at", { ascending: false })
      .maybeSingle();
    return data;
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      let resumo = obs;

      if (tipo === "antecipado" && valorAjusteNum > 0) {
        if (acaoAntecipado === "devolver") {
          const fatura = await findFatura();
          if (fatura && fatura.status !== "pago") {
            // reduz a fatura pendente
            const novoValor = Math.max(0, Number(fatura.valor) - valorAjusteNum);
            await supabase.from("contas_receber").update({ valor: novoValor }).eq("id", fatura.id);
            resumo = `Saída antecipada (${Math.abs(info.diasDiff)} dia(s)). Fatura reduzida em R$ ${valorAjusteNum.toFixed(2)}.${
              obs ? " Obs: " + obs : ""
            }`;
          } else {
            // gera contas a pagar (devolução)
            await supabase.from("contas_pagar").insert({
              empresa_id: agendamento.empresa_id,
              descricao: `Devolução check-out antecipado — ${petNome} (${clienteNome})`,
              valor: valorAjusteNum,
              vencimento: format(new Date(), "yyyy-MM-dd"),
              status: "pendente",
              categoria: "Devolução",
            } as any);
            resumo = `Saída antecipada (${Math.abs(info.diasDiff)} dia(s)). Devolução de R$ ${valorAjusteNum.toFixed(2)} lançada em Contas a Pagar.${
              obs ? " Obs: " + obs : ""
            }`;
          }
        } else if (acaoAntecipado === "credito") {
          // soma ao saldo_credito do cliente
          const { data: cli } = await supabase
            .from("clientes")
            .select("saldo_credito")
            .eq("id", agendamento.cliente_id)
            .maybeSingle();
          const atual = Number((cli as any)?.saldo_credito || 0);
          await supabase
            .from("clientes")
            .update({ saldo_credito: atual + valorAjusteNum } as any)
            .eq("id", agendamento.cliente_id);
          resumo = `Saída antecipada (${Math.abs(info.diasDiff)} dia(s)). R$ ${valorAjusteNum.toFixed(2)} adicionado como crédito do cliente.${
            obs ? " Obs: " + obs : ""
          }`;
        } else {
          resumo = `Saída antecipada (${Math.abs(info.diasDiff)} dia(s)). Pagamento mantido integralmente.${
            obs ? " Obs: " + obs : ""
          }`;
        }
      } else if (tipo === "atrasado" && valorAjusteNum > 0) {
        if (acaoAtrasado === "fatura_diferenca") {
          await supabase.from("contas_receber").insert({
            empresa_id: agendamento.empresa_id,
            cliente_id: agendamento.cliente_id,
            descricao: `Diárias adicionais (${info.diasDiff} dia${info.diasDiff > 1 ? "s" : ""}) — ${petNome}`,
            valor: valorAjusteNum,
            vencimento: format(new Date(), "yyyy-MM-dd"),
            status: "pendente",
            categoria: agendamento.tipo_servico,
          } as any);
          resumo = `Saída atrasada (${info.diasDiff} dia(s)). Fatura adicional de R$ ${valorAjusteNum.toFixed(2)} gerada.${
            obs ? " Obs: " + obs : ""
          }`;
        } else {
          resumo = `Saída atrasada (${info.diasDiff} dia(s)). Sem cobrança adicional.${obs ? " Obs: " + obs : ""}`;
        }
      }

      await finalizarCheckout({ obs: resumo });
      toast.success("Check-out realizado!");
      onOpenChange(false);
      onCompleted();
    } catch (e: any) {
      toast.error("Erro: " + (e?.message || String(e)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hotel className="h-5 w-5 text-amber-600" /> Check-out — {petNome}
          </DialogTitle>
          <DialogDescription>{clienteNome}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-2 rounded-md border p-3 bg-muted/30">
            <div>
              <p className="text-xs text-muted-foreground">Saída prevista</p>
              <p className="font-medium">
                {info.saidaPrevDate ? format(info.saidaPrevDate, "dd/MM/yyyy") : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Saída real</p>
              <p className="font-medium">{format(new Date(), "dd/MM/yyyy")}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Diárias previstas</p>
              <p className="font-medium">{info.diariasPrevistas}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Valor diária</p>
              <p className="font-medium">R$ {info.valorDiaria.toFixed(2)}</p>
            </div>
          </div>

          {tipo === "no_prazo" && (
            <p className="text-emerald-700 text-sm">Saída no prazo previsto. Nenhum ajuste necessário.</p>
          )}

          {tipo === "antecipado" && (
            <div className="space-y-3">
              <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs">
                  Saída <strong>{Math.abs(info.diasDiff)} dia(s) antes</strong> do previsto. O que fazer com a diferença?
                </p>
              </div>
              <div>
                <Label className="text-xs">Valor da diferença (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={valorAjuste}
                  onChange={(e) => setValorAjuste(e.target.value)}
                  className="h-9"
                />
              </div>
              <RadioGroup value={acaoAntecipado} onValueChange={(v) => setAcaoAntecipado(v as AntecipadoAcao)}>
                <div className="flex items-start gap-2 rounded-md border p-2">
                  <RadioGroupItem value="manter" id="ant-manter" className="mt-0.5" />
                  <Label htmlFor="ant-manter" className="font-normal cursor-pointer text-sm">
                    Manter pagamento normal e fazer check-out
                  </Label>
                </div>
                <div className="flex items-start gap-2 rounded-md border p-2">
                  <RadioGroupItem value="devolver" id="ant-devolver" className="mt-0.5" />
                  <Label htmlFor="ant-devolver" className="font-normal cursor-pointer text-sm">
                    Devolver o valor (reduz fatura ou gera contas a pagar)
                  </Label>
                </div>
                <div className="flex items-start gap-2 rounded-md border p-2">
                  <RadioGroupItem value="credito" id="ant-credito" className="mt-0.5" />
                  <Label htmlFor="ant-credito" className="font-normal cursor-pointer text-sm">
                    Deixar como crédito do cliente
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {tipo === "atrasado" && (
            <div className="space-y-3">
              <div className="flex items-start gap-2 rounded-md border border-orange-300 bg-orange-50 dark:bg-orange-950/30 p-2">
                <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 shrink-0" />
                <p className="text-xs">
                  Saída <strong>{info.diasDiff} dia(s) após</strong> o previsto. Cobrar a diferença?
                </p>
              </div>
              <div>
                <Label className="text-xs">Valor adicional (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={valorAjuste}
                  onChange={(e) => setValorAjuste(e.target.value)}
                  className="h-9"
                />
              </div>
              <RadioGroup value={acaoAtrasado} onValueChange={(v) => setAcaoAtrasado(v as AtrasadoAcao)}>
                <div className="flex items-start gap-2 rounded-md border p-2">
                  <RadioGroupItem value="fatura_diferenca" id="atr-fat" className="mt-0.5" />
                  <Label htmlFor="atr-fat" className="font-normal cursor-pointer text-sm">
                    Gerar fatura da diferença
                  </Label>
                </div>
                <div className="flex items-start gap-2 rounded-md border p-2">
                  <RadioGroupItem value="sem_fatura" id="atr-sem" className="mt-0.5" />
                  <Label htmlFor="atr-sem" className="font-normal cursor-pointer text-sm">
                    Check-out sem gerar fatura
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}

          <div>
            <Label className="text-xs">Observação (opcional)</Label>
            <Textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Processando..." : "Confirmar Check-out"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { isHotelService };
