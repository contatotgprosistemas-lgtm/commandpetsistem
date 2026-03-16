interface ChatStatusTagProps {
  status: "novo" | "em_atendimento" | "aguardando" | "finalizado";
}

const config = {
  novo: { bg: "bg-primary/10", text: "text-primary", label: "Novo" },
  em_atendimento: { bg: "bg-success/10", text: "text-success", label: "Em atendimento" },
  aguardando: { bg: "bg-warning/10", text: "text-warning", label: "Aguardando" },
  finalizado: { bg: "bg-muted", text: "text-muted-foreground", label: "Finalizado" },
};

export function ChatStatusTag({ status }: ChatStatusTagProps) {
  const c = config[status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
}
