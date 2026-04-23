import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, CalendarDays, Users, PawPrint, LogOut, Menu, X, Clock, CalendarCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useOperationalAuth } from "@/hooks/useOperationalAuth";
import { toast } from "sonner";
import { useState } from "react";
import logoTgPro from "@/assets/logo-tgpro.jpeg";
import { useEmpresaLogo } from "@/hooks/useEmpresaLogo";

const navItems = [
  { path: "/operacional", label: "Dashboard", icon: LayoutDashboard },
  { path: "/operacional/agenda", label: "Agenda", icon: CalendarDays },
  { path: "/operacional/reservas", label: "Reservas", icon: CalendarCheck },
  { path: "/operacional/clientes", label: "Clientes", icon: Users },
  { path: "/operacional/pets", label: "Pets", icon: PawPrint },
  { path: "/operacional/ponto", label: "Ponto", icon: Clock },
];

export function OperacionalLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, signOut } = useOperationalAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { logoUrl: empresaLogo } = useEmpresaLogo(logoTgPro);

  const handleSignOut = async () => {
    await signOut();
    navigate("/operacional/login");
    toast.success("Sessão encerrada.");
  };

  const isActive = (path: string) =>
    path === "/operacional"
      ? location.pathname === "/operacional"
      : location.pathname.startsWith(path);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="h-16 bg-card border-b border-border/60 flex items-center px-4 sticky top-0 z-50">
        <Button variant="ghost" size="icon" className="md:hidden mr-2" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
        <img src={empresaLogo} alt="Logo" className="h-9 w-9 rounded-lg object-cover mr-3" />
        <div>
          <span className="font-semibold text-foreground text-base tracking-tight">Operacional</span>
          {user && <p className="text-xs text-muted-foreground">Olá, {user.nome.split(" ")[0]}</p>}
        </div>
        <div className="ml-auto">
          <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-muted-foreground">
            <LogOut className="h-5 w-5 mr-1" />
            <span className="hidden sm:inline">Sair</span>
          </Button>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar desktop */}
        <aside className="hidden md:flex flex-col w-60 bg-card border-r border-border/60 p-4 gap-2">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex items-center gap-4 px-4 py-3.5 rounded-xl text-base font-medium transition-all text-left",
                isActive(item.path)
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-6 w-6 shrink-0" />
              {item.label}
            </button>
          ))}
        </aside>

        {/* Mobile overlay */}
        {mobileOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
            <aside className="absolute left-0 top-16 bottom-0 w-72 bg-card border-r border-border p-4 flex flex-col gap-2 overflow-y-auto">
              {navItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => { navigate(item.path); setMobileOpen(false); }}
                  className={cn(
                    "flex items-center gap-4 px-4 py-3.5 rounded-xl text-base font-medium transition-colors text-left",
                    isActive(item.path)
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="h-6 w-6 shrink-0" />
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

      {/* Bottom mobile nav - larger icons */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border flex justify-around py-3 z-50">
        {navItems.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={cn(
              "flex flex-col items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors",
              isActive(item.path) ? "text-primary" : "text-muted-foreground"
            )}
          >
            <item.icon className="h-7 w-7" />
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
