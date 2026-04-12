import { useState } from "react";
import { ClipboardList, Search, Loader2, Filter } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const TABELA_LABELS: Record<string, string> = {
  agendamentos: "Agendamentos",
  clientes: "Clientes",
  pets: "Pets",
  produtos: "Produtos",
  contas_receber: "Contas a Receber",
  contas_pagar: "Contas a Pagar",
  vendas_produtos: "Vendas",
  contracts: "Contratos",
  customer_pet_subscriptions: "Contratações",
  conversas: "Conversas",
  profiles: "Perfis",
  contas_bancarias: "Contas Bancárias",
  movimentacoes_estoque: "Estoque",
};

const ACAO_COLORS: Record<string, "default" | "secondary" | "destructive"> = {
  criou: "default",
  editou: "secondary",
  excluiu: "destructive",
};

const AuditLogPage = () => {
  const { profile } = useAuth();
  const empresaId = profile?.empresa_id;
  const [search, setSearch] = useState("");
  const [tabelaFilter, setTabelaFilter] = useState("todas");
  const [acaoFilter, setAcaoFilter] = useState("todas");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const { data: logs, isLoading } = useQuery({
    queryKey: ["audit-logs", empresaId, tabelaFilter, acaoFilter, search, page],
    queryFn: async () => {
      let query = supabase
        .from("audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (tabelaFilter !== "todas") query = query.eq("tabela", tabelaFilter);
      if (acaoFilter !== "todas") query = query.eq("acao", acaoFilter);

      const { data, error } = await query;
      if (error) throw error;

      // Fetch user names for the logs
      const userIds = [...new Set((data || []).map((l: any) => l.user_id).filter(Boolean))];
      let usersMap: Record<string, { nome: string; email: string }> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, nome, email")
          .in("user_id", userIds);
        profiles?.forEach((p: any) => { usersMap[p.user_id] = { nome: p.nome, email: p.email }; });
      }

      return (data || []).map((l: any) => ({ ...l, _user: usersMap[l.user_id] || null }));
    },
    enabled: !!empresaId,
  });

  const filtered = logs?.filter((l: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    const userName = l._user?.nome?.toLowerCase() || "";
    const userEmail = l._user?.email?.toLowerCase() || "";
    const tabela = l.tabela?.toLowerCase() || "";
    return userName.includes(s) || userEmail.includes(s) || tabela.includes(s);
  });

  const formatDate = (d: string) => {
    const date = new Date(d);
    return `${date.toLocaleDateString("pt-BR")} ${date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`;
  };

  const getResumo = (log: any) => {
    const d = log.detalhes;
    if (!d) return "—";
    if (log.acao === "criou" && d.novo) {
      return d.novo.descricao || d.novo.nome || d.novo.title || d.novo.contato_nome || d.novo.tipo_servico || "Novo registro";
    }
    if (log.acao === "editou" && d.novo) {
      return d.novo.descricao || d.novo.nome || d.novo.title || d.novo.contato_nome || "Registro editado";
    }
    if (log.acao === "excluiu" && d.excluido) {
      return d.excluido.descricao || d.excluido.nome || d.excluido.title || "Registro excluído";
    }
    return "—";
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <ClipboardList className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Logs de Auditoria</h1>
      </div>
      <p className="text-muted-foreground">Histórico completo de todas as ações realizadas no sistema.</p>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-sm">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por usuário..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Tabela</Label>
          <Select value={tabelaFilter} onValueChange={v => { setTabelaFilter(v); setPage(0); }}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              {Object.entries(TABELA_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Ação</Label>
          <Select value={acaoFilter} onValueChange={v => { setAcaoFilter(v); setPage(0); }}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              <SelectItem value="criou">Criou</SelectItem>
              <SelectItem value="editou">Editou</SelectItem>
              <SelectItem value="excluiu">Excluiu</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered && filtered.length > 0 ? (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Módulo</TableHead>
                <TableHead>Resumo</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((log: any) => (
                <TableRow key={log.id}>
                  <TableCell className="text-sm whitespace-nowrap">{formatDate(log.created_at)}</TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm font-medium">{log._user?.nome || "Sistema"}</p>
                      <p className="text-xs text-muted-foreground">{log._user?.email || "—"}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={ACAO_COLORS[log.acao] || "secondary"} className="capitalize">
                      {log.acao}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{TABELA_LABELS[log.tabela] || log.tabela}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{getResumo(log)}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => { setSelectedLog(log); setDetailsOpen(true); }}>
                      Detalhes
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">Página {page + 1}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Anterior</Button>
              <Button variant="outline" size="sm" disabled={(filtered?.length || 0) < pageSize} onClick={() => setPage(p => p + 1)}>Próxima</Button>
            </div>
          </div>
        </>
      ) : (
        <p className="text-center text-muted-foreground py-12">Nenhum log encontrado.</p>
      )}

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Log</DialogTitle>
            <DialogDescription>Informações completas da ação registrada.</DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="font-medium">Data:</span> {formatDate(selectedLog.created_at)}</div>
                <div><span className="font-medium">Usuário:</span> {selectedLog._user?.nome || "Sistema"}</div>
                <div><span className="font-medium">Ação:</span> <Badge variant={ACAO_COLORS[selectedLog.acao] || "secondary"} className="capitalize">{selectedLog.acao}</Badge></div>
                <div><span className="font-medium">Módulo:</span> {TABELA_LABELS[selectedLog.tabela] || selectedLog.tabela}</div>
                <div className="col-span-2"><span className="font-medium">ID do Registro:</span> <span className="text-xs text-muted-foreground">{selectedLog.registro_id}</span></div>
              </div>
              <div>
                <p className="font-medium text-sm mb-2">Dados:</p>
                <pre className="bg-muted rounded-lg p-4 text-xs overflow-x-auto whitespace-pre-wrap max-h-[400px]">
                  {JSON.stringify(selectedLog.detalhes, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AuditLogPage;
