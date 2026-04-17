import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, FileSignature, Copy, ExternalLink, Loader2, Plus, Trash2, Gift, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { createContractShareLink } from "@/lib/contract-links";
import { buildHospedagemContractValues, replaceContractPlaceholders } from "@/lib/contract-placeholders";

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

interface ServicoExtra {
  id?: string; // existing item id
  servico_id?: string;
  descricao: string;
  valor: number;
  quantidade: number;
  cortesia: boolean;
}

export function EditarAgendamentoDialog({ agendamento, open, onOpenChange, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [servicos, setServicos] = useState<{ id: string; descricao: string; valor: number }[]>([]);
  const [baias, setBaias] = useState<{ id: string; nome: string }[]>([]);
  const [baiasLoaded, setBaiasLoaded] = useState(false);
  const [gerarContrato, setGerarContrato] = useState(false);
  const [servicosExtras, setServicosExtras] = useState<ServicoExtra[]>([]);
  const [faturaId, setFaturaId] = useState<string | null>(null);
  const [contratoDialog, setContratoDialog] = useState<{
    open: boolean;
    agendamento: any;
    templates: any[];
    selectedTemplate: string;
    fillTemplate?: (template: string) => string;
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
      supabase.from("servicos").select("id, descricao, valor").eq("ativo", true).order("descricao").then(({ data }) => { if (data) setServicos(data as any); });
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

      // Load existing extras from the linked invoice (contas_receber + itens)
      (async () => {
        setServicosExtras([]);
        setFaturaId(null);
        const petName = agendamento.pet?.nome || "";
        if (!petName || !agendamento.cliente_id) return;
        const { data: faturas } = await supabase
          .from("contas_receber")
          .select("id, descricao")
          .eq("cliente_id", agendamento.cliente_id)
          .eq("empresa_id", agendamento.empresa_id)
          .in("status", ["pendente", "pago"])
          .order("created_at", { ascending: false });
        const fatura = (faturas || []).find((f: any) =>
          (f.descricao || "").includes(petName) &&
          (f.descricao || "").toLowerCase().includes((agendamento.tipo_servico || "").toLowerCase().substring(0, 10))
        );
        if (!fatura) return;
        setFaturaId(fatura.id);
        const { data: itens } = await supabase
          .from("contas_receber_itens" as any)
          .select("id, descricao, valor, tipo")
          .eq("conta_receber_id", fatura.id);
        const extras = (itens || [])
          .filter((it: any) => it.tipo === "extra" || it.tipo === "cortesia")
          .map((it: any) => {
            // parse "Descricao xN (extra) — PetName"
            const desc = (it.descricao || "").replace(` — ${petName}`, "");
            const cortesia = it.tipo === "cortesia";
            const m = desc.match(/^(.*?)\s*x(\d+)\s*\((extra|cortesia)\)$/i);
            let descricao = cortesia ? desc.replace(" (cortesia)", "") : desc;
            let quantidade = 1;
            if (m) {
              descricao = m[1].trim();
              quantidade = parseInt(m[2]) || 1;
            }
            const valorUnit = quantidade > 0 ? Number(it.valor) / quantidade : Number(it.valor);
            return { id: it.id, descricao, valor: cortesia ? 0 : valorUnit, quantidade, cortesia };
          });
        setServicosExtras(extras);
      })();
    }
  }, [agendamento, baiasLoaded, form]);

  // Extras helpers
  function addServicoExtra() {
    setServicosExtras(prev => [...prev, { descricao: "", valor: 0, quantidade: 1, cortesia: false }]);
  }
  function updateServicoExtra(index: number, field: keyof ServicoExtra, value: any) {
    setServicosExtras(prev => {
      const updated = [...prev];
      if (field === "servico_id") {
        const svc = servicos.find(s => s.id === value);
        if (svc) updated[index] = { ...updated[index], servico_id: value, descricao: svc.descricao, valor: svc.valor };
      } else {
        updated[index] = { ...updated[index], [field]: value } as ServicoExtra;
      }
      return updated;
    });
  }
  function removeServicoExtra(index: number) {
    setServicosExtras(prev => prev.filter((_, i) => i !== index));
  }
  const totalExtras = useMemo(() => servicosExtras
    .filter(e => !e.cortesia && e.valor > 0)
    .reduce((sum, e) => sum + e.valor * (e.quantidade || 1), 0), [servicosExtras]);

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

      // Sync extras to invoice (contas_receber + itens)
      const petName = agendamento.pet?.nome || "";
      if (faturaId) {
        // Delete previous extra/cortesia items
        await supabase
          .from("contas_receber_itens" as any)
          .delete()
          .eq("conta_receber_id", faturaId)
          .in("tipo", ["extra", "cortesia"]);

        const novosExtras = servicosExtras.filter(e => e.descricao);
        const newItems = novosExtras.map(e => {
          const qtd = e.quantidade || 1;
          if (e.cortesia) {
            return { conta_receber_id: faturaId, empresa_id: agendamento.empresa_id, descricao: `${e.descricao} (cortesia) — ${petName}`, valor: 0, tipo: "cortesia" };
          }
          return { conta_receber_id: faturaId, empresa_id: agendamento.empresa_id, descricao: `${e.descricao} x${qtd} (extra) — ${petName}`, valor: e.valor * qtd, tipo: "extra" };
        });
        if (newItems.length > 0) {
          await supabase.from("contas_receber_itens" as any).insert(newItems);
        }

        // Recompute fatura total from remaining items (principal/desconto kept, extras replaced)
        const { data: allItems } = await supabase
          .from("contas_receber_itens" as any)
          .select("valor")
          .eq("conta_receber_id", faturaId);
        const novoTotal = (allItems || []).reduce((s: number, it: any) => s + Number(it.valor || 0), 0);
        await supabase.from("contas_receber").update({ valor: Math.max(novoTotal, 0) }).eq("id", faturaId);
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
          .select("id, nome, raca, especie, peso, porte, sexo, cor, castrado, cliente_id")
          .eq("id", agendamento.pet_id)
          .maybeSingle();

        // Fetch pets from same owner that have reservations for same service on same date
        let petsMesmoTutor = "___";
        const dayStart = new Date(data.data_reserva + "T00:00:00").toISOString();
        const dayEnd = new Date(data.data_reserva + "T23:59:59").toISOString();
        const tipoSvc = data.tipo_servico || agendamento.tipo_servico;

        if (fullPet?.cliente_id) {
          const { data: sameDateBookings } = await supabase
            .from("agendamentos")
            .select("id, valor, desconto, pet:pets(nome)")
            .eq("cliente_id", fullPet.cliente_id)
            .eq("tipo_servico", tipoSvc)
            .gte("data_hora", dayStart)
            .lte("data_hora", dayEnd);
          if (sameDateBookings && sameDateBookings.length > 0) {
            const names = sameDateBookings.map((b: any) => b.pet?.nome).filter(Boolean);
            petsMesmoTutor = names.length > 0 ? names.join(", ") : fullPet?.nome || "___";

            // Compute valor total from contas_receber (faturas) which already include extras and discounts
            const petNames = sameDateBookings.map((b: any) => (b as any).pet?.nome).filter(Boolean);
            
            // Try to get the real total from faturas (contas_receber) which have the final values
            let valorContratoFromFaturas = 0;
            let foundFaturas = false;
            
            if (petNames.length > 0) {
              // Build OR filter for faturas matching any pet name
              const { data: faturas } = await supabase
                .from("contas_receber")
                .select("id, valor, descricao")
                .eq("cliente_id", fullPet.cliente_id)
                .in("status", ["pendente", "pago"]);
              
              if (faturas && faturas.length > 0) {
                // Filter faturas that match both the service type and a pet name
                const matchingFaturas = faturas.filter((f: any) => {
                  const desc = (f as any).descricao || "";
                  return petNames.some((name: string) => desc.includes(name)) && desc.includes(tipoSvc.substring(0, 20));
                });
                
                if (matchingFaturas.length > 0) {
                  foundFaturas = true;
                  valorContratoFromFaturas = matchingFaturas.reduce((sum: number, f: any) => sum + (Number(f.valor) || 0), 0);
                }
              }
            }
            
            if (foundFaturas) {
              var valorContrato = valorContratoFromFaturas;
            } else {
              // Fallback: sum agendamento values + extras - discounts
              let valorBrutoTotal = 0;
              let descontoTotal = 0;
              for (const bk of sameDateBookings) {
                valorBrutoTotal += (bk as any).valor ? Number((bk as any).valor) : 0;
                descontoTotal += (bk as any).desconto ? Number((bk as any).desconto) : 0;
              }
              var valorContrato = Math.max(valorBrutoTotal - descontoTotal, 0);
            }
          } else {
            petsMesmoTutor = fullPet?.nome || "___";
            var valorContrato = Math.max((data.valor ? parseFloat(data.valor) : 0) - (data.desconto ? parseFloat(data.desconto) : 0), 0);
          }
        } else {
          var valorContrato = Math.max((data.valor ? parseFloat(data.valor) : 0) - (data.desconto ? parseFloat(data.desconto) : 0), 0);
        }

        const valor = valorContrato > 0 ? `R$ ${valorContrato.toFixed(2)}` : "___";

        const svcLower = tipoSvc.toLowerCase();
        let matched = allTemplates.find(t => {
          const n = t.name.toLowerCase();
          if (svcLower.includes("hotel") || svcLower.includes("hospedagem") || svcLower.includes("diária") || svcLower.includes("diaria")) return n.includes("hotel") || n.includes("hospedagem");
          if (svcLower.includes("escola") || svcLower.includes("daycare") || svcLower.includes("creche")) return n.includes("escola") || n.includes("daycare") || n.includes("creche");
          if (svcLower.includes("banho") || svcLower.includes("tosa")) return n.includes("banho") || n.includes("tosa");
          return false;
        });
        if (!matched && allTemplates.length > 0) matched = allTemplates[0];

        const dataAtual = format(new Date(), "dd/MM/yyyy");

        const petName = fullPet?.nome || agendamento.pet?.nome || "";
        const fillTpl = (c: string) => {
          const values = buildHospedagemContractValues({
            clienteNome: fullCliente?.nome || agendamento.cliente?.nome,
            clienteCpf: fullCliente?.cpf,
            clienteEmail: fullCliente?.email,
            clienteEndereco: fullCliente?.endereco,
            clienteWhatsapp: fullCliente?.whatsapp || fullCliente?.telefone,
            petNome: petName,
            petRaca: fullPet?.raca,
            petEspecie: fullPet?.especie,
            petSexo: fullPet?.sexo,
            petCor: fullPet?.cor,
            petCastrado:
              typeof fullPet?.castrado === "boolean"
                ? fullPet.castrado
                : fullPet?.castrado === "true"
                  ? true
                  : fullPet?.castrado === "false"
                    ? false
                    : null,
            tipoServico: data.tipo_servico,
            valor: valorContrato > 0 ? valorContrato : null,
            dataEntrada: `${data.data_reserva}T${data.hora_reserva || "00:00"}`,
            horaEntrada: data.hora_reserva || "___",
            dataSaida: data.data_saida_provavel || agendamento.data_saida || agendamento.data_saida_provavel || null,
            horaSaida: data.hora_saida_provavel || agendamento.hora_saida || "___",
            baia: data.baia,
            petsMesmoTutor,
          });

          return replaceContractPlaceholders(c, {
            ...values,
            pet_peso: fullPet?.peso ? `${fullPet.peso}kg` : "___",
            pet_porte: fullPet?.porte || "___",
            plano: data.tipo_servico || "___",
            valor_servico: values.valor,
            valor_plano: values.valor,
            data_atual: dataAtual,
          });
        };

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
          fillTemplate: fillTpl,
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

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      toast({ title: "Usuário não autenticado", variant: "destructive" });
      setContratoDialog(prev => prev ? { ...prev, loading: false } : null);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("empresa_id, id")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (profileError || !profile?.empresa_id) {
      console.error("Erro ao buscar perfil para contrato:", profileError, profile);
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

    const link = await createContractShareLink((contract as any).signing_token, profile.empresa_id, window.location.origin);
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
                    <div key={idx} className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 items-center">
                      <Select
                        value={extra.servico_id || ""}
                        onValueChange={(val) => updateServicoExtra(idx, "servico_id", val)}
                      >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder={extra.descricao || "Selecione o serviço"} />
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

                      <Input
                        type="number"
                        min="1"
                        step="1"
                        value={extra.quantidade || 1}
                        onChange={(e) => updateServicoExtra(idx, "quantidade", Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-16 h-9 text-sm text-center"
                        title="Quantidade"
                      />

                      <Button
                        type="button"
                        variant={extra.cortesia ? "default" : "outline"}
                        size="sm"
                        className="h-9 gap-1 text-xs whitespace-nowrap"
                        onClick={() => updateServicoExtra(idx, "cortesia", !extra.cortesia)}
                      >
                        {extra.cortesia ? (<><Gift className="h-3.5 w-3.5" /> Cortesia</>) : (<><DollarSign className="h-3.5 w-3.5" /> Cobrar</>)}
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
              {!faturaId && (
                <p className="text-[11px] text-muted-foreground">
                  Fatura vinculada não encontrada. Os extras só serão salvos na fatura se ela existir para este pet/serviço.
                </p>
              )}
            </div>

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
        <DialogContent className="max-w-6xl w-[95vw] h-[95vh] flex flex-col overflow-hidden p-0">
          <DialogHeader className="px-6 pt-6 shrink-0">
            <DialogTitle>Gerar Contrato</DialogTitle>
          </DialogHeader>

          {contratoDialog.createdLink ? (
            <div className="space-y-4 py-4 px-6 overflow-y-auto">
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
            <div className="flex flex-col flex-1 min-h-0 px-6 pb-6 gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 shrink-0">
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
                          content: prev.fillTemplate ? prev.fillTemplate(tpl.content) : tpl.content,
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
              </div>
              <div className="flex flex-col flex-1 min-h-0">
                <Label className="shrink-0">Pré-visualização do contrato</Label>
                <div
                  className="border rounded-md p-4 mt-1 flex-1 min-h-0 overflow-y-auto bg-white text-foreground prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: contratoDialog.content }}
                />
              </div>
              <div className="flex justify-end gap-2 shrink-0">
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
