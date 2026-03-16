interface StatusTagProps {
  status: "waiting" | "in-bath" | "ready" | "hosted" | "daycare";
  label?: string;
}

const statusConfig = {
  "waiting": { bg: "bg-warning/10", text: "text-warning", label: "Aguardando" },
  "in-bath": { bg: "bg-primary/10", text: "text-primary", label: "Em Banho" },
  "ready": { bg: "bg-success/10", text: "text-success", label: "Pronto" },
  "hosted": { bg: "bg-accent/10", text: "text-accent", label: "Hospedado" },
  "daycare": { bg: "bg-primary/10", text: "text-primary", label: "Daycare" },
};

export function StatusTag({ status, label }: StatusTagProps) {
  const config = statusConfig[status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.bg} ${config.text}`}>
      {label || config.label}
    </span>
  );
}
