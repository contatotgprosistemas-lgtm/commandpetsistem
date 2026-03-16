import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const schema = z.object({
  cliente_id: z.string().uuid("Selecione um cliente"),
  pet_id: z.string().uuid("Selecione um pet"),
  tipo_servico: z.string().min(1, "Selecione o serviço"),
  data: z.date({ required_error: "Selecione a data" }),
  hora: z.string().regex(/^\d{2}:\d{2}$/, "Horário inválido"),
  duracao_min: z.string().optional(),
  valor: z.string().optional().or(z.literal("")),
  notas: z.string().trim().max(500).optional().or(z.literal("")),
});

type FormValues = z.infer<typeof schema>;

export function NovoAgendamentoDialog({ onSuccess }: { onSuccess?: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState<{ id: string; nome: string }[]>([]);
  const [pets, setPets] = useState<{ id: string; nome: string; cliente_id: string }[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { cliente_id: "", pet_id: "", tipo_servico: "", hora: "09:00", duracao_min: "60", valor: "", notas: "" },
  });

  const selectedCliente = form.watch("cliente_id");
  const filteredPets = pets.filter(p => p.cliente_id === selectedCliente);

  useEffect(() => {
    if (open) {
      supabase.from("clientes").select("id, nome").order("nome").then(({ data }) => {
        if (data) setClientes(data);
      });
      supabase.from("pets").select("id, nome, cliente_id").order("nome").then(({ data }) => {
        if (data) setPets(data);
      });
    }
  }, [open]);

  useEffect(() => {
    form.setValue("pet_id", "");
  }, [selectedCliente]);

  async function onSubmit(data: FormValues) {
    setLoading(true);
    try {
      const { data: profile } = await supabase.from("profiles").select("empresa_id").single();
      if (!profile?.empresa_id) {
        toast({ title: "Erro", description: "Empresa não encontrada.", variant: "destructive" });
        return;
      }

      const dataHora = new Date(data.data);
      const [h, m] = data.hora.split(":").map(Number);
      dataHora.setHours(h, m, 0, 0);

      const { error } = await supabase.from("agendamentos").insert({
        empresa_id: profile.empresa_id,
        cliente_id: data.cliente_id,
        pet_id: data.pet_id,
        tipo_servico: data.tipo_servico,
        data_hora: dataHora.toISOString(),
        duracao_min: data.duracao_min ? parseInt(data.duracao_min) : 60,
        valor: data.valor ? parseFloat(data.valor) : null,
        notas: data.notas || null,
      });

      if (error) throw error;
      toast({ title: "Agendamento criado com sucesso!" });
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
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Agendamento</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="cliente_id" render={({ field }) => (
              <FormItem>
                <FormLabel>Cliente *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {clientes.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="pet_id" render={({ field }) => (
              <FormItem>
                <FormLabel>Pet *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={!selectedCliente}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder={selectedCliente ? "Selecione o pet" : "Selecione um cliente primeiro"} /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {filteredPets.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="tipo_servico" render={({ field }) => (
              <FormItem>
                <FormLabel>Serviço *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Tipo de serviço" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Banho">Banho</SelectItem>
                    <SelectItem value="Tosa">Tosa</SelectItem>
                    <SelectItem value="Banho e Tosa">Banho e Tosa</SelectItem>
                    <SelectItem value="Daycare">Daycare</SelectItem>
                    <SelectItem value="Hospedagem">Hospedagem</SelectItem>
                    <SelectItem value="Consulta">Consulta</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="data" render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data *</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                          {field.value ? format(field.value, "dd/MM/yyyy") : "Selecione"}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="hora" render={({ field }) => (
                <FormItem>
                  <FormLabel>Horário *</FormLabel>
                  <FormControl><Input type="time" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="duracao_min" render={({ field }) => (
                <FormItem>
                  <FormLabel>Duração (min)</FormLabel>
                  <FormControl><Input type="number" placeholder="60" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="valor" render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor (R$)</FormLabel>
                  <FormControl><Input type="number" step="0.01" placeholder="0,00" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
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
