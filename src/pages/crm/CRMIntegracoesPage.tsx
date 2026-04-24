import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare, Cloud, Server, Send, Instagram, Facebook,
  Webhook, Code2, Sparkles, ExternalLink,
} from "lucide-react";

type Integration = {
  id: string;
  nome: string;
  desc: string;
  icon: any;
  iconBg: string;
  iconFg: string;
  status: "conectado" | "desconectado";
  badge?: string;
  badgeTone?: "primary" | "success";
  href?: string;
  group: "messaging" | "social" | "outros";
  docs?: string;
};

const integrations: Integration[] = [
  {
    id: "evolution",
    nome: "Evolution API",
    desc: "Multi-instância WhatsApp via Baileys, ideal para escalar.",
    icon: MessageSquare,
    iconBg: "bg-emerald-50",
    iconFg: "text-emerald-600",
    status: "desconectado",
    badge: "RECOMENDADO",
    badgeTone: "primary",
    href: "/crm/canais",
    group: "messaging",
    docs: "https://doc.evolution-api.com/",
  },
  {
    id: "meta",
    nome: "Meta Cloud API",
    desc: "API oficial do WhatsApp Business via Meta.",
    icon: Cloud,
    iconBg: "bg-blue-50",
    iconFg: "text-blue-600",
    status: "desconectado",
    badge: "OFICIAL",
    badgeTone: "success",
    group: "messaging",
    docs: "https://developers.facebook.com/docs/whatsapp/cloud-api/",
  },
  {
    id: "wppconnect",
    nome: "WPPConnect",
    desc: "Servidor não-oficial, código aberto.",
    icon: Server,
    iconBg: "bg-violet-50",
    iconFg: "text-violet-600",
    status: "desconectado",
    group: "messaging",
    docs: "https://wppconnect.io/",
  },
  {
    id: "360dialog",
    nome: "360Dialog",
    desc: "BSP oficial Meta com pricing previsível.",
    icon: Send,
    iconBg: "bg-sky-50",
    iconFg: "text-sky-600",
    status: "desconectado",
    group: "messaging",
    docs: "https://www.360dialog.com/",
  },
  {
    id: "instagram",
    nome: "Instagram Direct",
    desc: "DMs, comentários e respostas a stories.",
    icon: Instagram,
    iconBg: "bg-pink-50",
    iconFg: "text-pink-600",
    status: "desconectado",
    group: "social",
  },
  {
    id: "messenger",
    nome: "Facebook Messenger",
    desc: "Páginas, Lead Ads e mensagens.",
    icon: Facebook,
    iconBg: "bg-blue-50",
    iconFg: "text-blue-600",
    status: "desconectado",
    group: "social",
  },
  {
    id: "webhooks",
    nome: "Webhooks",
    desc: "Eventos de entrada e saída para qualquer sistema.",
    icon: Webhook,
    iconBg: "bg-amber-50",
    iconFg: "text-amber-600",
    status: "conectado",
    group: "outros",
  },
  {
    id: "rest",
    nome: "API REST pública",
    desc: "Acesso programático a contatos, deals e mensagens.",
    icon: Code2,
    iconBg: "bg-slate-100",
    iconFg: "text-slate-700",
    status: "conectado",
    group: "outros",
  },
  {
    id: "lovable-ai",
    nome: "Lovable AI",
    desc: "IA nativa para resumo, sentimento e respostas.",
    icon: Sparkles,
    iconBg: "bg-indigo-50",
    iconFg: "text-indigo-600",
    status: "conectado",
    group: "outros",
  },
];

function StatusDot({ status }: { status: Integration["status"] }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          status === "conectado" ? "bg-success" : "bg-muted-foreground/40"
        }`}
      />
      {status === "conectado" ? "Conectado" : "Desconectado"}
    </span>
  );
}

function IntegrationCard({ item }: { item: Integration }) {
  const navigate = useNavigate();
  const Icon = item.icon;
  const connected = item.status === "conectado";
  return (
    <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4 hover:shadow-card-hover transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={`h-11 w-11 rounded-xl ${item.iconBg} flex items-center justify-center shrink-0`}>
            <Icon className={`h-5 w-5 ${item.iconFg}`} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-sm">{item.nome}</h3>
              {item.badge && (
                <Badge
                  className={
                    item.badgeTone === "success"
                      ? "bg-success/10 text-success border-success/20 hover:bg-success/10"
                      : "bg-primary/10 text-primary border-primary/20 hover:bg-primary/10"
                  }
                  variant="outline"
                >
                  {item.badge}
                </Badge>
              )}
            </div>
            <div className="mt-1"><StatusDot status={item.status} /></div>
          </div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
      <div className="flex items-center justify-between pt-2 mt-auto border-t border-border/60">
        {item.docs ? (
          <a
            href={item.docs}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1"
          >
            Documentação <ExternalLink className="h-3 w-3" />
          </a>
        ) : (
          <span className="text-xs text-muted-foreground">Documentação</span>
        )}
        <Button
          size="sm"
          variant={connected ? "outline" : "default"}
          onClick={() => item.href && navigate(item.href)}
          disabled={!connected && !item.href}
        >
          {connected ? "Configurar" : item.href ? "+ Conectar" : "Em breve"}
        </Button>
      </div>
    </div>
  );
}

export default function CRMIntegracoesPage() {
  const messaging = integrations.filter((i) => i.group === "messaging");
  const social = integrations.filter((i) => i.group === "social");
  const outros = integrations.filter((i) => i.group === "outros");

  return (
    <div className="h-full overflow-y-auto p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Integrações</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Conecte canais, APIs e automações.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {messaging.map((i) => (
            <IntegrationCard key={i.id} item={i} />
          ))}
        </div>

        <div className="mt-8 mb-3 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
          Social
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {social.map((i) => (
            <IntegrationCard key={i.id} item={i} />
          ))}
        </div>

        <div className="mt-8 mb-3 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
          Outros
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {outros.map((i) => (
            <IntegrationCard key={i.id} item={i} />
          ))}
        </div>
      </div>
    </div>
  );
}