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
import { createContractShareLink, extractContractSigningToken } from "@/lib/contract-links";
import { buildHospedagemContractValues, replaceContractPlaceholders } from "@/lib/contract-placeholders";

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

    const entradaDateOnly = agendamento.data_hora.split("T")[0];

    // Fetch templates, agendamento exit date, full client data, full pet data, and same-tutor pets in parallel
    const [{ data: tpls }, { data: ag }, { data: cli }, { data: petFull }, { data: peersAg }] = await Promise.all([
      supabase.from("contract_templates").select("id, name, content").eq("active", true),
      supabase.from("agendamentos").select("data_saida, hora_saida, data_saida_provavel, hora_saida_provavel").eq("id", agendamento.id).maybeSingle(),
      supabase.from("clientes").select("cpf, email, endereco").eq("id", agendamento.cliente_id).maybeSingle(),
      supabase.from("pets").select("sexo, cor, castrado").eq("id", agendamento.pet_id).maybeSingle(),
      supabase.from("agendamentos")
        .select("pet:pets(nome, raca)")
        .eq("cliente_id", agendamento.cliente_id)
        .eq("tipo_servico", agendamento.tipo_servico)
        .gte("data_hora", `${entradaDateOnly}T00:00:00`)
        .lte("data_hora", `${entradaDateOnly}T23:59:59`)
        .neq("id", agendamento.id),
    ]);

    const dataSaidaContrato = (ag as any)?.data_saida ?? (ag as any)?.data_saida_provavel ?? null;
    const horaSaidaContrato = (ag as any)?.hora_saida ?? (ag as any)?.hora_saida_provavel ?? null;

    const petsMesmoTutor = (peersAg as any[] | null || [])
      .map(a => a?.pet ? `${a.pet.nome}${a.pet.raca ? ` (${a.pet.raca})` : ""}` : "")
      .filter(Boolean)
      .join(", ");

    const extras: Record<string, string> = {
      cliente_cpf: (cli as any)?.cpf || "___",
      cliente_email: (cli as any)?.email || "___",
      cliente_endereco: (cli as any)?.endereco || "___",
      pet_sexo: (petFull as any)?.sexo || "___",
      pet_cor: (petFull as any)?.cor || "___",
      pet_castrado: (petFull as any)?.castrado === true ? "Sim" : (petFull as any)?.castrado === false ? "Não" : "___",
      pets_mesmo_tutor: petsMesmoTutor,
    };

    const allTemplates = (tpls as Template[]) || [];
    setTemplates(allTemplates);

    // Try to auto-match template by service type
    const serviceType = agendamento.tipo_servico.toLowerCase();
    const matched = allTemplates.find(t => t.name.toLowerCase().includes(serviceType));

    const apply = (tpl: Template) => {
      setSelectedTemplate(tpl.id);
      setContent(fillTemplate(tpl.content, dataSaidaContrato, horaSaidaContrato, extras));
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
    (window as any).__contractFillCtx = { dataSaidaContrato, horaSaidaContrato, extras };

    setLoading(false);
  }

  function fillTemplate(templateContent: string, dataSaidaProvavel?: string | null, horaSaidaProvavel?: string | null, extras?: Record<string, string>): string {
    const values = buildHospedagemContractValues({
      clienteNome: agendamento.cliente?.nome,
      clienteCpf: extras?.cliente_cpf,
      clienteEmail: extras?.cliente_email,
      clienteEndereco: extras?.cliente_endereco,
      clienteWhatsapp: agendamento.cliente?.whatsapp,
      petNome: agendamento.pet?.nome,
      petRaca: agendamento.pet?.raca,
      petEspecie: agendamento.pet?.especie,
      petSexo: extras?.pet_sexo,
      petCor: extras?.pet_cor,
      petCastrado: extras?.pet_castrado === "Sim" ? true : extras?.pet_castrado === "Não" ? false : null,
      tipoServico: agendamento.tipo_servico,
      valor: agendamento.valor,
      dataEntrada: agendamento.data_hora,
      horaEntrada: agendamento.data_hora.match(/T(\d{2}:\d{2})/)?.[1] || "___",
      dataSaida: dataSaidaProvavel,
      horaSaida: horaSaidaProvavel,
      baia: agendamento.baia,
      petsMesmoTutor: extras?.pets_mesmo_tutor,
    });

    return replaceContractPlaceholders(templateContent, values);
  }

  function handleTemplateChange(templateId: string) {
    setSelectedTemplate(templateId);
    const tpl = templates.find(t => t.id === templateId);
    if (tpl) {
      const ctx = (window as any).__contractFillCtx || {};
      setContent(fillTemplate(tpl.content, ctx.dataSaidaContrato, ctx.horaSaidaContrato, ctx.extras));
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
    }).select("id").single();

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
      const { data: tokenRows } = await supabase.rpc(
        "get_contract_signing_token" as any,
        { p_contract_id: contract.id }
      );
      const tk = extractContractSigningToken(tokenRows);
      if (!tk) throw new Error("Token de assinatura indisponível");
      const link = await createContractShareLink(tk, profile.empresa_id, window.location.origin);
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
