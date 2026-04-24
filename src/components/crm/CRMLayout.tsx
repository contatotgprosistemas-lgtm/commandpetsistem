import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  GitBranch,
  Bot,
  Megaphone,
  Phone,
  BarChart3,
  Settings,
  ArrowLeft,
  Sparkles,
  ListChecks,
  FileText,
  Timer,
  Plug,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const items = [
  { to: "/crm", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/crm/conversas", label: "Conversas", icon: MessageSquare, badge: "live" },
  { to: "/crm/contatos", label: "Contatos", icon: Users },
  { to: "/crm/pipeline", label: "Pipeline", icon: GitBranch },
  { to: "/crm/tarefas", label: "Tarefas", icon: ListChecks },
  { to: "/crm/templates", label: "Modelos", icon: FileText },
  { to: "/crm/automacao", label: "Automação", icon: Bot },
  { to: "/crm/campanhas", label: "Campanhas", icon: Megaphone },
  { to: "/crm/canais", label: "Canais", icon: Phone },
  { to: "/crm/integracoes", label: "Integrações", icon: Plug },
  { to: "/crm/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/crm/sla", label: "SLA & Resposta", icon: Timer },
  { to: "/crm/configuracoes", label: "Configurações", icon: Settings },
];

export function CRMLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useAuth();

  return (
    <div className="h-screen w-full flex bg-background text-foreground overflow-hidden">
      {/* Sidebar interna do CRM */}
      <aside className="w-[230px] shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col">
        {/* Topo: voltar + brand */}
        <div className="px-4 py-4 border-b border-sidebar-border/60">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-sidebar-muted hover:text-sidebar-foreground transition-colors mb-3"
          >
            <ArrowLeft className="h-3 w-3" />
            Voltar ao sistema
          </button>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-sidebar-primary">
              <Sparkles className="h-4 w-4 text-sidebar-primary-foreground" strokeWidth={2.2} />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold text-sidebar-foreground">PetCRM</div>
              <div className="text-[10px] text-sidebar-muted uppercase tracking-wider">Omnichannel</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `group flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all relative ${
                    isActive
                      ? "bg-sidebar-accent text-sidebar-foreground"
                      : "text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/60"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.span
                        layoutId="crm-nav-indicator"
                        className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r-full bg-sidebar-primary"
                      />
                    )}
                    <Icon className="h-[17px] w-[17px] shrink-0" strokeWidth={1.7} />
                    <span className="flex-1">{item.label}</span>
                    {item.badge === "live" && (
                      <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Rodapé: usuário */}
        <div className="p-3 border-t border-sidebar-border/60">
          <div className="flex items-center gap-2.5 px-2 py-1.5">
            <div className="h-8 w-8 rounded-full bg-sidebar-accent flex items-center justify-center text-[11px] font-semibold text-sidebar-foreground">
              {profile?.nome?.charAt(0).toUpperCase() ?? "U"}
            </div>
            <div className="flex-1 min-w-0 leading-tight">
              <div className="text-xs font-medium text-sidebar-foreground truncate">
                {profile?.nome ?? "Usuário"}
              </div>
              <div className="text-[10px] text-sidebar-muted truncate flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                Online
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Conteúdo */}
      <main key={location.pathname} className="flex-1 min-w-0 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}