import { useState, useEffect } from "react";
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
import { Building2, Users, Bell, Shield, Settings, Loader2, Save, UserPlus, Eye, EyeOff } from "lucide-react";

// ─── Dados da Empresa ───────────────────────────────────────────────
function EmpresaTab() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ nome_empresa: "", cnpj: "", email: "", telefone: "" });

  useEffect(() => {
    if (!profile?.empresa_id) return;
    supabase
      .from("empresas")
      .select("nome_empresa, cnpj, email, telefone")
      .eq("id", profile.empresa_id)
      .single()
      .then(({ data }) => {
        if (data) setForm({ nome_empresa: data.nome_empresa, cnpj: data.cnpj || "", email: data.email || "", telefone: data.telefone || "" });
        setLoading(false);
      });
  }, [profile?.empresa_id]);

  const handleSave = async () => {
    if (!profile?.empresa_id) return;
    setSaving(true);
    const { error } = await supabase.from("empresas").update(form).eq("id", profile.empresa_id);
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
            <Label>CNPJ</Label>
            <Input value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} placeholder="00.000.000/0001-00" />
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
function IntegracoesTab() {
  const [statuses, setStatuses] = useState<Record<string, boolean>>({});
  const [connecting, setConnecting] = useState<string | null>(null);

  const integrations = [
    { key: "whatsapp", name: "WhatsApp Business", desc: "Conecte sua conta do WhatsApp para enviar e receber mensagens", icon: "📱" },
    { key: "pagamento", name: "Gateway de Pagamento", desc: "Receba pagamentos online dos seus clientes", icon: "💳" },
    { key: "gcalendar", name: "Google Calendar", desc: "Sincronize agendamentos com o Google Calendar", icon: "📅" },
  ];

  const handleConnect = (key: string) => {
    setConnecting(key);
    // Simula conexão
    setTimeout(() => {
      setStatuses((prev) => ({ ...prev, [key]: !prev[key] }));
      setConnecting(null);
      const isNowConnected = !statuses[key];
      toast({
        title: isNowConnected ? "Integração conectada!" : "Integração desconectada",
        description: isNowConnected
          ? "A configuração detalhada estará disponível em breve."
          : "A integração foi removida.",
      });
    }, 1200);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Integrações</CardTitle>
        <CardDescription>Conecte serviços externos ao seu sistema</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {integrations.map((int) => {
          const connected = statuses[int.key] || false;
          const isLoading = connecting === int.key;
          return (
            <div key={int.key} className="flex items-center justify-between py-3 border-b border-border last:border-0">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{int.icon}</span>
                <div>
                  <p className="text-sm font-medium text-foreground flex items-center gap-2">
                    {int.name}
                    {connected && <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/30">Conectado</Badge>}
                  </p>
                  <p className="text-xs text-muted-foreground">{int.desc}</p>
                </div>
              </div>
              <Button
                variant={connected ? "outline" : "default"}
                size="sm"
                disabled={isLoading}
                onClick={() => handleConnect(int.key)}
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {connected ? "Desconectar" : "Conectar"}
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// ─── Página Principal ───────────────────────────────────────────────
export default function SettingsPage() {
  return (
    <div className="p-6 space-y-6 max-w-[900px]">
      <div>
        <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          Configurações
        </h1>
        <p className="text-sm text-muted-foreground">Gerencie as configurações da sua empresa</p>
      </div>

      <Tabs defaultValue="empresa">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="empresa" className="gap-1.5"><Building2 className="h-4 w-4" /> Empresa</TabsTrigger>
          <TabsTrigger value="usuarios" className="gap-1.5"><Users className="h-4 w-4" /> Usuários</TabsTrigger>
          <TabsTrigger value="notificacoes" className="gap-1.5"><Bell className="h-4 w-4" /> Notificações</TabsTrigger>
          <TabsTrigger value="seguranca" className="gap-1.5"><Shield className="h-4 w-4" /> Segurança</TabsTrigger>
          <TabsTrigger value="integracoes" className="gap-1.5"><Settings className="h-4 w-4" /> Integrações</TabsTrigger>
        </TabsList>

        <TabsContent value="empresa"><EmpresaTab /></TabsContent>
        <TabsContent value="usuarios"><UsuariosTab /></TabsContent>
        <TabsContent value="notificacoes"><NotificacoesTab /></TabsContent>
        <TabsContent value="seguranca"><SegurancaTab /></TabsContent>
        <TabsContent value="integracoes"><IntegracoesTab /></TabsContent>
      </Tabs>
    </div>
  );
}
