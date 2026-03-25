import { useState } from "react";
import { useParams } from "react-router-dom";
import { z } from "zod";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, differenceInYears, differenceInMonths, parse } from "date-fns";
import { PawPrint, Plus, Trash2, CheckCircle2, Building2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

function calcularIdade(nascimento: string): string {
  if (!nascimento) return "";
  const date = new Date(nascimento + "T00:00:00");
  if (isNaN(date.getTime())) return "";
  const anos = differenceInYears(new Date(), date);
  if (anos >= 1) return `${anos} ano${anos > 1 ? "s" : ""}`;
  const meses = differenceInMonths(new Date(), date);
  return `${meses} ${meses === 1 ? "mês" : "meses"}`;
}

const petSchema = z.object({
  nome: z.string().trim().min(1, "Nome do pet é obrigatório").max(100),
  especie: z.string().min(1),
  raca: z.string().trim().max(100).optional().or(z.literal("")),
  sexo: z.string().optional().or(z.literal("")),
  peso: z.string().optional().or(z.literal("")),
  data_nascimento: z.string().optional().or(z.literal("")),
  pelagem: z.string().optional().or(z.literal("")),
  comportamento: z.string().optional().or(z.literal("")),
  restricoes_alimentares: z.string().trim().max(500).optional().or(z.literal("")),
  medicacoes: z.string().trim().max(500).optional().or(z.literal("")),
  antiparasitario: z.string().optional().or(z.literal("")),
  antiparasitario_data: z.string().optional().or(z.literal("")),
  v10: z.string().optional().or(z.literal("")),
  v10_data: z.string().optional().or(z.literal("")),
  raiva: z.string().optional().or(z.literal("")),
  raiva_data: z.string().optional().or(z.literal("")),
});

const schema = z.object({
  nome: z.string().trim().min(2, "Nome é obrigatório").max(100),
  data_nascimento: z.string().optional().or(z.literal("")),
  whatsapp: z.string().trim().max(20).optional().or(z.literal("")),
  email: z.string().trim().email("Email inválido").max(255).optional().or(z.literal("")),
  cpf: z.string().trim().min(1, "CPF é obrigatório").max(14),
  cep: z.string().trim().max(10).optional().or(z.literal("")),
  endereco: z.string().trim().max(500).optional().or(z.literal("")),
  numero: z.string().trim().max(20).optional().or(z.literal("")),
  como_conheceu: z.string().optional().or(z.literal("")),
  pets: z.array(petSchema),
});

type FormValues = z.infer<typeof schema>;

function PetVacinasFields({ control, idx }: { control: any; idx: number }) {
  const vacinas = [
    { dataName: `pets.${idx}.antiparasitario_data` as const, label: "Antiparasitário" },
    { dataName: `pets.${idx}.v10_data` as const, label: "V10" },
    { dataName: `pets.${idx}.raiva_data` as const, label: "Raiva" },
  ];
  return (
    <div className="space-y-2">
      <FormLabel>Vacinas</FormLabel>
      {vacinas.map((v) => (
        <div key={v.dataName} className="grid grid-cols-2 gap-2 items-center">
          <span className="text-sm font-medium text-foreground">{v.label}</span>
          <FormField control={control} name={v.dataName} render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input type="date" placeholder="dd/mm/aaaa" {...field} />
              </FormControl>
            </FormItem>
          )} />
        </div>
      ))}
    </div>
  );
}

const defaultPet = {
  nome: "", especie: "Cachorro", raca: "", sexo: "", peso: "", pelagem: "",
  comportamento: "", restricoes_alimentares: "", medicacoes: "",
  antiparasitario: "", v10: "", raiva: "",
};

export default function CadastroPublicoPage() {
  const { empresaId } = useParams<{ empresaId: string }>();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);

  async function buscarCep(cep: string) {
    const clean = cep.replace(/\D/g, "");
    if (clean.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const data = await res.json();
      if (!data.erro) {
        form.setValue("endereco", `${data.logradouro}, ${data.bairro}, ${data.localidade} - ${data.uf}`);
      } else {
        form.setValue("endereco", "");
        toast.error("CEP não encontrado. Preencha o endereço manualmente.");
      }
    } catch {
      toast.error("Erro ao buscar CEP. Preencha o endereço manualmente.");
    } finally {
      setCepLoading(false);
    }
  }

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nome: "", whatsapp: "", email: "", cpf: "", cep: "", endereco: "", numero: "", como_conheceu: "",
      pets: [{ ...defaultPet }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "pets" });

  async function onSubmit(data: FormValues) {
    if (!empresaId) return;
    setLoading(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const pets = data.pets.filter(p => p.nome.trim().length > 0).map(p => ({
        ...p,
        data_nascimento: p.data_nascimento || null,
        idade: p.data_nascimento ? calcularIdade(p.data_nascimento) : null,
        antiparasitario_data: p.antiparasitario_data || null,
        v10_data: p.v10_data || null,
        raiva_data: p.raiva_data || null,
        vacinas: [p.antiparasitario, p.v10, p.raiva].filter(Boolean).join(", ") || null,
      }));

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/cadastro-publico`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            empresa_id: empresaId,
            cliente: {
              nome: data.nome,
              data_nascimento: data.data_nascimento || null,
              whatsapp: data.whatsapp || null,
              email: data.email || null,
              cpf: data.cpf || null,
              endereco: data.numero ? `${data.endereco}, ${data.numero}` : (data.endereco || null),
              como_conheceu: data.como_conheceu || null,
            },
            pets,
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
          <p className="text-sm text-muted-foreground">Seus dados e dos seus pets foram cadastrados com sucesso. Obrigado!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
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
                <FormField control={form.control} name="data_nascimento" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Nascimento</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
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
                    <FormLabel>CPF *</FormLabel>
                    <FormControl><Input placeholder="000.000.000-00" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <FormField control={form.control} name="cep" render={({ field }) => (
                  <FormItem>
                    <FormLabel>CEP</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          placeholder="00000-000"
                          {...field}
                          onBlur={(e) => {
                            field.onBlur();
                            buscarCep(e.target.value);
                          }}
                        />
                        {cepLoading && <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="endereco" render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Endereço</FormLabel>
                    <FormControl><Input placeholder="Rua, bairro, cidade" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="numero" render={({ field }) => (
                <FormItem>
                  <FormLabel>Número</FormLabel>
                  <FormControl><Input placeholder="Nº da casa/apto" className="w-32" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="como_conheceu" render={({ field }) => (
                <FormItem>
                  <FormLabel>Como nos conheceu?</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="Redes Sociais">Redes Sociais</SelectItem>
                      <SelectItem value="Indicação">Indicação</SelectItem>
                      <SelectItem value="Google">Google</SelectItem>
                      <SelectItem value="Passou na frente">Passou na frente</SelectItem>
                      <SelectItem value="Outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Pets */}
            <div className="bg-card rounded-lg shadow-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium text-foreground">Seus Pets</h2>
                <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => append({ ...defaultPet })}>
                  <Plus className="h-3.5 w-3.5" /> Adicionar pet
                </Button>
              </div>

              {fields.map((field, idx) => (
                <PetFormCard key={field.id} control={form.control} idx={idx} canRemove={fields.length > 1} onRemove={() => remove(idx)} watch={form.watch} />
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

function PetFormCard({ control, idx, canRemove, onRemove, watch }: { control: any; idx: number; canRemove: boolean; onRemove: () => void; watch: any }) {
  const dataNascimento = watch(`pets.${idx}.data_nascimento`);
  const idadeCalculada = dataNascimento ? calcularIdade(dataNascimento) : "";

  return (
    <div className="border border-border rounded-md p-4 space-y-3 relative">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PawPrint className="h-4 w-4 text-primary" strokeWidth={1.5} />
          <span className="text-sm font-medium text-foreground">Pet {idx + 1}</span>
        </div>
        {canRemove && (
          <button type="button" onClick={onRemove} className="h-7 w-7 rounded hover:bg-destructive/10 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors">
            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
        )}
      </div>

      <FormField control={control} name={`pets.${idx}.nome`} render={({ field }) => (
        <FormItem>
          <FormLabel>Nome do pet *</FormLabel>
          <FormControl><Input placeholder="Ex: Rex" {...field} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <FormField control={control} name={`pets.${idx}.especie`} render={({ field }) => (
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
        <FormField control={control} name={`pets.${idx}.raca`} render={({ field }) => (
          <FormItem>
            <FormLabel>Raça</FormLabel>
            <FormControl><Input placeholder="Ex: Golden" {...field} /></FormControl>
          </FormItem>
        )} />
        <FormField control={control} name={`pets.${idx}.sexo`} render={({ field }) => (
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

      <div className="grid grid-cols-3 gap-3">
        <FormField control={control} name={`pets.${idx}.peso`} render={({ field }) => (
          <FormItem>
            <FormLabel>Peso (kg)</FormLabel>
            <FormControl><Input type="number" step="0.1" placeholder="0.0" {...field} /></FormControl>
          </FormItem>
        )} />
        <FormField control={control} name={`pets.${idx}.pelagem`} render={({ field }) => (
          <FormItem>
            <FormLabel>Pelagem</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger></FormControl>
              <SelectContent>
                <SelectItem value="Curto">Curto</SelectItem>
                <SelectItem value="Médio">Médio</SelectItem>
                <SelectItem value="Longo">Longo</SelectItem>
              </SelectContent>
            </Select>
          </FormItem>
        )} />
        <FormField control={control} name={`pets.${idx}.comportamento`} render={({ field }) => (
          <FormItem>
            <FormLabel>Comportamento</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger></FormControl>
              <SelectContent>
                <SelectItem value="Dócil">Dócil</SelectItem>
                <SelectItem value="Agitado">Agitado</SelectItem>
                <SelectItem value="Ativo">Ativo</SelectItem>
                <SelectItem value="Adestrado">Adestrado</SelectItem>
                <SelectItem value="Individual">Individual</SelectItem>
              </SelectContent>
            </Select>
          </FormItem>
        )} />
      </div>

      {/* Data nascimento + idade */}
      <div className="grid grid-cols-2 gap-3">
        <FormField control={control} name={`pets.${idx}.data_nascimento`} render={({ field }) => (
          <FormItem>
            <FormLabel>Data de Nascimento</FormLabel>
            <FormControl>
              <Input type="date" {...field} />
            </FormControl>
          </FormItem>
        )} />
        <FormItem className="flex flex-col">
          <FormLabel>Idade</FormLabel>
          <Input value={idadeCalculada} readOnly placeholder="Automática" className="bg-muted" />
        </FormItem>
      </div>

      <PetVacinasFields control={control} idx={idx} />

      <FormField control={control} name={`pets.${idx}.restricoes_alimentares`} render={({ field }) => (
        <FormItem>
          <FormLabel>Restrições alimentares</FormLabel>
          <FormControl><Input placeholder="Alergias, dietas especiais..." {...field} /></FormControl>
        </FormItem>
      )} />
      <FormField control={control} name={`pets.${idx}.medicacoes`} render={({ field }) => (
        <FormItem>
          <FormLabel>Medicações</FormLabel>
          <FormControl><Input placeholder="Medicações em uso..." {...field} /></FormControl>
        </FormItem>
      )} />
    </div>
  );
}
