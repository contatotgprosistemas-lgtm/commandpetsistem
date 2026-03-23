import { useEffect, useState } from "react";
import { CreditCard, AlertCircle, CheckCircle2, Clock, Filter } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { usePortalCliente } from "@/hooks/usePortalCliente";

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

  useEffect(() => {
    if (!cliente) return;
    const fetch = async () => {
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
    fetch();
  }, [cliente, filter]);

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
            <CardContent className="p-4 flex items-center justify-between">
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
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
