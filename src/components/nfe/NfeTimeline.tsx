import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Send, CheckCircle2, XCircle, RefreshCw, Ban, Eye, Download, Webhook } from "lucide-react";

const ICONS: Record<string, any> = {
  criacao: FileText,
  emissao_enviada: Send,
  consulta_status: RefreshCw,
  cancelamento: Ban,
  webhook_recebido: Webhook,
};

export function NfeTimeline({ nfeId, empresaId }: { nfeId: string; empresaId: string }) {
  const { data: events = [] } = useQuery({
    queryKey: ["nfe_events", nfeId],
    queryFn: async () => {
      const { data } = await supabase
        .from("nfe_events")
        .select("*")
        .eq("nfe_id", nfeId)
        .eq("empresa_id", empresaId)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  if (events.length === 0) return <p className="text-sm text-muted-foreground">Nenhum evento registrado.</p>;

  return (
    <div className="space-y-1">
      <h4 className="text-sm font-medium">Linha do Tempo</h4>
      <div className="relative pl-6 space-y-3">
        <div className="absolute left-2.5 top-2 bottom-2 w-px bg-border" />
        {events.map((ev: any) => {
          const Icon = ICONS[ev.event_type] || FileText;
          return (
            <div key={ev.id} className="relative flex gap-3">
              <div className="absolute -left-[14px] top-1 h-5 w-5 rounded-full bg-background border-2 border-primary flex items-center justify-center">
                <Icon className="h-3 w-3 text-primary" />
              </div>
              <div className="flex-1 ml-2">
                <p className="text-sm font-medium">{ev.description}</p>
                {ev.event_message && <p className="text-xs text-muted-foreground">{ev.event_message}</p>}
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(ev.created_at).toLocaleString("pt-BR")}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
