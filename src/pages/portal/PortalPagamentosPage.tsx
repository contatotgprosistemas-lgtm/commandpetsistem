import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { CreditCard, Copy, Check, Loader2, QrCode, Download, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { usePortalCliente } from "@/hooks/usePortalCliente";
import { formatDateBR } from "@/lib/utils";
import { toast } from "sonner";
import jsPDF from "jspdf";

interface Pagamento {
  id: string;
  descricao: string;
  valor: number;
  vencimento: string;
  status: string;
  data_baixa: string | null;
  valor_pago: number | null;
  banco: string | null;
}

interface GrupoFatura {
  vencimento: string;
  status: string; // unified status
  faturas: Pagamento[];
  totalValor: number;
  allPago: boolean;
}

interface PixData {
  payment_id: string;
  qr_code_image: string;
  qr_code_payload: string;
  expiration_date: string;
}

function statusBadge(status: string) {
  switch (status) {
    case "pago": return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200">Pago</Badge>;
    case "pendente": return <Badge className="bg-amber-500/10 text-amber-600 border-amber-200">Pendente</Badge>;
    case "vencido": return <Badge className="bg-destructive/10 text-destructive border-destructive/20">Vencido</Badge>;
    case "cancelado": return <Badge variant="secondary">Cancelado</Badge>;
    default: return <Badge variant="secondary">{status}</Badge>;
  }
}

function gerarComprovante(faturas: Pagamento[], clienteNome: string) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const w = doc.internal.pageSize.getWidth();

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Comprovante de Pagamento", w / 2, 30, { align: "center" });

  doc.setDrawColor(200);
  doc.line(20, 36, w - 20, 36);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");

  const totalValor = faturas.reduce((s, f) => s + (f.valor_pago ?? f.valor), 0);

  const lines: [string, string][] = [
    ["Cliente", clienteNome],
    ["Descrição", faturas.map(f => f.descricao).join(", ")],
    ["Valor Total", `R$ ${totalValor.toFixed(2)}`],
    ["Vencimento", formatDateBR(faturas[0].vencimento)],
    ["Data do Pagamento", faturas[0].data_baixa ? formatDateBR(faturas[0].data_baixa) : new Date().toLocaleDateString("pt-BR")],
    ["Forma de Pagamento", faturas[0].banco || "PIX"],
    ["Status", "Pago"],
  ];

  let y = 46;
  for (const [label, value] of lines) {
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, 25, y);
    doc.setFont("helvetica", "normal");
    const splitValue = doc.splitTextToSize(value, w - 100);
    doc.text(splitValue, 75, y);
    y += 8 * splitValue.length;
  }

  if (faturas.length > 1) {
    y += 4;
    doc.setFont("helvetica", "bold");
    doc.text("Detalhamento:", 25, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    for (const f of faturas) {
      doc.text(`• ${f.descricao} — R$ ${(f.valor_pago ?? f.valor).toFixed(2)}`, 30, y);
      y += 6;
    }
  }

  doc.setDrawColor(200);
  doc.line(20, y + 2, w - 20, y + 2);

  y += 12;
  doc.setFontSize(9);
  doc.setTextColor(130);
  doc.text("Este comprovante foi gerado automaticamente.", w / 2, y, { align: "center" });

  doc.save(`comprovante-${faturas[0].vencimento}.pdf`);
}

export default function PortalPagamentosPage() {
  const { cliente, loading: clienteLoading } = usePortalCliente();
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("todos");
  const [pixDialogOpen, setPixDialogOpen] = useState(false);
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [pixLoading, setPixLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedGrupo, setSelectedGrupo] = useState<GrupoFatura | null>(null);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [pixProgress, setPixProgress] = useState({ current: 0, total: 0 });
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchPagamentos = useCallback(async () => {
    if (!cliente) return;
    let query = supabase
      .from("contas_receber")
      .select("id, descricao, valor, vencimento, status, data_baixa, valor_pago, banco")
      .eq("cliente_id", cliente.id)
      .order("vencimento", { ascending: false });

    if (filter !== "todos") {
      query = query.eq("status", filter);
    }

    const { data } = await query;
    setPagamentos((data as Pagamento[]) ?? []);
    setLoading(false);
  }, [cliente, filter]);

  useEffect(() => {
    fetchPagamentos();
  }, [fetchPagamentos]);

  // Group invoices by vencimento + status group
  const grupos = useMemo<GrupoFatura[]>(() => {
    const map = new Map<string, Pagamento[]>();
    for (const p of pagamentos) {
      const statusGroup = p.status === "pago" ? "pago" : "aberto";
      const key = `${p.vencimento}|${statusGroup}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }

    return Array.from(map.entries()).map(([key, faturas]) => {
      const allPago = faturas.every(f => f.status === "pago");
      const hasVencido = faturas.some(f => f.status === "vencido");
      return {
        vencimento: faturas[0].vencimento,
        status: allPago ? "pago" : hasVencido ? "vencido" : "pendente",
        faturas,
        totalValor: faturas.reduce((s, f) => s + (f.valor_pago ?? f.valor), 0),
        allPago,
      };
    });
  }, [pagamentos]);

  // Poll for payment status while PIX dialog is open
  useEffect(() => {
    if (!pixDialogOpen || !selectedGrupo || paymentConfirmed) {
      if (pollingRef.current) clearInterval(pollingRef.current);
      return;
    }

    const ids = selectedGrupo.faturas.map(f => f.id);

    pollingRef.current = setInterval(async () => {
      const { data } = await supabase
        .from("contas_receber")
        .select("id, status")
        .in("id", ids);

      if (data && data.every((d: any) => d.status === "pago")) {
        setPaymentConfirmed(true);
        fetchPagamentos();
        if (pollingRef.current) clearInterval(pollingRef.current);
      }
    }, 5000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [pixDialogOpen, selectedGrupo, paymentConfirmed, fetchPagamentos]);

  const handlePayPixGrupo = async (grupo: GrupoFatura) => {
    setSelectedGrupo(grupo);
    setPixDialogOpen(true);
    setPixLoading(true);
    setPixData(null);
    setCopied(false);
    setPaymentConfirmed(false);
    setPixProgress({ current: 0, total: grupo.faturas.length });

    try {
      // Generate PIX for each invoice individually, but show combined to user
      // We use the first invoice to generate the PIX QR code with the total amount
      // The edge function handles creating the Asaas payment
      
      // For single invoice, use existing flow
      if (grupo.faturas.length === 1) {
        const { data, error } = await supabase.functions.invoke("asaas-pix", {
          body: { conta_id: grupo.faturas[0].id },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        setPixData(data);
      } else {
        // For multiple invoices, generate PIX for each and show combined total
        // Use the first one's PIX data for display (Asaas will handle each separately)
        const { data, error } = await supabase.functions.invoke("asaas-pix", {
          body: { 
            conta_ids: grupo.faturas.map(f => f.id),
          },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        setPixData(data);
      }
    } catch (err: any) {
      console.error("PIX error:", err);
      toast.error(err.message || "Erro ao gerar PIX");
      setPixDialogOpen(false);
    } finally {
      setPixLoading(false);
    }
  };

  const handleCopyPayload = async () => {
    if (!pixData?.qr_code_payload) return;
    await navigator.clipboard.writeText(pixData.qr_code_payload);
    setCopied(true);
    toast.success("Código PIX copiado!");
    setTimeout(() => setCopied(false), 3000);
  };

  const handleDownloadReceipt = () => {
    if (!selectedGrupo || !cliente) return;
    gerarComprovante(selectedGrupo.faturas, cliente.nome);
  };

  const toggleExpand = (key: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (clienteLoading || loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20 md:pb-0">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Pagamentos</h1>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-36 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="pendente">Pendentes</SelectItem>
            <SelectItem value="pago">Pagos</SelectItem>
            <SelectItem value="vencido">Vencidos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {grupos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <CreditCard className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">Nenhum pagamento encontrado.</p>
        </div>
      ) : (
        grupos.map((grupo) => {
          const key = `${grupo.vencimento}|${grupo.status}`;
          const isExpanded = expandedGroups.has(key);
          const hasMultiple = grupo.faturas.length > 1;
          const descricaoResumo = hasMultiple
            ? `${grupo.faturas.length} faturas`
            : grupo.faturas[0].descricao;

          return (
            <Card key={key}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{descricaoResumo}</p>
                    <p className="text-xs text-muted-foreground">
                      Vencimento: {formatDateBR(grupo.vencimento)}
                      {grupo.allPago && grupo.faturas[0].data_baixa && ` • Pago em: ${formatDateBR(grupo.faturas[0].data_baixa)}`}
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="text-sm font-bold text-foreground">
                      R$ {grupo.totalValor.toFixed(2)}
                    </p>
                    {statusBadge(grupo.status)}
                  </div>
                </div>

                {/* Expandable detail for grouped invoices */}
                {hasMultiple && (
                  <button
                    onClick={() => toggleExpand(key)}
                    className="flex items-center gap-1 mt-2 text-xs text-primary hover:underline"
                  >
                    {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    {isExpanded ? "Ocultar detalhes" : "Ver detalhes das faturas"}
                  </button>
                )}

                {isExpanded && hasMultiple && (
                  <div className="mt-3 space-y-1.5 border-t border-border pt-3">
                    {grupo.faturas.map(f => (
                      <div key={f.id} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground truncate flex-1">{f.descricao}</span>
                        <span className="font-medium text-foreground ml-2">R$ {(f.valor_pago ?? f.valor).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {(grupo.status === "pendente" || grupo.status === "vencido") && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <Button size="sm" className="w-full gap-2" onClick={() => handlePayPixGrupo(grupo)}>
                      <QrCode className="h-4 w-4" />
                      Pagar via PIX {hasMultiple ? `(${grupo.faturas.length} faturas)` : ""}
                    </Button>
                  </div>
                )}

                {grupo.allPago && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full gap-2"
                      onClick={() => {
                        if (!cliente) return;
                        gerarComprovante(grupo.faturas, cliente.nome);
                      }}
                    >
                      <Download className="h-4 w-4" />
                      Baixar Comprovante
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })
      )}

      {/* PIX Dialog */}
      <Dialog open={pixDialogOpen} onOpenChange={(open) => {
        setPixDialogOpen(open);
        if (!open) setPaymentConfirmed(false);
      }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">
              {paymentConfirmed ? "Pagamento Confirmado!" : "Pagamento via PIX"}
            </DialogTitle>
          </DialogHeader>

          {paymentConfirmed ? (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10 text-emerald-600" />
              </div>
              {selectedGrupo && (
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">
                    {selectedGrupo.faturas.length > 1
                      ? `${selectedGrupo.faturas.length} faturas`
                      : selectedGrupo.faturas[0].descricao}
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    R$ {selectedGrupo.totalValor.toFixed(2)}
                  </p>
                  <p className="text-sm text-emerald-600 mt-1">Pagamento recebido com sucesso</p>
                </div>
              )}
              <Button className="w-full gap-2" onClick={handleDownloadReceipt}>
                <Download className="h-4 w-4" />
                Baixar Comprovante
              </Button>
            </div>
          ) : pixLoading ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Gerando QR Code PIX...</p>
            </div>
          ) : pixData ? (
            <div className="flex flex-col items-center gap-4">
              {selectedGrupo && (
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">
                    {selectedGrupo.faturas.length > 1
                      ? `${selectedGrupo.faturas.length} faturas • Venc. ${formatDateBR(selectedGrupo.vencimento)}`
                      : selectedGrupo.faturas[0].descricao}
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    R$ {selectedGrupo.totalValor.toFixed(2)}
                  </p>
                </div>
              )}

              {pixData.qr_code_image && (
                <div className="bg-white p-3 rounded-xl">
                  <img
                    src={`data:image/png;base64,${pixData.qr_code_image}`}
                    alt="QR Code PIX"
                    className="w-48 h-48"
                  />
                </div>
              )}

              <div className="w-full space-y-2">
                <p className="text-xs text-center text-muted-foreground">
                  Ou copie o código PIX abaixo:
                </p>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={pixData.qr_code_payload || ""}
                    className="flex-1 text-[10px] bg-muted rounded-lg px-3 py-2 text-muted-foreground truncate border border-border"
                  />
                  <Button variant="outline" size="icon" className="shrink-0" onClick={handleCopyPayload}>
                    {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2 text-[10px] text-muted-foreground text-center">
                <Loader2 className="h-3 w-3 animate-spin" />
                Aguardando confirmação do pagamento...
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
