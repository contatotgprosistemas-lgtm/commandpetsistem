import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const schema = z.object({
  tipo_servico: z.string().min(1, "Selecione o serviço"),
  data_reserva: z.string().min(1, "Informe a data"),
  hora_reserva: z.string().regex(/^\d{2}:\d{2}$/, "Horário inválido"),
  data_saida_provavel: z.string().optional().or(z.literal("")),
  hora_saida_provavel: z.string().optional().or(z.literal("")),
  baia: z.string().optional().or(z.literal("")),
  desconto: z.string().optional().or(z.literal("")),
  valor: z.string().optional().or(z.literal("")),
  forma_pagamento: z.string().optional().or(z.literal("")),
  status: z.string().min(1),
  notas: z.string().trim().max(500).optional().or(z.literal("")),
});

type FormValues = z.infer<typeof schema>;

const baiaOptions = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];

function DatePickerField({ value, onChange, placeholder = "Selecione" }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const dateValue = value ? new Date(value + "T00:00:00") : undefined;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-10", !value && "text-muted-foreground")}>
          <CalendarIcon className="mr-2 h-4 w-4" />
          {dateValue ? format(dateValue, "dd/MM/yyyy") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={dateValue} onSelect={(d) => onChange(d ? format(d, "yyyy-MM-dd") : "")} initialFocus locale={ptBR} className={cn("p-3 pointer-events-auto")} />
      </PopoverContent>
    </Popover>
  );
}

interface Props {
  agendamento: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EditarAgendamentoDialog({ agendamento, open, onOpenChange, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [servicos, setServicos] = useState<{ id: string; descricao: string }[]>([]);

  const tipoServico = agendamento?.tipo_servico || "";
  const isHotel = useMemo(() => {
    const desc = tipoServico.toLowerCase();
    return desc.includes("hotel") || desc.includes("hospedagem");
  }, [tipoServico]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { tipo_servico: "", data_reserva: "", hora_reserva: "09:00", data_saida_provavel: "", hora_saida_provavel: "", baia: "", desconto: "", valor: "", forma_pagamento: "", status: "agendado", notas: "" },
  });

  useEffect(() => {
    if (open) {
      supabase.from("servicos").select("id, descricao").eq("ativo", true).order("descricao").then(({ data }) => { if (data) setServicos(data); });
    }
  }, [open]);

  useEffect(() => {
    if (agendamento) {
      const dh = new Date(agendamento.data_hora);
      const dsp = agendamento.data_saida_provavel ? new Date(agendamento.data_saida_provavel) : null;
      form.reset({
        tipo_servico: agendamento.tipo_servico || "",
        data_reserva: format(dh, "yyyy-MM-dd"),
        hora_reserva: format(dh, "HH:mm"),
        data_saida_provavel: dsp ? format(dsp, "yyyy-MM-dd") : "",
        hora_saida_provavel: agendamento.hora_saida_provavel || "",
        baia: agendamento.baia || "",
        desconto: agendamento.desconto != null ? String(agendamento.desconto) : "",
        valor: agendamento.valor != null ? String(agendamento.valor) : "",
        forma_pagamento: agendamento.forma_pagamento || "",
        status: agendamento.status || "agendado",
        notas: agendamento.notas || "",
      });
    }
  }, [agendamento, form]);

  async function onSubmit(data: FormValues) {
    if (!agendamento?.id) return;
    setLoading(true);
    try {
      const now = new Date();
      const dataHora = new Date(data.data_reserva + "T" + data.hora_reserva + ":00");
      const buildTs = (d: string, h: string) => d ? new Date(d + "T" + (h || "00:00") + ":00").toISOString() : null;

      const updatePayload: Record<string, any> = {
        tipo_servico: data.tipo_servico,
        data_hora: dataHora.toISOString(),
        data_saida_provavel: buildTs(data.data_saida_provavel || "", data.hora_saida_provavel || ""),
        hora_saida_provavel: data.hora_saida_provavel || null,
        baia: data.baia || null,
        valor: data.valor ? parseFloat(data.valor) : null,
        desconto: data.desconto ? parseFloat(data.desconto) : 0,
        forma_pagamento: data.forma_pagamento || null,
        status: data.status,
        notas: data.notas || null,
      };

      // Auto-register check-in timestamp when status changes to "na_empresa"
      if (data.status === "na_empresa" && agendamento.status !== "na_empresa") {
        if (!agendamento.data_entrada) {
          updatePayload.data_entrada = now.toISOString();
          updatePayload.hora_entrada = format(now, "HH:mm");
        }
      }

      // Auto-register check-out timestamp when status changes to "concluido"
      if (data.status === "concluido" && agendamento.status !== "concluido") {
        if (!agendamento.data_saida) {
          updatePayload.data_saida = now.toISOString();
          updatePayload.hora_saida = format(now, "HH:mm");
        }
      }

      const { error } = await supabase.from("agendamentos").update(updatePayload as any).eq("id", agendamento.id);

      if (error) throw error;
      toast({ title: "Agendamento atualizado!" });
      onSuccess?.();
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Agendamento</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="tipo_servico" render={({ field }) => (
              <FormItem>
                <FormLabel>Serviço *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {servicos.map(s => <SelectItem key={s.id} value={s.descricao}>{s.descricao}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="data_reserva" render={({ field }) => (
                <FormItem>
                  <FormLabel>Data Reserva *</FormLabel>
                  <DatePickerField value={field.value} onChange={field.onChange} placeholder="Data" />
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="hora_reserva" render={({ field }) => (
                <FormItem>
                  <FormLabel>Hora *</FormLabel>
                  <FormControl><Input type="time" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="data_saida_provavel" render={({ field }) => (
                <FormItem>
                  <FormLabel>Saída Prevista</FormLabel>
                  <DatePickerField value={field.value || ""} onChange={field.onChange} placeholder="Data saída" />
                </FormItem>
              )} />
              <FormField control={form.control} name="hora_saida_provavel" render={({ field }) => (
                <FormItem>
                  <FormLabel>Hora Saída</FormLabel>
                  <FormControl><Input type="time" {...field} /></FormControl>
                </FormItem>
              )} />
            </div>

            <div className={cn("grid gap-4", isHotel ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3")}>
              <FormField control={form.control} name="baia" render={({ field }) => (
                <FormItem>
                  <FormLabel>Baia</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {baiaOptions.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
              {isHotel && (
                <FormField control={form.control} name="desconto" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Desconto R$</FormLabel>
                    <FormControl><Input type="number" step="0.01" min="0" placeholder="0,00" {...field} /></FormControl>
                  </FormItem>
                )} />
              )}
              <FormField control={form.control} name="valor" render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor R$</FormLabel>
                  <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="forma_pagamento" render={({ field }) => (
                <FormItem>
                  <FormLabel>Pagamento</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                      <SelectItem value="PIX">PIX</SelectItem>
                      <SelectItem value="Cartão Crédito">Cartão Crédito</SelectItem>
                      <SelectItem value="Cartão Débito">Cartão Débito</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="status" render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="agendado">Agendado</SelectItem>
                    <SelectItem value="confirmado">Confirmado</SelectItem>
                    <SelectItem value="na_empresa">Na Empresa</SelectItem>
                    <SelectItem value="concluido">Concluído</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )} />

            <FormField control={form.control} name="notas" render={({ field }) => (
              <FormItem>
                <FormLabel>Observações</FormLabel>
                <FormControl><Textarea rows={2} {...field} /></FormControl>
              </FormItem>
            )} />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={loading}>{loading ? "Salvando..." : "Salvar"}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}