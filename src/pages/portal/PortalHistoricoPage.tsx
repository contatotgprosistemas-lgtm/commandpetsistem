import { useEffect, useState } from "react";
import { History, CreditCard, Wrench, Bell, ClipboardList, FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatDateBRCustom } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { usePortalCliente } from "@/hooks/usePortalCliente";

interface TimelineItem {
  id: string;
  type: "servico" | "pagamento" | "notificacao" | "solicitacao" | "contrato_plano";
  title: string;
  description: string;
  date: string;
}

const iconMap = {
  servico: Wrench,
  pagamento: CreditCard,
  notificacao: Bell,
  solicitacao: ClipboardList,
  contrato_plano: FileText,
};

const colorMap = {
  servico: "bg-primary/10 text-primary",
  pagamento: "bg-emerald-500/10 text-emerald-600",
  notificacao: "bg-amber-500/10 text-amber-600",
  solicitacao: "bg-accent/10 text-accent",
  contrato_plano: "bg-destructive/10 text-destructive",
};

export default function PortalHistoricoPage() {
  const { cliente, loading: clienteLoading } = usePortalCliente();
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!cliente) return;
    const fetch = async () => {
      const [servicos, pagamentos, notificacoes, solicitacoes, assinaturas] = await Promise.all([
        supabase.from("historico_servicos").select("id, tipo_servico, notas, data_servico").eq("cliente_id", cliente.id).order("data_servico", { ascending: false }).limit(20),
        supabase.from("contas_receber").select("id, descricao, valor, vencimento, status").eq("cliente_id", cliente.id).eq("status", "pago").order("vencimento", { ascending: false }).limit(20),
        supabase.from("customer_notifications").select("id, title, message, created_at").eq("cliente_id", cliente.id).order("created_at", { ascending: false }).limit(20),
        supabase.from("customer_requests").select("id, subject, status, created_at").eq("cliente_id", cliente.id).order("created_at", { ascending: false }).limit(20),
        supabase.from("customer_pet_subscriptions").select("id, plan_id, package_id, contract_end_date, status, final_price, service_plans(name), service_packages(name)").eq("cliente_id", cliente.id).not("contract_end_date", "is", null).order("contract_end_date", { ascending: true }).limit(20),
      ]);

      const timeline: TimelineItem[] = [
        ...(servicos.data ?? []).map((s: any) => ({ id: s.id, type: "servico" as const, title: s.tipo_servico, description: s.notas || "", date: s.data_servico })),
        ...(pagamentos.data ?? []).map((p: any) => ({ id: p.id, type: "pagamento" as const, title: p.descricao, description: `R$ ${p.valor.toFixed(2)}`, date: p.vencimento })),
        ...(notificacoes.data ?? []).map((n: any) => ({ id: n.id, type: "notificacao" as const, title: n.title, description: n.message, date: n.created_at })),
        ...(solicitacoes.data ?? []).map((r: any) => ({ id: r.id, type: "solicitacao" as const, title: r.subject, description: r.status, date: r.created_at })),
        ...(contratos.data ?? []).map((c: any) => ({ id: c.id, type: "contrato" as const, title: c.title, description: "Contrato vencido — não assinado a tempo", date: c.token_expires_at || c.created_at })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setItems(timeline);
      setLoading(false);
    };
    fetch();
  }, [cliente]);

  if (clienteLoading || loading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-32" />{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>;
  }

  return (
    <div className="space-y-4 pb-20 md:pb-0">
      <h1 className="text-xl font-bold text-foreground">Histórico</h1>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <History className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">Nenhum registro encontrado.</p>
        </div>
      ) : (
        <div className="relative pl-6 border-l-2 border-border space-y-4">
          {items.map((item) => {
            const Icon = iconMap[item.type];
            return (
              <div key={`${item.type}-${item.id}`} className="relative">
                <div className={cn("absolute -left-[calc(1.5rem+5px)] h-6 w-6 rounded-full flex items-center justify-center", colorMap[item.type])}>
                  <Icon className="h-3 w-3" />
                </div>
                <div className="ml-2">
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {formatDateBRCustom(item.date, { day: "2-digit", month: "short", year: "numeric" })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
