import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, CalendarIcon, BedDouble, RotateCcw, Gift, DollarSign, Trash2 } from "lucide-react";
import { format, differenceInCalendarDays } from "date-fns";

import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

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
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [servicosExtras, setServicosExtras] = useState<ServicoExtra[]>([]);
  const [baias, setBaias] = useState<{ id: string; nome: string; capacidade_pets: number }[]>([]);

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
        .select("id, pet_id, tipo_servico, pet:pets(nome), cliente:clientes(nome)")
        .in("id", absenceAgendamentoIds);

      if (!agendamentos) return;

      const matching = absences.filter((abs: any) => {
        const ag = agendamentos.find((a: any) => a.id === abs.agendamento_id);
        if (!ag) return false;
        return selectedPetIds.includes(ag.pet_id);
      }).map((abs: any) => {
        const ag = agendamentos.find((a: any) => a.id === abs.agendamento_id);
        return { ...abs, agendamento: ag };
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
    setServicosExtras(prev => [...prev, { servico_id: "", descricao: "", valor: 0, cortesia: false }]);
  }

  function updateServicoExtra(index: number, field: keyof ServicoExtra, value: any) {
    setServicosExtras(prev => {
      const updated = [...prev];
      if (field === "servico_id") {
        const svc = servicos.find(s => s.id === value);
        if (svc) {
          updated[index] = { ...updated[index], servico_id: value, descricao: svc.descricao, valor: svc.valor };
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
      .reduce((sum, e) => sum + e.valor, 0);
  }, [servicosExtras]);

  // Valor contrato = (valor unitário + extras) * qtd pets - desconto
  const valorContrato = useMemo(() => {
    const valorUnit = form.getValues("valor") ? parseFloat(form.getValues("valor")) : 0;
    const qtdPets = selectedPetIds.length || 1;
    const bruto = (valorUnit + totalExtras) * qtdPets;
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

      const finalValor = useRepl ? 0 : (data.valor ? parseFloat(data.valor) : null);

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
        valor: finalValor,
        desconto: data.desconto ? parseFloat(data.desconto) : 0,
        forma_pagamento: data.forma_pagamento || null,
        notas: useRepl
          ? `${data.notas || ""} [Reposição de falta justificada]`.trim()
          : data.notas || null,
      }));

      const { data: insertedRows, error } = await supabase.from("agendamentos").insert(rows as any).select("id, pet_id");
      if (error) throw error;

      // Mark replacement absences as used
      if (useRepl && insertedRows) {
        for (const row of insertedRows) {
          const matchingAbsence = availableReplacements.find(
            (abs: any) => abs.agendamento?.pet_id === row.pet_id
          );
          if (matchingAbsence) {
            await supabase
              .from("agendamento_absences" as any)
              .update({
                reposicao_utilizada: true,
                reposicao_agendamento_id: row.id,
              })
              .eq("id", matchingAbsence.id);
          }
        }
      }

      // Generate GROUPED invoice: one fatura per pet with line items
      const valorNum = useRepl ? 0 : (data.valor ? parseFloat(data.valor) : 0);
      const isPagamentoPosterior = data.forma_pagamento === "Pagamento Posterior";
      const vencimentoFatura = isPagamentoPosterior && data.data_pagamento
        ? data.data_pagamento
        : data.data_reserva;

      const extrasACobrar = servicosExtras.filter(e => !e.cortesia && e.valor > 0 && e.descricao);

      for (let idx = 0; idx < data.pet_ids.length; idx++) {
        const petName = pets.find(p => p.id === data.pet_ids[idx])?.nome || "Pet";

        // Build line items for this pet
        const lineItems: { descricao: string; valor: number; tipo: string }[] = [];
        if (valorNum > 0) {
          lineItems.push({ descricao: `${data.tipo_servico} — ${petName}`, valor: valorNum, tipo: "principal" });
        }
        for (const extra of extrasACobrar) {
          lineItems.push({ descricao: `${extra.descricao} (extra) — ${petName}`, valor: extra.valor, tipo: "extra" });
        }
        // Add cortesia items with valor 0
        for (const extra of servicosExtras.filter(e => e.cortesia && e.descricao)) {
          lineItems.push({ descricao: `${extra.descricao} (cortesia) — ${petName}`, valor: 0, tipo: "cortesia" });
        }

        if (lineItems.length === 0) continue;

        const totalFatura = lineItems.reduce((sum, li) => sum + li.valor, 0);
        if (totalFatura <= 0 && lineItems.every(li => li.tipo === "cortesia")) continue;

        const descParts = [data.tipo_servico];
        if (extrasACobrar.length > 0) descParts.push(`+${extrasACobrar.length} extra(s)`);
        const descricaoFatura = `${descParts.join(" ")} — ${petName}`;

        const { data: insertedFatura } = await supabase.from("contas_receber").insert({
          empresa_id: empresaId,
          cliente_id: data.cliente_id,
          descricao: descricaoFatura,
          valor: totalFatura,
          vencimento: vencimentoFatura,
          categoria: data.forma_pagamento || "A definir",
          status: "pendente",
        } as any).select("id").single();

        if (insertedFatura?.id && lineItems.length > 0) {
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
      form.reset();
      setAvailableReplacements([]);
      setUseReplacement(false);
      setServicosExtras([]);
      setOpen(false);
      onSuccess?.();
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
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
              <FormItem>
                <FormLabel>Cliente *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger></FormControl>
                  <SelectContent>{clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                </Select>
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

            {/* Replacement banner */}
            {availableReplacements.length > 0 && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <RotateCcw className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">
                    Reposição disponível! ({availableReplacements.length} falta{availableReplacements.length > 1 ? "s" : ""} justificada{availableReplacements.length > 1 ? "s" : ""})
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {availableReplacements.map((r: any) => (
                    <p key={r.id}>{r.agendamento?.pet?.nome} — {r.agendamento?.tipo_servico}</p>
                  ))}
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={useReplacement} onCheckedChange={(v) => {
                    setUseReplacement(!!v);
                    if (v) form.setValue("valor", "0");
                  }} />
                  <span className="text-sm font-medium">Usar reposição (valor zerado, sem fatura)</span>
                </label>
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

            {/* Row 3: Quarto + Diárias + Valor + Valor Contrato */}
            <div className={cn("grid gap-3 items-end", isHotel ? "grid-cols-2 sm:grid-cols-4" : selectedPetIds.length > 1 ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2 sm:grid-cols-3")}>
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
                  <FormLabel>Valor p/ Pet (R$)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      {...field}
                      readOnly={isHotel && diarias > 0}
                      className={cn(isHotel && diarias > 0 && "bg-muted")}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {selectedPetIds.length > 1 && (
                <FormItem>
                  <FormLabel>Valor Contrato (R$)</FormLabel>
                  <Input
                    type="number"
                    step="0.01"
                    value={valorContrato.toFixed(2)}
                    readOnly
                    className="bg-muted font-semibold"
                  />
                  <p className="text-xs text-muted-foreground">
                    {selectedPetIds.length} pets × R$ {((form.watch("valor") ? parseFloat(form.watch("valor")) : 0) + totalExtras).toFixed(2)}
                    {descontoStr && parseFloat(descontoStr) > 0 ? ` - R$ ${parseFloat(descontoStr).toFixed(2)} desc.` : ""}
                  </p>
                </FormItem>
              )}
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
                    <div key={idx} className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center">
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

            {/* Desconto - abaixo dos extras */}
            <FormField control={form.control} name="desconto" render={({ field }) => (
              <FormItem>
                <FormLabel>Desconto (R$)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" min="0" placeholder="0,00" {...field} />
                </FormControl>
                {selectedPetIds.length > 1 && (
                  <p className="text-xs text-muted-foreground">
                    O desconto será abatido do valor total do contrato
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )} />

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
  );
}
