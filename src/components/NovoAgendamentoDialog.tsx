import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, CalendarIcon, BedDouble, RotateCcw, Gift, DollarSign, Trash2, FileSignature, Copy, ExternalLink, Loader2 } from "lucide-react";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { format, differenceInCalendarDays } from "date-fns";

import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { createContractShareLink } from "@/lib/contract-links";
import { buildHospedagemContractValues, replaceContractPlaceholders } from "@/lib/contract-placeholders";
import { useBanhoAvailability } from "@/hooks/useBanhoAvailability";
import { BanhoTimeSlotPicker } from "@/components/planos/BanhoTimeSlotPicker";

const schema = z.object({
  cliente_id: z.string().uuid("Selecione um cliente"),
  pet_ids: z.array(z.string().uuid()).min(1, "Selecione pelo menos um pet"),
  tipo_servico: z.string().min(1, "Selecione o serviço"),
  data_reserva: z.string().min(1, "Informe a data da reserva"),
  hora_reserva: z.string().regex(/^\d{2}:\d{2}$/, "Horário inválido"),
  data_entrada: z.string().optional().or(z.literal("")),
  hora_entrada: z.string().optional().or(z.literal("")),
  data_saida_provavel: z.string().optional().or(z.literal("")),
  hora_saida_provavel: z.string().optional().or(z.literal("")),
  data_saida: z.string().optional().or(z.literal("")),
  hora_saida: z.string().optional().or(z.literal("")),
  baia: z.string().optional().or(z.literal("")),
  desconto: z.string().optional().or(z.literal("")),
  valor: z.string().optional().or(z.literal("")),
  forma_pagamento: z.string().optional().or(z.literal("")),
  data_pagamento: z.string().optional().or(z.literal("")),
  notas: z.string().trim().max(500).optional().or(z.literal("")),
});

type FormValues = z.infer<typeof schema>;

interface ServicoItem {
  id: string;
  descricao: string;
  valor: number;
  tipo: string;
}

interface ServicoExtra {
  servico_id: string;
  descricao: string;
  valor: number;
  quantidade: number;
  cortesia: boolean;
}

// quartoOptions removed – baias are fetched from DB

function DatePickerField({
  value,
  onChange,
  placeholder = "Selecione",
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}) {
  const dateValue = value ? new Date(value + "T00:00:00") : undefined;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal h-10",
            !value && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {dateValue ? format(dateValue, "dd/MM/yyyy") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={dateValue}
          onSelect={(d) => onChange(d ? format(d, "yyyy-MM-dd") : "")}
          initialFocus
          locale={ptBR}
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );
}

export function NovoAgendamentoDialog({ onSuccess }: { onSuccess?: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState<{ id: string; nome: string }[]>([]);
  const [pets, setPets] = useState<{ id: string; nome: string; cliente_id: string }[]>([]);
  const [servicos, setServicos] = useState<ServicoItem[]>([]);
  const [formasPagamento, setFormasPagamento] = useState<{ id: string; nome: string }[]>([]);
  const [availableReplacements, setAvailableReplacements] = useState<any[]>([]);
  const [useReplacement, setUseReplacement] = useState(false);
  // Map<pet_id, absence_id> — qual reposição cada pet vai consumir
  const [replacementChoices, setReplacementChoices] = useState<Record<string, string>>({});
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [servicosExtras, setServicosExtras] = useState<ServicoExtra[]>([]);
  const [baias, setBaias] = useState<{ id: string; nome: string; capacidade_pets: number }[]>([]);
  const [clientePopoverOpen, setClientePopoverOpen] = useState(false);
  const [gerarContrato, setGerarContrato] = useState(false);
  const banhoAvail = useBanhoAvailability(empresaId || "");
  const [contratoDialog, setContratoDialog] = useState<{
    open: boolean;
    agendamento: any;
    templates: any[];
    selectedTemplate: string;
    fillTemplate?: (template: string) => string;
    content: string;
    title: string;
    loading: boolean;
    createdLink: string | null;
  } | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      cliente_id: "", pet_ids: [], tipo_servico: "",
      data_reserva: "", hora_reserva: "09:00",
      data_entrada: "", hora_entrada: "",
      data_saida_provavel: "", hora_saida_provavel: "18:00",
      data_saida: "", hora_saida: "",
      baia: "", desconto: "", valor: "", forma_pagamento: "", data_pagamento: "", notas: "",
    },
  });

  const selectedCliente = form.watch("cliente_id");
  const selectedPetIds = form.watch("pet_ids");
  const selectedServico = form.watch("tipo_servico");
  const dataReserva = form.watch("data_reserva");
  const horaReserva = form.watch("hora_reserva");
  const dataSaidaProvavel = form.watch("data_saida_provavel");
  const descontoStr = form.watch("desconto");
  const filteredPets = pets.filter(p => p.cliente_id === selectedCliente);

  // Find the selected service object
  const servicoObj = useMemo(
    () => servicos.find(s => s.descricao === selectedServico),
    [servicos, selectedServico]
  );

  // Check if service is hotel type
  const isHotel = useMemo(() => {
    if (!servicoObj) return false;
    const desc = servicoObj.descricao.toLowerCase();
    const tipo = servicoObj.tipo.toLowerCase();
    return desc.includes("hotel") || desc.includes("hospedagem") || tipo.includes("hotel") || tipo.includes("hospedagem");
  }, [servicoObj]);

  // Check if service is banho/tosa type
  const isBanho = useMemo(() => {
    if (!servicoObj) return false;
    const desc = servicoObj.descricao.toLowerCase();
    const tipo = servicoObj.tipo.toLowerCase();
    return desc.includes("banho") || desc.includes("tosa") || tipo.includes("banho") || tipo.includes("tosa");
  }, [servicoObj]);

  // Auto-fill for banho: same date + 30min for saída prevista
  useEffect(() => {
    if (!isBanho) return;
    if (dataReserva) {
      form.setValue("data_saida_provavel", dataReserva);
    }
    if (horaReserva && /^\d{2}:\d{2}$/.test(horaReserva)) {
      const [h, m] = horaReserva.split(":").map(Number);
      const totalMin = h * 60 + m + 30;
      const nh = Math.floor(totalMin / 60) % 24;
      const nm = totalMin % 60;
      form.setValue("hora_saida_provavel", `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`);
    }
  }, [isBanho, dataReserva, horaReserva]);

  // Auto-fill valor for banho from service price
  useEffect(() => {
    if (isBanho && servicoObj) {
      form.setValue("valor", servicoObj.valor.toFixed(2));
    }
  }, [isBanho, servicoObj]);

  // Auto-fill valor for any other service type (taxi, daycare, avulsos, etc.)
  // when a service is picked and the user hasn't typed a value yet.
  useEffect(() => {
    if (!servicoObj || isBanho || isHotel) return;
    const current = form.getValues("valor");
    if (!current || current === "" || current === "0" || current === "0.00") {
      form.setValue("valor", servicoObj.valor.toFixed(2));
    }
  }, [servicoObj, isBanho, isHotel]);

  // Check banho availability when date changes
  useEffect(() => {
    if (isBanho && dataReserva && empresaId) {
      banhoAvail.checkAvailability([dataReserva]);
    }
  }, [isBanho, dataReserva, empresaId]);

  const banhoConflicts = useMemo(() => {
    if (!isBanho || !dataReserva || !horaReserva) return [];
    return banhoAvail.getConflictingDates(horaReserva, [dataReserva]);
  }, [isBanho, dataReserva, horaReserva, banhoAvail.availabilityMap]);

  const banhoSuggestions = useMemo(() => {
    if (!isBanho || banhoConflicts.length === 0) return [];
    return banhoAvail.suggestAlternatives(dataReserva, horaReserva, 3);
  }, [banhoConflicts, isBanho, dataReserva, horaReserva]);
  // Calculate diárias
  const diarias = useMemo(() => {
    if (!isHotel || !dataReserva || !dataSaidaProvavel) return 0;
    const start = new Date(dataReserva + "T00:00:00");
    const end = new Date(dataSaidaProvavel + "T00:00:00");
    const diff = differenceInCalendarDays(end, start);
    return diff > 0 ? diff : 0;
  }, [isHotel, dataReserva, dataSaidaProvavel]);

  // Auto-calculate valor for hotel (without discount - discount applies to contract total)
  useEffect(() => {
    if (isHotel && diarias > 0 && servicoObj) {
      const bruto = diarias * servicoObj.valor;
      form.setValue("valor", bruto.toFixed(2));
    }
  }, [isHotel, diarias, servicoObj]);

  useEffect(() => {
    if (open) {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (!user) return;
        supabase.from("profiles").select("empresa_id").eq("user_id", user.id).single().then(({ data }) => {
          if (data?.empresa_id) setEmpresaId(data.empresa_id);
        });
      });
      supabase.from("clientes").select("id, nome").order("nome").then(({ data }) => { if (data) setClientes(data); });
      supabase.from("pets").select("id, nome, cliente_id").order("nome").then(({ data }) => { if (data) setPets(data); });
      supabase.from("servicos").select("id, descricao, valor, tipo").eq("ativo", true).order("descricao").then(({ data }) => { if (data) setServicos(data as ServicoItem[]); });
      supabase.from("formas_pagamento").select("id, nome").eq("ativo", true).order("nome").then(({ data }) => { if (data) setFormasPagamento(data); });
      supabase.from("baias").select("id, nome, capacidade_pets").eq("ativa", true).order("nome").then(({ data }) => { if (data) setBaias(data); });
    } else {
      setServicosExtras([]);
    }
  }, [open]);

  useEffect(() => { form.setValue("pet_ids", []); }, [selectedCliente]);

  // Check for available replacements when pets or service change
  useEffect(() => {
    setAvailableReplacements([]);
    setUseReplacement(false);
    setReplacementChoices({});

    if (selectedPetIds.length === 0 || !selectedServico || !empresaId) return;

    const check = async () => {
      const { data: absences } = await supabase
        .from("agendamento_absences" as any)
        .select("id, agendamento_id, tipo, reposicao_utilizada, notes")
        .eq("empresa_id", empresaId)
        .eq("tipo", "com_reposicao")
        .eq("reposicao_utilizada", false);

      if (!absences || absences.length === 0) return;

      const absenceAgendamentoIds = absences.map((a: any) => a.agendamento_id);
      const { data: agendamentos } = await supabase
        .from("agendamentos")
        .select("id, pet_id, tipo_servico, data_hora, pet:pets(nome), cliente:clientes(nome)")
        .in("id", absenceAgendamentoIds);

      if (!agendamentos) return;

      // Match por palavra-chave: agendamento "Escola" deve casar com falta de
      // "Plano Escola Premium 3x Semana", "Hotel" com "Hotel Diária", etc.
      const SERVICE_KEYWORDS = ["escola", "hotel", "creche", "daycare", "banho", "tosa", "taxi", "adestramento"];
      const newSvcLower = (selectedServico || "").toLowerCase();
      const newKeywords = SERVICE_KEYWORDS.filter((k) => newSvcLower.includes(k));
      const matching = absences
        .map((abs: any) => {
          const ag = agendamentos.find((a: any) => a.id === abs.agendamento_id);
          return ag ? { ...abs, agendamento: ag } : null;
        })
        .filter((abs: any) => {
          if (!abs) return false;
          const ag = abs.agendamento;
          if (!selectedPetIds.includes(ag.pet_id)) return false;
          const absSvcLower = (ag.tipo_servico || "").toLowerCase();
          // Casa se compartilham alguma palavra-chave conhecida
          if (newKeywords.length > 0) {
            return newKeywords.some((k) => absSvcLower.includes(k));
          }
          // Fallback: igualdade exata (lowercase)
          return absSvcLower === newSvcLower;
        });

      if (matching.length > 0) {
        setAvailableReplacements(matching);
      }
    };

    check();
  }, [selectedPetIds, selectedServico, empresaId]);

  function togglePet(petId: string) {
    const current = form.getValues("pet_ids");
    const updated = current.includes(petId) ? current.filter(id => id !== petId) : [...current, petId];
    form.setValue("pet_ids", updated, { shouldValidate: true });
  }

  // Serviços extras helpers
  function addServicoExtra() {
    setServicosExtras(prev => [...prev, { servico_id: "", descricao: "", valor: 0, quantidade: 1, cortesia: false }]);
  }

  function updateServicoExtra(index: number, field: keyof ServicoExtra, value: any) {
    setServicosExtras(prev => {
      const updated = [...prev];
      if (field === "servico_id") {
        const svc = servicos.find(s => s.id === value);
        if (svc) {
          updated[index] = { ...updated[index], servico_id: value, descricao: svc.descricao, valor: svc.valor, quantidade: updated[index].quantidade || 1 };
        }
      } else {
        updated[index] = { ...updated[index], [field]: value };
      }
      return updated;
    });
  }

  function removeServicoExtra(index: number) {
    setServicosExtras(prev => prev.filter((_, i) => i !== index));
  }

  // Total dos extras cobrados
  const totalExtras = useMemo(() => {
    return servicosExtras
      .filter(e => !e.cortesia && e.valor > 0)
      .reduce((sum, e) => sum + e.valor * (e.quantidade || 1), 0);
  }, [servicosExtras]);

  // Valor contrato = (valor unitário × qtd pets) + extras (por quantidade) - desconto
  const valorContrato = useMemo(() => {
    const valorUnit = form.getValues("valor") ? parseFloat(form.getValues("valor")) : 0;
    const qtdPets = selectedPetIds.length || 1;
    const bruto = (valorUnit * qtdPets) + totalExtras;
    const desc = descontoStr ? parseFloat(descontoStr) : 0;
    return Math.max(bruto - (isNaN(desc) ? 0 : desc), 0);
  }, [form.watch("valor"), totalExtras, selectedPetIds.length, descontoStr]);

  async function onSubmit(data: FormValues) {
    await executeSubmit(data, useReplacement);
  }

  async function executeSubmit(data: FormValues, useRepl: boolean) {
    setLoading(true);
    try {
      if (!empresaId) {
        toast({ title: "Erro", description: "Empresa não encontrada. Faça login novamente.", variant: "destructive" });
        return;
      }

      const dataHora = new Date(data.data_reserva + "T" + data.hora_reserva + ":00");

      const buildTs = (d: string, h: string) => {
        if (!d) return null;
        return new Date(d + "T" + (h || "00:00") + ":00").toISOString();
      };

      const baseValor = data.valor ? parseFloat(data.valor) : null;
      const petUsesReplacement = (petId: string) => useRepl && !!replacementChoices[petId];

      const rows = data.pet_ids.map(pet_id => ({
        empresa_id: empresaId,
        cliente_id: data.cliente_id,
        pet_id,
        tipo_servico: data.tipo_servico,
        data_hora: dataHora.toISOString(),
        data_entrada: buildTs(data.data_entrada || "", data.hora_entrada || ""),
        hora_entrada: data.hora_entrada || null,
        data_saida_provavel: buildTs(data.data_saida_provavel || "", data.hora_saida_provavel || ""),
        hora_saida_provavel: data.hora_saida_provavel || null,
        data_saida: buildTs(data.data_saida || "", data.hora_saida || ""),
        hora_saida: data.hora_saida || null,
        baia: data.baia || null,
        valor: petUsesReplacement(pet_id) ? 0 : baseValor,
        desconto: data.desconto ? parseFloat(data.desconto) : 0,
        forma_pagamento: data.forma_pagamento || null,
        notas: petUsesReplacement(pet_id)
          ? `${data.notas || ""} [Reposição de falta justificada]`.trim()
          : data.notas || null,
      }));

      const { data: insertedRows, error } = await supabase.from("agendamentos").insert(rows as any).select("id, pet_id");
      if (error) throw error;

      // Mark replacement absences as used (apenas para o pet que escolheu)
      if (useRepl && insertedRows) {
        for (const row of insertedRows) {
          const chosenAbsenceId = replacementChoices[row.pet_id];
          if (chosenAbsenceId) {
            await supabase
              .from("agendamento_absences" as any)
              .update({
                reposicao_utilizada: true,
                reposicao_agendamento_id: row.id,
              })
              .eq("id", chosenAbsenceId);
          }
        }
      }

      // Generate GROUPED invoice: one fatura per pet with line items
      const valorNum = data.valor ? parseFloat(data.valor) : 0;
      const isPagamentoPosterior = data.forma_pagamento === "Pagamento Posterior";
      const vencimentoFatura = isPagamentoPosterior && data.data_pagamento
        ? data.data_pagamento
        : data.data_reserva;

      const extrasACobrar = servicosExtras.filter(e => !e.cortesia && e.valor > 0 && e.descricao);
      const descontoTotal = data.desconto ? parseFloat(data.desconto) : 0;

      // ===== UMA fatura consolidada por agendamento (cliente + vencimento) =====
      // Itens: serviço por pet + extras (uma vez) + cortesias (registro) + desconto
      const lineItems: { descricao: string; valor: number; tipo: string }[] = [];

      if (valorNum > 0) {
        for (const petId of data.pet_ids) {
          // Pets que estão usando reposição não geram cobrança
          if (petUsesReplacement(petId)) continue;
          const petName = pets.find(p => p.id === petId)?.nome || "Pet";
          lineItems.push({ descricao: `${data.tipo_servico} — ${petName}`, valor: valorNum, tipo: "principal" });
        }
      }

      // Extras cobrados apenas uma vez na fatura consolidada
      for (const extra of extrasACobrar) {
        const qtd = extra.quantidade || 1;
        lineItems.push({ descricao: `${extra.descricao} x${qtd} (extra)`, valor: extra.valor * qtd, tipo: "extra" });
      }
      for (const extra of servicosExtras.filter(e => e.cortesia && e.descricao)) {
        lineItems.push({ descricao: `${extra.descricao} (cortesia)`, valor: 0, tipo: "cortesia" });
      }

      const totalBruto = lineItems.reduce((sum, li) => sum + li.valor, 0);
      const totalFatura = Math.max(totalBruto - descontoTotal, 0);

      const podeCriarFatura = lineItems.some(li => li.tipo !== "cortesia") && totalFatura > 0;

      if (podeCriarFatura) {
        if (descontoTotal > 0) {
          lineItems.push({ descricao: `Desconto`, valor: -descontoTotal, tipo: "desconto" });
        }

        const petNames = data.pet_ids
          .map(pid => pets.find(p => p.id === pid)?.nome)
          .filter(Boolean)
          .join(", ");
        const descParts = [data.tipo_servico];
        if (data.pet_ids.length > 1) descParts.push(`(${data.pet_ids.length} pets)`);
        if (extrasACobrar.length > 0) descParts.push(`+${extrasACobrar.length} extra(s)`);
        if (descontoTotal > 0) descParts.push(`-R$${descontoTotal.toFixed(2)} desc.`);
        const descricaoFatura = `${descParts.join(" ")} — ${petNames}`;

        // Plano de contas é definido pelo TIPO DE SERVIÇO (DRE), nunca pela forma de pagamento
        const tipoSvcLower = (data.tipo_servico || "").toLowerCase();
        let planoContas = "Serviços Extras";
        if (tipoSvcLower.includes("banho") || tipoSvcLower.includes("tosa")) planoContas = "Banho e Tosa";
        else if (tipoSvcLower.includes("hosped") || tipoSvcLower.includes("diária") || tipoSvcLower.includes("diaria") || tipoSvcLower.includes("pernoite")) planoContas = "Hospedagem";
        else if (tipoSvcLower.includes("daycare") || tipoSvcLower.includes("creche") || tipoSvcLower.includes("day care")) planoContas = "Day Care";
        else if (tipoSvcLower.includes("adestr")) planoContas = "Adestramento";
        else if (tipoSvcLower.includes("consulta") || tipoSvcLower.includes("vacin") || tipoSvcLower.includes("veterin")) planoContas = "Consultas Veterinárias";
        else if (tipoSvcLower.includes("transporte") || tipoSvcLower.includes("taxi") || tipoSvcLower.includes("táxi")) planoContas = "Transporte Pet";

        const { data: insertedFatura } = await supabase.from("contas_receber").insert({
          empresa_id: empresaId,
          cliente_id: data.cliente_id,
          descricao: descricaoFatura,
          valor: totalFatura,
          vencimento: vencimentoFatura,
          categoria: planoContas,
          status: "pendente",
        } as any).select("id").single();

        if (insertedFatura?.id) {
          await supabase.from("contas_receber_itens" as any).insert(
            lineItems.map(li => ({
              conta_receber_id: insertedFatura.id,
              empresa_id: empresaId,
              descricao: li.descricao,
              valor: li.valor,
              tipo: li.tipo,
            }))
          );
        }
      }

      // Build extras summary for notes
      const extrasNotes = servicosExtras
        .filter(e => e.descricao)
        .map(e => `${e.descricao}${e.cortesia ? " (cortesia)" : ` R$${e.valor.toFixed(2)}`}`)
        .join("; ");

      // Append extras info to agendamento notes if any
      if (extrasNotes && insertedRows) {
        for (const row of insertedRows) {
          const currentNotes = rows.find(r => r.pet_id === row.pet_id)?.notas || "";
          const updatedNotes = currentNotes
            ? `${currentNotes} | Extras: ${extrasNotes}`
            : `Extras: ${extrasNotes}`;
          await supabase.from("agendamentos").update({ notas: updatedNotes } as any).eq("id", row.id);
        }
      }

      toast({
        title: useRepl
          ? `Reposição utilizada! ${data.pet_ids.length} agendamento(s) criado(s) sem cobrança.`
          : `${data.pet_ids.length} agendamento(s) criado(s) com sucesso!`,
      });

      // If user wants to generate contract, open contract dialog
      if (gerarContrato && insertedRows && insertedRows.length > 0) {
        const firstRow = insertedRows[0];
        const petObj = pets.find(p => p.id === firstRow.pet_id);
        const clienteObj = clientes.find(c => c.id === data.cliente_id);

        // Fetch templates
        const { data: tpls } = await supabase
          .from("contract_templates")
          .select("id, name, content")
          .eq("active", true);
        const allTemplates = (tpls || []) as { id: string; name: string; content: string }[];

        // Match template by service type keywords
        const svcLower = data.tipo_servico.toLowerCase();
        let matched = allTemplates.find(t => {
          const n = t.name.toLowerCase();
          if (svcLower.includes("hotel") || svcLower.includes("hospedagem") || svcLower.includes("diária") || svcLower.includes("diaria")) return n.includes("hotel") || n.includes("hospedagem");
          if (svcLower.includes("escola") || svcLower.includes("daycare") || svcLower.includes("creche")) return n.includes("escola") || n.includes("daycare") || n.includes("creche");
          if (svcLower.includes("banho") || svcLower.includes("tosa")) return n.includes("banho") || n.includes("tosa");
          return false;
        });
        if (!matched && allTemplates.length > 0) matched = allTemplates[0];

        // Fetch full client and pet data for placeholders
        const { data: fullCliente } = await supabase
          .from("clientes")
          .select("id, nome, cpf, endereco, email, whatsapp, telefone")
          .eq("id", data.cliente_id)
          .maybeSingle();
        const { data: fullPet } = await supabase
          .from("pets")
          .select("id, nome, raca, especie, peso, porte, sexo, cor, castrado, cliente_id")
          .eq("id", firstRow.pet_id)
          .maybeSingle();

        // Fetch pets from same owner that have reservations for same service on same date
        let petsMesmoTutor = "___";
        if (fullPet?.cliente_id) {
          const dayStart = new Date(data.data_reserva + "T00:00:00").toISOString();
          const dayEnd = new Date(data.data_reserva + "T23:59:59").toISOString();
          const { data: sameDateBookings } = await supabase
            .from("agendamentos")
            .select("pet:pets(nome)")
            .eq("cliente_id", fullPet.cliente_id)
            .eq("tipo_servico", data.tipo_servico)
            .gte("data_hora", dayStart)
            .lte("data_hora", dayEnd);
          if (sameDateBookings && sameDateBookings.length > 0) {
            const names = sameDateBookings.map((b: any) => b.pet?.nome).filter(Boolean);
            petsMesmoTutor = names.length > 0 ? names.join(", ") : fullPet?.nome || "___";
          } else {
            petsMesmoTutor = fullPet?.nome || "___";
          }
        }

        const dataAtual = format(new Date(), "dd/MM/yyyy");

        const fillTpl = (c: string) => {
          const horaEntradaContrato = data.hora_reserva || data.hora_entrada || "___";
          const horaSaidaContrato = data.hora_saida || data.hora_saida_provavel || "___";
          const dataEntradaContrato = data.data_reserva
            ? `${data.data_reserva}T${data.hora_reserva || data.hora_entrada || "00:00"}`
            : data.data_entrada || null;
          const dataSaidaContrato = data.data_saida || data.data_saida_provavel || null;

          const values = buildHospedagemContractValues({
            clienteNome: fullCliente?.nome || clienteObj?.nome,
            clienteCpf: fullCliente?.cpf,
            clienteEmail: fullCliente?.email,
            clienteEndereco: fullCliente?.endereco,
            clienteWhatsapp: fullCliente?.whatsapp || fullCliente?.telefone,
            petNome: fullPet?.nome || petObj?.nome,
            petRaca: fullPet?.raca,
            petEspecie: fullPet?.especie,
            petSexo: fullPet?.sexo,
            petCor: fullPet?.cor,
            petCastrado:
              typeof fullPet?.castrado === "boolean"
                ? fullPet.castrado
                : fullPet?.castrado === "true"
                  ? true
                  : fullPet?.castrado === "false"
                    ? false
                    : null,
            tipoServico: data.tipo_servico,
            valor: valorContrato > 0 ? valorContrato : null,
            dataEntrada: dataEntradaContrato,
            horaEntrada: horaEntradaContrato,
            dataSaida: dataSaidaContrato,
            horaSaida: horaSaidaContrato,
            baia: data.baia,
            petsMesmoTutor,
          });

          return replaceContractPlaceholders(c, {
            ...values,
            pet_peso: fullPet?.peso ? `${fullPet.peso}kg` : "___",
            pet_porte: fullPet?.porte || "___",
            plano: data.tipo_servico || "___",
            valor_servico: values.valor,
            valor_plano: values.valor,
            data_atual: dataAtual,
          });
        };

        const filledContent = matched ? fillTpl(matched.content) : "";
        const tplTitle = matched ? `${matched.name} — ${fullPet?.nome || petObj?.nome || "Pet"}` : "";

        setContratoDialog({
          open: true,
          agendamento: {
            id: firstRow.id,
            tipo_servico: data.tipo_servico,
            valor: data.valor ? parseFloat(data.valor) : null,
            empresa_id: empresaId,
            cliente_id: data.cliente_id,
            pet_id: firstRow.pet_id,
            pet: petObj ? { id: petObj.id, nome: petObj.nome } : null,
            cliente: clienteObj ? { id: clienteObj.id, nome: clienteObj.nome } : null,
          },
          templates: allTemplates,
          selectedTemplate: matched?.id || "",
          fillTemplate: fillTpl,
          content: filledContent,
          title: tplTitle,
          loading: false,
          createdLink: null,
        });
      }

      form.reset();
      setAvailableReplacements([]);
      setUseReplacement(false);
      setReplacementChoices({});
      setServicosExtras([]);
      setGerarContrato(false);
      setOpen(false);
      onSuccess?.();
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateContract() {
    if (!contratoDialog || !contratoDialog.title.trim() || !contratoDialog.content.trim()) {
      toast({ title: "Preencha o título e conteúdo", variant: "destructive" });
      return;
    }

    setContratoDialog(prev => prev ? { ...prev, loading: true } : null);

    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(contratoDialog.content));
    const contentHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      toast({ title: "Usuário não autenticado", variant: "destructive" });
      setContratoDialog(prev => prev ? { ...prev, loading: false } : null);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("empresa_id, id")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (profileError || !profile?.empresa_id) {
      console.error("Erro ao buscar perfil para contrato:", profileError, profile);
      toast({ title: "Erro ao identificar empresa", variant: "destructive" });
      setContratoDialog(prev => prev ? { ...prev, loading: false } : null);
      return;
    }

    const { data: contract, error } = await supabase.from("contracts").insert({
      empresa_id: profile.empresa_id,
      template_id: contratoDialog.selectedTemplate || null,
      cliente_id: contratoDialog.agendamento.cliente_id,
      title: contratoDialog.title.trim(),
      content: contratoDialog.content,
      content_hash: contentHash,
      status: "enviado",
      sent_at: new Date().toISOString(),
      created_by: profile.id,
      token_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    }).select("id, signing_token").single();

    if (error || !contract) {
      toast({ title: "Erro ao gerar contrato", variant: "destructive" });
      setContratoDialog(prev => prev ? { ...prev, loading: false } : null);
      return;
    }

    await supabase.from("contract_events").insert({
      contract_id: contract.id,
      empresa_id: profile.empresa_id,
      event_type: "criado",
      description: `Contrato gerado a partir do agendamento (${contratoDialog.agendamento.tipo_servico})`,
    });

    const link = await createContractShareLink((contract as any).signing_token, profile.empresa_id, window.location.origin);
    setContratoDialog(prev => prev ? { ...prev, loading: false, createdLink: link } : null);
    toast({ title: "Contrato gerado com sucesso!" });
  }

  return (
    <>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" strokeWidth={1.5} />
          Novo Agendamento
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Agendamento</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Cliente */}
            <FormField control={form.control} name="cliente_id" render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Cliente *</FormLabel>
                <Popover open={clientePopoverOpen} onOpenChange={setClientePopoverOpen}>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button variant="outline" role="combobox" className={cn("w-full justify-between h-10 font-normal", !field.value && "text-muted-foreground")}>
                        {field.value ? clientes.find(c => c.id === field.value)?.nome ?? "Selecione o cliente" : "Selecione o cliente"}
                        <CalendarIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Buscar por cliente ou pet..." />
                      <CommandList>
                        <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                        <CommandGroup>
                          {clientes.filter(c => {
                            return true; // cmdk handles filtering via its own search
                          }).map(c => {
                            const clientPets = pets.filter(p => p.cliente_id === c.id);
                            const petNames = clientPets.map(p => p.nome).join(", ");
                            const keywords = petNames ? [c.nome, petNames].join(" ") : c.nome;
                            return (
                              <CommandItem
                                key={c.id}
                                value={keywords}
                                onSelect={() => { field.onChange(c.id); setClientePopoverOpen(false); }}
                              >
                                <div className="flex flex-col">
                                  <span className={cn("text-sm", field.value === c.id && "font-semibold")}>{c.nome}</span>
                                  {petNames && <span className="text-xs text-muted-foreground">Pets: {petNames}</span>}
                                </div>
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )} />

            {/* Pets */}
            <FormField control={form.control} name="pet_ids" render={() => (
              <FormItem>
                <FormLabel>Pets *</FormLabel>
                {!selectedCliente ? (
                  <p className="text-sm text-muted-foreground">Selecione um cliente primeiro</p>
                ) : filteredPets.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum pet cadastrado para este cliente</p>
                ) : (
                  <div className="space-y-2 rounded-md border border-border p-3 max-h-40 overflow-y-auto">
                    {filteredPets.map(p => (
                      <label key={p.id} className="flex items-center gap-2 cursor-pointer text-sm">
                        <Checkbox checked={selectedPetIds.includes(p.id)} onCheckedChange={() => togglePet(p.id)} />
                        {p.nome}
                      </label>
                    ))}
                  </div>
                )}
                <FormMessage />
              </FormItem>
            )} />

            {/* Serviço */}
            <FormField control={form.control} name="tipo_servico" render={({ field }) => (
              <FormItem>
                <FormLabel>Serviço *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Tipo de serviço" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {servicos.length === 0 ? (
                      <SelectItem value="__empty" disabled>Nenhum serviço cadastrado</SelectItem>
                    ) : servicos.map(s => (
                      <SelectItem key={s.id} value={s.descricao}>
                        {s.descricao} — R$ {s.valor.toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            {/* Replacement banner — escolha qual reposição consumir por pet */}
            {availableReplacements.length > 0 && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <RotateCcw className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">
                    Reposição disponível para {selectedServico}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Existe(m) falta(s) justificada(s) para este serviço. Escolha qual deseja consumir
                  — o saldo do plano será reaberto e o pet não será cobrado neste agendamento.
                </p>

                {selectedPetIds.map((petId) => {
                  const pet = pets.find((p) => p.id === petId);
                  const opcoes = availableReplacements.filter(
                    (r: any) => r.agendamento?.pet_id === petId
                  );
                  if (opcoes.length === 0) return null;
                  const selecionado = replacementChoices[petId] || "";
                  return (
                    <div key={petId} className="space-y-1.5 rounded-md border bg-background p-2.5">
                      <Label className="text-xs font-medium">{pet?.nome ?? "Pet"}</Label>
                      <Select
                        value={selecionado}
                        onValueChange={(v) => {
                          setReplacementChoices((prev) => {
                            const next = { ...prev };
                            if (v === "__none__") delete next[petId];
                            else next[petId] = v;
                            return next;
                          });
                          // Habilita modo reposição se ao menos um pet está usando
                          setUseReplacement(true);
                          if (v !== "__none__") form.setValue("valor", form.getValues("valor") || "0");
                        }}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Não usar reposição (cobrar normalmente)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Não usar reposição (cobrar normalmente)</SelectItem>
                          {opcoes.map((r: any) => {
                            const dt = r.agendamento?.data_hora
                              ? format(new Date(r.agendamento.data_hora), "dd/MM/yyyy")
                              : "—";
                            return (
                              <SelectItem key={r.id} value={r.id}>
                                Falta de {dt} — {r.agendamento?.tipo_servico}
                                {r.notes ? ` · ${r.notes.slice(0, 30)}` : ""}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}

                {Object.keys(replacementChoices).length > 0 && (
                  <div className="text-xs text-primary font-medium">
                    {Object.keys(replacementChoices).length} pet(s) usarão reposição — sem cobrança para esses pets.
                  </div>
                )}
              </div>
            )}

            {/* Row 1: Reserva + Hora Reserva + Saída Prevista + Hr Saída Prevista */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <FormField control={form.control} name="data_reserva" render={({ field }) => (
                <FormItem>
                  <FormLabel>Reserva *</FormLabel>
                  <FormControl>
                    <DatePickerField value={field.value} onChange={field.onChange} placeholder="Data reserva" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="hora_reserva" render={({ field }) => (
                <FormItem>
                  <FormLabel>Hora Reserva *</FormLabel>
                  <FormControl><Input type="time" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="data_saida_provavel" render={({ field }) => (
                <FormItem>
                  <FormLabel>Data Saída Prevista</FormLabel>
                  <FormControl>
                    <DatePickerField value={field.value || ""} onChange={field.onChange} placeholder="Data saída prev." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="hora_saida_provavel" render={({ field }) => (
                <FormItem>
                  <FormLabel>Hr Saída Prevista</FormLabel>
                  <FormControl><Input type="time" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Disponibilidade de horários para banho avulso */}
            {isBanho && dataReserva && (
              <div className="space-y-1.5 rounded-md border border-border p-3 bg-muted/20">
                <FormLabel className="text-sm">Horários disponíveis para banho ({format(new Date(dataReserva + "T00:00:00"), "dd/MM/yyyy")})</FormLabel>
                <BanhoTimeSlotPicker
                  value={horaReserva}
                  onChange={(t) => form.setValue("hora_reserva", t, { shouldValidate: true })}
                  availabilityMap={banhoAvail.availabilityMap}
                  relevantDates={[dataReserva]}
                  loading={banhoAvail.loading}
                  conflictingDates={banhoConflicts}
                  suggestions={banhoSuggestions}
                />
              </div>
            )}

            {/* Row 2: Data Entrada + Hora Entrada + Data Saída + Hora Saída */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <FormField control={form.control} name="data_entrada" render={({ field }) => (
                <FormItem>
                  <FormLabel>Data da Entrada</FormLabel>
                  <FormControl>
                    <DatePickerField value={field.value || ""} onChange={field.onChange} placeholder="Entrada" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="hora_entrada" render={({ field }) => (
                <FormItem>
                  <FormLabel>Hora da Entrada</FormLabel>
                  <FormControl><Input type="time" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="data_saida" render={({ field }) => (
                <FormItem>
                  <FormLabel>Data da Saída</FormLabel>
                  <FormControl>
                    <DatePickerField value={field.value || ""} onChange={field.onChange} placeholder="Saída" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="hora_saida" render={({ field }) => (
                <FormItem>
                  <FormLabel>Hora da Saída</FormLabel>
                  <FormControl><Input type="time" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Row 3: Quarto + Diárias + Valor */}
            <div className={cn("grid gap-3 items-end", isHotel ? "grid-cols-2 sm:grid-cols-3" : isBanho ? "grid-cols-1 sm:grid-cols-1" : "grid-cols-2")}>
              {!isBanho && (
                <FormField control={form.control} name="baia" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quarto</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                      <SelectContent>{baias.map(b => <SelectItem key={b.id} value={b.nome}>{b.nome} ({b.capacidade_pets} pets)</SelectItem>)}</SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              )}

              {isHotel && (
                <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 h-10">
                  <BedDouble className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-sm font-medium text-foreground whitespace-nowrap">
                    {diarias > 0
                      ? `${diarias} diária${diarias > 1 ? "s" : ""}`
                      : "0 diárias"}
                  </span>
                  {diarias > 0 && servicoObj && (
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      ({diarias}×R${servicoObj.valor.toFixed(0)})
                    </span>
                  )}
                </div>
              )}

              <FormField control={form.control} name="valor" render={({ field }) => (
                <FormItem>
                  <FormLabel>{isBanho ? "Valor (R$)" : "Valor p/ Pet (R$)"}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      {...field}
                      readOnly={(isHotel && diarias > 0) || isBanho}
                      className={cn(((isHotel && diarias > 0) || isBanho) && "bg-muted")}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Serviços Extras */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <FormLabel className="text-sm font-medium">Serviços Extras</FormLabel>
                <Button type="button" variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={addServicoExtra}>
                  <Plus className="h-3.5 w-3.5" />
                  Adicionar Extra
                </Button>
              </div>

              {servicosExtras.length > 0 && (
                <div className="space-y-2 rounded-md border border-border p-3">
                  {servicosExtras.map((extra, idx) => (
                    <div key={idx} className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 items-center">
                      <Select
                        value={extra.servico_id}
                        onValueChange={(val) => updateServicoExtra(idx, "servico_id", val)}
                      >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="Selecione o serviço" />
                        </SelectTrigger>
                        <SelectContent>
                          {servicos.map(s => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.descricao} — R$ {s.valor.toFixed(2)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Input
                        type="number"
                        step="0.01"
                        value={extra.valor || ""}
                        onChange={(e) => updateServicoExtra(idx, "valor", parseFloat(e.target.value) || 0)}
                        placeholder="Valor"
                        className="w-24 h-9 text-sm"
                        disabled={extra.cortesia}
                      />

                      <Input
                        type="number"
                        min="1"
                        step="1"
                        value={extra.quantidade || 1}
                        onChange={(e) => updateServicoExtra(idx, "quantidade", Math.max(1, parseInt(e.target.value) || 1))}
                        placeholder="Qtd"
                        className="w-16 h-9 text-sm text-center"
                        title="Quantidade"
                      />

                      <Button
                        type="button"
                        variant={extra.cortesia ? "default" : "outline"}
                        size="sm"
                        className="h-9 gap-1 text-xs whitespace-nowrap"
                        onClick={() => updateServicoExtra(idx, "cortesia", !extra.cortesia)}
                        title={extra.cortesia ? "Cortesia ativa" : "Marcar como cortesia"}
                      >
                        {extra.cortesia ? (
                          <><Gift className="h-3.5 w-3.5" /> Cortesia</>
                        ) : (
                          <><DollarSign className="h-3.5 w-3.5" /> Cobrar</>
                        )}
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-destructive hover:text-destructive"
                        onClick={() => removeServicoExtra(idx)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}

                  {totalExtras > 0 && (
                    <div className="flex items-center justify-end pt-1 border-t border-border mt-2">
                      <Badge variant="secondary" className="text-xs">
                        Total extras: R$ {totalExtras.toFixed(2)}
                      </Badge>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Desconto + Valor Total / Valor Contrato lado a lado */}
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="desconto" render={({ field }) => (
                <FormItem>
                  <FormLabel>Desconto (R$)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" min="0" placeholder="0,00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormItem>
                <FormLabel>Valor Total (R$)</FormLabel>
                <Input
                  type="number"
                  value={valorContrato.toFixed(2)}
                  readOnly
                  className="bg-muted font-semibold"
                />
                <p className="text-xs text-muted-foreground">
                  {selectedPetIds.length > 1
                    ? `${selectedPetIds.length} pets × R$ ${((form.watch("valor") ? parseFloat(form.watch("valor")) : 0) + totalExtras).toFixed(2)}`
                    : `R$ ${(form.watch("valor") ? parseFloat(form.watch("valor")) : 0).toFixed(2)}`
                  }
                  {totalExtras > 0 && selectedPetIds.length <= 1 ? ` + R$ ${totalExtras.toFixed(2)} extras` : ""}
                  {descontoStr && parseFloat(descontoStr) > 0 ? ` - R$ ${parseFloat(descontoStr).toFixed(2)} desc.` : ""}
                </p>
              </FormItem>
            </div>

            {/* Resumo de cobrança (multi-pet) */}
            {selectedPetIds.length > 1 && (
              <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2 text-xs">
                <p className="text-sm font-medium text-foreground">Resumo da fatura consolidada</p>
                <p className="text-muted-foreground">
                  Será gerada <strong>1 fatura única</strong> para o cliente, contendo todos os itens abaixo.
                </p>
                <div className="space-y-1.5">
                  {/* Serviço por pet */}
                  <div>
                    <p className="text-foreground font-medium">Cobrado por pet:</p>
                    <ul className="ml-3 mt-0.5 space-y-0.5 text-muted-foreground">
                      {selectedPetIds.map(pid => {
                        const petName = pets.find(p => p.id === pid)?.nome || "Pet";
                        const v = form.watch("valor") ? parseFloat(form.watch("valor")) : 0;
                        return (
                          <li key={pid} className="flex justify-between">
                            <span>• {selectedServico || "Serviço"} — {petName}</span>
                            <span>R$ {v.toFixed(2)}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  {/* Extras (uma vez) */}
                  {servicosExtras.filter(e => e.descricao).length > 0 && (
                    <div>
                      <p className="text-foreground font-medium pt-1">Cobrado uma única vez (extras):</p>
                      <ul className="ml-3 mt-0.5 space-y-0.5 text-muted-foreground">
                        {servicosExtras.filter(e => e.descricao).map((e, i) => {
                          const qtd = e.quantidade || 1;
                          const total = e.cortesia ? 0 : e.valor * qtd;
                          return (
                            <li key={i} className="flex justify-between">
                              <span>• {e.descricao} x{qtd} {e.cortesia ? "(cortesia)" : ""}</span>
                              <span>{e.cortesia ? "Grátis" : `R$ ${total.toFixed(2)}`}</span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}

                  {descontoStr && parseFloat(descontoStr) > 0 && (
                    <div className="flex justify-between pt-1 text-muted-foreground">
                      <span>Desconto aplicado</span>
                      <span>- R$ {parseFloat(descontoStr).toFixed(2)}</span>
                    </div>
                  )}
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-border">
                  <span className="text-sm font-semibold text-foreground">Total da fatura</span>
                  <span className="text-sm font-bold text-primary">R$ {valorContrato.toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Forma de Pagamento + Data de Pagamento */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField control={form.control} name="forma_pagamento" render={({ field }) => (
                <FormItem>
                  <FormLabel>Forma de Pagamento</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {formasPagamento.map(fp => (
                        <SelectItem key={fp.id} value={fp.nome}>{fp.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="data_pagamento" render={({ field }) => (
                <FormItem>
                  <FormLabel>Data de Pagamento</FormLabel>
                  <FormControl>
                    <DatePickerField value={field.value || ""} onChange={field.onChange} placeholder="Data pagamento" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Deseja gerar contrato? */}
            <div className="rounded-lg border border-border p-3 space-y-2">
              <FormLabel className="text-sm font-medium flex items-center gap-2">
                <FileSignature className="h-4 w-4 text-primary" />
                Deseja gerar contrato?
              </FormLabel>
              <RadioGroup
                value={gerarContrato ? "sim" : "nao"}
                onValueChange={(v) => setGerarContrato(v === "sim")}
                className="flex gap-4"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="sim" id="contrato-sim" />
                  <Label htmlFor="contrato-sim" className="text-sm cursor-pointer">Sim</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="nao" id="contrato-nao" />
                  <Label htmlFor="contrato-nao" className="text-sm cursor-pointer">Não</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Observações */}
            <FormField control={form.control} name="notas" render={({ field }) => (
              <FormItem>
                <FormLabel>Observações</FormLabel>
                <FormControl><Textarea rows={2} placeholder="Notas do agendamento..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={loading}>{loading ? "Salvando..." : "Salvar"}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>

    {/* Contract generation dialog */}
    {contratoDialog && (
      <Dialog open={contratoDialog.open} onOpenChange={(v) => { if (!v) setContratoDialog(null); }}>
        <DialogContent className="max-w-6xl w-[95vw] h-[95vh] flex flex-col overflow-hidden p-0">
          <DialogHeader className="px-6 pt-6 shrink-0">
            <DialogTitle>Gerar Contrato</DialogTitle>
          </DialogHeader>

          {contratoDialog.createdLink ? (
            <div className="space-y-4 py-4 px-6 overflow-y-auto">
              <div className="text-center space-y-3">
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <FileSignature className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-semibold text-lg">Contrato gerado com sucesso!</h3>
                <p className="text-sm text-muted-foreground">Envie o link abaixo para o cliente assinar</p>
              </div>
              <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-3 border">
                <Input value={contratoDialog.createdLink} readOnly className="text-xs" />
                <Button variant="outline" size="icon" onClick={() => {
                  navigator.clipboard.writeText(contratoDialog.createdLink!);
                  toast({ title: "Link copiado!" });
                }}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" onClick={() => window.open(contratoDialog.createdLink!, "_blank")} className="gap-2">
                  <ExternalLink className="h-4 w-4" /> Visualizar
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col flex-1 min-h-0 px-6 pb-6 gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 shrink-0">
                <div>
                  <Label>Template</Label>
                  <Select
                    value={contratoDialog.selectedTemplate}
                    onValueChange={(val) => {
                      const tpl = contratoDialog.templates.find((t: any) => t.id === val);
                      if (tpl) {
                        setContratoDialog(prev => prev ? {
                          ...prev,
                          selectedTemplate: val,
                          content: typeof prev.fillTemplate === "function" ? prev.fillTemplate(tpl.content) : tpl.content,
                          title: `${tpl.name} — ${prev.agendamento.pet?.nome || "Pet"}`,
                        } : null);
                      }
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Selecione um template" /></SelectTrigger>
                    <SelectContent>
                      {contratoDialog.templates.map((t: any) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {contratoDialog.templates.length === 0 && (
                    <p className="text-xs text-destructive mt-1">Nenhum template encontrado. Crie um template em Contratos → Templates primeiro.</p>
                  )}
                </div>
                <div>
                  <Label>Título do contrato</Label>
                  <Input
                    value={contratoDialog.title}
                    onChange={e => setContratoDialog(prev => prev ? { ...prev, title: e.target.value } : null)}
                  />
                </div>
              </div>
              <div className="flex flex-col flex-1 min-h-0">
                <Label className="shrink-0">Pré-visualização do contrato</Label>
                <div
                  className="border rounded-md p-4 mt-1 flex-1 min-h-0 overflow-y-auto bg-white text-foreground prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: contratoDialog.content }}
                />
              </div>
              <div className="flex justify-end gap-2 shrink-0">
                <Button variant="outline" onClick={() => setContratoDialog(null)}>Cancelar</Button>
                <Button onClick={handleCreateContract} disabled={contratoDialog.loading || !contratoDialog.content.trim()}>
                  {contratoDialog.loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileSignature className="h-4 w-4 mr-2" />}
                  Gerar e Enviar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    )}
    </>
  );
}
