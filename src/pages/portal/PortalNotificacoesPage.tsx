import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Check, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatDateBR } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { usePortalCliente } from "@/hooks/usePortalCliente";

interface Notificacao {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

const typeRouteMap: Record<string, string> = {
  galeria: "/portal/pets",
  foto: "/portal/pets",
  media: "/portal/pets",
  ocorrencia: "/portal/ocorrencias",
  alerta: "/portal/ocorrencias",
  fatura: "/portal/pagamentos",
  cobranca: "/portal/pagamentos",
  vencimento: "/portal/pagamentos",
  pagamento: "/portal/pagamentos",
  financeiro: "/portal/pagamentos",
  agendamento: "/portal/historico",
  agenda: "/portal/historico",
  contrato: "/portal/contratos",
  documento: "/portal/documentos",
  solicitacao: "/portal/solicitacoes",
  transporte: "/portal/transporte",
  manejo: "/portal/manejo",
  boletim: "/portal/manejo",
  checklist: "/portal/checklist",
  mensagem: "/portal/mensagens",
  plano: "/portal/historico",
};

function getRouteForType(type: string): string | null {
  const lower = type.toLowerCase();
  for (const [key, route] of Object.entries(typeRouteMap)) {
    if (lower.includes(key)) return route;
  }
  return null;
}

export default function PortalNotificacoesPage() {
  const { cliente, loading: clienteLoading } = usePortalCliente();
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!cliente) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("customer_notifications")
        .select("*")
        .eq("cliente_id", cliente.id)
        .order("created_at", { ascending: false });
      setNotificacoes((data as Notificacao[]) ?? []);
      setLoading(false);
    };
    fetch();
  }, [cliente]);

  const markAsRead = async (id: string) => {
    await supabase.from("customer_notifications").update({ is_read: true }).eq("id", id);
    setNotificacoes((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  };

  const handleNotificationClick = async (n: Notificacao) => {
    if (!n.is_read) await markAsRead(n.id);
    const route = getRouteForType(n.type);
    if (route) navigate(route);
  };

  const markAllAsRead = async () => {
    if (!cliente) return;
    const unreadIds = notificacoes.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    await supabase.from("customer_notifications").update({ is_read: true }).in("id", unreadIds);
    setNotificacoes((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  if (clienteLoading || loading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-32" />{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>;
  }

  const unreadCount = notificacoes.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-4 pb-20 md:pb-0">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">
          Notificações {unreadCount > 0 && <Badge className="ml-2 bg-destructive text-destructive-foreground">{unreadCount}</Badge>}
        </h1>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs">
            <Check className="h-3 w-3 mr-1" /> Marcar todas como lidas
          </Button>
        )}
      </div>

      {notificacoes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Bell className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">Nenhuma notificação.</p>
        </div>
      ) : (
        notificacoes.map((n) => {
          const hasRoute = !!getRouteForType(n.type);
          return (
            <Card
              key={n.id}
              className={cn("cursor-pointer hover:shadow-md transition-shadow", !n.is_read && "border-l-4 border-l-primary")}
              onClick={() => handleNotificationClick(n)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-medium", !n.is_read ? "text-foreground" : "text-muted-foreground")}>{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <div className="text-right">
                      <Badge variant="secondary" className="text-[10px]">{n.type}</Badge>
                      <p className="text-[10px] text-muted-foreground mt-1">{formatDateBR(n.created_at)}</p>
                    </div>
                    {hasRoute && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
