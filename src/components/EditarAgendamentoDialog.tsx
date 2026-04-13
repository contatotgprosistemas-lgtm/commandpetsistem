import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, FileSignature, Copy, ExternalLink, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { addToEsteiraIfApplicable, removeFromEsteira } from "@/lib/esteira";

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
  const [baias, setBaias] = useState<{ id: string; nome: string }[]>([]);
  const [baiasLoaded, setBaiasLoaded] = useState(false);
  const [gerarContrato, setGerarContrato] = useState(false);
  const [contratoDialog, setContratoDialog] = useState<{
    open: boolean;
    agendamento: any;
    templates: any[];
    selectedTemplate: string;
    content: string;
    title: string;
    loading: boolean;
    createdLink: string | null;
  } | null>(null);

  const tipoServico = agendamento?.tipo_servico || "";
  const isHotel = useMemo(() => {
    const desc = tipoServico.toLowerCase();
    return desc.includes("hotel") || desc.includes("hospedagem");
  }, [tipoServico]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { tipo_servico: "", data_reserva: "", hora_reserva: "09:00", data_saida_provavel: "", hora_saida_provavel: "", baia: "", desconto: "", valor: "", forma_pagamento: "", status: "agendado", notas: "" },
  });

  // Load baias and servicos when dialog opens
  useEffect(() => {
    if (open) {
      setBaiasLoaded(false);
      supabase.from("servicos").select("id, descricao").eq("ativo", true).order("descricao").then(({ data }) => { if (data) setServicos(data); });
      supabase.from("baias").select("id, nome").eq("ativa", true).order("nome").then(({ data }) => {
        if (data) setBaias(data);
        setBaiasLoaded(true);
      });
    } else {
      setGerarContrato(false);
    }
  }, [open]);

  // Reset form when agendamento changes AND baias are loaded
  useEffect(() => {
    if (agendamento && baiasLoaded) {
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
  }, [agendamento, baiasLoaded, form]);

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

      if (data.status === "na_empresa" && agendamento.status !== "na_empresa") {
        if (!agendamento.data_entrada) {
          updatePayload.data_entrada = now.toISOString();
          updatePayload.hora_entrada = format(now, "HH:mm");
        }
      }

      if (data.status === "concluido" && agendamento.status !== "concluido") {
        if (!agendamento.data_saida) {
          updatePayload.data_saida = now.toISOString();
          updatePayload.hora_saida = format(now, "HH:mm");
        }
      }

      const { error } = await supabase.from("agendamentos").update(updatePayload as any).eq("id", agendamento.id);
      if (error) throw error;

      if (data.status === "na_empresa" && agendamento.status !== "na_empresa") {
        await addToEsteiraIfApplicable({
          empresaId: agendamento.empresa_id,
          agendamentoId: agendamento.id,
          tipoServico: data.tipo_servico || agendamento.tipo_servico,
        });
      }

      if ((data.status === "concluido" || data.status === "cancelado") && agendamento.status !== data.status) {
        await removeFromEsteira(agendamento.id);
      }

      toast({ title: "Agendamento atualizado!" });

      // If user wants contract, open contract dialog
      if (gerarContrato) {
        const { data: tpls } = await supabase
          .from("contract_templates")
          .select("id, name, content")
          .eq("active", true);
        const allTemplates = (tpls || []) as { id: string; name: string; content: string }[];

        // Fetch full client and pet data for placeholders
        const { data: fullCliente } = await supabase
          .from("clientes")
          .select("id, nome, cpf, endereco, email, whatsapp, telefone")
          .eq("id", agendamento.cliente_id)
          .maybeSingle();
        const { data: fullPet } = await supabase
          .from("pets")
          .select("id, nome, raca, especie, peso, porte, data_nascimento")
          .eq("id", agendamento.pet_id)
          .maybeSingle();

        const svcLower = (data.tipo_servico || agendamento.tipo_servico).toLowerCase();
        let matched = allTemplates.find(t => {
          const n = t.name.toLowerCase();
          if (svcLower.includes("hotel") || svcLower.includes("hospedagem") || svcLower.includes("diária") || svcLower.includes("diaria")) return n.includes("hotel") || n.includes("hospedagem");
          if (svcLower.includes("escola") || svcLower.includes("daycare") || svcLower.includes("creche")) return n.includes("escola") || n.includes("daycare") || n.includes("creche");
          if (svcLower.includes("banho") || svcLower.includes("tosa")) return n.includes("banho") || n.includes("tosa");
          return false;
        });
        if (!matched && allTemplates.length > 0) matched = allTemplates[0];

        const petName = fullPet?.nome || agendamento.pet?.nome || "";
        const clienteName = fullCliente?.nome || agendamento.cliente?.nome || "";
        const valor = data.valor ? `R$ ${parseFloat(data.valor).toFixed(2)}` : "___";
        const dataReserva = format(new Date(data.data_reserva + "T00:00:00"), "dd/MM/yyyy");

        const fillTpl = (c: string) => c
          .replace(/\{\{cliente_nome\}\}/g, clienteName)
          .replace(/\{\{cliente_cpf\}\}/g, fullCliente?.cpf || "___")
          .replace(/\{\{cliente_endereco\}\}/g, fullCliente?.endereco || "___")
          .replace(/\{\{cliente_email\}\}/g, fullCliente?.email || "___")
          .replace(/\{\{cliente_whatsapp\}\}/g, fullCliente?.whatsapp || fullCliente?.telefone || "___")
          .replace(/\{\{pet_nome\}\}/g, petName)
          .replace(/\{\{pet_raca\}\}/g, fullPet?.raca || "___")
          .replace(/\{\{pet_especie\}\}/g, fullPet?.especie || "___")
          .replace(/\{\{pet_peso\}\}/g, fullPet?.peso ? `${fullPet.peso}kg` : "___")
          .replace(/\{\{pet_porte\}\}/g, fullPet?.porte || "___")
          .replace(/\{\{tipo_servico\}\}/g, data.tipo_servico)
          .replace(/\{\{valor\}\}/g, valor)
          .replace(/\{\{data\}\}/g, dataReserva)
          .replace(/\{\{baia\}\}/g, data.baia || "___");

        const filledContent = matched ? fillTpl(matched.content) : "";
        const tplTitle = matched ? `${matched.name} — ${petName}` : "";

        setContratoDialog({
          open: true,
          agendamento: {
            ...agendamento,
            tipo_servico: data.tipo_servico,
            valor: data.valor ? parseFloat(data.valor) : null,
            baia: data.baia || null,
          },
          templates: allTemplates,
          selectedTemplate: matched?.id || "",
          content: filledContent,
          title: tplTitle,
          loading: false,
          createdLink: null,
        });
      }

      onOpenChange(false);
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

    const { data: profile } = await supabase.from("profiles").select("empresa_id, id").single();
    if (!profile?.empresa_id) {
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

    const link = `${window.location.origin}/assinar/${(contract as any).signing_token}`;
    setContratoDialog(prev => prev ? { ...prev, loading: false, createdLink: link } : null);
    toast({ title: "Contrato gerado com sucesso!" });
  }

  return (
    <>
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
                      {baias.map(b => <SelectItem key={b.id} value={b.nome}>{b.nome}</SelectItem>)}
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
                  <RadioGroupItem value="sim" id="edit-contrato-sim" />
                  <Label htmlFor="edit-contrato-sim" className="text-sm cursor-pointer">Sim</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="nao" id="edit-contrato-nao" />
                  <Label htmlFor="edit-contrato-nao" className="text-sm cursor-pointer">Não</Label>
                </div>
              </RadioGroup>
            </div>

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

    {/* Contract generation dialog */}
    {contratoDialog && (
      <Dialog open={contratoDialog.open} onOpenChange={(v) => { if (!v) setContratoDialog(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gerar Contrato</DialogTitle>
          </DialogHeader>

          {contratoDialog.createdLink ? (
            <div className="space-y-4 py-4">
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
            <div className="space-y-4">
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
                        content: tpl.content,
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
              <div>
                <Label>Pré-visualização do contrato</Label>
                <div
                  className="border rounded-md p-4 mt-1 max-h-[400px] overflow-y-auto bg-white text-foreground prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: contratoDialog.content }}
                />
              </div>
              <div className="flex justify-end gap-2">
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
