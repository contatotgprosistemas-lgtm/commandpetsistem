import { useEffect, useState } from "react";
import { CreditCard, Copy, Check, Loader2, QrCode } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { usePortalCliente } from "@/hooks/usePortalCliente";
import { toast } from "sonner";

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

export default function PortalPagamentosPage() {
  const { cliente, loading: clienteLoading } = usePortalCliente();
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("todos");
  const [pixDialogOpen, setPixDialogOpen] = useState(false);
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [pixLoading, setPixLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedConta, setSelectedConta] = useState<Pagamento | null>(null);

  useEffect(() => {
    if (!cliente) return;
    const fetchData = async () => {
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
    };
    fetchData();
  }, [cliente, filter]);

  const handlePayPix = async (pagamento: Pagamento) => {
    setSelectedConta(pagamento);
    setPixDialogOpen(true);
    setPixLoading(true);
    setPixData(null);
    setCopied(false);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error("Sessão expirada");

      const { data, error } = await supabase.functions.invoke("asaas-pix", {
        body: { conta_id: pagamento.id },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setPixData(data);
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

      {pagamentos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <CreditCard className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">Nenhum pagamento encontrado.</p>
        </div>
      ) : (
        pagamentos.map((p) => (
          <Card key={p.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{p.descricao}</p>
                  <p className="text-xs text-muted-foreground">
                    Vencimento: {new Date(p.vencimento).toLocaleDateString("pt-BR")}
                    {p.data_baixa && ` • Pago em: ${new Date(p.data_baixa).toLocaleDateString("pt-BR")}`}
                  </p>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className="text-sm font-bold text-foreground">
                    R$ {(p.valor_pago ?? p.valor).toFixed(2)}
                  </p>
                  {statusBadge(p.status)}
                </div>
              </div>
              {(p.status === "pendente" || p.status === "vencido") && (
                <div className="mt-3 pt-3 border-t border-border">
                  <Button
                    size="sm"
                    className="w-full gap-2"
                    onClick={() => handlePayPix(p)}
                  >
                    <QrCode className="h-4 w-4" />
                    Pagar via PIX
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}

      {/* PIX Dialog */}
      <Dialog open={pixDialogOpen} onOpenChange={setPixDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">Pagamento via PIX</DialogTitle>
          </DialogHeader>

          {pixLoading ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Gerando QR Code PIX...</p>
            </div>
          ) : pixData ? (
            <div className="flex flex-col items-center gap-4">
              {selectedConta && (
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">{selectedConta.descricao}</p>
                  <p className="text-2xl font-bold text-foreground">
                    R$ {selectedConta.valor.toFixed(2)}
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
                  <Button
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    onClick={handleCopyPayload}
                  >
                    {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <p className="text-[10px] text-muted-foreground text-center">
                Após o pagamento, o status será atualizado automaticamente.
              </p>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
