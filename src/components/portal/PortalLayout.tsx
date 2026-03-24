import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  MessageCircle,
  CreditCard,
  FileText,
  Bell,
  ClipboardList,
  FolderOpen,
  User,
  LogOut,
  Menu,
  X,
  PawPrint,
  History,
  Camera,
  Stethoscope,
  ClipboardCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const navItems = [
  { path: "/portal", label: "Dashboard", icon: LayoutDashboard },
  { path: "/portal/pets", label: "Meus Pets", icon: PawPrint },
  { path: "/portal/pagamentos", label: "Pagamentos", icon: CreditCard },
  { path: "/portal/mensagens", label: "Mensagens", icon: MessageCircle },
  { path: "/portal/solicitacoes", label: "Solicitações", icon: ClipboardList },
  { path: "/portal/notificacoes", label: "Notificações", icon: Bell },
  { path: "/portal/documentos", label: "Documentos", icon: FolderOpen },
  { path: "/portal/historico", label: "Histórico", icon: History },
  { path: "/portal/galeria", label: "Galeria", icon: Camera },
  { path: "/portal/manejo", label: "Boletim Diário", icon: Stethoscope },
  { path: "/portal/checklist", label: "Checklist", icon: ClipboardCheck },
  { path: "/portal/conta", label: "Minha Conta", icon: User },
];

export function PortalLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/portal/login");
    toast.success("Sessão encerrada.");
  };

  const isActive = (path: string) =>
    path === "/portal"
      ? location.pathname === "/portal"
      : location.pathname.startsWith(path);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="h-14 bg-card border-b border-border flex items-center px-4 sticky top-0 z-50">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden mr-2"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
        <PawPrint className="h-6 w-6 text-primary mr-2" />
        <span className="font-semibold text-foreground text-sm">Meu Portal</span>
        <div className="ml-auto">
          <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-muted-foreground">
            <LogOut className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Sair</span>
          </Button>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar desktop */}
        <aside className="hidden md:flex flex-col w-56 bg-card border-r border-border p-3 gap-1">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left",
                isActive(item.path)
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </button>
          ))}
        </aside>

        {/* Mobile sidebar overlay */}
        {mobileOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
            <aside className="absolute left-0 top-14 bottom-0 w-64 bg-card border-r border-border p-3 flex flex-col gap-1 overflow-y-auto">
              {navItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => {
                    navigate(item.path);
                    setMobileOpen(false);
                  }}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left",
                    isActive(item.path)
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </button>
              ))}
            </aside>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* Bottom mobile nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border flex justify-around py-2 z-50">
        {navItems.slice(0, 5).map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={cn(
              "flex flex-col items-center gap-0.5 text-[10px] font-medium px-2 py-1 rounded-md transition-colors",
              isActive(item.path)
                ? "text-primary"
                : "text-muted-foreground"
            )}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
