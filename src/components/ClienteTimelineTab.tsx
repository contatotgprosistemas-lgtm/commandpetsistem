import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CalendarX, CalendarSync, DollarSign, Package, ClipboardList,
  PawPrint, Loader2, FileText, Stethoscope, MessageCircle
} from "lucide-react";

interface Props {
  clienteId: string;
  empresaId: string;
}

interface TimelineItem {
  id: string;
  date: string;
  type: "servico" | "falta" | "troca" | "pagamento" | "fatura" | "plano" | "manejo" | "mensagem";
  title: string;
  description?: string;
  badge?: { label: string; variant: "default" | "destructive" | "secondary" | "outline" };
  petName?: string;
}

const typeConfig: Record<string, { icon: any; color: string; label: string }> = {
  servico: { icon: PawPrint, color: "text-primary", label: "Serviço" },
  falta: { icon: CalendarX, color: "text-destructive", label: "Falta" },
  troca: { icon: CalendarSync, color: "text-amber-600", label: "Troca" },
  pagamento: { icon: DollarSign, color: "text-emerald-600", label: "Pagamento" },
  fatura: { icon: FileText, color: "text-blue-600", label: "Fatura" },
  plano: { icon: Package, color: "text-violet-600", label: "Plano/Pacote" },
  manejo: { icon: Stethoscope, color: "text-teal-600", label: "Manejo" },
  mensagem: { icon: MessageCircle, color: "text-sky-600", label: "Mensagem" },
};

export function ClienteTimelineTab({ clienteId, empresaId }: Props) {
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("todos");

  useEffect(() => {
    if (!clienteId) return;
    fetchAll();
  }, [clienteId]);

  async function fetchAll() {
    setLoading(true);
    const timeline: TimelineItem[] = [];

    // 1. Serviços realizados (agendamentos concluídos)
    const { data: agendamentos } = await supabase
      .from("agendamentos")
      .select("id, data_hora, tipo_servico, status, valor, notas, pet:pets(nome)")
      .eq("cliente_id", clienteId)
      .in("status", ["concluido", "na_empresa", "agendado", "falta", "troca"])
      .order("data_hora", { ascending: false })
      .limit(200);

    const agIds = (agendamentos || []).map((a: any) => a.id);

    // 2. Faltas e trocas
    let absences: any[] = [];
    if (agIds.length > 0) {
      const { data } = await supabase
        .from("agendamento_absences" as any)
        .select("id, agendamento_id, tipo, notes, created_at, troca_data")
        .in("agendamento_id", agIds);
      absences = data || [];
    }

    // 3. Manejo
    let manejos: any[] = [];
    if (agIds.length > 0) {
      const { data } = await supabase
        .from("manejo_registros" as any)
        .select("id, agendamento_id, pet_id, created_at, respostas")
        .in("agendamento_id", agIds);
      manejos = data || [];
    }

    // 4. Faturas / Pagamentos
    const { data: faturas } = await supabase
      .from("contas_receber")
      .select("id, descricao, valor, vencimento, status, data_baixa, categoria")
      .eq("cliente_id", clienteId)
      .order("vencimento", { ascending: false })
      .limit(200);

    // 5. Planos/Pacotes (subscription events)
    const { data: subs } = await supabase
      .from("customer_pet_subscriptions" as any)
      .select("id, plan_id, package_id, status, created_at, pet:pets(nome), service_plans(name), service_packages(name)")
      .eq("cliente_id", clienteId) as { data: any[] | null };

    let subEvents: any[] = [];
    if (subs && subs.length > 0) {
      const subIds = subs.map((s: any) => s.id);
      const { data } = await supabase
        .from("subscription_events" as any)
        .select("id, subscription_id, event_type, description, created_at")
        .in("subscription_id", subIds)
        .order("created_at", { ascending: false });
      subEvents = data || [];
    }

    // 6. Mensagens enviadas (notificações de fatura)
    const { data: mensagens } = await supabase
      .from("invoice_notification_log" as any)
      .select("id, tipo, status, erro, enviado_em, conta_receber_id")
      .eq("cliente_id", clienteId)
      .eq("empresa_id", empresaId)
      .order("enviado_em", { ascending: false })
      .limit(200) as { data: any[] | null };

    const tipoLabel: Record<string, string> = {
      geracao: "Geração de fatura",
      pre_vencimento: "Pré-vencimento",
      vencimento: "Vencimento",
      atraso: "Atraso",
      multa_atraso: "Multa por atraso",
    };
    const faturaMap = new Map((faturas || []).map((f: any) => [f.id, f]));

    // Map agendamentos to lookup
    const agMap = new Map((agendamentos || []).map((a: any) => [a.id, a]));

    // Build timeline: Serviços concluídos
    for (const ag of (agendamentos || [])) {
      if (ag.status === "concluido") {
        timeline.push({
          id: `srv-${ag.id}`,
          date: ag.data_hora,
          type: "servico",
          title: ag.tipo_servico,
          description: ag.valor ? `R$ ${Number(ag.valor).toFixed(2)}` : undefined,
          petName: (ag as any).pet?.nome,
          badge: { label: "Concluído", variant: "default" },
        });
      }
    }

    // Faltas e trocas
    for (const abs of absences) {
      const ag = agMap.get(abs.agendamento_id);
      const isTroca = abs.tipo === "troca";
      timeline.push({
        id: `abs-${abs.id}`,
        date: abs.created_at,
        type: isTroca ? "troca" : "falta",
        title: isTroca
          ? `Troca de dia${abs.troca_data ? ` → ${format(new Date(abs.troca_data + "T00:00:00"), "dd/MM/yyyy")}` : ""}`
          : abs.tipo === "com_reposicao" ? "Falta com reposição" : "Falta sem reposição",
        description: abs.notes || undefined,
        petName: ag?.pet?.nome,
        badge: isTroca
          ? { label: "Troca", variant: "secondary" as const }
          : { label: abs.tipo === "com_reposicao" ? "Reposição" : "Consumido", variant: abs.tipo === "com_reposicao" ? "outline" as const : "destructive" as const },
      });
    }

    // Manejo
    for (const m of manejos) {
      const ag = agMap.get(m.agendamento_id);
      const respostas = typeof m.respostas === "object" ? m.respostas : {};
      const keys = Object.keys(respostas).slice(0, 3);
      const preview = keys.map((k: string) => `${k}: ${(respostas as any)[k]}`).join(" · ");
      timeline.push({
        id: `man-${m.id}`,
        date: m.created_at,
        type: "manejo",
        title: "Registro de manejo",
        description: preview || undefined,
        petName: ag?.pet?.nome,
      });
    }

    // Faturas
    for (const f of (faturas || [])) {
      if (f.status === "pago") {
        timeline.push({
          id: `pag-${f.id}`,
          date: f.data_baixa || f.vencimento,
          type: "pagamento",
          title: f.descricao,
          description: `R$ ${Number(f.valor).toFixed(2)}`,
          badge: { label: "Pago", variant: "default" },
        });
      } else {
        timeline.push({
          id: `fat-${f.id}`,
          date: f.vencimento,
          type: "fatura",
          title: f.descricao,
          description: `R$ ${Number(f.valor).toFixed(2)} · ${f.categoria || ""}`,
          badge: {
            label: f.status === "pendente" ? "Pendente" : "Vencida",
            variant: f.status === "pendente" ? "secondary" as const : "destructive" as const,
          },
        });
      }
    }

    // Planos/Pacotes events
    for (const ev of subEvents) {
      const sub = (subs || []).find((s: any) => s.id === ev.subscription_id);
      const planName = sub?.service_plans?.name || sub?.service_packages?.name || "";
      timeline.push({
        id: `sub-${ev.id}`,
        date: ev.created_at,
        type: "plano",
        title: `${ev.event_type === "cancel" ? "Cancelamento" : ev.event_type === "pause" ? "Pausa" : "Evento"}: ${planName}`,
        description: ev.description || undefined,
        petName: sub?.pet?.nome,
      });
    }

    // Contratações criadas (sem evento)
    for (const sub of (subs || [])) {
      const planName = (sub as any).service_plans?.name || (sub as any).service_packages?.name || "Plano/Pacote";
      timeline.push({
        id: `subcr-${sub.id}`,
        date: (sub as any).created_at,
        type: "plano",
        title: `Contratação: ${planName}`,
        description: `Status: ${(sub as any).status}`,
        petName: (sub as any).pet?.nome,
        badge: { label: (sub as any).status === "ativo" ? "Ativo" : (sub as any).status, variant: (sub as any).status === "ativo" ? "default" : "secondary" },
      });
    }

    // Mensagens (notificações WhatsApp/Email enviadas)
    for (const msg of (mensagens || [])) {
      const fat = faturaMap.get(msg.conta_receber_id);
      const isFalha = msg.status === "falha";
      timeline.push({
        id: `msg-${msg.id}`,
        date: msg.enviado_em,
        type: "mensagem",
        title: tipoLabel[msg.tipo] || `Notificação (${msg.tipo})`,
        description: isFalha
          ? `Falha no envio${msg.erro ? `: ${msg.erro}` : ""}`
          : fat
            ? `Fatura: ${fat.descricao} · R$ ${Number(fat.valor).toFixed(2)}`
            : "Mensagem enviada via WhatsApp",
        badge: isFalha
          ? { label: "Falha", variant: "destructive" as const }
          : { label: "Enviada", variant: "default" as const },
      });
    }

    // Sort by date descending
    timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setItems(timeline);
    setLoading(false);
  }

  const filteredItems = filter === "todos" ? items : items.filter(i => i.type === filter);

  const filterOptions = [
    { value: "todos", label: "Todos" },
    { value: "servico", label: "Serviços" },
    { value: "falta", label: "Faltas" },
    { value: "troca", label: "Trocas" },
    { value: "pagamento", label: "Pagamentos" },
    { value: "fatura", label: "Faturas" },
    { value: "plano", label: "Planos" },
    { value: "manejo", label: "Manejo" },
    { value: "mensagem", label: "Mensagens" },
  ];

  if (loading) {
    return (
      <div className="py-8 flex items-center justify-center text-muted-foreground gap-2">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando timeline...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex flex-wrap gap-1.5">
        {filterOptions.map(opt => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
              filter === opt.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {opt.label}
            {opt.value !== "todos" && (
              <span className="ml-1 opacity-70">
                ({items.filter(i => i.type === opt.value).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Timeline */}
      <ScrollArea className="h-[400px]">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <ClipboardList className="h-8 w-8 text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">Nenhum registro encontrado</p>
          </div>
        ) : (
          <div className="relative pl-6">
            {/* Vertical line */}
            <div className="absolute left-2.5 top-0 bottom-0 w-px bg-border" />

            {filteredItems.map((item, idx) => {
              const cfg = typeConfig[item.type] || typeConfig.servico;
              const Icon = cfg.icon;
              return (
                <div key={item.id} className="relative pb-4 last:pb-0">
                  {/* Dot */}
                  <div className={`absolute -left-[14px] top-1 flex items-center justify-center h-5 w-5 rounded-full bg-background border-2 border-border`}>
                    <Icon className={`h-3 w-3 ${cfg.color}`} />
                  </div>
                  {/* Content */}
                  <div className="bg-muted/30 rounded-lg p-2.5 ml-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-semibold text-muted-foreground">{cfg.label}</span>
                          {item.badge && (
                            <Badge variant={item.badge.variant} className="text-[10px] h-4 px-1.5">
                              {item.badge.label}
                            </Badge>
                          )}
                          {item.petName && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                              <PawPrint className="h-2.5 w-2.5" /> {item.petName}
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-foreground mt-0.5 truncate">{item.title}</p>
                        {item.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                        {format(new Date(item.date), "dd/MM/yy HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
