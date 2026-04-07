import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, CalendarIcon, BedDouble, RotateCcw } from "lucide-react";
import { format, differenceInCalendarDays } from "date-fns";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
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

const baiaOptions = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];

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

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      cliente_id: "", pet_ids: [], tipo_servico: "",
      data_reserva: "", hora_reserva: "09:00",
      data_entrada: "", hora_entrada: "",
      data_saida_provavel: "", hora_saida_provavel: "18:00",
      data_saida: "", hora_saida: "",
      baia: "", valor: "", forma_pagamento: "", data_pagamento: "", notas: "",
    },
  });

  const selectedCliente = form.watch("cliente_id");
  const selectedPetIds = form.watch("pet_ids");
  const selectedServico = form.watch("tipo_servico");
  const dataReserva = form.watch("data_reserva");
  const dataSaidaProvavel = form.watch("data_saida_provavel");
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

  // Auto-calculate valor for hotel
  useEffect(() => {
    if (isHotel && diarias > 0 && servicoObj) {
      const total = (diarias * servicoObj.valor).toFixed(2);
      form.setValue("valor", total);
    }
  }, [isHotel, diarias, servicoObj]);

  useEffect(() => {
    if (open) {
      supabase.from("clientes").select("id, nome").order("nome").then(({ data }) => { if (data) setClientes(data); });
      supabase.from("pets").select("id, nome, cliente_id").order("nome").then(({ data }) => { if (data) setPets(data); });
      supabase.from("servicos").select("id, descricao, valor, tipo").eq("ativo", true).order("descricao").then(({ data }) => { if (data) setServicos(data as ServicoItem[]); });
    }
  }, [open]);

  useEffect(() => { form.setValue("pet_ids", []); }, [selectedCliente]);

  function togglePet(petId: string) {
    const current = form.getValues("pet_ids");
    const updated = current.includes(petId) ? current.filter(id => id !== petId) : [...current, petId];
    form.setValue("pet_ids", updated, { shouldValidate: true });
  }

  async function onSubmit(data: FormValues) {
    setLoading(true);
    try {
      const { data: profile } = await supabase.from("profiles").select("empresa_id").single();
      if (!profile?.empresa_id) {
        toast({ title: "Erro", description: "Empresa não encontrada.", variant: "destructive" });
        return;
      }

      const dataHora = new Date(data.data_reserva + "T" + data.hora_reserva + ":00");

      const buildTs = (d: string, h: string) => {
        if (!d) return null;
        return new Date(d + "T" + (h || "00:00") + ":00").toISOString();
      };

      const rows = data.pet_ids.map(pet_id => ({
        empresa_id: profile.empresa_id,
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
        valor: data.valor ? parseFloat(data.valor) : null,
        forma_pagamento: data.forma_pagamento || null,
        notas: data.notas || null,
      }));

      const { error } = await supabase.from("agendamentos").insert(rows as any);
      if (error) throw error;

      // Gerar fatura em contas_receber para cada pet
      const valorNum = data.valor ? parseFloat(data.valor) : 0;
      if (valorNum > 0) {
        const petNames = data.pet_ids.map(pid => {
          const pet = pets.find(p => p.id === pid);
          return pet?.nome || "Pet";
        });
        const faturas = data.pet_ids.map((_, idx) => ({
          empresa_id: profile.empresa_id,
          cliente_id: data.cliente_id,
          descricao: `${data.tipo_servico} — ${petNames[idx]}`,
          valor: valorNum / data.pet_ids.length,
          vencimento: data.data_reserva,
          categoria: data.forma_pagamento || "A definir",
          status: "pendente",
        }));
        await supabase.from("contas_receber").insert(faturas as any);
      }
      if (error) throw error;
      toast({ title: `${data.pet_ids.length} agendamento(s) criado(s) com sucesso!` });
      form.reset();
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

            {/* Row 3: Baia + Diárias + Valor */}
            <div className={cn("grid gap-3 items-end", isHotel ? "grid-cols-3 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-3")}>
              <FormField control={form.control} name="baia" render={({ field }) => (
                <FormItem>
                  <FormLabel>Baia</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                    <SelectContent>{baiaOptions.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
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
                <FormItem className={cn(!isHotel && "sm:col-span-2")}>
                  <FormLabel>Valor (R$)</FormLabel>
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
            </div>

            {/* Forma de Pagamento + Data de Pagamento */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField control={form.control} name="forma_pagamento" render={({ field }) => (
                <FormItem>
                  <FormLabel>Forma de Pagamento</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                      <SelectItem value="PIX">PIX</SelectItem>
                      <SelectItem value="Cartão de Crédito">Cartão de Crédito</SelectItem>
                      <SelectItem value="Cartão de Débito">Cartão de Débito</SelectItem>
                      <SelectItem value="Boleto">Boleto</SelectItem>
                      <SelectItem value="Transferência">Transferência</SelectItem>
                      <SelectItem value="A definir">A definir</SelectItem>
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
