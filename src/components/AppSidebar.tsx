import { useState, useEffect } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useEmpresaLogo } from "@/hooks/useEmpresaLogo";
import { useEmpresaModulos } from "@/hooks/useEmpresaModulos";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "@/hooks/useTheme";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Sun, Moon } from "lucide-react";
import { isRouteAllowed } from "@/lib/modulos";
import logoDefault from "@/assets/logo.png";
import {
  LayoutDashboard,
  PawPrint,
  DollarSign,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Shield,
  LogOut,
  ClipboardList,
  Package,
  ShoppingBag,
  Gift,
  Car,
  FileSignature,
  CalendarDays,
  Receipt,
  Clock,
  Scissors,
  ListOrdered,
  CalendarCheck,
  Wallet,
  Wrench,
  Sparkles,
  Bell,
} from "lucide-react";

type MenuItem = { icon: any; label: string; path: string };

export function AppSidebar() {
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, toggle: toggleTheme } = useTheme();

  const { isSuperAdmin, signOut, profile } = useAuth();
  const { logoUrl: empresaLogo } = useEmpresaLogo(logoDefault);
  const modulos = useEmpresaModulos();
  const navigate = useNavigate();
  const location = useLocation();

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // --- Módulo Operacional ---
  const operacionalPaths = [
    "/agenda", "/reservas", "/banho-tosa", "/esteira-banho",
    "/clientes", "/pets", "/servicos", "/produtos", "/planos-pacotes",
    "/taxipet", "/ponto",
  ];
  const isOperacionalActive = operacionalPaths.includes(location.pathname);
  const [operacionalOpen, setOperacionalOpen] = useState(isOperacionalActive);

  const operacionalItems: MenuItem[] = [
    { icon: CalendarDays, label: "Agenda", path: "/agenda" },
    { icon: CalendarCheck, label: "Reservas", path: "/reservas" },
    { icon: Scissors, label: "Banho e Tosa", path: "/banho-tosa" },
    { icon: ListOrdered, label: "Esteira de Banho", path: "/esteira-banho" },
    { icon: Users, label: "Clientes", path: "/clientes" },
    { icon: PawPrint, label: "Pets", path: "/pets" },
    { icon: Package, label: "Serviços", path: "/servicos" },
    { icon: ShoppingBag, label: "Produtos", path: "/produtos" },
    { icon: Gift, label: "Planos e Pacotes", path: "/planos-pacotes" },
    { icon: Car, label: "TaxiPet", path: "/taxipet" },
  ];

  // --- Módulo Finanças ---
  const financasPaths = ["/financeiro", "/contratos", "/notas-fiscais", "/notificacoes-whatsapp"];
  const isFinancasActive = financasPaths.includes(location.pathname);
  const [financasOpen, setFinancasOpen] = useState(isFinancasActive);

  const financasItems: MenuItem[] = [
    { icon: DollarSign, label: "Financeiro", path: "/financeiro" },
    { icon: FileSignature, label: "Contratos", path: "/contratos" },
  ];

  // Filter operational/finance items by contracted modules (skip for super admin – it sees nothing here anyway).
  const filterByModules = (items: MenuItem[]) =>
    items.filter((it) => isRouteAllowed(it.path, modulos));
  const operacionalVisible = filterByModules(operacionalItems);
  const financasVisible = filterByModules(financasItems);

  const showDashboard = !isSuperAdmin;
  const showOperacional = !isSuperAdmin && operacionalVisible.length > 0;
  const showFinancas = !isSuperAdmin && financasVisible.length > 0;

  const bottomItems = [
    ...(isSuperAdmin
      ? [
          { icon: Users, label: "Leads do Site", path: "/leads" },
          { icon: Shield, label: "Super Admin", path: "/admin" },
        ]
      : []),
    { icon: Settings, label: "Configurações", path: "/configuracoes" },
  ];

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const renderNavItem = (item: MenuItem) => (
    <NavLink
      key={item.path}
      to={item.path}
      end={item.path === "/"}
      className={({ isActive }) =>
        `group relative flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 ${
          isActive
            ? "bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-md shadow-primary/30"
            : "text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/60 hover:translate-x-0.5"
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute -left-2 top-1.5 bottom-1.5 w-1 rounded-r-full bg-primary-foreground/90" />
          )}
          <item.icon className={`h-[17px] w-[17px] shrink-0 transition-transform ${isActive ? "scale-110" : "group-hover:scale-110"}`} strokeWidth={isActive ? 2.2 : 1.7} />
      <AnimatePresence>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="whitespace-nowrap overflow-hidden"
          >
            {item.label}
          </motion.span>
        )}
      </AnimatePresence>
        </>
      )}
    </NavLink>
  );

  const renderSubmenu = (
    label: string,
    icon: any,
    items: MenuItem[],
    isActive: boolean,
    isOpen: boolean,
    setOpen: (v: boolean) => void,
  ) => {
    const Icon = icon;
    return (
      <>
        <button
          onClick={() => setOpen(!isOpen)}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 ${
            isActive
              ? "text-sidebar-foreground"
              : "text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/70"
          }`}
        >
          <Icon className="h-[17px] w-[17px] shrink-0" strokeWidth={1.6} />
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="whitespace-nowrap overflow-hidden flex-1 text-left"
              >
                {label}
              </motion.span>
            )}
          </AnimatePresence>
          {!collapsed && (
            <ChevronDown
              className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${
                isOpen ? "rotate-0" : "-rotate-90"
              }`}
            />
          )}
        </button>

        <AnimatePresence>
          {isOpen && !collapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden pl-4 space-y-0.5"
            >
              {items.map(renderNavItem)}
            </motion.div>
          )}
        </AnimatePresence>

        {collapsed && items.map(renderNavItem)}
      </>
    );
  };

  const sidebarBody = (
    <motion.aside
      animate={{ width: isMobile ? 232 : (collapsed ? 60 : 232) }}
      transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
      className="h-screen bg-sidebar flex flex-col border-r border-sidebar-border sticky top-0 z-30 overflow-hidden"
    >
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-sidebar-border/60">
        <img src={empresaLogo} alt="Logo" className="h-8 w-8 rounded-lg object-cover shrink-0" />
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              className="ml-3 text-sm font-semibold text-sidebar-foreground whitespace-nowrap overflow-hidden tracking-tight"
            >
              PetControl System
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {showDashboard && renderNavItem({ icon: LayoutDashboard, label: "Dashboard", path: "/" })}

        {showOperacional && renderSubmenu("Operacional", Wrench, operacionalVisible, isOperacionalActive, operacionalOpen, setOperacionalOpen)}
        {showFinancas && renderSubmenu("Finanças", Wallet, financasVisible, isFinancasActive, financasOpen, setFinancasOpen)}

        <div className="pt-2 mt-2 border-t border-sidebar-border/40 space-y-0.5">
          {bottomItems.map(renderNavItem)}
        </div>
      </nav>

      {/* User + Logout */}
      <div className="border-t border-sidebar-border/60 p-2 space-y-0.5">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/70 transition-all"
          title={theme === "dark" ? "Modo claro" : "Modo escuro"}
        >
          {theme === "dark" ? (
            <Sun className="h-[17px] w-[17px] shrink-0 text-amber-400" strokeWidth={2} />
          ) : (
            <Moon className="h-[17px] w-[17px] shrink-0 text-indigo-500" strokeWidth={2} />
          )}
          <AnimatePresence>
            {!collapsed && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {theme === "dark" ? "Modo claro" : "Modo escuro"}
              </motion.span>
            )}
          </AnimatePresence>
        </button>
        {!collapsed && profile && (
          <div className="px-3 py-1.5 text-[11px] text-sidebar-muted truncate font-medium">
            {profile.nome}
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/70 transition-all"
        >
          <LogOut className="h-[17px] w-[17px] shrink-0" strokeWidth={1.6} />
          <AnimatePresence>
            {!collapsed && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                Sair
              </motion.span>
            )}
          </AnimatePresence>
        </button>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center py-1.5 text-sidebar-muted hover:text-sidebar-foreground transition-colors rounded-lg"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
    </motion.aside>
  );

  if (isMobile) {
    return (
      <>
        {/* Top bar mobile */}
        <header className="md:hidden fixed top-0 inset-x-0 h-12 bg-sidebar border-b border-sidebar-border z-40 flex items-center px-3 gap-2">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <button className="p-2 -ml-2 text-sidebar-foreground">
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-[232px] bg-sidebar border-sidebar-border">
              {sidebarBody}
            </SheetContent>
          </Sheet>
          <img src={empresaLogo} alt="Logo" className="h-7 w-7 rounded-md object-cover" />
          <span className="text-sm font-semibold text-sidebar-foreground tracking-tight truncate">PetControl</span>
        </header>
      </>
    );
  }

  return sidebarBody;
}
