import { ComercialLayout } from "@/components/comercial/ComercialLayout";
import { useComercialContacts } from "@/hooks/comercial/useComercialContacts";
import { useComercialConversations } from "@/hooks/comercial/useComercialConversations";
import { useComercialPipeline } from "@/hooks/comercial/useComercialPipeline";
import { Activity, DollarSign, MessageSquare, Target, TrendingUp, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function ComercialDashboard() {
  const { contacts } = useComercialContacts();
  const { conversations } = useComercialConversations();
  const { deals, stages } = useComercialPipeline();

  const totalValor = deals.reduce((s, d) => s + Number(d.valor ?? 0), 0);
  const ponderado = deals.reduce((s, d) => s + (Number(d.valor ?? 0) * (d.probabilidade ?? 0)) / 100, 0);
  const naoLidas = conversations.reduce((s, c) => s + (c.unread_count ?? 0), 0);
  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

  return (
    <ComercialLayout title="Dashboard Comercial" subtitle="Visão geral do CRM">
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KPI icon={Target} label="Contatos" value={String(contacts.length)} tone="primary" />
          <KPI icon={MessageSquare} label="Conversas" value={String(conversations.length)} hint={`${naoLidas} não lidas`} tone="info" />
          <KPI icon={Activity} label="Oportunidades" value={String(deals.length)} tone="warning" />
          <KPI icon={DollarSign} label="Valor total" value={fmt(totalValor)} hint={`Ponderado: ${fmt(ponderado)}`} tone="success" />
        </div>

        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Distribuição por etapa</h3>
          </div>
          <div className="space-y-3">
            {stages.map((s) => {
              const list = deals.filter((d) => d.stage_id === s.id);
              const valor = list.reduce((sum, d) => sum + Number(d.valor ?? 0), 0);
              const max = Math.max(...stages.map((st) => deals.filter((d) => d.stage_id === st.id).length), 1);
              const pct = (list.length / max) * 100;
              return (
                <div key={s.id}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ background: s.cor }} />
                      <span className="font-medium text-foreground">{s.nome}</span>
                      <span className="text-muted-foreground">{list.length}</span>
                    </span>
                    <span className="font-semibold text-muted-foreground">{fmt(valor)}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: s.cor }} />
                  </div>
                </div>
              );
            })}
            {stages.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">Pipeline ainda não inicializado.</p>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Últimos contatos</h3>
          </div>
          <div className="divide-y divide-border">
            {contacts.slice(0, 5).map((c) => (
              <div key={c.id} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <p className="font-medium text-foreground">{c.nome}</p>
                  <p className="text-xs text-muted-foreground">{c.telefone ?? c.email ?? "—"}</p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(c.created_at).toLocaleDateString("pt-BR")}
                </span>
              </div>
            ))}
            {contacts.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">Nenhum contato cadastrado.</p>
            )}
          </div>
        </Card>
      </div>
    </ComercialLayout>
  );
}

function KPI({
  icon: Icon,
  label,
  value,
  hint,
  tone = "primary",
}: {
  icon: typeof Target;
  label: string;
  value: string;
  hint?: string;
  tone?: "primary" | "success" | "info" | "warning";
}) {
  const map = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    info: "bg-info/10 text-info",
    warning: "bg-warning/10 text-warning",
  };
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", map[tone])}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold text-foreground">{value}</p>
        </div>
      </div>
      {hint && <p className="mt-2 text-[11px] text-muted-foreground">{hint}</p>}
    </Card>
  );
}