import { useState } from "react";
import { useParams } from "react-router-dom";
import { z } from "zod";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { PawPrint, Plus, Trash2, CheckCircle2, Building2, CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const petSchema = z.object({
  nome: z.string().trim().min(1, "Nome do pet é obrigatório").max(100),
  especie: z.string().min(1),
  raca: z.string().trim().max(100).optional().or(z.literal("")),
  sexo: z.string().optional().or(z.literal("")),
  peso: z.string().optional().or(z.literal("")),
  idade: z.string().trim().max(50).optional().or(z.literal("")),
  comportamento: z.string().trim().max(500).optional().or(z.literal("")),
  restricoes_alimentares: z.string().trim().max(500).optional().or(z.literal("")),
  vacinas: z.string().trim().max(500).optional().or(z.literal("")),
  medicacoes: z.string().trim().max(500).optional().or(z.literal("")),
});

const schema = z.object({
  nome: z.string().trim().min(2, "Nome é obrigatório").max(100),
  data_nascimento: z.date().optional(),
  whatsapp: z.string().trim().max(20).optional().or(z.literal("")),
  email: z.string().trim().email("Email inválido").max(255).optional().or(z.literal("")),
  cpf: z.string().trim().max(14).optional().or(z.literal("")),
  endereco: z.string().trim().max(500).optional().or(z.literal("")),
  como_conheceu: z.string().optional().or(z.literal("")),
  pets: z.array(petSchema),
});

type FormValues = z.infer<typeof schema>;

export default function CadastroPublicoPage() {
  const { empresaId } = useParams<{ empresaId: string }>();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nome: "", whatsapp: "", email: "", cpf: "", endereco: "", como_conheceu: "",
      pets: [{ nome: "", especie: "Cachorro", raca: "", sexo: "", peso: "", idade: "", comportamento: "", restricoes_alimentares: "", vacinas: "", medicacoes: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "pets" });

  async function onSubmit(data: FormValues) {
    if (!empresaId) return;
    setLoading(true);

    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/cadastro-publico`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            empresa_id: empresaId,
            cliente: {
              nome: data.nome,
              telefone: data.telefone || null,
              whatsapp: data.whatsapp || null,
              email: data.email || null,
              cpf: data.cpf || null,
              endereco: data.endereco || null,
            },
            pets: data.pets.filter(p => p.nome.trim().length > 0),
          }),
        }
      );

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Erro ao enviar cadastro");

      setSubmitted(true);
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar cadastro");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-card rounded-lg shadow-card p-8 max-w-md w-full text-center space-y-4">
          <CheckCircle2 className="h-16 w-16 text-success mx-auto" />
          <h1 className="text-xl font-semibold text-foreground">Cadastro enviado!</h1>
          <p className="text-sm text-muted-foreground">
            Seus dados e dos seus pets foram cadastrados com sucesso. Obrigado!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">Cadastro de Cliente e Pet</h1>
          <p className="text-sm text-muted-foreground">Preencha seus dados e dos seus pets abaixo</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Client Info */}
            <div className="bg-card rounded-lg shadow-card p-5 space-y-4">
              <h2 className="text-sm font-medium text-foreground">Seus Dados</h2>

              <FormField control={form.control} name="nome" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome completo *</FormLabel>
                  <FormControl><Input placeholder="Seu nome completo" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="telefone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl><Input placeholder="(00) 0000-0000" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="whatsapp" render={({ field }) => (
                  <FormItem>
                    <FormLabel>WhatsApp</FormLabel>
                    <FormControl><Input placeholder="(00) 00000-0000" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl><Input type="email" placeholder="seu@email.com" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="cpf" render={({ field }) => (
                  <FormItem>
                    <FormLabel>CPF</FormLabel>
                    <FormControl><Input placeholder="000.000.000-00" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="endereco" render={({ field }) => (
                <FormItem>
                  <FormLabel>Endereço</FormLabel>
                  <FormControl><Input placeholder="Rua, número, bairro, cidade" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Pets */}
            <div className="bg-card rounded-lg shadow-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium text-foreground">Seus Pets</h2>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => append({ nome: "", especie: "Cachorro", raca: "", sexo: "", peso: "", idade: "", comportamento: "", restricoes_alimentares: "", vacinas: "", medicacoes: "" })}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Adicionar pet
                </Button>
              </div>

              {fields.map((field, idx) => (
                <div key={field.id} className="border border-border rounded-md p-4 space-y-3 relative">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <PawPrint className="h-4 w-4 text-primary" strokeWidth={1.5} />
                      <span className="text-sm font-medium text-foreground">Pet {idx + 1}</span>
                    </div>
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => remove(idx)}
                        className="h-7 w-7 rounded hover:bg-destructive/10 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                      </button>
                    )}
                  </div>

                  <FormField control={form.control} name={`pets.${idx}.nome`} render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do pet *</FormLabel>
                      <FormControl><Input placeholder="Ex: Rex" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <FormField control={form.control} name={`pets.${idx}.especie`} render={({ field }) => (
                      <FormItem>
                        <FormLabel>Espécie</FormLabel>
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
                    <FormField control={form.control} name={`pets.${idx}.raca`} render={({ field }) => (
                      <FormItem>
                        <FormLabel>Raça</FormLabel>
                        <FormControl><Input placeholder="Ex: Golden" {...field} /></FormControl>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name={`pets.${idx}.sexo`} render={({ field }) => (
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
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <FormField control={form.control} name={`pets.${idx}.peso`} render={({ field }) => (
                      <FormItem>
                        <FormLabel>Peso (kg)</FormLabel>
                        <FormControl><Input type="number" step="0.1" placeholder="0.0" {...field} /></FormControl>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name={`pets.${idx}.idade`} render={({ field }) => (
                      <FormItem>
                        <FormLabel>Idade</FormLabel>
                        <FormControl><Input placeholder="Ex: 3 anos" {...field} /></FormControl>
                      </FormItem>
                    )} />
                  </div>

                  <FormField control={form.control} name={`pets.${idx}.comportamento`} render={({ field }) => (
                    <FormItem>
                      <FormLabel>Comportamento</FormLabel>
                      <FormControl><Input placeholder="Dócil, agitado, tímido..." {...field} /></FormControl>
                    </FormItem>
                  )} />

                  <FormField control={form.control} name={`pets.${idx}.restricoes_alimentares`} render={({ field }) => (
                    <FormItem>
                      <FormLabel>Restrições alimentares</FormLabel>
                      <FormControl><Input placeholder="Alergias, dietas especiais..." {...field} /></FormControl>
                    </FormItem>
                  )} />

                  <FormField control={form.control} name={`pets.${idx}.vacinas`} render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vacinas</FormLabel>
                      <FormControl><Textarea rows={2} placeholder="Vacinas aplicadas..." {...field} /></FormControl>
                    </FormItem>
                  )} />

                  <FormField control={form.control} name={`pets.${idx}.medicacoes`} render={({ field }) => (
                    <FormItem>
                      <FormLabel>Medicações</FormLabel>
                      <FormControl><Input placeholder="Medicações em uso..." {...field} /></FormControl>
                    </FormItem>
                  )} />
                </div>
              ))}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Enviando..." : "Enviar cadastro"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
