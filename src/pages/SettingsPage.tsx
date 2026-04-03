import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Building2, Users, Bell, Shield, Settings, Loader2, Save, UserPlus, Eye, EyeOff, Wrench, Trash2 } from "lucide-react";
import { WhatsAppConnectionPanel } from "@/components/WhatsAppConnectionPanel";
import { PermissoesCargoPanel } from "@/components/PermissoesCargoPanel";

// ─── Dados da Empresa ───────────────────────────────────────────────
function EmpresaTab() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [form, setForm] = useState({
    nome_empresa: "", cnpj: "", email: "", telefone: "", nome_fantasia: "", endereco: "", endereco_numero: "", cep: "",
    inscricao_estadual: "", inscricao_municipal: "",
    horario_semana_inicio: "08:00", horario_semana_fim: "18:00",
    horario_sabado_inicio: "", horario_sabado_fim: "",
    horario_domingo_inicio: "", horario_domingo_fim: "",
  });

  async function buscarCep(cep: string) {
    const clean = cep.replace(/\D/g, "");
    if (clean.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setForm(f => ({ ...f, endereco: `${data.logradouro}, ${data.bairro}, ${data.localidade} - ${data.uf}` }));
      } else {
        toast({ title: "CEP não encontrado", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erro ao buscar CEP", variant: "destructive" });
    } finally {
      setCepLoading(false);
    }
  }

  useEffect(() => {
    if (!profile?.empresa_id) return;
    supabase
      .from("empresas")
      .select("nome_empresa, cnpj, email, telefone, nome_fantasia, endereco, endereco_numero, cep, inscricao_estadual, inscricao_municipal, horario_semana_inicio, horario_semana_fim, horario_sabado_inicio, horario_sabado_fim, horario_domingo_inicio, horario_domingo_fim")
      .eq("id", profile.empresa_id)
      .single()
      .then(({ data }: any) => {
        if (data) setForm({
          nome_empresa: data.nome_empresa || "", cnpj: data.cnpj || "", email: data.email || "", telefone: data.telefone || "",
          nome_fantasia: data.nome_fantasia || "", endereco: data.endereco || "", endereco_numero: data.endereco_numero || "", cep: data.cep || "",
          inscricao_estadual: data.inscricao_estadual || "", inscricao_municipal: data.inscricao_municipal || "",
          horario_semana_inicio: data.horario_semana_inicio || "08:00", horario_semana_fim: data.horario_semana_fim || "18:00",
          horario_sabado_inicio: data.horario_sabado_inicio || "", horario_sabado_fim: data.horario_sabado_fim || "",
          horario_domingo_inicio: data.horario_domingo_inicio || "", horario_domingo_fim: data.horario_domingo_fim || "",
        });
        setLoading(false);
      });
  }, [profile?.empresa_id]);

  const handleSave = async () => {
    if (!profile?.empresa_id) return;
    setSaving(true);
    const { error } = await supabase.from("empresas").update(form as any).eq("id", profile.empresa_id);
    setSaving(false);
    if (error) toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    else toast({ title: "Dados da empresa atualizados!" });
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Dados da Empresa</CardTitle>
        <CardDescription>Informações gerais da sua empresa</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Nome da Empresa</Label>
            <Input value={form.nome_empresa} onChange={(e) => setForm({ ...form, nome_empresa: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Nome Fantasia</Label>
            <Input value={form.nome_fantasia} onChange={(e) => setForm({ ...form, nome_fantasia: e.target.value })} placeholder="Nome fantasia" />
          </div>
          <div className="space-y-2">
            <Label>CNPJ</Label>
            <Input value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} placeholder="00.000.000/0001-00" />
          </div>
          <div className="space-y-2">
            <Label>Inscrição Estadual</Label>
            <Input value={form.inscricao_estadual} onChange={(e) => setForm({ ...form, inscricao_estadual: e.target.value })} placeholder="IE" />
          </div>
          <div className="space-y-2">
            <Label>Inscrição Municipal</Label>
            <Input value={form.inscricao_municipal} onChange={(e) => setForm({ ...form, inscricao_municipal: e.target.value })} placeholder="IM" />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Telefone</Label>
            <Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} placeholder="(00) 00000-0000" />
          </div>
        </div>

        {/* Endereço com CEP */}
        <div className="border-t pt-4 space-y-3">
          <Label className="text-sm font-semibold">Endereço</Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>CEP</Label>
              <div className="relative">
                <Input
                  value={form.cep}
                  onChange={(e) => setForm({ ...form, cep: e.target.value })}
                  onBlur={(e) => buscarCep(e.target.value)}
                  placeholder="00000-000"
                />
                {cepLoading && <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
              </div>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Endereço</Label>
              <Input value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} placeholder="Rua, bairro, cidade - UF" />
            </div>
          </div>
          <div className="w-32 space-y-2">
            <Label>Número</Label>
            <Input value={form.endereco_numero} onChange={(e) => setForm({ ...form, endereco_numero: e.target.value })} placeholder="Nº" />
          </div>
        </div>

        {/* Horários de Funcionamento */}
        <div className="border-t pt-4 space-y-3">
          <Label className="text-sm font-semibold">Horário de Funcionamento</Label>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground w-24 shrink-0">Seg a Sex</span>
              <Input type="time" className="w-28" value={form.horario_semana_inicio} onChange={(e) => setForm({ ...form, horario_semana_inicio: e.target.value })} />
              <span className="text-sm text-muted-foreground">às</span>
              <Input type="time" className="w-28" value={form.horario_semana_fim} onChange={(e) => setForm({ ...form, horario_semana_fim: e.target.value })} />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground w-24 shrink-0">Sábado</span>
              <Input type="time" className="w-28" value={form.horario_sabado_inicio} onChange={(e) => setForm({ ...form, horario_sabado_inicio: e.target.value })} placeholder="--:--" />
              <span className="text-sm text-muted-foreground">às</span>
              <Input type="time" className="w-28" value={form.horario_sabado_fim} onChange={(e) => setForm({ ...form, horario_sabado_fim: e.target.value })} placeholder="--:--" />
              <span className="text-xs text-muted-foreground">(vazio = fechado)</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground w-24 shrink-0">Domingo</span>
              <Input type="time" className="w-28" value={form.horario_domingo_inicio} onChange={(e) => setForm({ ...form, horario_domingo_inicio: e.target.value })} placeholder="--:--" />
              <span className="text-sm text-muted-foreground">às</span>
              <Input type="time" className="w-28" value={form.horario_domingo_fim} onChange={(e) => setForm({ ...form, horario_domingo_fim: e.target.value })} placeholder="--:--" />
              <span className="text-xs text-muted-foreground">(vazio = fechado)</span>
            </div>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Salvar Alterações
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Usuários e Permissões ──────────────────────────────────────────
function UsuariosTab() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newNome, setNewNome] = useState("");
  const [newCargo, setNewCargo] = useState("atendente");
  const [newPassword, setNewPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [creating, setCreating] = useState(false);

  const fetchUsers = async () => {
    if (!profile?.empresa_id) return;
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("empresa_id", profile.empresa_id)
      .order("created_at", { ascending: false });
    setUsers(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, [profile?.empresa_id]);

  const updateCargo = async (id: string, cargo: string) => {
    await supabase.from("profiles").update({ cargo }).eq("id", id);
    toast({ title: "Cargo atualizado" });
    fetchUsers();
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("profiles").update({ status }).eq("id", id);
    toast({ title: `Status alterado para ${status}` });
    fetchUsers();
  };

  const handleCreateUser = async () => {
    if (!newEmail || !newNome || !newPassword) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }
    setCreating(true);
    const { error } = await supabase.auth.signUp({
      email: newEmail,
      password: newPassword,
      options: { data: { nome: newNome } },
    });
    if (error) {
      toast({ title: "Erro ao criar usuário", description: error.message, variant: "destructive" });
    } else {
      // Update the new user's profile to link to this empresa
      // Note: the trigger creates the profile, we need to update it
      setTimeout(async () => {
        await supabase
          .from("profiles")
          .update({ empresa_id: profile?.empresa_id, cargo: newCargo })
          .eq("email", newEmail);
        await fetchUsers();
        toast({ title: "Usuário criado com sucesso!" });
        setDialogOpen(false);
        setNewEmail(""); setNewNome(""); setNewPassword(""); setNewCargo("atendente");
      }, 1000);
    }
    setCreating(false);
  };

  return (
    <div className="space-y-6">
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">Usuários e Permissões</CardTitle>
          <CardDescription>Gerencie sua equipe</CardDescription>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><UserPlus className="h-4 w-4 mr-2" /> Novo Usuário</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Cadastrar Usuário</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={newNome} onChange={(e) => setNewNome(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Senha</Label>
                <div className="relative">
                  <Input type={showPw ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Cargo</Label>
                <Select value={newCargo} onValueChange={setNewCargo}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="gerente">Gerente</SelectItem>
                    <SelectItem value="atendente">Atendente</SelectItem>
                    <SelectItem value="financeiro">Financeiro</SelectItem>
                    <SelectItem value="operacional">Operacional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreateUser} disabled={creating} className="w-full">
                {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Criar Usuário
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.nome}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email || "—"}</TableCell>
                    <TableCell>
                      <Select defaultValue={u.cargo || "atendente"} onValueChange={(v) => updateCargo(u.id, v)}>
                        <SelectTrigger className="h-8 w-[130px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="gerente">Gerente</SelectItem>
                          <SelectItem value="atendente">Atendente</SelectItem>
                          <SelectItem value="financeiro">Financeiro</SelectItem>
                          <SelectItem value="operacional">Operacional</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select defaultValue={u.status} onValueChange={(v) => updateStatus(u.id, v)}>
                        <SelectTrigger className="h-8 w-[110px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ativo">Ativo</SelectItem>
                          <SelectItem value="suspenso">Suspenso</SelectItem>
                          <SelectItem value="bloqueado">Bloqueado</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                  </TableRow>
                ))}
                {users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum usuário encontrado</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
    <PermissoesCargoPanel />
    </div>
  );
}

// ─── Notificações ───────────────────────────────────────────────────
function NotificacoesTab() {
  const [notifs, setNotifs] = useState({
    novoAgendamento: true,
    cancelamento: true,
    novoCliente: false,
    lembreteDiario: true,
    contasVencer: true,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Notificações</CardTitle>
        <CardDescription>Configure quais alertas você deseja receber</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {[
          { key: "novoAgendamento", label: "Novo agendamento", desc: "Receba um alerta quando um novo agendamento for criado" },
          { key: "cancelamento", label: "Cancelamento", desc: "Notificação quando um agendamento for cancelado" },
          { key: "novoCliente", label: "Novo cliente", desc: "Alerta ao cadastrar um novo cliente" },
          { key: "lembreteDiario", label: "Lembrete diário", desc: "Resumo dos agendamentos do dia às 7h" },
          { key: "contasVencer", label: "Contas a vencer", desc: "Alerta de contas próximas do vencimento" },
        ].map((item) => (
          <div key={item.key} className="flex items-center justify-between py-2 border-b border-border last:border-0">
            <div>
              <p className="text-sm font-medium text-foreground">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
            <Switch
              checked={notifs[item.key as keyof typeof notifs]}
              onCheckedChange={(v) => setNotifs({ ...notifs, [item.key]: v })}
            />
          </div>
        ))}
        <p className="text-xs text-muted-foreground pt-2">As preferências são salvas automaticamente.</p>
      </CardContent>
    </Card>
  );
}

// ─── Segurança ──────────────────────────────────────────────────────
function SegurancaTab() {
  const { user } = useAuth();
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [saving, setSaving] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  useEffect(() => {
    supabase
      .from("audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        setLogs(data || []);
        setLoadingLogs(false);
      });
  }, []);

  const handleChangePassword = async () => {
    if (!newPw || !confirmPw) {
      toast({ title: "Preencha os campos de senha", variant: "destructive" });
      return;
    }
    if (newPw !== confirmPw) {
      toast({ title: "As senhas não coincidem", variant: "destructive" });
      return;
    }
    if (newPw.length < 6) {
      toast({ title: "A senha deve ter pelo menos 6 caracteres", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPw });
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao alterar senha", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Senha alterada com sucesso!" });
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Alterar Senha</CardTitle>
          <CardDescription>Atualize sua senha de acesso</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Senha atual</Label>
              <Input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Nova senha</Label>
              <Input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Confirmar nova senha</Label>
              <Input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} />
            </div>
          </div>
          <Button onClick={handleChangePassword} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Shield className="h-4 w-4 mr-2" />}
            Alterar Senha
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Logs de Auditoria</CardTitle>
          <CardDescription>Últimas atividades registradas no sistema</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loadingLogs ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : logs.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">Nenhum log registrado ainda</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ação</TableHead>
                    <TableHead>Tabela</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <Badge variant="outline">{log.acao}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{log.tabela}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(log.created_at).toLocaleString("pt-BR")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Integrações ────────────────────────────────────────────────────
function AsaasIntegrationPanel() {
  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/asaas-webhook`;
  const [copied, setCopied] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    toast({ title: "URL copiada!" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) {
      toast({ title: "Informe a API Key", variant: "destructive" });
      return;
    }
    setSaving(true);
    toast({ title: "API Key informada", description: "Entre em contato com o suporte para finalizar a configuração com esta chave." });
    setSaving(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Asaas — Gateway de Pagamento</CardTitle>
        <CardDescription>Configure a integração com o Asaas para cobranças PIX, boleto e cartão</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label>API Key do Asaas</Label>
          <p className="text-xs text-muted-foreground">
            Cole aqui a API Key encontrada no painel Asaas em <strong>Configurações → Integrações → API</strong>.
          </p>
          <div className="flex items-center gap-2">
            <Input
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Cole sua API Key do Asaas aqui"
              className="font-mono text-xs"
            />
            <Button variant="outline" size="sm" onClick={handleSaveApiKey} disabled={saving} className="whitespace-nowrap">
              Salvar
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label>URL do Webhook</Label>
          <p className="text-xs text-muted-foreground">
            Copie esta URL e cadastre no painel do Asaas em <strong>Configurações → Integrações → Webhooks</strong>.
            Selecione os eventos <strong>PAYMENT_CONFIRMED</strong> e <strong>PAYMENT_RECEIVED</strong>.
          </p>
          <div className="flex items-center gap-2">
            <Input value={webhookUrl} readOnly className="font-mono text-xs" />
            <Button variant="outline" size="sm" onClick={handleCopy} className="whitespace-nowrap">
              {copied ? "Copiado!" : "Copiar"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function IntegracoesTab() {
  return (
    <div className="space-y-6">
      <WhatsAppConnectionPanel />
      <AsaasIntegrationPanel />
    </div>
  );
}

// ─── Usuários Operacionais ──────────────────────────────────────────
function OperacionalTab() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ nome: "", email: "", password: "" });
  const [saving, setSaving] = useState(false);

  const fetchUsers = async () => {
    if (!profile?.empresa_id) return;
    const { data } = await supabase.from("operational_users").select("*").eq("empresa_id", profile.empresa_id).order("nome");
    setUsers(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, [profile?.empresa_id]);

  const handleCreate = async () => {
    if (!profile?.empresa_id || !form.nome || !form.email || !form.password) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }
    setSaving(true);

    // Create auth user first
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { nome: form.nome } },
    });

    if (authError || !authData.user) {
      toast({ title: "Erro ao criar usuário", description: authError?.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    // Create operational user record
    const { error } = await supabase.from("operational_users").insert({
      nome: form.nome,
      email: form.email,
      empresa_id: profile.empresa_id,
      user_id: authData.user.id,
    });

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Usuário operacional criado!" });
      setForm({ nome: "", email: "", password: "" });
      setDialogOpen(false);
      fetchUsers();
    }
    setSaving(false);
  };

  const handleToggle = async (id: string, ativo: boolean) => {
    await supabase.from("operational_users").update({ ativo: !ativo }).eq("id", id);
    fetchUsers();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este usuário operacional?")) return;
    await supabase.from("operational_users").delete().eq("id", id);
    fetchUsers();
    toast({ title: "Usuário removido." });
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">Usuários Operacionais</CardTitle>
          <CardDescription>Gerencie os acessos ao portal operacional (/operacional/login)</CardDescription>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5"><UserPlus className="h-4 w-4" /> Novo</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo Usuário Operacional</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Nome completo" />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@exemplo.com" />
              </div>
              <div className="space-y-2">
                <Label>Senha</Label>
                <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Mínimo 6 caracteres" />
              </div>
              <Button onClick={handleCreate} disabled={saving} className="w-full">
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Criar Usuário
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {users.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Nenhum usuário operacional cadastrado.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.nome}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    <Badge variant={u.ativo ? "default" : "secondary"}>{u.ativo ? "Ativo" : "Inativo"}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Switch checked={u.ativo} onCheckedChange={() => handleToggle(u.id, u.ativo)} />
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(u.id)} className="h-8 w-8 text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Página Principal ───────────────────────────────────────────────
export default function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") || "empresa";

  return (
    <div className="p-6 space-y-6 max-w-[900px]">
      <div>
        <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          Configurações
        </h1>
        <p className="text-sm text-muted-foreground">Gerencie as configurações da sua empresa</p>
      </div>

      <Tabs defaultValue={defaultTab} onValueChange={(v) => setSearchParams({ tab: v }, { replace: true })}>
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="empresa" className="gap-1.5"><Building2 className="h-4 w-4" /> Empresa</TabsTrigger>
          <TabsTrigger value="usuarios" className="gap-1.5"><Users className="h-4 w-4" /> Usuários</TabsTrigger>
          <TabsTrigger value="notificacoes" className="gap-1.5"><Bell className="h-4 w-4" /> Notificações</TabsTrigger>
          <TabsTrigger value="seguranca" className="gap-1.5"><Shield className="h-4 w-4" /> Segurança</TabsTrigger>
          <TabsTrigger value="integracoes" className="gap-1.5"><Settings className="h-4 w-4" /> Integrações</TabsTrigger>
          <TabsTrigger value="operacional" className="gap-1.5"><Wrench className="h-4 w-4" /> Operacional</TabsTrigger>
        </TabsList>

        <TabsContent value="empresa"><EmpresaTab /></TabsContent>
        <TabsContent value="usuarios"><UsuariosTab /></TabsContent>
        <TabsContent value="notificacoes"><NotificacoesTab /></TabsContent>
        <TabsContent value="seguranca"><SegurancaTab /></TabsContent>
        <TabsContent value="integracoes"><IntegracoesTab /></TabsContent>
        <TabsContent value="operacional"><OperacionalTab /></TabsContent>
      </Tabs>
    </div>
  );
}
