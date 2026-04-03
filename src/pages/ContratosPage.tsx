import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, FileText, Send, Eye, Copy, Clock, CheckCircle2, XCircle, Link2, History, Mail, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ContractTimelineDialog } from "@/components/contracts/ContractTimelineDialog";
import { RichTextEditor } from "@/components/contracts/RichTextEditor";

interface Template {
  id: string;
  name: string;
  description: string | null;
  content: string;
  placeholders: any;
  active: boolean;
  created_at: string;
}

interface Contract {
  id: string;
  title: string;
  content: string;
  status: string;
  signing_token: string;
  token_expires_at: string | null;
  signed_at: string | null;
  created_at: string;
  cliente_id: string | null;
  template_id: string | null;
  content_hash: string | null;
  cliente?: { nome: string; email: string | null; cpf: string | null } | null;
}

const statusMap: Record<string, { label: string; color: string }> = {
  rascunho: { label: "Não concluído", color: "bg-muted text-muted-foreground" },
  enviado: { label: "Não concluído", color: "bg-amber-100 text-amber-800" },
  assinado: { label: "Concluído", color: "bg-emerald-100 text-emerald-800" },
  cancelado: { label: "Cancelado", color: "bg-red-100 text-red-800" },
  expirado: { label: "Não concluído", color: "bg-gray-100 text-gray-800" },
};

const DEFAULT_TEMPLATE = `<h2 style="text-align: center">CONTRATO DE PRESTAÇÃO DE SERVIÇOS</h2>
<p>Pelo presente instrumento particular, de um lado:</p>
<p><strong>CONTRATANTE:</strong> {{cliente_nome}}, CPF: {{cliente_cpf}}, residente em {{cliente_endereco}}, doravante denominado CONTRATANTE;</p>
<p><strong>CONTRATADA:</strong> A empresa prestadora de serviços pet, doravante denominada CONTRATADA;</p>
<p>As partes acima qualificadas têm entre si justo e contratado o seguinte:</p>
<p><strong>CLÁUSULA 1ª - DO OBJETO</strong><br>O presente contrato tem como objeto a prestação de serviços de {{tipo_servico}} para o pet {{pet_nome}}, da raça {{pet_raca}}.</p>
<p><strong>CLÁUSULA 2ª - DO VALOR</strong><br>Os serviços descritos na Cláusula 1ª serão prestados pelo valor de R$ {{valor}}.</p>
<p><strong>CLÁUSULA 3ª - DAS OBRIGAÇÕES</strong><br>A CONTRATADA se compromete a prestar os serviços com zelo e dedicação, seguindo as melhores práticas do mercado pet.</p>
<p><strong>CLÁUSULA 4ª - DA VIGÊNCIA</strong><br>O presente contrato tem vigência a partir da data de assinatura.</p>
<p><strong>CLÁUSULA 5ª - DO FORO</strong><br>As partes elegem o foro da comarca do domicílio da CONTRATADA para dirimir quaisquer dúvidas ou litígios oriundos deste contrato.</p>
<p>E por estarem assim justas e contratadas, as partes assinam eletronicamente o presente instrumento.</p>`;

export default function ContratosPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [clientes, setClientes] = useState<{ id: string; nome: string; email: string | null; cpf: string | null; endereco: string | null }[]>([]);
  const [loading, setLoading] = useState(true);

  // Template dialog
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [templateForm, setTemplateForm] = useState({ name: "", description: "", content: DEFAULT_TEMPLATE });
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);

  // Contract dialog
  const [showContractDialog, setShowContractDialog] = useState(false);
  const [contractForm, setContractForm] = useState({ title: "", templateId: "", clienteId: "", content: "" });

  // Preview dialog
  const [previewContract, setPreviewContract] = useState<Contract | null>(null);

  // Timeline dialog
  const [timelineContractId, setTimelineContractId] = useState<string | null>(null);

  // Send dialog
  const [sendDialogContract, setSendDialogContract] = useState<Contract | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [tRes, cRes, clRes] = await Promise.all([
      supabase.from("contract_templates").select("*").order("created_at", { ascending: false }),
      supabase.from("contracts").select("*, cliente:clientes(nome, email, cpf)").order("created_at", { ascending: false }),
      supabase.from("clientes").select("id, nome, email, cpf, endereco"),
    ]);
    const loadedTemplates = (tRes.data as any as Template[]) || [];
    const loadedClientes = clRes.data || [];
    if (tRes.data) setTemplates(loadedTemplates);
    if (cRes.data) setContracts(cRes.data as any);
    if (clRes.data) setClientes(loadedClientes);
    setLoading(false);

    // Auto-open contract dialog from subscription
    const subId = searchParams.get("subscription_id");
    if (subId && loadedTemplates.length > 0) {
      await autoFillFromSubscription(subId, loadedTemplates, loadedClientes);
      setSearchParams({}, { replace: true });
    }
  }

  async function autoFillFromSubscription(
    subscriptionId: string,
    tpls: Template[],
    clientesList: typeof clientes
  ) {
    // Fetch subscription with related data including plan and package
    const { data: sub, error: subError } = await supabase
      .from("customer_pet_subscriptions")
      .select("*, cliente:clientes(id, nome, cpf, email, endereco), pet:pets(id, nome, raca, sexo, cor, castrado), plan:service_plans(id, name, price, type), package:service_packages(id, name, price)")
      .eq("id", subscriptionId)
      .single();

    if (subError || !sub) {
      console.error("Erro ao buscar contratação:", subError);
      toast.error("Contratação não encontrada");
      return;
    }

    const cliente = (sub as any).cliente;
    const pet = (sub as any).pet;
    const plan = (sub as any).plan;
    const pkg = (sub as any).package;

    const planName = plan?.name || "";
    const planPrice = Number(plan?.price) || 0;
    const packageName = pkg?.name || "";
    const packagePrice = Number(pkg?.price) || 0;

    // Fetch all pets from same tutor
    let petsMesmoTutor = "";
    if (cliente?.id) {
      const { data: allPets } = await supabase
        .from("pets")
        .select("nome, raca")
        .eq("cliente_id", cliente.id);
      if (allPets && allPets.length > 1) {
        petsMesmoTutor = allPets.map((p: any) => `${p.nome}${p.raca ? ` (${p.raca})` : ""}`).join(", ");
      }
    }

    // Auto-match template by plan/service type
    const searchTerms = [planName, packageName].join(" ").toLowerCase();
    let matchedTemplate: Template | undefined;

    // Hotel/Hospedagem matching
    if (/hotel|hospedagem|pernoite/i.test(searchTerms)) {
      matchedTemplate = tpls.find(t => /hospedagem|hotel/i.test(t.name));
    }
    // Escola/Daycare/Creche matching
    if (!matchedTemplate && /escola|daycare|creche/i.test(searchTerms)) {
      matchedTemplate = tpls.find(t => /escola|daycare|creche|serviço|servico/i.test(t.name));
    }
    // Fallback: try matching by plan name
    if (!matchedTemplate) {
      matchedTemplate = tpls.find(t => t.name.toLowerCase().includes(planName.toLowerCase()) || planName.toLowerCase().includes(t.name.toLowerCase()));
    }
    // Final fallback: first active template
    if (!matchedTemplate) {
      matchedTemplate = tpls.find(t => t.active) || tpls[0];
    }

    if (!matchedTemplate) {
      toast.error("Nenhum template encontrado. Crie um template primeiro.");
      return;
    }

    // Fill all placeholders
    const today = format(new Date(), "dd/MM/yyyy", { locale: ptBR });
    const startDate = (sub as any).start_date ? format(new Date((sub as any).start_date + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR }) : "___";
    const finalPrice = Number((sub as any).final_price) || 0;

    const filledContent = matchedTemplate.content
      .replace(/\{\{cliente_nome\}\}/g, cliente?.nome || "___")
      .replace(/\{\{cliente_cpf\}\}/g, cliente?.cpf || "___")
      .replace(/\{\{cliente_email\}\}/g, cliente?.email || "___")
      .replace(/\{\{cliente_endereco\}\}/g, cliente?.endereco || "___")
      .replace(/\{\{pet_nome\}\}/g, pet?.nome || "___")
      .replace(/\{\{pet_raca\}\}/g, pet?.raca || "___")
      .replace(/\{\{pet_sexo\}\}/g, pet?.sexo || "___")
      .replace(/\{\{pet_cor\}\}/g, pet?.cor || "___")
      .replace(/\{\{pet_castrado\}\}/g, pet?.castrado || "___")
      .replace(/\{\{pets_mesmo_tutor\}\}/g, petsMesmoTutor || pet?.nome || "___")
      .replace(/\{\{servicos\}\}/g, planName || packageName || "___")
      .replace(/\{\{plano\}\}/g, planName || "___")
      .replace(/\{\{pacote\}\}/g, packageName || "___")
      .replace(/\{\{data_reserva\}\}/g, startDate)
      .replace(/\{\{valor_plano\}\}/g, planPrice ? `R$ ${planPrice.toFixed(2)}` : `R$ ${finalPrice.toFixed(2)}`)
      .replace(/\{\{valor_servico\}\}/g, `R$ ${finalPrice.toFixed(2)}`)
      .replace(/\{\{valor_pacote\}\}/g, packagePrice ? `R$ ${packagePrice.toFixed(2)}` : "___")
      .replace(/\{\{data_atual\}\}/g, today)
      .replace(/\{\{tipo_servico\}\}/g, planName || packageName || "___")
      .replace(/\{\{valor\}\}/g, `R$ ${finalPrice.toFixed(2)}`);

    const contractTitle = `${matchedTemplate.name} — ${pet?.nome || cliente?.nome || ""}`;

    setContractForm({
      title: contractTitle,
      templateId: matchedTemplate.id,
      clienteId: cliente?.id || "",
      content: filledContent,
    });
    setShowContractDialog(true);
  }

  async function handleLogoUpload(file: File): Promise<string | null> {
    const { data: profile } = await supabase.from("profiles").select("empresa_id").single();
    if (!profile?.empresa_id) return null;
    const ext = file.name.split(".").pop();
    const path = `${profile.empresa_id}/logo_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("profile-photos").upload(path, file, { upsert: true });
    if (error) { toast.error("Erro ao enviar imagem"); return null; }
    const { data: urlData } = supabase.storage.from("profile-photos").getPublicUrl(path);
    return urlData.publicUrl;
  }

  async function saveTemplate() {
    if (!templateForm.name || !templateForm.content) {
      toast.error("Preencha nome e conteúdo do template");
      return;
    }
    const { data: profile } = await supabase.from("profiles").select("empresa_id").single();
    if (!profile?.empresa_id) return;

    if (editingTemplate) {
      await supabase.from("contract_templates").update({
        name: templateForm.name,
        description: templateForm.description,
        content: templateForm.content,
      }).eq("id", editingTemplate);
      toast.success("Template atualizado!");
    } else {
      await supabase.from("contract_templates").insert({
        empresa_id: profile.empresa_id,
        name: templateForm.name,
        description: templateForm.description,
        content: templateForm.content,
      });
      toast.success("Template criado!");
    }
    setShowTemplateDialog(false);
    setEditingTemplate(null);
    setTemplateForm({ name: "", description: "", content: DEFAULT_TEMPLATE });
    loadData();
  }

  function fillTemplate(templateContent: string, clienteId: string) {
    const cliente = clientes.find(c => c.id === clienteId);
    if (!cliente) return templateContent;
    return templateContent
      .replace(/\{\{cliente_nome\}\}/g, cliente.nome || "")
      .replace(/\{\{cliente_cpf\}\}/g, cliente.cpf || "___")
      .replace(/\{\{cliente_endereco\}\}/g, cliente.endereco || "___");
  }

  async function createContract() {
    if (!contractForm.title || !contractForm.clienteId) {
      toast.error("Preencha título e selecione um cliente");
      return;
    }
    const { data: profile } = await supabase.from("profiles").select("empresa_id, id").single();
    if (!profile?.empresa_id) return;

    let content = contractForm.content;
    if (contractForm.templateId) {
      const tpl = templates.find(t => t.id === contractForm.templateId);
      if (tpl) content = fillTemplate(tpl.content, contractForm.clienteId);
    }
    if (!content) {
      toast.error("O contrato precisa de conteúdo");
      return;
    }

    // Generate hash
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const contentHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

    const { error } = await supabase.from("contracts").insert({
      empresa_id: profile.empresa_id,
      template_id: contractForm.templateId || null,
      cliente_id: contractForm.clienteId,
      title: contractForm.title,
      content,
      content_hash: contentHash,
      created_by: profile.id,
      token_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });

    if (error) {
      toast.error("Erro ao criar contrato");
      return;
    }

    toast.success("Contrato criado!");
    setShowContractDialog(false);
    setContractForm({ title: "", templateId: "", clienteId: "", content: "" });
    loadData();
  }

  async function markAsSent(contract: Contract) {
    const { error } = await supabase.from("contracts").update({
      status: "enviado",
      sent_at: new Date().toISOString(),
      token_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    }).eq("id", contract.id);

    if (!error) {
      const { data: profile } = await supabase.from("profiles").select("empresa_id").single();
      if (profile?.empresa_id) {
        await supabase.from("contract_events").insert({
          contract_id: contract.id,
          empresa_id: profile.empresa_id,
          event_type: "enviado",
          description: "Contrato enviado para assinatura",
        });
      }
      loadData();
    }
  }

  async function handleSendWhatsApp(contract: Contract) {
    await markAsSent(contract);
    const link = getSigningUrl(contract);
    const clienteName = (contract as any).cliente?.nome || "Cliente";
    const phone = await getClienteWhatsApp(contract.cliente_id);
    if (!phone) {
      toast.error("Cliente não possui WhatsApp cadastrado");
      navigator.clipboard.writeText(link);
      toast.info("Link copiado para a área de transferência");
      setSendDialogContract(null);
      return;
    }
    const msg = encodeURIComponent(`Olá ${clienteName}! Segue o contrato para assinatura digital:\n\n${link}`);
    window.open(`https://wa.me/${phone.replace(/\D/g, "")}?text=${msg}`, "_blank");
    toast.success("Contrato enviado via WhatsApp!");
    setSendDialogContract(null);
  }

  async function handleSendEmail(contract: Contract) {
    await markAsSent(contract);
    const link = getSigningUrl(contract);
    const clienteName = (contract as any).cliente?.nome || "Cliente";
    const clienteEmail = (contract as any).cliente?.email;
    if (!clienteEmail) {
      toast.error("Cliente não possui e-mail cadastrado");
      navigator.clipboard.writeText(link);
      toast.info("Link copiado para a área de transferência");
      setSendDialogContract(null);
      return;
    }

    try {
      const { error } = await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "contract-signing",
          recipientEmail: clienteEmail,
          idempotencyKey: `contract-signing-${contract.id}`,
          templateData: {
            clienteName,
            contractTitle: contract.title,
            signingLink: link,
            petName: (contract as any).cliente?.nome || "",
            serviceType: "",
          },
        },
      });
      if (error) throw error;
      toast.success(`E-mail enviado automaticamente para ${clienteEmail}!`);
    } catch (err) {
      console.error("Erro ao enviar e-mail:", err);
      toast.error("Erro ao enviar e-mail. Link copiado como alternativa.");
      navigator.clipboard.writeText(link);
    }
    setSendDialogContract(null);
  }

  async function getClienteWhatsApp(clienteId: string | null): Promise<string | null> {
    if (!clienteId) return null;
    const { data } = await supabase.from("clientes").select("whatsapp").eq("id", clienteId).single();
    return data?.whatsapp || null;
  }

  function getSigningUrl(contract: Contract) {
    const base = window.location.origin;
    return `${base}/assinar/${contract.signing_token}`;
  }

  function copyLink(contract: Contract) {
    navigator.clipboard.writeText(getSigningUrl(contract));
    toast.success("Link copiado!");
  }

  function handleEditTemplate(t: Template) {
    setEditingTemplate(t.id);
    setTemplateForm({ name: t.name, description: t.description || "", content: t.content });
    setShowTemplateDialog(true);
  }

  function handleSelectTemplate(templateId: string) {
    setContractForm(prev => ({ ...prev, templateId }));
    const tpl = templates.find(t => t.id === templateId);
    if (tpl) {
      setContractForm(prev => ({ ...prev, content: tpl.content }));
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Contratos Digitais</h1>
          <p className="text-sm text-muted-foreground">Gerencie templates e contratos com assinatura eletrônica</p>
        </div>
      </div>

      <Tabs defaultValue="contratos">
        <TabsList>
          <TabsTrigger value="contratos">Contratos</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="contratos" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contracts.map(c => {
                    const st = statusMap[c.status] || statusMap.rascunho;
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.title}</TableCell>
                        <TableCell>{(c as any).cliente?.nome || "—"}</TableCell>
                        <TableCell>
                          <Badge className={st.color}>{st.label}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(c.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => setPreviewContract(c)} title="Visualizar">
                              <Eye className="h-4 w-4" />
                            </Button>
                            {c.status === "rascunho" && (
                              <Button variant="ghost" size="icon" onClick={() => setSendDialogContract(c)} title="Enviar">
                                <Send className="h-4 w-4" />
                              </Button>
                            )}
                            {(c.status === "enviado" || c.status === "assinado") && (
                              <Button variant="ghost" size="icon" onClick={() => copyLink(c)} title="Copiar link">
                                <Link2 className="h-4 w-4" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" onClick={() => setTimelineContractId(c.id)} title="Histórico">
                              <History className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {contracts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Nenhum contrato criado ainda
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => {
              setEditingTemplate(null);
              setTemplateForm({ name: "", description: "", content: DEFAULT_TEMPLATE });
              setShowTemplateDialog(true);
            }}>
              <Plus className="h-4 w-4 mr-2" /> Novo Template
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map(t => (
              <Card key={t.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleEditTemplate(t)}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    {t.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">{t.description || "Sem descrição"}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Criado em {format(new Date(t.created_at), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                </CardContent>
              </Card>
            ))}
            {templates.length === 0 && (
              <p className="text-muted-foreground col-span-full text-center py-8">Nenhum template criado</p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Template Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? "Editar Template" : "Novo Template"}</DialogTitle>
            <DialogDescription>Use placeholders como {"{{cliente_nome}}"}, {"{{cliente_cpf}}"}, {"{{pet_nome}}"} etc.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input value={templateForm.name} onChange={e => setTemplateForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Contrato de Creche" />
            </div>
            <div>
              <Label>Descrição</Label>
              <Input value={templateForm.description} onChange={e => setTemplateForm(p => ({ ...p, description: e.target.value }))} placeholder="Breve descrição" />
            </div>
            <div>
              <Label>Conteúdo do contrato</Label>
              <RichTextEditor
                content={templateForm.content}
                onChange={(html) => setTemplateForm(p => ({ ...p, content: html }))}
                onLogoUpload={handleLogoUpload}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>Cancelar</Button>
            <Button onClick={saveTemplate}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Contract Dialog */}
      <Dialog open={showContractDialog} onOpenChange={setShowContractDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Contrato</DialogTitle>
            <DialogDescription>Selecione um template e cliente para gerar o contrato</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Título</Label>
              <Input value={contractForm.title} onChange={e => setContractForm(p => ({ ...p, title: e.target.value }))} placeholder="Ex: Contrato Creche - Rex" />
            </div>
            <div>
              <Label>Template</Label>
              <Select value={contractForm.templateId} onValueChange={handleSelectTemplate}>
                <SelectTrigger><SelectValue placeholder="Selecione um template" /></SelectTrigger>
                <SelectContent>
                  {templates.filter(t => t.active).map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Cliente</Label>
              <Select value={contractForm.clienteId} onValueChange={v => setContractForm(p => ({ ...p, clienteId: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                <SelectContent>
                  {clientes.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Conteúdo (editável)</Label>
              <RichTextEditor
                content={contractForm.clienteId ? fillTemplate(contractForm.content, contractForm.clienteId) : contractForm.content}
                onChange={(html) => setContractForm(p => ({ ...p, content: html }))}
                onLogoUpload={handleLogoUpload}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowContractDialog(false)}>Cancelar</Button>
            <Button onClick={createContract}>Criar Contrato</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewContract} onOpenChange={() => setPreviewContract(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewContract?.title}</DialogTitle>
            <DialogDescription>
              {previewContract?.status === "assinado" && previewContract?.signed_at
                ? `Assinado em ${format(new Date(previewContract.signed_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}`
                : statusMap[previewContract?.status || "rascunho"]?.label}
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted/30 rounded-lg p-6 border prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: previewContract?.content || "" }} />
          {previewContract?.content_hash && (
            <div className="text-xs text-muted-foreground border-t pt-2">
              <strong>Hash SHA-256:</strong> {previewContract.content_hash}
            </div>
          )}
          {(previewContract?.status === "enviado" || previewContract?.status === "assinado") && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => copyLink(previewContract!)}>
                <Copy className="h-3 w-3 mr-1" /> Copiar link
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Send Dialog */}
      <Dialog open={!!sendDialogContract} onOpenChange={() => setSendDialogContract(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Enviar Contrato</DialogTitle>
            <DialogDescription>
              Escolha como deseja enviar o contrato para {(sendDialogContract as any)?.cliente?.nome || "o cliente"}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-4">
            <Button
              variant="outline"
              className="justify-start gap-3 h-14 text-left"
              onClick={() => sendDialogContract && handleSendWhatsApp(sendDialogContract)}
            >
              <div className="h-9 w-9 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <MessageCircle className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="font-medium text-sm">WhatsApp</p>
                <p className="text-xs text-muted-foreground">Enviar link via WhatsApp</p>
              </div>
            </Button>
            <Button
              variant="outline"
              className="justify-start gap-3 h-14 text-left"
              onClick={() => sendDialogContract && handleSendEmail(sendDialogContract)}
            >
              <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <Mail className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-sm">E-mail</p>
                <p className="text-xs text-muted-foreground">Abrir e-mail com link do contrato</p>
              </div>
            </Button>
            <Button
              variant="ghost"
              className="justify-start gap-3 h-14 text-left"
              onClick={() => {
                if (sendDialogContract) {
                  copyLink(sendDialogContract);
                  markAsSent(sendDialogContract);
                  setSendDialogContract(null);
                }
              }}
            >
              <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                <Copy className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-sm">Copiar link</p>
                <p className="text-xs text-muted-foreground">Copiar link de assinatura</p>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Timeline Dialog */}
      {timelineContractId && (
        <ContractTimelineDialog
          contractId={timelineContractId}
          open={!!timelineContractId}
          onOpenChange={() => setTimelineContractId(null)}
        />
      )}
    </div>
  );
}
