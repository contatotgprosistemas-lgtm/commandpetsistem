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
import { Users, UserCheck, UserX, Search, Loader2, Shield, Activity, CheckCircle, XCircle, Clock, Trash2, LogIn } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
}

const statusColors: Record<string, string> = {
  ativo: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  suspenso: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  bloqueado: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export default function SuperAdminPage() {
  const { profile } = useAuth();
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCargo, setFilterCargo] = useState("todos");
  const [filterStatus, setFilterStatus] = useState("todos");

  const fetchProfiles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("*, empresas(nome_empresa)")
      .order("created_at", { ascending: false });
    if (!error && data) {
      setProfiles(data.map((p: any) => ({
        ...p,
        empresa_nome: p.empresas?.nome_empresa || null,
      })) as ProfileRow[]);
    }
    setLoading(false);
  };

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

  const pendingProfiles = profiles.filter((p) => !p.aprovado && p.status !== "bloqueado");
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
            Aprovados
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
                            {new Date(p.created_at).toLocaleDateString("pt-BR")}
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
                            {new Date(p.created_at).toLocaleDateString("pt-BR")}
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
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
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
      </Tabs>
    </div>
  );
}
