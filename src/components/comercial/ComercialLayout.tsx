import { ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  MessageSquare,
  KanbanSquare,
  Megaphone,
  Contact,
  Bot,
  Sparkles,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/comercial", end: true, label: "Dashboard", icon: LayoutDashboard },
  { to: "/comercial/conversas", label: "Conversas", icon: MessageSquare },
  { to: "/comercial/contatos", label: "Contatos", icon: Contact },
  { to: "/comercial/pipeline", label: "Pipeline", icon: KanbanSquare },
  { to: "/comercial/campanhas", label: "Campanhas", icon: Megaphone },
  { to: "/comercial/automacao", label: "Automação", icon: Bot },
] as const;

export function ComercialLayout({
  children,
  title,
  subtitle,
  noPadding,
}: {
  children: ReactNode;
  title: string;
  subtitle?: string;
  noPadding?: boolean;
}) {
  return (
    <div className="flex h-[calc(100vh-3.5rem)] w-full overflow-hidden bg-background">
      <aside className="hidden md:flex w-56 flex-col border-r border-border bg-card">
        <div className="flex h-14 items-center gap-2 border-b border-border px-4">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg shadow-[var(--shadow-glow)]"
            style={{ background: "var(--gradient-primary)" }}
          >
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <div className="text-sm font-bold text-foreground">Comercial</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">CRM</div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          <ul className="space-y-0.5">
            {nav.map((it) => {
              const Icon = it.icon;
              return (
                <li key={it.to}>
                  <NavLink
                    to={it.to}
                    end={"end" in it && it.end}
                    className={({ isActive }) =>
                      cn(
                        "group flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all",
                        isActive
                          ? "bg-accent text-accent-foreground shadow-sm"
                          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                      )
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {it.label}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="border-t border-border p-2">
          <NavLink
            to="/"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar ao sistema
          </NavLink>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-4 border-b border-border bg-card/60 px-5 backdrop-blur">
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold text-foreground">{title}</h1>
            {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
          </div>
        </header>
        <main className={noPadding ? "flex-1 overflow-hidden" : "flex-1 overflow-y-auto p-5"}>
          {children}
        </main>
      </div>
    </div>
  );
}

export function ComercialMobileTabs() {
  const location = useLocation();
  return (
    <div className="md:hidden border-b border-border bg-card overflow-x-auto">
      <div className="flex gap-1 p-2">
        {nav.map((it) => {
          const active = it.to === "/comercial"
            ? location.pathname === "/comercial"
            : location.pathname.startsWith(it.to);
          return (
            <NavLink
              key={it.to}
              to={it.to}
              end={"end" in it && it.end}
              className={cn(
                "shrink-0 rounded-md px-3 py-1.5 text-xs font-medium",
                active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
              )}
            >
              {it.label}
            </NavLink>
          );
        })}
      </div>
    </div>
  );
}