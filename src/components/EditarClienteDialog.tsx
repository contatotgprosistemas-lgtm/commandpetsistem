import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { PawPrint, Loader2, DollarSign, Pencil, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { EditarContaReceberDialog } from "@/components/EditarContaReceberDialog";
import { ClienteTimelineTab } from "@/components/ClienteTimelineTab";

const schema = z.object({
  nome: z.string().trim().min(2, "Nome deve ter pelo menos 2 caracteres").max(100),
  cpf: z.string().trim().max(14).optional().or(z.literal("")),
  data_nascimento: z.string().optional().or(z.literal("")),
  whatsapp: z.string().trim().max(20).optional().or(z.literal("")),
  email: z.string().trim().email("Email inválido").max(255).optional().or(z.literal("")),
  cep: z.string().trim().max(10).optional().or(z.literal("")),
  endereco: z.string().trim().max(300).optional().or(z.literal("")),
  numero: z.string().trim().max(20).optional().or(z.literal("")),
  como_conheceu: z.string().optional().or(z.literal("")),
  notas: z.string().trim().max(1000).optional().or(z.literal("")),
});

type FormValues = z.infer<typeof schema>;

interface EditarClienteDialogProps {
  cliente: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface HistoricoServico {
  id: string;
  tipo_servico: string;
  valor: number | null;
  data_servico: string;
  notas: string | null;
}

interface Fatura {
  id: string;
  descricao: string;
  valor: number;
  vencimento: string;
  categoria: string | null;
  status: string;
  cliente_id: string | null;
  banco: string | null;
}

export function EditarClienteDialog({ cliente, open, onOpenChange, onSuccess }: EditarClienteDialogProps) {
  const [loading, setLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [historico, setHistorico] = useState<HistoricoServico[]>([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  const [faturas, setFaturas] = useState<Fatura[]>([]);
  const [loadingFaturas, setLoadingFaturas] = useState(false);
  const [editFatura, setEditFatura] = useState<Fatura | null>(null);
  const [diaVencimento, setDiaVencimento] = useState(10);
  const [diasGerarFatura, setDiasGerarFatura] = useState(5);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { nome: "", cpf: "", data_nascimento: "", whatsapp: "", email: "", cep: "", endereco: "", numero: "", como_conheceu: "", notas: "" },
  });

  useEffect(() => {
    if (cliente) {
      form.reset({
        nome: cliente.nome || "",
        cpf: cliente.cpf || "",
        data_nascimento: cliente.data_nascimento || "",
        whatsapp: cliente.whatsapp || "",
        email: cliente.email || "",
        cep: cliente.cep || "",
        endereco: cliente.endereco || "",
        numero: "",
        como_conheceu: cliente.como_conheceu || "",
        notas: cliente.notas || "",
      });
      setDiaVencimento(cliente.dia_vencimento_fatura ?? 10);
      setDiasGerarFatura(cliente.dias_gerar_fatura ?? 5);
      fetchHistorico(cliente.id);
      fetchFaturas(cliente.id);
    }
  }, [cliente, form]);

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
        toast({ title: "CEP não encontrado", description: "Preencha o endereço manualmente.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erro ao buscar CEP", description: "Preencha manualmente.", variant: "destructive" });
    } finally {
      setCepLoading(false);
    }
  }

  async function fetchHistorico(clienteId: string) {
    setLoadingHistorico(true);
    const { data } = await supabase
      .from("historico_servicos" as any)
      .select("id, tipo_servico, valor, data_servico, notas")
      .eq("cliente_id", clienteId)
      .order("data_servico", { ascending: false });
    setHistorico((data as any) ?? []);
    setLoadingHistorico(false);
  }

  async function fetchFaturas(clienteId: string) {
    setLoadingFaturas(true);
    const { data } = await supabase
      .from("contas_receber")
      .select("id, descricao, valor, vencimento, categoria, status, cliente_id, banco")
      .eq("cliente_id", clienteId)
      .order("vencimento", { ascending: false });
    setFaturas((data as any) ?? []);
    setLoadingFaturas(false);
  }

  async function onSubmit(data: FormValues) {
    if (!cliente?.id) return;
    setLoading(true);
    try {
      let enderecoFinal = data.endereco || null;
      if (data.numero && enderecoFinal) {
        enderecoFinal = `${enderecoFinal}, ${data.numero}`;
      }

      const { error } = await supabase.from("clientes").update({
        nome: data.nome,
        cpf: data.cpf || null,
        data_nascimento: data.data_nascimento || null,
        whatsapp: data.whatsapp || null,
        email: data.email || null,
        cep: data.cep || null,
        endereco: enderecoFinal,
        como_conheceu: data.como_conheceu || null,
        notas: data.notas || null,
        dia_vencimento_fatura: diaVencimento,
        dias_gerar_fatura: diasGerarFatura,
      } as any).eq("id", cliente.id);

      if (error) throw error;
      toast({ title: "Contato atualizado com sucesso!" });
      onSuccess?.();
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Contato</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="dados" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="dados" className="flex-1">Dados</TabsTrigger>
            <TabsTrigger value="timeline" className="flex-1">Timeline</TabsTrigger>
            <TabsTrigger value="faturas" className="flex-1">Faturas</TabsTrigger>
          </TabsList>
          <TabsContent value="dados">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="nome" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome *</FormLabel>
                    <FormControl><Input placeholder="Nome completo" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="cpf" render={({ field }) => (
                    <FormItem>
                      <FormLabel>CPF</FormLabel>
                      <FormControl><Input placeholder="000.000.000-00" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="data_nascimento" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de Nascimento</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="whatsapp" render={({ field }) => (
                    <FormItem>
                      <FormLabel>WhatsApp</FormLabel>
                      <FormControl><Input placeholder="(11) 99999-9999" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl><Input type="email" placeholder="email@exemplo.com" {...field} /></FormControl>
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
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      </FormControl>
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
                <FormField control={form.control} name="notas" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl><Textarea placeholder="Notas internas..." rows={3} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Venc. Fatura (dia do mês)</label>
                    <Input
                      type="number"
                      min={1}
                      max={28}
                      value={diaVencimento}
                      onChange={e => setDiaVencimento(Number(e.target.value))}
                      placeholder="10"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Gerar Fatura (dias antes)</label>
                    <Input
                      type="number"
                      min={0}
                      max={30}
                      value={diasGerarFatura}
                      onChange={e => setDiasGerarFatura(Number(e.target.value))}
                      placeholder="5"
                    />
                    <p className="text-xs text-muted-foreground">Quantos dias antes do vencimento gera automático a fatura</p>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                  <Button type="submit" disabled={loading}>{loading ? "Salvando..." : "Salvar"}</Button>
                </div>
              </form>
            </Form>
          </TabsContent>
          <TabsContent value="historico">
            {loadingHistorico ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Carregando histórico...</div>
            ) : historico.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <PawPrint className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">Nenhum serviço registrado</p>
              </div>
            ) : (
              <div className="divide-y divide-border mt-2">
                {historico.map(h => (
                  <div key={h.id} className="py-3 px-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">{h.tipo_servico}</span>
                      <span className="text-xs text-muted-foreground">{format(new Date(h.data_servico), "dd/MM/yyyy HH:mm")}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      {h.valor != null && <span className="text-sm text-primary font-medium">R$ {Number(h.valor).toFixed(2)}</span>}
                      {h.notas && <span className="text-xs text-muted-foreground">{h.notas}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
          <TabsContent value="faturas">
            {loadingFaturas ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Carregando faturas...</div>
            ) : faturas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <DollarSign className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">Nenhuma fatura encontrada</p>
              </div>
            ) : (
              <div className="mt-2 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {faturas.map(f => (
                      <TableRow key={f.id}>
                        <TableCell>
                          <p className="text-sm font-medium">{f.descricao}</p>
                          {f.categoria && <p className="text-xs text-muted-foreground">{f.categoria}</p>}
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(f.vencimento + "T00:00:00"), "dd/MM/yyyy")}
                        </TableCell>
                        <TableCell className="text-sm text-right tabular-nums font-medium">
                          R$ {Number(f.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>
                          {f.status === "pago" ? (
                            <Badge className="bg-emerald-500/15 text-emerald-600 border-0 text-xs">Pago</Badge>
                          ) : (
                            (() => {
                              const vencDate = new Date(f.vencimento + "T00:00:00");
                              const today = new Date();
                              today.setHours(0, 0, 0, 0);
                              return vencDate < today
                                ? <Badge variant="destructive" className="text-xs">Vencida</Badge>
                                : <Badge className="bg-amber-500/15 text-amber-600 border-0 text-xs">Pendente</Badge>;
                            })()
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setEditFatura(f)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <EditarContaReceberDialog
          open={!!editFatura}
          onOpenChange={(o) => { if (!o) setEditFatura(null); }}
          onSuccess={() => { setEditFatura(null); if (cliente) fetchFaturas(cliente.id); }}
          conta={editFatura}
        />
      </DialogContent>
    </Dialog>
  );
}
