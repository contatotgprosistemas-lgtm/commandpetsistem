import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, XCircle, AlertTriangle, Ban, Loader2, FileX } from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: any; className?: string }> = {
  rascunho: { label: "Rascunho", variant: "secondary", icon: Clock },
  processando: { label: "Processando", variant: "outline", icon: Loader2, className: "animate-spin" },
  autorizada: { label: "Autorizada", variant: "default", icon: CheckCircle2 },
  rejeitada: { label: "Rejeitada", variant: "destructive", icon: XCircle },
  cancelada: { label: "Cancelada", variant: "secondary", icon: Ban },
  erro: { label: "Erro", variant: "destructive", icon: AlertTriangle },
  inutilizada: { label: "Inutilizada", variant: "secondary", icon: FileX },
};

export function NfeStatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || { label: status, variant: "outline" as const, icon: Clock };
  const Icon = config.icon;
  return (
    <Badge variant={config.variant} className="gap-1 text-xs">
      <Icon className={`h-3 w-3 ${config.className || ""}`} />
      {config.label}
    </Badge>
  );
}
