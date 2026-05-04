import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Users, UserCheck, UserX, Search, Loader2, Shield, Activity, CheckCircle, XCircle, Clock, Trash2, LogIn, PawPrint } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Pencil, Building2 } from "lucide-react";
import { calcularValorMensal, MODULO_PRECOS } from "@/lib/modulos";
import { CobrancaSaasTab } from "@/components/superadmin/CobrancaSaasTab";
import { Receipt } from "lucide-react";

interface ProfileRow {
  id: string;
  nome: string;
  email: string | null;
  empresa_id: string | null;
  cargo: string | null;
  status: string;
  aprovado: boolean;
  created_at: string;
  user_id: string;
  empresa_nome: string | null;
  signup_source: string | null;
}

interface EmpresaModuloRow {
  id: string;
  nome: string;
  created_at: string;
  modulo_banho_tosa: boolean;
  modulo_hotel_creche: boolean;
  modulo_ponto: boolean;
  valor_mensal: number;
  data_inicio: string | null;
  data_fim: string | null;
  observacao: string | null;
}

const statusColors: Record<string, string> = {
  ativo: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  suspenso: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  bloqueado: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export default function SuperAdminPage() {
  const { profile } = useAuth();
  const [allProfiles, setAllProfiles] = useState<ProfileRow[]>([]);
  const [clientUserIds, setClientUserIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCargo, setFilterCargo] = useState("todos");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [searchClientes, setSearchClientes] = useState("");
  const [filterEmpresaCliente, setFilterEmpresaCliente] = useState("todas");
  const [searchEmpresas, setSearchEmpresas] = useState("");
  const [empresas, setEmpresas] = useState<EmpresaModuloRow[]>([]);
  const [editEmpresa, setEditEmpresa] = useState<EmpresaModuloRow | null>(null);

  const fetchProfiles = async () => {
    setLoading(true);
    const [profilesRes, clientRolesRes, clientesRes, empresasRes, modulosRes] = await Promise.all([
      supabase.from("profiles").select("*, empresas(nome_empresa)").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("clientes").select("user_id, empresa_id, empresas(nome_empresa)").not("user_id", "is", null),
      supabase.from("empresas").select("id, nome_empresa, created_at").order("nome_empresa"),
      supabase.from("empresa_modulos").select("*"),
    ]);
    if (!profilesRes.error && profilesRes.data) {
      // Only treat as "portal client" users that have ONLY the 'cliente' role
      // (no system role like admin/gerente/atendente/operacional/banhista/financeiro).
      const rolesByUser = new Map<string, Set<string>>();
      (clientRolesRes.data || []).forEach((r: any) => {
        if (!rolesByUser.has(r.user_id)) rolesByUser.set(r.user_id, new Set());
        rolesByUser.get(r.user_id)!.add(r.role);
      });
      const cIds = new Set<string>();
      rolesByUser.forEach((rs, uid) => {
        if (rs.has("cliente") && rs.size === 1) cIds.add(uid);
      });
      setClientUserIds(cIds);

      // Build map of user_id -> empresa name from clientes table
      const clienteEmpresaMap = new Map<string, string>();
      (clientesRes.data || []).forEach((c: any) => {
        if (c.user_id && c.empresas?.nome_empresa) {
          clienteEmpresaMap.set(c.user_id, c.empresas.nome_empresa);
        }
      });

      setAllProfiles(
        profilesRes.data.map((p: any) => ({
          ...p,
          empresa_nome: p.empresas?.nome_empresa || clienteEmpresaMap.get(p.user_id) || null,
          signup_source: p.signup_source ?? null,
        })) as ProfileRow[]
      );
    }
    if (!empresasRes.error && empresasRes.data) {
      const moduloMap = new Map<string, any>();
      (modulosRes.data || []).forEach((m: any) => moduloMap.set(m.empresa_id, m));
      setEmpresas(
        empresasRes.data.map((e: any) => {
          const m = moduloMap.get(e.id);
          return {
            id: e.id,
            nome: e.nome_empresa,
            created_at: e.created_at,
            modulo_banho_tosa: m?.modulo_banho_tosa ?? false,
            modulo_hotel_creche: m?.modulo_hotel_creche ?? false,
            modulo_ponto: m?.modulo_ponto ?? false,
            valor_mensal: Number(m?.valor_mensal ?? 0),
            data_inicio: m?.data_inicio ?? null,
            data_fim: m?.data_fim ?? null,
            observacao: m?.observacao ?? null,
          };
        })
      );
    }
    setLoading(false);
  };

  // Separate system users from portal clients
  const profiles = allProfiles.filter((p) => !clientUserIds.has(p.user_id));
  const clientProfiles = allProfiles.filter((p) => clientUserIds.has(p.user_id));

  useEffect(() => {
    fetchProfiles();

    // Realtime: alert when new account is created
    const channel = supabase
      .channel('new-profiles')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'profiles' },
        (payload) => {
          const newProfile = payload.new as ProfileRow;
          toast({
            title: "Nova conta criada!",
            description: `${newProfile.nome} (${newProfile.email || 'sem email'}) aguarda aprovação.`,
          });
          fetchProfiles();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const updateStatus = async (profileId: string, newStatus: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ status: newStatus })
      .eq("id", profileId);
    if (error) {
      toast({ title: "Erro ao atualizar status", variant: "destructive" });
    } else {
      toast({ title: `Status atualizado para ${newStatus}` });
      fetchProfiles();
    }
  };

  const updateCargo = async (profileId: string, cargo: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ cargo })
      .eq("id", profileId);
    if (error) {
      toast({ title: "Erro ao atualizar cargo", variant: "destructive" });
    } else {
      toast({ title: `Cargo atualizado para ${cargo}` });
      fetchProfiles();
    }
  };

  const approveUser = async (profileId: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ aprovado: true })
      .eq("id", profileId);
    if (error) {
      toast({ title: "Erro ao aprovar usuário", variant: "destructive" });
    } else {
      toast({ title: "Usuário aprovado com sucesso!" });
      fetchProfiles();
    }
  };

  const rejectUser = async (profileId: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ aprovado: false, status: "bloqueado" })
      .eq("id", profileId);
    if (error) {
      toast({ title: "Erro ao rejeitar usuário", variant: "destructive" });
    } else {
      toast({ title: "Usuário rejeitado e bloqueado" });
      fetchProfiles();
    }
  };

  const deleteUser = async (userId: string) => {
    const { data, error } = await supabase.functions.invoke("excluir-usuario", {
      body: { user_id: userId },
    });
    if (error || data?.error) {
      toast({ title: data?.error || "Erro ao excluir usuário", variant: "destructive" });
    } else {
      toast({ title: "Usuário excluído com sucesso!" });
      fetchProfiles();
    }
  };

  const deleteEmpresa = async (empresaId: string, nome: string) => {
    toast({ title: "Excluindo empresa...", description: nome });
    const { data, error } = await supabase.functions.invoke("excluir-empresa", {
      body: { empresa_id: empresaId },
    });
    if (error || data?.error) {
      toast({ title: data?.error || "Erro ao excluir empresa", variant: "destructive" });
    } else {
      toast({ title: `Empresa ${nome} excluída`, description: `${data?.usuarios_excluidos ?? 0} usuário(s) removido(s)` });
      fetchProfiles();
    }
  };

  const impersonateUser = async (userId: string, nome: string) => {
    toast({ title: "Gerando acesso...", description: `Acessando conta de ${nome}` });
    const { data, error } = await supabase.functions.invoke("impersonate-user", {
      body: { user_id: userId },
    });
    if (error || data?.error) {
      toast({ title: data?.error || "Erro ao acessar conta", variant: "destructive" });
    } else if (data?.url) {
      window.open(data.url, "_blank");
    }
  };

  // Apenas usuários criados via "Criar conta" (signup público) precisam de aprovação.
  // Funcionários criados por admins entram já aprovados (aprovado=true).
  const pendingProfiles = profiles.filter(
    (p) => p.signup_source === "self_signup" && !p.aprovado && p.status !== "bloqueado"
  );
  const approvedProfiles = profiles.filter((p) => p.aprovado);

  const filtered = approvedProfiles.filter((p) => {
    const matchSearch = p.nome.toLowerCase().includes(search.toLowerCase()) || (p.email || "").toLowerCase().includes(search.toLowerCase());
    const matchCargo = filterCargo === "todos" || p.cargo === filterCargo;
    const matchStatus = filterStatus === "todos" || p.status === filterStatus;
    return matchSearch && matchCargo && matchStatus;
  });

  const totalUsers = profiles.length;
  const activeUsers = profiles.filter((p) => p.status === "ativo" && p.aprovado).length;
  const pendingCount = pendingProfiles.length;
  const recentUsers = profiles.filter((p) => {
    const d = new Date(p.created_at);
    const now = new Date();
    return now.getTime() - d.getTime() < 7 * 24 * 60 * 60 * 1000;
  }).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Painel Super Admin
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie todos os usuários do sistema</p>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Usuários</p>
              <p className="text-2xl font-bold">{totalUsers}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <UserCheck className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Aprovados Ativos</p>
              <p className="text-2xl font-bold">{activeUsers}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pendentes</p>
              <p className="text-2xl font-bold">{pendingCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Activity className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Novos (7 dias)</p>
              <p className="text-2xl font-bold">{recentUsers}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue={pendingCount > 0 ? "pendentes" : "aprovados"}>
        <TabsList>
          <TabsTrigger value="pendentes" className="gap-2">
            <Clock className="h-4 w-4" />
            Pendentes
            {pendingCount > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">{pendingCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="aprovados" className="gap-2">
            <UserCheck className="h-4 w-4" />
            Usuários do Sistema
          </TabsTrigger>
          <TabsTrigger value="clientes" className="gap-2">
            <PawPrint className="h-4 w-4" />
            Portal do Cliente
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{clientProfiles.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="empresas" className="gap-2">
            <Building2 className="h-4 w-4" />
            Empresas & Módulos
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{empresas.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="cobranca" className="gap-2">
            <Receipt className="h-4 w-4" />
            Cobrança SaaS
          </TabsTrigger>
        </TabsList>

        {/* Pending Users Tab */}
        <TabsContent value="pendentes">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Usuários Aguardando Aprovação ({pendingCount})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : pendingCount === 0 ? (
                <div className="text-center text-muted-foreground py-12">
                  Nenhum usuário pendente de aprovação
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Empresa</TableHead>
                        <TableHead>Cargo</TableHead>
                        <TableHead>Cadastrado em</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingProfiles.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.nome}</TableCell>
                          <TableCell className="text-muted-foreground">{p.email || "—"}</TableCell>
                          <TableCell className="text-muted-foreground">{p.empresa_nome || "—"}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{p.cargo || "—"}</Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {(() => { const [y,m,d] = p.created_at.split("T")[0].split("-").map(Number); return new Date(y, m-1, d).toLocaleDateString("pt-BR"); })()}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button size="sm" variant="default" className="gap-1" onClick={() => approveUser(p.id)}>
                                <CheckCircle className="h-4 w-4" />
                                Aprovar
                              </Button>
                              <Button size="sm" variant="destructive" className="gap-1" onClick={() => rejectUser(p.id)}>
                                <XCircle className="h-4 w-4" />
                                Rejeitar
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Approved Users Tab */}
        <TabsContent value="aprovados">
          {/* Filters */}
          <Card className="mb-4">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar por nome ou email..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <Select value={filterCargo} onValueChange={setFilterCargo}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Cargo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os cargos</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="gerente">Gerente</SelectItem>
                    <SelectItem value="atendente">Atendente</SelectItem>
                    <SelectItem value="financeiro">Financeiro</SelectItem>
                    <SelectItem value="operacional">Operacional</SelectItem>
                    <SelectItem value="banhista">Banhista</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os status</SelectItem>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="suspenso">Suspenso</SelectItem>
                    <SelectItem value="bloqueado">Bloqueado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Usuários Aprovados ({filtered.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Empresa</TableHead>
                        <TableHead>Cargo</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Criado em</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.nome}</TableCell>
                          <TableCell className="text-muted-foreground">{p.email || "—"}</TableCell>
                          <TableCell className="text-muted-foreground">{p.empresa_nome || "—"}</TableCell>
                          <TableCell>
                            <Select defaultValue={p.cargo || "atendente"} onValueChange={(v) => updateCargo(p.id, v)}>
                              <SelectTrigger className="h-8 w-[130px]">
                                <SelectValue />
                              </SelectTrigger>
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
                            <Select defaultValue={p.status} onValueChange={(v) => updateStatus(p.id, v)}>
                              <SelectTrigger className="h-8 w-[120px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ativo">Ativo</SelectItem>
                                <SelectItem value="suspenso">Suspenso</SelectItem>
                                <SelectItem value="bloqueado">Bloqueado</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {(() => { const [y,m,d] = p.created_at.split("T")[0].split("-").map(Number); return new Date(y, m-1, d).toLocaleDateString("pt-BR"); })()}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1 items-center">
                              <Button variant="ghost" size="sm" className="gap-1 text-primary hover:text-primary" onClick={() => impersonateUser(p.user_id, p.nome)} title="Acessar conta deste usuário">
                                <LogIn className="h-4 w-4" />
                                Acessar
                              </Button>
                              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => updateStatus(p.id, "bloqueado")}>
                                Bloquear
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive h-8 w-8">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Excluir acesso do usuário?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Isso removerá permanentemente o acesso de <strong>{p.nome}</strong> ({p.email}) ao sistema. Esta ação não pode ser desfeita.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deleteUser(p.user_id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                      Excluir
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filtered.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                            Nenhum usuário encontrado
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Portal do Cliente Tab */}
        <TabsContent value="clientes">
          <Card className="mb-4">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar cliente por nome ou email..." className="pl-9" value={searchClientes} onChange={(e) => setSearchClientes(e.target.value)} />
                </div>
                <Select value={filterEmpresaCliente} onValueChange={setFilterEmpresaCliente}>
                  <SelectTrigger className="w-[260px]">
                    <SelectValue placeholder="Empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas as empresas</SelectItem>
                    {empresas.map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Clientes do Portal ({clientProfiles.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Empresa</TableHead>
                        <TableHead>Criado em</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clientProfiles
                        .filter((p) => {
                          if (filterEmpresaCliente !== "todas" && p.empresa_id !== filterEmpresaCliente) return false;
                          if (!searchClientes) return true;
                          const s = searchClientes.toLowerCase();
                          return p.nome.toLowerCase().includes(s) || (p.email || "").toLowerCase().includes(s);
                        })
                        .map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.nome}</TableCell>
                          <TableCell className="text-muted-foreground">{p.email || "—"}</TableCell>
                          <TableCell className="text-muted-foreground">{p.empresa_nome || "—"}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {(() => { const [y,m,d] = p.created_at.split("T")[0].split("-").map(Number); return new Date(y, m-1, d).toLocaleDateString("pt-BR"); })()}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1 items-center">
                              <Button variant="ghost" size="sm" className="gap-1 text-primary hover:text-primary" onClick={() => impersonateUser(p.user_id, p.nome)} title="Acessar conta deste cliente">
                                <LogIn className="h-4 w-4" />
                                Acessar
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive h-8 w-8">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Excluir acesso do cliente?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Isso removerá permanentemente o acesso de <strong>{p.nome}</strong> ({p.email}) ao portal do cliente. Esta ação não pode ser desfeita.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deleteUser(p.user_id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                      Excluir
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {clientProfiles.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                            Nenhum cliente do portal encontrado
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Empresas & Módulos Tab */}
        <TabsContent value="empresas">
          <Card className="mb-4">
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar empresa..." className="pl-9" value={searchEmpresas} onChange={(e) => setSearchEmpresas(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Empresas e Módulos Contratados ({empresas.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empresa</TableHead>
                      <TableHead>Módulos Contratados</TableHead>
                      <TableHead className="text-right">Valor Mensal</TableHead>
                      <TableHead>Início</TableHead>
                      <TableHead className="w-[100px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {empresas
                      .filter((e) => !searchEmpresas || e.nome.toLowerCase().includes(searchEmpresas.toLowerCase()))
                      .map((e) => {
                        const todos = e.modulo_banho_tosa && e.modulo_hotel_creche && e.modulo_ponto;
                        const algum = e.modulo_banho_tosa || e.modulo_hotel_creche || e.modulo_ponto;
                        return (
                          <TableRow key={e.id}>
                            <TableCell className="font-medium">{e.nome}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {todos ? (
                                  <Badge className="bg-primary/10 text-primary border-primary/20">Combo Completo</Badge>
                                ) : (
                                  <>
                                    {e.modulo_banho_tosa && <Badge variant="secondary">Banho e Tosa</Badge>}
                                    {e.modulo_hotel_creche && <Badge variant="secondary">Hotel e Creche</Badge>}
                                    {e.modulo_ponto && <Badge variant="secondary">Ponto Digital</Badge>}
                                    {!algum && <span className="text-xs text-muted-foreground">Nenhum módulo ativo</span>}
                                  </>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              R$ {Number(e.valor_mensal).toFixed(2).replace(".", ",")}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {e.data_inicio
                                ? (() => { const [y, m, d] = e.data_inicio!.split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString("pt-BR"); })()
                                : "—"}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="sm" className="gap-1" onClick={() => setEditEmpresa(e)}>
                                  <Pencil className="h-4 w-4" />
                                  Editar
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="sm" className="gap-1 text-destructive hover:text-destructive">
                                      <Trash2 className="h-4 w-4" />
                                      Excluir
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Excluir empresa {e.nome}?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Esta ação é irreversível. Todos os dados desta empresa (clientes, pets, agendamentos, financeiro, contratos, usuários do sistema, etc.) serão removidos permanentemente.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        onClick={() => deleteEmpresa(e.id, e.nome)}
                                      >
                                        Excluir definitivamente
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    {empresas.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          Nenhuma empresa cadastrada
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <EditarModulosDialog
        empresa={editEmpresa}
        open={!!editEmpresa}
        onClose={() => setEditEmpresa(null)}
        onSaved={() => { setEditEmpresa(null); fetchProfiles(); }}
      />
    </div>
  );
}

function EditarModulosDialog({
  empresa,
  open,
  onClose,
  onSaved,
}: {
  empresa: EmpresaModuloRow | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [banho, setBanho] = useState(false);
  const [hotel, setHotel] = useState(false);
  const [ponto, setPonto] = useState(false);
  const [valor, setValor] = useState<string>("");
  const [valorOverride, setValorOverride] = useState(false);
  const [dataInicio, setDataInicio] = useState<string>("");
  const [observacao, setObservacao] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (empresa) {
      setBanho(empresa.modulo_banho_tosa);
      setHotel(empresa.modulo_hotel_creche);
      setPonto(empresa.modulo_ponto);
      const calc = calcularValorMensal({
        banho_tosa: empresa.modulo_banho_tosa,
        hotel_creche: empresa.modulo_hotel_creche,
        ponto: empresa.modulo_ponto,
      });
      const isOverride = Math.abs(calc - Number(empresa.valor_mensal)) > 0.01;
      setValorOverride(isOverride);
      setValor(Number(empresa.valor_mensal || calc).toFixed(2));
      setDataInicio(empresa.data_inicio || new Date().toISOString().slice(0, 10));
      setObservacao(empresa.observacao || "");
    }
  }, [empresa]);

  const valorCalculado = calcularValorMensal({ banho_tosa: banho, hotel_creche: hotel, ponto });
  const valorFinal = valorOverride ? Number(valor || 0) : valorCalculado;
  const isCombo = banho && hotel && ponto;

  const salvar = async () => {
    if (!empresa) return;
    setSaving(true);
    const { error } = await supabase
      .from("empresa_modulos")
      .upsert({
        empresa_id: empresa.id,
        modulo_banho_tosa: banho,
        modulo_hotel_creche: hotel,
        modulo_ponto: ponto,
        valor_mensal: valorFinal,
        data_inicio: dataInicio || new Date().toISOString().slice(0, 10),
        observacao: observacao || null,
      });
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Módulos atualizados com sucesso!" });
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Editar módulos — {empresa?.nome}</DialogTitle>
          <DialogDescription>
            Selecione quais módulos esta empresa contratou. O valor mensal é calculado automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-3 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Checkbox id="m1" checked={banho} onCheckedChange={(v) => setBanho(!!v)} />
                <Label htmlFor="m1" className="font-medium cursor-pointer">Módulo 1 — Banho e Tosa</Label>
              </div>
              <span className="text-sm text-muted-foreground tabular-nums">R$ {MODULO_PRECOS.banho_tosa.toFixed(2)}/mês</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Checkbox id="m2" checked={hotel} onCheckedChange={(v) => setHotel(!!v)} />
                <Label htmlFor="m2" className="font-medium cursor-pointer">Módulo 2 — Hotel e Creche</Label>
              </div>
              <span className="text-sm text-muted-foreground tabular-nums">R$ {MODULO_PRECOS.hotel_creche.toFixed(2)}/mês</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Checkbox id="m3" checked={ponto} onCheckedChange={(v) => setPonto(!!v)} />
                <Label htmlFor="m3" className="font-medium cursor-pointer">Módulo 3 — Sistema Ponto</Label>
              </div>
              <span className="text-sm text-muted-foreground tabular-nums">R$ {MODULO_PRECOS.ponto.toFixed(2)}/mês</span>
            </div>
            <div className="text-xs text-muted-foreground pt-2 border-t">
              Módulos 1 e 2 incluem TaxiPet e Financeiro. Combo Completo (1+2+3) por R$ {MODULO_PRECOS.combo_completo.toFixed(2)}/mês.
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="data-inicio">Data de início</Label>
              <Input id="data-inicio" type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="valor-mensal">Valor mensal (R$)</Label>
              <Input
                id="valor-mensal"
                type="number"
                step="0.01"
                value={valorOverride ? valor : valorCalculado.toFixed(2)}
                disabled={!valorOverride}
                onChange={(e) => setValor(e.target.value)}
              />
              <label className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground cursor-pointer">
                <Checkbox checked={valorOverride} onCheckedChange={(v) => setValorOverride(!!v)} />
                Sobrescrever valor manualmente
              </label>
            </div>
          </div>

          {isCombo && !valorOverride && (
            <div className="text-xs text-primary bg-primary/5 border border-primary/20 rounded p-2">
              Aplicado preço promocional <strong>Combo Completo</strong>: R$ {MODULO_PRECOS.combo_completo.toFixed(2)}/mês.
            </div>
          )}

          <div>
            <Label htmlFor="obs">Observação (opcional)</Label>
            <Input id="obs" value={observacao} onChange={(e) => setObservacao(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={salvar} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
