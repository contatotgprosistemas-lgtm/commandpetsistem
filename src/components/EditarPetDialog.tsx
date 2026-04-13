import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, differenceInYears, differenceInMonths } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, PawPrint } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

function calcularIdade(nascimento: Date): string {
  const anos = differenceInYears(new Date(), nascimento);
  if (anos >= 1) return `${anos} ano${anos > 1 ? "s" : ""}`;
  const meses = differenceInMonths(new Date(), nascimento);
  return `${meses} ${meses === 1 ? "mês" : "meses"}`;
}

const schema = z.object({
  nome: z.string().trim().min(1, "Nome é obrigatório").max(100),
  especie: z.string().min(1),
  raca: z.string().trim().max(100).optional().or(z.literal("")),
  cor: z.string().trim().max(100).optional().or(z.literal("")),
  porte: z.string().optional().or(z.literal("")),
  castrado: z.string().optional().or(z.literal("")),
  sexo: z.string().optional().or(z.literal("")),
  peso: z.string().optional().or(z.literal("")),
  data_nascimento: z.date().optional(),
  pelagem: z.string().optional().or(z.literal("")),
  comportamento: z.string().optional().or(z.literal("")),
  restricoes_alimentares: z.string().trim().max(500).optional().or(z.literal("")),
  medicacoes: z.string().trim().max(500).optional().or(z.literal("")),
  antiparasitario_data: z.date().optional(),
  v10_data: z.date().optional(),
  raiva_data: z.date().optional(),
  gripe_data: z.date().optional(),
  giardia_data: z.date().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  pet: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EditarPetDialog({ pet, open, onOpenChange, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { nome: "", especie: "Cachorro", raca: "", cor: "", porte: "", castrado: "", sexo: "", peso: "", pelagem: "", comportamento: "", restricoes_alimentares: "", medicacoes: "" },
  });

  const dataNascimento = form.watch("data_nascimento");
  const idadeCalculada = dataNascimento ? calcularIdade(dataNascimento) : "";

  useEffect(() => {
    if (pet) {
      form.reset({
        nome: pet.nome || "",
        especie: pet.especie || "Cachorro",
        raca: pet.raca || "",
        cor: pet.cor || "",
        porte: pet.porte || "",
        castrado: pet.castrado || "",
        sexo: pet.sexo || "",
        peso: pet.peso != null ? String(pet.peso) : "",
        data_nascimento: pet.data_nascimento ? new Date(pet.data_nascimento + "T00:00:00") : undefined,
        pelagem: pet.pelagem || "",
        comportamento: pet.comportamento || "",
        restricoes_alimentares: pet.restricoes_alimentares || "",
        medicacoes: pet.medicacoes || "",
        antiparasitario_data: pet.antiparasitario_data ? new Date(pet.antiparasitario_data + "T00:00:00") : undefined,
        v10_data: pet.v10_data ? new Date(pet.v10_data + "T00:00:00") : undefined,
        raiva_data: pet.raiva_data ? new Date(pet.raiva_data + "T00:00:00") : undefined,
        gripe_data: pet.gripe_data ? new Date(pet.gripe_data + "T00:00:00") : undefined,
        giardia_data: (pet as any).giardia_data ? new Date((pet as any).giardia_data + "T00:00:00") : undefined,
      });
    }
  }, [pet, form]);

  async function onSubmit(data: FormValues) {
    if (!pet?.id) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("pets").update({
        nome: data.nome,
        especie: data.especie,
        raca: data.raca || null,
        cor: data.cor || null,
        porte: data.porte || null,
        castrado: data.castrado || null,
        sexo: data.sexo || null,
        peso: data.peso ? parseFloat(data.peso) : null,
        data_nascimento: data.data_nascimento ? format(data.data_nascimento, "yyyy-MM-dd") : null,
        idade: idadeCalculada || null,
        pelagem: data.pelagem || null,
        comportamento: data.comportamento || null,
        restricoes_alimentares: data.restricoes_alimentares || null,
        medicacoes: data.medicacoes || null,
        antiparasitario_data: data.antiparasitario_data ? format(data.antiparasitario_data, "yyyy-MM-dd") : null,
        v10_data: data.v10_data ? format(data.v10_data, "yyyy-MM-dd") : null,
        raiva_data: data.raiva_data ? format(data.raiva_data, "yyyy-MM-dd") : null,
        gripe_data: data.gripe_data ? format(data.gripe_data, "yyyy-MM-dd") : null,
        giardia_data: data.giardia_data ? format(data.giardia_data, "yyyy-MM-dd") : null,
      }).eq("id", pet.id);

      if (error) throw error;
      toast({ title: "Pet atualizado com sucesso!" });
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
          <DialogTitle>Editar Pet</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="dados" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="dados" className="flex-1 gap-1.5">
              <PawPrint className="h-3.5 w-3.5" /> Dados
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dados">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="nome" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Pet *</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="especie" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Espécie *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="Cachorro">Cachorro</SelectItem>
                          <SelectItem value="Gato">Gato</SelectItem>
                          <SelectItem value="Ave">Ave</SelectItem>
                          <SelectItem value="Outro">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="raca" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Raça</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                    </FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="cor" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cor</FormLabel>
                      <FormControl><Input placeholder="Ex: Caramelo" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="porte" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Porte</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="Micro">Micro</SelectItem>
                          <SelectItem value="Pequeno">Pequeno</SelectItem>
                          <SelectItem value="Médio">Médio</SelectItem>
                          <SelectItem value="Grande">Grande</SelectItem>
                          <SelectItem value="Gigante">Gigante</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <FormField control={form.control} name="sexo" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sexo</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="Macho">Macho</SelectItem>
                          <SelectItem value="Fêmea">Fêmea</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="castrado" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Castrado</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="Sim">Sim</SelectItem>
                          <SelectItem value="Não">Não</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="peso" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Peso (kg)</FormLabel>
                      <FormControl><Input type="number" step="0.1" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="pelagem" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pelagem</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="Curta">Curta</SelectItem>
                          <SelectItem value="Média">Média</SelectItem>
                          <SelectItem value="Longa">Longa</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="data_nascimento" render={({ field }) => {
                    const [dateText, setDateText] = React.useState(field.value ? format(field.value, "dd/MM/yyyy") : "");
                    React.useEffect(() => {
                      setDateText(field.value ? format(field.value, "dd/MM/yyyy") : "");
                    }, [field.value]);
                    const handleDateInput = (e: React.ChangeEvent<HTMLInputElement>) => {
                      let v = e.target.value.replace(/\D/g, "").slice(0, 8);
                      if (v.length >= 5) v = v.slice(0, 2) + "/" + v.slice(2, 4) + "/" + v.slice(4);
                      else if (v.length >= 3) v = v.slice(0, 2) + "/" + v.slice(2);
                      setDateText(v);
                      const m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
                      if (m) {
                        const d = new Date(parseInt(m[3]), parseInt(m[2]) - 1, parseInt(m[1]));
                        if (!isNaN(d.getTime()) && d <= new Date()) field.onChange(d);
                      }
                    };
                    return (
                      <FormItem className="flex flex-col">
                        <FormLabel>Data de Nascimento</FormLabel>
                        <Popover>
                          <div className="relative">
                            <FormControl>
                              <Input
                                value={dateText}
                                onChange={handleDateInput}
                                placeholder="DD/MM/AAAA"
                                className="pr-10"
                              />
                            </FormControl>
                            <PopoverTrigger asChild>
                              <Button variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-2 hover:bg-transparent">
                                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </PopoverTrigger>
                          </div>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={field.value} onSelect={(d) => { field.onChange(d); if (d) setDateText(format(d, "dd/MM/yyyy")); }} disabled={(date) => date > new Date()} initialFocus className={cn("p-3 pointer-events-auto")} />
                          </PopoverContent>
                        </Popover>
                      </FormItem>
                    );
                  }} />
                  <FormItem className="flex flex-col">
                    <FormLabel>Idade</FormLabel>
                    <Input value={idadeCalculada} readOnly placeholder="Calculada automaticamente" className="bg-muted" />
                  </FormItem>
                </div>

                <div className="space-y-3">
                  <FormLabel>Vacinas</FormLabel>
                  {([
                    { dataName: "antiparasitario_data" as const, label: "Antiparasitário" },
                    { dataName: "v10_data" as const, label: "V10" },
                    { dataName: "raiva_data" as const, label: "Raiva" },
                    { dataName: "gripe_data" as const, label: "Gripe" },
                    { dataName: "giardia_data" as const, label: "Giárdia" },
                  ]).map((vacina) => (
                    <div key={vacina.dataName} className="grid grid-cols-2 gap-3 items-center">
                      <span className="text-sm font-medium text-foreground">{vacina.label}</span>
                      <FormField control={form.control} name={vacina.dataName} render={({ field }) => (
                        <FormItem>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                  {field.value ? format(field.value, "dd/MM/yyyy") : <span>Data aplicação</span>}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date()} initialFocus className={cn("p-3 pointer-events-auto")} />
                            </PopoverContent>
                          </Popover>
                        </FormItem>
                      )} />
                    </div>
                  ))}
                </div>

                <FormField control={form.control} name="comportamento" render={({ field }) => {
                  const selected = field.value ? field.value.split(", ").filter(Boolean) : [];
                  const toggle = (opt: string) => {
                    const next = selected.includes(opt) ? selected.filter(s => s !== opt) : [...selected, opt];
                    field.onChange(next.join(", "));
                  };
                  return (
                    <FormItem>
                      <FormLabel>Comportamento</FormLabel>
                      <div className="flex flex-wrap gap-2">
                        {["Dócil", "Agitado", "Ativo", "Adestrado", "Individual", "Inseguro"].map(opt => (
                          <Button key={opt} type="button" size="sm" variant={selected.includes(opt) ? "default" : "outline"} onClick={() => toggle(opt)}>
                            {opt}
                          </Button>
                        ))}
                      </div>
                    </FormItem>
                  );
                }} />

                <FormField control={form.control} name="restricoes_alimentares" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Restrições alimentares</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                  </FormItem>
                )} />

                <FormField control={form.control} name="medicacoes" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Medicações</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                  </FormItem>
                )} />

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                  <Button type="submit" disabled={loading}>{loading ? "Salvando..." : "Salvar"}</Button>
                </div>
              </form>
            </Form>
          </TabsContent>

        </Tabs>
      </DialogContent>
    </Dialog>
  );
}