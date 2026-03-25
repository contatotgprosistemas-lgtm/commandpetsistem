import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FileText, Send, CheckCircle2, Eye, Shield } from "lucide-react";

interface Props {
  contractId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Event {
  id: string;
  event_type: string;
  description: string | null;
  metadata: any;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

const eventIcons: Record<string, any> = {
  criado: FileText,
  enviado: Send,
  visualizado: Eye,
  assinado: CheckCircle2,
  default: Shield,
};

export function ContractTimelineDialog({ contractId, open, onOpenChange }: Props) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open || !contractId) return;
    setLoading(true);
    supabase
      .from("contract_events")
      .select("*")
      .eq("contract_id", contractId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        setEvents((data as any) || []);
        setLoading(false);
      });
  }, [contractId, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Timeline do Contrato</DialogTitle>
          <DialogDescription>Registro completo de eventos e auditoria</DialogDescription>
        </DialogHeader>
        {loading ? (
          <p className="text-center text-muted-foreground py-4">Carregando...</p>
        ) : events.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">Nenhum evento registrado</p>
        ) : (
          <div className="relative ml-4 border-l-2 border-muted space-y-6 py-2">
            {events.map(evt => {
              const Icon = eventIcons[evt.event_type] || eventIcons.default;
              return (
                <div key={evt.id} className="relative pl-6">
                  <div className="absolute -left-[11px] top-1 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                    <Icon className="h-3 w-3 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-sm capitalize">{evt.event_type}</p>
                    {evt.description && <p className="text-sm text-muted-foreground">{evt.description}</p>}
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(evt.created_at), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
                    </p>
                    {evt.ip_address && (
                      <p className="text-xs text-muted-foreground">IP: {evt.ip_address}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
