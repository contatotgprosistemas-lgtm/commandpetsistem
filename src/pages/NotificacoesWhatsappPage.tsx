import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, RefreshCw, Search, AlertCircle, CheckCircle2, Clock, XCircle } from "lucide-react";
import { formatDateBR } from "@/lib/utils";

type LogRow = {
  id: string;
  empresa_id: string;
  cliente_id: string | null;
  conta_receber_id: string | null;
  status: string;
  erro: string | null;
  enviado_em: string;
  tipo: string;
  metadata: any;
  cliente_nome?: string | null;
  cliente_whatsapp?: string | null;
  fatura_descricao?: string | null;
  fatura_valor?: number | null;
  fatura_vencimento?: string | null;
};

const TIPO_LABELS: Record<string, string> = {
  geracao: "Geração",
  pre_vencimento: "Pré-vencimento",
  vencimento: "Vencimento",
  atraso: "Atraso",
  multa_atraso: "Multa atraso",
};

function StatusBadge({ status }: { status: string }) {
  if (status === "enviado")
    return (
      <Badge className="bg-success/15 text-success hover:bg-success/20 gap-1">
        <CheckCircle2 className="h-3 w-3" /> Enviado
      </Badge>
    );
  if (status === "enviando")
    return (
      <Badge className="bg-primary/15 text-primary hover:bg-primary/20 gap-1">
        <Clock className="h-3 w-3" /> Enviando
      </Badge>
    );
  if (status === "falha")
    return (
      <Badge variant="destructive" className="gap-1">
        <XCircle className="h-3 w-3" /> Falha
      </Badge>
    );
  return <Badge variant="secondary">{status}</Badge>;
}

function fmtDateTime(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })} ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })}`;
}

export default function NotificacoesWhatsappPage() {
  const { profile } = useAuth();
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<string>("all");
  const [tipoFiltro, setTipoFiltro] = useState<string>("all");
  const [periodo, setPeriodo] = useState<string>("7");
  const [detalhe, setDetalhe] = useState<LogRow | null>(null);

  const empresaId = profile?.empresa_id;

  async function carregar() {
    if (!empresaId) return;
    setLoading(true);

    const desde = new Date(Date.now() - Number(periodo) * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from("invoice_notification_log")
      .select(
        "id, empresa_id, cliente_id, conta_receber_id, status, erro, enviado_em, tipo, metadata, clientes:cliente_id(nome, whatsapp, telefone), contas_receber:conta_receber_id(descricao, valor, vencimento)"
      )
      .eq("empresa_id", empresaId)
      .gte("enviado_em", desde)
      .order("enviado_em", { ascending: false })
      .limit(1000);

    if (error) {
      console.error(error);
      setRows([]);
    } else {
      setRows(
        (data ?? []).map((r: any) => ({
          ...r,
          cliente_nome: r.clientes?.nome ?? null,
          cliente_whatsapp: r.clientes?.whatsapp ?? r.clientes?.telefone ?? null,
          fatura_descricao: r.contas_receber?.descricao ?? null,
          fatura_valor: r.contas_receber?.valor ?? null,
          fatura_vencimento: r.contas_receber?.vencimento ?? null,
        }))
      );
    }
    setLoading(false);
  }

  useEffect(() => {
    carregar();
  }, [empresaId, periodo]);

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFiltro !== "all" && r.status !== statusFiltro) return false;
      if (tipoFiltro !== "all" && r.tipo !== tipoFiltro) return false;
      if (!q) return true;
      return (
        (r.cliente_nome ?? "").toLowerCase().includes(q) ||
        (r.cliente_whatsapp ?? "").toLowerCase().includes(q) ||
        (r.fatura_descricao ?? "").toLowerCase().includes(q) ||
        (r.erro ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, busca, statusFiltro, tipoFiltro]);

  const stats = useMemo(() => {
    const total = rows.length;
    const enviados = rows.filter((r) => r.status === "enviado").length;
    const enviando = rows.filter((r) => r.status === "enviando").length;
    const falhas = rows.filter((r) => r.status === "falha").length;
    return { total, enviados, enviando, falhas };
  }, [rows]);

  return (
    <div className="p-3 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" /> Notificações WhatsApp
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Status, erros e horário de cada envio por cliente e fatura.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={carregar} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} /> Atualizar
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Total</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{stats.total}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Enviados</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold text-success">{stats.enviados}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Enviando</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold text-primary">{stats.enviando}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Falhas</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold text-destructive">{stats.falhas}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row gap-2 md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente, telefone, fatura ou erro…"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={statusFiltro} onValueChange={setStatusFiltro}>
              <SelectTrigger className="w-full md:w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="enviado">Enviado</SelectItem>
                <SelectItem value="enviando">Enviando</SelectItem>
                <SelectItem value="falha">Falha</SelectItem>
              </SelectContent>
            </Select>
            <Select value={tipoFiltro} onValueChange={setTipoFiltro}>
              <SelectTrigger className="w-full md:w-[170px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {Object.entries(TIPO_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={periodo} onValueChange={setPeriodo}>
              <SelectTrigger className="w-full md:w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Últimas 24h</SelectItem>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : filtradas.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Nenhuma notificação encontrada no período/filtros selecionados.
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[150px]">Data/Hora</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>WhatsApp</TableHead>
                    <TableHead>Fatura</TableHead>
                    <TableHead className="w-[120px]">Tipo</TableHead>
                    <TableHead className="w-[110px]">Status</TableHead>
                    <TableHead className="w-[80px] text-right">Detalhes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtradas.map((r) => (
                    <TableRow key={r.id} className={r.status === "falha" ? "bg-destructive/5" : ""}>
                      <TableCell className="text-xs whitespace-nowrap">{fmtDateTime(r.enviado_em)}</TableCell>
                      <TableCell className="font-medium text-sm">{r.cliente_nome ?? "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.cliente_whatsapp ?? "—"}</TableCell>
                      <TableCell className="text-xs">
                        {r.fatura_descricao ? (
                          <div>
                            <div className="truncate max-w-[260px]">{r.fatura_descricao}</div>
                            {r.fatura_vencimento && (
                              <div className="text-muted-foreground text-[11px]">
                                Venc. {formatDateBR(r.fatura_vencimento)}
                                {r.fatura_valor != null && ` · R$ ${Number(r.fatura_valor).toFixed(2).replace(".", ",")}`}
                              </div>
                            )}
                          </div>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-xs">{TIPO_LABELS[r.tipo] ?? r.tipo}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <StatusBadge status={r.status} />
                          {r.status === "falha" && r.erro && (
                            <span className="text-[10px] text-destructive truncate max-w-[150px]" title={r.erro}>
                              {r.erro}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => setDetalhe(r)}>Ver</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!detalhe} onOpenChange={(o) => !o && setDetalhe(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" /> Detalhes da notificação
            </DialogTitle>
          </DialogHeader>
          {detalhe && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-muted-foreground">Data/Hora (BRT)</div>
                  <div className="font-medium">{fmtDateTime(detalhe.enviado_em)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Status</div>
                  <StatusBadge status={detalhe.status} />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Tipo</div>
                  <div className="font-medium">{TIPO_LABELS[detalhe.tipo] ?? detalhe.tipo}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">WhatsApp</div>
                  <div className="font-medium">{detalhe.cliente_whatsapp ?? "—"}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-xs text-muted-foreground">Cliente</div>
                  <div className="font-medium">{detalhe.cliente_nome ?? "—"}</div>
                </div>
                {detalhe.fatura_descricao && (
                  <div className="col-span-2">
                    <div className="text-xs text-muted-foreground">Fatura</div>
                    <div className="font-medium">{detalhe.fatura_descricao}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {detalhe.fatura_vencimento && `Vencimento: ${formatDateBR(detalhe.fatura_vencimento)}`}
                      {detalhe.fatura_valor != null && ` · R$ ${Number(detalhe.fatura_valor).toFixed(2).replace(".", ",")}`}
                    </div>
                  </div>
                )}
              </div>

              {detalhe.erro && (
                <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3">
                  <div className="text-xs font-medium text-destructive mb-1">Erro</div>
                  <pre className="text-xs whitespace-pre-wrap break-words">{detalhe.erro}</pre>
                </div>
              )}

              {detalhe.metadata && Object.keys(detalhe.metadata ?? {}).length > 0 && (
                <div className="rounded-md bg-muted/50 p-3">
                  <div className="text-xs font-medium text-muted-foreground mb-1">Metadata</div>
                  <pre className="text-xs whitespace-pre-wrap break-words">
                    {JSON.stringify(detalhe.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
