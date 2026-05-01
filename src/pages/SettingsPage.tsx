import { useState, useEffect, useRef } from "react";
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
import { Building2, Users, Bell, Shield, Settings, Loader2, Save, UserPlus, Eye, EyeOff, Trash2, Camera, X, Upload, CalendarDays } from "lucide-react";
import { PermissoesCargoPanel } from "@/components/PermissoesCargoPanel";
import { translateAuthError } from "@/lib/authErrors";
import { AniversariosCard } from "@/components/AniversariosCard";
import { FaturaWhatsappCard } from "@/components/FaturaWhatsappCard";
import { SistemaTab } from "@/components/settings/SistemaTab";
import { FeriadosTab } from "@/components/settings/FeriadosTab";

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
    logo_url: "",
    assinatura_url: "",
    assinatura_responsavel: "",
  });
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAssinatura, setUploadingAssinatura] = useState(false);
  const assinaturaInputRef = useRef<HTMLInputElement>(null);

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
      .select("nome_empresa, cnpj, email, telefone, nome_fantasia, endereco, endereco_numero, cep, inscricao_estadual, inscricao_municipal, horario_semana_inicio, horario_semana_fim, horario_sabado_inicio, horario_sabado_fim, horario_domingo_inicio, horario_domingo_fim, logo_url, assinatura_url, assinatura_responsavel")
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
          logo_url: data.logo_url || "",
          assinatura_url: data.assinatura_url || "",
          assinatura_responsavel: data.assinatura_responsavel || "",
        });
        setLoading(false);
      });
  }, [profile?.empresa_id]);

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile?.empresa_id) return;
    if (!file.type.startsWith("image/")) { toast({ title: "Selecione uma imagem válida", variant: "destructive" }); return; }
    if (file.size > 5 * 1024 * 1024) { toast({ title: "Imagem deve ter no máximo 5MB", variant: "destructive" }); return; }
    setUploadingLogo(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const fileName = `${profile.empresa_id}/logo.${ext}`;
      const { error } = await supabase.storage.from("profile-photos").upload(fileName, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("profile-photos").getPublicUrl(fileName);
      setForm(f => ({ ...f, logo_url: urlData.publicUrl }));
      toast({ title: "Logo enviada! Clique em Salvar para confirmar." });
    } catch (err: any) {
      toast({ title: "Erro ao enviar logo", description: err.message, variant: "destructive" });
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  };

  const handleUploadAssinatura = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile?.empresa_id) return;
    if (!file.type.startsWith("image/")) { toast({ title: "Selecione uma imagem válida", variant: "destructive" }); return; }
    if (file.size > 5 * 1024 * 1024) { toast({ title: "Imagem deve ter no máximo 5MB", variant: "destructive" }); return; }
    setUploadingAssinatura(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const fileName = `${profile.empresa_id}/assinatura.${ext}`;
      const { error } = await supabase.storage.from("profile-photos").upload(fileName, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("profile-photos").getPublicUrl(fileName);
      setForm(f => ({ ...f, assinatura_url: `${urlData.publicUrl}?t=${Date.now()}` }));
      toast({ title: "Assinatura enviada! Clique em Salvar para confirmar." });
    } catch (err: any) {
      toast({ title: "Erro ao enviar assinatura", description: err.message, variant: "destructive" });
    } finally {
      setUploadingAssinatura(false);
      if (assinaturaInputRef.current) assinaturaInputRef.current.value = "";
    }
  };

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
        {/* Logo da Empresa */}
        <div className="flex items-center gap-4">
          <div
            className="h-20 w-20 rounded-lg bg-muted border-2 border-dashed border-border flex items-center justify-center overflow-hidden relative cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => !uploadingLogo && logoInputRef.current?.click()}
          >
            {uploadingLogo ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : form.logo_url ? (
              <>
                <img src={form.logo_url} alt="Logo" className="h-full w-full object-contain" />
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setForm(f => ({ ...f, logo_url: "" })); }}
                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-sm"
                >
                  <X className="h-3 w-3" />
                </button>
              </>
            ) : (
              <Upload className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
            )}
          </div>
          <div>
            <Label className="text-sm font-semibold">Logo da Empresa</Label>
            <p className="text-xs text-muted-foreground">A logo será exibida na sidebar, portal do cliente e portal operacional.</p>
          </div>
          <input ref={logoInputRef} type="file" accept="image/*" onChange={handleUploadLogo} className="hidden" />
        </div>
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

        {/* Assinatura da Empresa */}
        <div className="border-t pt-4 space-y-3">
          <div>
            <Label className="text-sm font-semibold">Assinatura Digital da Empresa</Label>
            <p className="text-xs text-muted-foreground">
              Quando configurada, todos os contratos gerados já serão automaticamente assinados pela empresa.
              O cliente só precisa concluir a assinatura dele.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div
              className="h-24 w-48 rounded-lg bg-muted border-2 border-dashed border-border flex items-center justify-center overflow-hidden relative cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => !uploadingAssinatura && assinaturaInputRef.current?.click()}
            >
              {uploadingAssinatura ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : form.assinatura_url ? (
                <>
                  <img src={form.assinatura_url} alt="Assinatura" className="h-full w-full object-contain bg-white" />
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setForm(f => ({ ...f, assinatura_url: "" })); }}
                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-sm"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </>
              ) : (
                <div className="flex flex-col items-center gap-1 text-muted-foreground">
                  <Upload className="h-5 w-5" strokeWidth={1.5} />
                  <span className="text-xs">Enviar imagem da assinatura</span>
                </div>
              )}
            </div>
            <div className="flex-1 space-y-2">
              <Label>Responsável que assina pela empresa</Label>
              <Input
                value={form.assinatura_responsavel}
                onChange={(e) => setForm({ ...form, assinatura_responsavel: e.target.value })}
                placeholder="Ex: João da Silva — Sócio-administrador"
              />
              <p className="text-xs text-muted-foreground">Esse nome será registrado como assinante da empresa em cada contrato.</p>
            </div>
            <input ref={assinaturaInputRef} type="file" accept="image/*" onChange={handleUploadAssinatura} className="hidden" />
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

// ─── Equipe (Usuários do Sistema) ────────────────────
function EquipeTab() {
  const { profile, user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newNome, setNewNome] = useState("");
  const [newCargo, setNewCargo] = useState("atendente");
  const [newPassword, setNewPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<any>(null);

  const isAdmin = profile?.cargo === "admin";

  const fetchUsers = async () => {
    if (!profile?.empresa_id) return;
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("empresa_id", profile.empresa_id)
      .neq("cargo", "cliente")
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

  const toggleAcessoOperacional = async (id: string, current: boolean) => {
    await supabase.from("profiles").update({ acesso_operacional: !current }).eq("id", id);
    toast({ title: !current ? "Acesso operacional liberado" : "Acesso operacional removido" });
    fetchUsers();
  };

  const handleDeleteUser = async () => {
    if (!confirmDeleteUser) return;
    setDeletingId(confirmDeleteUser.user_id);
    try {
      const { data, error } = await supabase.functions.invoke("excluir-usuario", {
        body: { user_id: confirmDeleteUser.user_id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Usuário excluído com sucesso!" });
      await fetchUsers();
    } catch (err: any) {
      toast({ title: "Erro ao excluir usuário", description: err.message, variant: "destructive" });
    }
    setDeletingId(null);
    setConfirmDeleteUser(null);
  };

  const handleCreateUser = async () => {
    if (!newEmail || !newNome || !newPassword) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("criar-acesso-operacional", {
        body: { nome: newNome, email: newEmail, senha: newPassword, empresa_id: profile?.empresa_id, cargo: newCargo },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      await fetchUsers();
      toast({ title: "Usuário criado com sucesso!" });
      setDialogOpen(false);
      setNewEmail(""); setNewNome(""); setNewPassword(""); setNewCargo("atendente");
    } catch (err: any) {
      toast({ title: "Erro ao criar usuário", description: err.message, variant: "destructive" });
    }
    setCreating(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Usuários do Sistema</CardTitle>
            <CardDescription>Equipe com acesso ao painel administrativo</CardDescription>
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
                      <SelectItem value="banhista">Banhista</SelectItem>
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
                    <TableHead className="min-w-[120px]">Nome</TableHead>
                    <TableHead className="min-w-[160px]">Email</TableHead>
                    <TableHead className="w-[120px]">Cargo</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead className="w-[70px] text-center">Oper.</TableHead>
                    <TableHead className="w-[85px]">Criado em</TableHead>
                    {isAdmin && <TableHead className="w-[50px]"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium text-sm">{u.nome}</TableCell>
                      <TableCell className="text-muted-foreground text-sm truncate max-w-[200px]">{u.email || "—"}</TableCell>
                      <TableCell>
                        <Select defaultValue={u.cargo || "atendente"} onValueChange={(v) => updateCargo(u.id, v)}>
                          <SelectTrigger className="h-7 w-[110px] text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="gerente">Gerente</SelectItem>
                            <SelectItem value="atendente">Atendente</SelectItem>
                            <SelectItem value="financeiro">Financeiro</SelectItem>
                            <SelectItem value="operacional">Operacional</SelectItem>
                            <SelectItem value="banhista">Banhista</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select defaultValue={u.status} onValueChange={(v) => updateStatus(u.id, v)}>
                          <SelectTrigger className="h-7 w-[95px] text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ativo">Ativo</SelectItem>
                            <SelectItem value="suspenso">Suspenso</SelectItem>
                            <SelectItem value="bloqueado">Bloqueado</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={u.acesso_operacional ?? true}
                          onCheckedChange={() => toggleAcessoOperacional(u.id, u.acesso_operacional ?? true)}
                        />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {(() => { const [y,m,d] = u.created_at.split("T")[0].split("-").map(Number); return new Date(y, m-1, d).toLocaleDateString("pt-BR"); })()}
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="p-1">
                          {u.user_id !== user?.id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => setConfirmDeleteUser(u)}
                              disabled={deletingId === u.user_id}
                            >
                              {deletingId === u.user_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  {users.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={isAdmin ? 7 : 6} className="text-center text-muted-foreground py-8">Nenhum usuário encontrado</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
             </div>
           )}
         </CardContent>
       </Card>

       {/* Confirmação de exclusão */}
       <Dialog open={!!confirmDeleteUser} onOpenChange={(o) => !o && setConfirmDeleteUser(null)}>
         <DialogContent>
           <DialogHeader>
             <DialogTitle>Excluir Usuário</DialogTitle>
           </DialogHeader>
           <p className="text-sm text-muted-foreground">
             Tem certeza que deseja excluir <strong>{confirmDeleteUser?.nome}</strong> ({confirmDeleteUser?.email})?
             Esta ação é irreversível e removerá todo o acesso deste usuário ao sistema.
           </p>
           <div className="flex justify-end gap-2 pt-4">
             <Button variant="outline" onClick={() => setConfirmDeleteUser(null)}>Cancelar</Button>
             <Button variant="destructive" onClick={handleDeleteUser} disabled={!!deletingId}>
               {deletingId ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
               Excluir
             </Button>
           </div>
         </DialogContent>
       </Dialog>

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
    <div className="space-y-4">
      <AniversariosCard />
      <FaturaWhatsappCard />
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
    </div>
  );
}

// ─── Segurança ──────────────────────────────────────────────────────
function SegurancaTab() {
  const { user } = useAuth();
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [saving, setSaving] = useState(false);

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
      toast({ title: "Erro ao alterar senha", description: translateAuthError(error, "Não foi possível alterar a senha."), variant: "destructive" });
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

    </div>
  );
}

// ─── Integrações ────────────────────────────────────────────────────
function AsaasIntegrationPanel() {
  const { profile } = useAuth();
  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/asaas-webhook`;
  const [copied, setCopied] = useState(false);
  const [contas, setContas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ label: "", api_key: "", teto_mensal: "", prioridade: "1" });
  const [saving, setSaving] = useState(false);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  const fetchContas = async () => {
    if (!profile?.empresa_id) return;
    const { data } = await supabase.from("asaas_contas").select("*").eq("empresa_id", profile.empresa_id).order("prioridade");
    setContas((data as any) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchContas(); }, [profile?.empresa_id]);

  const handleCopy = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    toast({ title: "URL copiada!" });
    setTimeout(() => setCopied(false), 2000);
  };

  const openNew = () => {
    setEditId(null);
    setForm({ label: "", api_key: "", teto_mensal: "", prioridade: String((contas.length || 0) + 1) });
    setDialogOpen(true);
  };

  const openEdit = (c: any) => {
    setEditId(c.id);
    setForm({ label: c.label, api_key: c.api_key, teto_mensal: c.teto_mensal?.toString() || "", prioridade: String(c.prioridade) });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!profile?.empresa_id || !form.label || !form.api_key) {
      toast({ title: "Preencha nome e API Key", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      empresa_id: profile.empresa_id,
      label: form.label,
      api_key: form.api_key,
      teto_mensal: form.teto_mensal ? parseFloat(form.teto_mensal) : null,
      prioridade: parseInt(form.prioridade) || 1,
    };

    let error;
    if (editId) {
      ({ error } = await supabase.from("asaas_contas").update(payload).eq("id", editId));
    } else {
      ({ error } = await supabase.from("asaas_contas").insert(payload));
    }

    // Replicar/atualizar conta bancária correspondente em Financeiro
    if (!error) {
      try {
        const { data: existente } = await supabase
          .from("contas_bancarias")
          .select("id")
          .eq("empresa_id", profile.empresa_id)
          .eq("banco", "Asaas")
          .ilike("titular", form.label)
          .maybeSingle();

        if (existente?.id) {
          await supabase
            .from("contas_bancarias")
            .update({ titular: form.label, banco: "Asaas" })
            .eq("id", existente.id);
        } else {
          await supabase.from("contas_bancarias").insert({
            empresa_id: profile.empresa_id,
            titular: form.label,
            banco: "Asaas",
            saldo_inicial: 0,
            saldo_atual: 0,
          });
        }
      } catch (e) {
        console.warn("Falha ao replicar conta bancária:", e);
      }
    }

    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editId ? "Conta atualizada!" : "Conta cadastrada e replicada no Financeiro!" });
      setDialogOpen(false);
      fetchContas();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta conta Asaas?")) return;
    await supabase.from("asaas_contas").delete().eq("id", id);
    toast({ title: "Conta removida" });
    fetchContas();
  };

  const handleToggle = async (id: string, ativo: boolean) => {
    await supabase.from("asaas_contas").update({ ativo: !ativo }).eq("id", id);
    fetchContas();
  };

  const maskKey = (key: string) => key.length > 12 ? key.slice(0, 8) + "••••••••" + key.slice(-4) : "••••••••";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">Asaas — Gateway de Pagamento</CardTitle>
          <CardDescription>Configure contas Asaas com roteamento automático por teto mensal</CardDescription>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={openNew}><UserPlus className="h-4 w-4 mr-1" /> Adicionar Conta</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editId ? "Editar Conta Asaas" : "Nova Conta Asaas"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1">
                <Label>Nome da Conta <span className="text-destructive">*</span></Label>
                <Input value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} placeholder="Ex: Conta Principal" />
              </div>
              <div className="space-y-1">
                <Label>API Key do Asaas <span className="text-destructive">*</span></Label>
                <Input value={form.api_key} onChange={e => setForm({ ...form, api_key: e.target.value })} placeholder="Cole aqui a API Key" className="font-mono text-xs" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Teto Mensal (R$)</Label>
                  <Input type="number" step="0.01" value={form.teto_mensal} onChange={e => setForm({ ...form, teto_mensal: e.target.value })} placeholder="Sem limite" />
                  <p className="text-xs text-muted-foreground">Deixe vazio para sem limite</p>
                </div>
                <div className="space-y-1">
                  <Label>Prioridade</Label>
                  <Input type="number" min="1" value={form.prioridade} onChange={e => setForm({ ...form, prioridade: e.target.value })} />
                  <p className="text-xs text-muted-foreground">1 = recebe primeiro</p>
                </div>
              </div>
              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {editId ? "Atualizar" : "Cadastrar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-5">
        {loading ? (
          <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : contas.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">Nenhuma conta Asaas cadastrada. Adicione uma conta para começar a receber pagamentos.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Conta</TableHead>
                <TableHead>API Key</TableHead>
                <TableHead>Teto Mensal</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-28">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contas.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.label}</TableCell>
                  <TableCell className="font-mono text-xs">
                    <button onClick={() => setShowKeys(prev => ({ ...prev, [c.id]: !prev[c.id] }))} className="flex items-center gap-1 hover:text-primary">
                      {showKeys[c.id] ? c.api_key : maskKey(c.api_key)}
                      {showKeys[c.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </button>
                  </TableCell>
                  <TableCell>{c.teto_mensal ? `R$ ${Number(c.teto_mensal).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "Sem limite"}</TableCell>
                  <TableCell>{c.prioridade}</TableCell>
                  <TableCell><Badge variant={c.ativo ? "default" : "secondary"}>{c.ativo ? "Ativo" : "Inativo"}</Badge></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}>
                        <Settings className="h-3.5 w-3.5" />
                      </Button>
                      <Switch checked={c.ativo} onCheckedChange={() => handleToggle(c.id, c.ativo)} />
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(c.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <div className="space-y-2 pt-2 border-t">
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
      <AsaasIntegrationPanel />
      <EvolutionApiPanel />
    </div>
  );
}

// ─── Evolution API (WhatsApp) ────────────────────────────────────────
function EvolutionApiPanel() {
  const { profile } = useAuth();
  const empresaId = profile?.empresa_id;
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [instanceName, setInstanceName] = useState("");
  const [numero, setNumero] = useState("");
  const [status, setStatus] = useState<string>("desconectado");
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    if (!empresaId) return;
    (async () => {
      const { data } = await supabase
        .from("conexoes_whatsapp")
        .select("id, instance_name, numero, status, session_data")
        .eq("empresa_id", empresaId)
        .maybeSingle();
      if (data) {
        setInstanceName((data as any).instance_name || "");
        setNumero((data as any).numero || "");
        setStatus((data as any).status || "desconectado");
        setQr(((data as any).session_data?.qr) || null);
      }
      setLoading(false);
    })();
  }, [empresaId]);

  async function callAction(action: "connect" | "status" | "disconnect" | "delete") {
    setWorking(true);
    const { data, error } = await supabase.functions.invoke("whatsapp-qr", { body: { action } });
    setWorking(false);
    if (error || (data as any)?.error) {
      toast({ title: "Erro", description: (data as any)?.error || error?.message, variant: "destructive" });
      return null;
    }
    if (data) {
      if ((data as any).status) setStatus((data as any).status);
      if ("qr" in (data as any)) setQr((data as any).qr || null);
      if ((data as any).instance_name) setInstanceName((data as any).instance_name);
      if ((data as any).numero !== undefined) setNumero((data as any).numero || "");
    }
    return data;
  }

  // Poll status while waiting for QR scan
  useEffect(() => {
    if (status !== "conectando") return;
    const t = setInterval(() => { callAction("status"); }, 4000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Evolution API (WhatsApp)</CardTitle>
        <CardDescription>
          Conecte o WhatsApp lendo o QR code abaixo. O sistema enviará mensagens automáticas (notificações da Esteira de Banho, faturas, etc.) sem depender do CRM.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            <div className="flex items-center justify-between rounded-lg border border-border p-3 bg-card">
              <div>
                <p className="text-sm font-medium text-foreground">
                  Status: {status === "conectado" ? "Conectado" : status === "conectando" ? "Aguardando leitura do QR" : "Desconectado"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {instanceName ? `Instância: ${instanceName}` : "Nenhuma instância configurada"}
                  {numero ? ` • Número: ${numero}` : ""}
                </p>
              </div>
              <Badge variant={status === "conectado" ? "default" : "secondary"}>
                {status === "conectado" ? "Conectado" : status === "conectando" ? "Conectando" : "Desconectado"}
              </Badge>
            </div>

            {status !== "conectado" && qr && (
              <div className="flex flex-col items-center gap-2 rounded-lg border border-border p-4 bg-muted/30">
                <p className="text-sm font-medium">Escaneie o QR Code com o WhatsApp</p>
                <img
                  src={qr.startsWith("data:") ? qr : `data:image/png;base64,${qr}`}
                  alt="QR Code WhatsApp"
                  className="h-64 w-64 rounded-md bg-white p-2"
                />
                <p className="text-xs text-muted-foreground text-center max-w-sm">
                  WhatsApp → Aparelhos conectados → Conectar um aparelho. A página atualiza automaticamente após a leitura.
                </p>
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-2">
              {status !== "conectado" ? (
                <Button onClick={() => callAction("connect")} disabled={working}>
                  {working ? <Loader2 className="h-4 w-4 animate-spin" /> : qr ? "Gerar novo QR" : "Conectar WhatsApp"}
                </Button>
              ) : (
                <Button variant="outline" onClick={() => callAction("disconnect")} disabled={working}>
                  {working ? <Loader2 className="h-4 w-4 animate-spin" /> : "Desconectar"}
                </Button>
              )}
              <Button variant="ghost" onClick={() => callAction("status")} disabled={working}>
                Atualizar status
              </Button>
            </div>
          </>
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
          <TabsTrigger value="equipe" className="gap-1.5"><Users className="h-4 w-4" /> Equipe</TabsTrigger>
          <TabsTrigger value="sistema" className="gap-1.5"><Settings className="h-4 w-4" /> Sistema</TabsTrigger>
          <TabsTrigger value="feriados" className="gap-1.5"><CalendarDays className="h-4 w-4" /> Feriados</TabsTrigger>
          <TabsTrigger value="notificacoes" className="gap-1.5"><Bell className="h-4 w-4" /> Notificações</TabsTrigger>
          <TabsTrigger value="seguranca" className="gap-1.5"><Shield className="h-4 w-4" /> Segurança</TabsTrigger>
          <TabsTrigger value="integracoes" className="gap-1.5"><Settings className="h-4 w-4" /> Integrações</TabsTrigger>
        </TabsList>

        <TabsContent value="empresa"><EmpresaTab /></TabsContent>
        <TabsContent value="equipe"><EquipeTab /></TabsContent>
        <TabsContent value="usuarios"><EquipeTab /></TabsContent>
        <TabsContent value="sistema"><SistemaTab /></TabsContent>
        <TabsContent value="feriados"><FeriadosTab /></TabsContent>
        <TabsContent value="notificacoes"><NotificacoesTab /></TabsContent>
        <TabsContent value="seguranca"><SegurancaTab /></TabsContent>
        <TabsContent value="integracoes"><IntegracoesTab /></TabsContent>
      </Tabs>
    </div>
  );
}
