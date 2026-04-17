import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { FileSignature, Loader2, Copy, ExternalLink } from "lucide-react";
import { formatDateBR } from "@/lib/utils";
import { createContractShareLink } from "@/lib/contract-links";

interface Props {
  agendamento: {
    id: string;
    tipo_servico: string;
    valor: number | null;
    empresa_id: string;
    cliente_id: string;
    pet_id: string;
    data_hora: string;
    baia: string | null;
    notas: string | null;
    pet: { id: string; nome: string; raca: string | null; especie: string } | null;
    cliente: { id: string; nome: string; whatsapp: string | null } | null;
  };
  variant?: "ghost" | "outline";
  size?: "icon" | "sm";
}

interface Template {
  id: string;
  name: string;
  content: string;
}

export function GerarContratoButton({ agendamento, variant = "ghost", size = "icon" }: Props) {
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [createdLink, setCreatedLink] = useState<string | null>(null);

  async function handleOpen() {
    setCreatedLink(null);
    setLoading(true);
    setOpen(true);

    // Fetch templates and the agendamento's planned exit date in parallel
    const [{ data: tpls }, { data: ag }] = await Promise.all([
      supabase.from("contract_templates").select("id, name, content").eq("active", true),
      supabase.from("agendamentos").select("data_saida_provavel, hora_saida_provavel").eq("id", agendamento.id).maybeSingle(),
    ]);

    const dataSaidaProv = (ag as any)?.data_saida_provavel ?? null;
    const horaSaidaProv = (ag as any)?.hora_saida_provavel ?? null;

    const allTemplates = (tpls as Template[]) || [];
    setTemplates(allTemplates);

    // Try to auto-match template by service type
    const serviceType = agendamento.tipo_servico.toLowerCase();
    const matched = allTemplates.find(t => t.name.toLowerCase().includes(serviceType));

    const apply = (tpl: Template) => {
      setSelectedTemplate(tpl.id);
      setContent(fillTemplate(tpl.content, dataSaidaProv, horaSaidaProv));
      setTitle(`${tpl.name} — ${agendamento.pet?.nome || "Pet"}`);
    };

    if (matched) {
      apply(matched);
    } else if (allTemplates.length > 0) {
      apply(allTemplates[0]);
    } else {
      setContent("");
      setTitle("");
    }

    // Stash for handleTemplateChange
    (window as any).__contractFillCtx = { dataSaidaProv, horaSaidaProv };

    setLoading(false);
  }

  function fillTemplate(templateContent: string, dataSaidaProvavel?: string | null, horaSaidaProvavel?: string | null): string {
    const petName = agendamento.pet?.nome || "";
    const petRaca = agendamento.pet?.raca || "";
    const petEspecie = agendamento.pet?.especie || "";
    const clientName = agendamento.cliente?.nome || "";
    const valor = agendamento.valor != null ? `R$ ${Number(agendamento.valor).toFixed(2)}` : "___";
    const dataHora = formatDateBR(agendamento.data_hora);
    const dataEntrada = formatDateBR(agendamento.data_hora);
    const dataSaida = dataSaidaProvavel
      ? formatDateBR(`${dataSaidaProvavel}T${horaSaidaProvavel || "00:00"}`)
      : "___";
    const entradaDateOnly = agendamento.data_hora.split("T")[0];
    const dataReserva = dataSaidaProvavel && dataSaidaProvavel !== entradaDateOnly
      ? `${dataEntrada} a ${dataSaida}`
      : dataEntrada;

    return templateContent
      .replace(/\{\{cliente_nome\}\}/g, clientName)
      .replace(/\{\{cliente_cpf\}\}/g, "___")
      .replace(/\{\{cliente_endereco\}\}/g, "___")
      .replace(/\{\{pet_nome\}\}/g, petName)
      .replace(/\{\{pet_raca\}\}/g, petRaca)
      .replace(/\{\{pet_especie\}\}/g, petEspecie)
      .replace(/\{\{tipo_servico\}\}/g, agendamento.tipo_servico)
      .replace(/\{\{valor\}\}/g, valor)
      .replace(/\{\{data\}\}/g, dataHora)
      .replace(/\{\{data_entrada\}\}/g, dataEntrada)
      .replace(/\{\{data_saida\}\}/g, dataSaida)
      .replace(/\{\{data_reserva\}\}/g, dataReserva)
      .replace(/\{\{baia\}\}/g, agendamento.baia || "___");
  }

  function handleTemplateChange(templateId: string) {
    setSelectedTemplate(templateId);
    const tpl = templates.find(t => t.id === templateId);
    if (tpl) {
      const ctx = (window as any).__contractFillCtx || {};
      setContent(fillTemplate(tpl.content, ctx.dataSaidaProv, ctx.horaSaidaProv));
      setTitle(`${tpl.name} — ${agendamento.pet?.nome || "Pet"}`);
    }
  }

  async function handleCreate() {
    if (!title.trim() || !content.trim()) {
      toast.error("Preencha o título e conteúdo");
      return;
    }

    setLoading(true);

    // Generate hash
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const contentHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      toast.error("Usuário não autenticado");
      setLoading(false);
      return;
    }
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("empresa_id, id")
      .eq("user_id", session.user.id)
      .maybeSingle();
    if (profileError || !profile?.empresa_id) {
      console.error("Erro ao buscar perfil:", profileError, profile);
      toast.error("Erro ao identificar empresa");
      setLoading(false);
      return;
    }

    const { data: contract, error } = await supabase.from("contracts").insert({
      empresa_id: profile.empresa_id,
      template_id: selectedTemplate || null,
      cliente_id: agendamento.cliente_id,
      title: title.trim(),
      content,
      content_hash: contentHash,
      status: "enviado",
      sent_at: new Date().toISOString(),
      created_by: profile.id,
      token_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    }).select("id, signing_token").single();

    if (error || !contract) {
      toast.error("Erro ao gerar contrato");
      setLoading(false);
      return;
    }

    // Log event
    await supabase.from("contract_events").insert({
      contract_id: contract.id,
      empresa_id: profile.empresa_id,
      event_type: "criado",
      description: `Contrato gerado a partir do agendamento (${agendamento.tipo_servico})`,
    });

    await supabase.from("contract_events").insert({
      contract_id: contract.id,
      empresa_id: profile.empresa_id,
      event_type: "enviado",
      description: "Contrato enviado para assinatura",
    });

    try {
      const link = await createContractShareLink((contract as any).signing_token, profile.empresa_id, window.location.origin);
      setCreatedLink(link);
    } catch (linkError) {
      console.error("Short link error:", linkError);
      toast.error("Erro ao gerar link do contrato");
      setLoading(false);
      return;
    }
    setLoading(false);
    toast.success("Contrato gerado e pronto para assinatura!");
  }

  function copyLink() {
    if (createdLink) {
      navigator.clipboard.writeText(createdLink);
      toast.success("Link copiado!");
    }
  }

  function sendWhatsApp() {
    if (!createdLink || !agendamento.cliente?.whatsapp) return;
    const phone = agendamento.cliente.whatsapp.replace(/\D/g, "");
    const msg = encodeURIComponent(`Olá ${agendamento.cliente.nome}! Segue o contrato para assinatura digital:\n\n${createdLink}`);
    window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
  }

  return (
    <>
      <Button variant={variant} size={size} className="h-7 w-7" title="Gerar Contrato" onClick={handleOpen}>
        <FileSignature className="h-3.5 w-3.5 text-primary" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl w-[95vw] max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gerar Contrato</DialogTitle>
            <DialogDescription>
              {agendamento.tipo_servico} — {agendamento.pet?.nome} ({agendamento.cliente?.nome})
            </DialogDescription>
          </DialogHeader>

          {createdLink ? (
            <div className="space-y-4 py-4">
              <div className="text-center space-y-3">
                <div className="h-14 w-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                  <FileSignature className="h-7 w-7 text-emerald-600" />
                </div>
                <h3 className="font-semibold text-lg">Contrato gerado com sucesso!</h3>
                <p className="text-sm text-muted-foreground">Envie o link abaixo para o cliente assinar</p>
              </div>

              <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-3 border">
                <Input value={createdLink} readOnly className="text-xs" />
                <Button variant="outline" size="icon" onClick={copyLink}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex gap-2 justify-center">
                {agendamento.cliente?.whatsapp && (
                  <Button variant="outline" onClick={sendWhatsApp} className="gap-2">
                    Enviar via WhatsApp
                  </Button>
                )}
                <Button variant="outline" onClick={() => window.open(createdLink, "_blank")} className="gap-2">
                  <ExternalLink className="h-4 w-4" /> Visualizar
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label>Template</Label>
                <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
                  <SelectTrigger><SelectValue placeholder="Selecione um template" /></SelectTrigger>
                  <SelectContent>
                    {templates.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {templates.length === 0 && !loading && (
                  <p className="text-xs text-destructive mt-1">
                    Nenhum template encontrado. Crie um template em Contratos → Templates primeiro.
                  </p>
                )}
              </div>

              <div>
                <Label>Título do contrato</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} />
              </div>

              <div>
                <Label>Conteúdo (preenchido automaticamente)</Label>
                <Textarea value={content} onChange={e => setContent(e.target.value)} rows={20} className="font-mono text-sm min-h-[400px]" />
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={handleCreate} disabled={loading || !content.trim()}>
                  {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileSignature className="h-4 w-4 mr-2" />}
                  Gerar e Enviar
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
