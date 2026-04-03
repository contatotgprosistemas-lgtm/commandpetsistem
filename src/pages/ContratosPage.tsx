import { useState, useEffect } from "react";
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
import { Plus, FileText, Send, Eye, Copy, Clock, CheckCircle2, XCircle, Link2, History } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ContractTimelineDialog } from "@/components/contracts/ContractTimelineDialog";

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

const DEFAULT_TEMPLATE = `CONTRATO DE PRESTAÇÃO DE SERVIÇOS

Pelo presente instrumento particular, de um lado:

CONTRATANTE: {{cliente_nome}}, CPF: {{cliente_cpf}}, residente em {{cliente_endereco}}, doravante denominado CONTRATANTE;

CONTRATADA: A empresa prestadora de serviços pet, doravante denominada CONTRATADA;

As partes acima qualificadas têm entre si justo e contratado o seguinte:

CLÁUSULA 1ª - DO OBJETO
O presente contrato tem como objeto a prestação de serviços de {{tipo_servico}} para o pet {{pet_nome}}, da raça {{pet_raca}}.

CLÁUSULA 2ª - DO VALOR
Os serviços descritos na Cláusula 1ª serão prestados pelo valor de R$ {{valor}}.

CLÁUSULA 3ª - DAS OBRIGAÇÕES
A CONTRATADA se compromete a prestar os serviços com zelo e dedicação, seguindo as melhores práticas do mercado pet.

CLÁUSULA 4ª - DA VIGÊNCIA
O presente contrato tem vigência a partir da data de assinatura.

CLÁUSULA 5ª - DO FORO
As partes elegem o foro da comarca do domicílio da CONTRATADA para dirimir quaisquer dúvidas ou litígios oriundos deste contrato.

E por estarem assim justas e contratadas, as partes assinam eletronicamente o presente instrumento.`;

export default function ContratosPage() {
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
    if (tRes.data) setTemplates(tRes.data as any);
    if (cRes.data) setContracts(cRes.data as any);
    if (clRes.data) setClientes(clRes.data);
    setLoading(false);
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

  async function sendContract(contract: Contract) {
    const { error } = await supabase.from("contracts").update({
      status: "enviado",
      sent_at: new Date().toISOString(),
      token_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    }).eq("id", contract.id);

    if (!error) {
      // Log event
      const { data: profile } = await supabase.from("profiles").select("empresa_id").single();
      if (profile?.empresa_id) {
        await supabase.from("contract_events").insert({
          contract_id: contract.id,
          empresa_id: profile.empresa_id,
          event_type: "enviado",
          description: "Contrato enviado para assinatura",
        });
      }
      toast.success("Contrato enviado!");
      loadData();
    }
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
                              <Button variant="ghost" size="icon" onClick={() => sendContract(c)} title="Enviar">
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
              <Textarea value={templateForm.content} onChange={e => setTemplateForm(p => ({ ...p, content: e.target.value }))} rows={15} className="font-mono text-sm" />
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
              <Textarea
                value={contractForm.clienteId ? fillTemplate(contractForm.content, contractForm.clienteId) : contractForm.content}
                onChange={e => setContractForm(p => ({ ...p, content: e.target.value }))}
                rows={12}
                className="font-mono text-sm"
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
          <div className="bg-muted/30 rounded-lg p-6 border">
            <pre className="whitespace-pre-wrap text-sm font-mono">{previewContract?.content}</pre>
          </div>
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
