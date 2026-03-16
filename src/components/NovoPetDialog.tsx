import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const schema = z.object({
  nome: z.string().trim().min(1, "Nome é obrigatório").max(100),
  especie: z.string().min(1, "Espécie é obrigatória"),
  raca: z.string().trim().max(100).optional().or(z.literal("")),
  sexo: z.string().optional().or(z.literal("")),
  peso: z.string().optional().or(z.literal("")),
  idade: z.string().trim().max(50).optional().or(z.literal("")),
  cliente_id: z.string().uuid("Selecione um tutor"),
  vacinas: z.string().trim().max(500).optional().or(z.literal("")),
  restricoes_alimentares: z.string().trim().max(500).optional().or(z.literal("")),
  comportamento: z.string().trim().max(500).optional().or(z.literal("")),
  medicacoes: z.string().trim().max(500).optional().or(z.literal("")),
});

type FormValues = z.infer<typeof schema>;

export function NovoPetDialog({ onSuccess }: { onSuccess?: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState<{ id: string; nome: string }[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { nome: "", especie: "Cachorro", raca: "", sexo: "", peso: "", idade: "", cliente_id: "", vacinas: "", restricoes_alimentares: "", comportamento: "", medicacoes: "" },
  });

  useEffect(() => {
    if (open) {
      supabase.from("clientes").select("id, nome").order("nome").then(({ data }) => {
        if (data) setClientes(data);
      });
    }
  }, [open]);

  async function onSubmit(data: FormValues) {
    setLoading(true);
    try {
      const { data: profile } = await supabase.from("profiles").select("empresa_id").single();
      if (!profile?.empresa_id) {
        toast({ title: "Erro", description: "Empresa não encontrada.", variant: "destructive" });
        return;
      }

      const { error } = await supabase.from("pets").insert({
        empresa_id: profile.empresa_id,
        nome: data.nome,
        especie: data.especie,
        raca: data.raca || null,
        sexo: data.sexo || null,
        peso: data.peso ? parseFloat(data.peso) : null,
        idade: data.idade || null,
        cliente_id: data.cliente_id,
        vacinas: data.vacinas || null,
        restricoes_alimentares: data.restricoes_alimentares || null,
        comportamento: data.comportamento || null,
        medicacoes: data.medicacoes || null,
      });

      if (error) throw error;
      toast({ title: "Pet cadastrado com sucesso!" });
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
          Novo Pet
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Pet</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="nome" render={({ field }) => (
              <FormItem>
                <FormLabel>Nome do Pet *</FormLabel>
                <FormControl><Input placeholder="Ex: Rex" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="cliente_id" render={({ field }) => (
              <FormItem>
                <FormLabel>Tutor *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Selecione o tutor" /></SelectTrigger>
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
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="especie" render={({ field }) => (
                <FormItem>
                  <FormLabel>Espécie *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Cachorro">Cachorro</SelectItem>
                      <SelectItem value="Gato">Gato</SelectItem>
                      <SelectItem value="Ave">Ave</SelectItem>
                      <SelectItem value="Outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="raca" render={({ field }) => (
                <FormItem>
                  <FormLabel>Raça</FormLabel>
                  <FormControl><Input placeholder="Ex: Golden Retriever" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <FormField control={form.control} name="sexo" render={({ field }) => (
                <FormItem>
                  <FormLabel>Sexo</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Macho">Macho</SelectItem>
                      <SelectItem value="Fêmea">Fêmea</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="peso" render={({ field }) => (
                <FormItem>
                  <FormLabel>Peso (kg)</FormLabel>
                  <FormControl><Input type="number" step="0.1" placeholder="0.0" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="idade" render={({ field }) => (
                <FormItem>
                  <FormLabel>Idade</FormLabel>
                  <FormControl><Input placeholder="Ex: 3 anos" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="vacinas" render={({ field }) => (
              <FormItem>
                <FormLabel>Vacinas</FormLabel>
                <FormControl><Textarea rows={2} placeholder="Vacinas aplicadas..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="comportamento" render={({ field }) => (
              <FormItem>
                <FormLabel>Comportamento</FormLabel>
                <FormControl><Input placeholder="Dócil, agitado..." {...field} /></FormControl>
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
