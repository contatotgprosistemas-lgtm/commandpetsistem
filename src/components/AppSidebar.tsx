import { useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useEmpresaLogo } from "@/hooks/useEmpresaLogo";
import logoDefault from "@/assets/logo.png";
import {
  LayoutDashboard,
  MessageSquare,
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
  Kanban,
  Bot,
  Gift,
  Car,
  FileSignature,
  CalendarDays,
  Receipt,
  Clock,
  Scissors,
  ListOrdered,
  CalendarCheck,
  Briefcase,
  Wallet,
  Wrench,
} from "lucide-react";

type MenuItem = { icon: any; label: string; path: string };

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);

  const { isSuperAdmin, signOut, profile } = useAuth();
  const { logoUrl: empresaLogo } = useEmpresaLogo(logoDefault);
  const navigate = useNavigate();
  const location = useLocation();

  // --- Módulo Comercial ---
  const comercialPaths = ["/crm", "/kanban", "/chatbot"];
  const isComercialActive = comercialPaths.includes(location.pathname);
  const [comercialOpen, setComercialOpen] = useState(isComercialActive);

  const comercialItems: MenuItem[] = [
    { icon: MessageSquare, label: "CRM WhatsApp", path: "/crm" },
    { icon: Kanban, label: "Pipeline Vendas", path: "/kanban" },
    { icon: Bot, label: "Chatbot", path: "/chatbot" },
  ];

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
    { icon: Clock, label: "Ponto", path: "/ponto" },
  ];

  // --- Módulo Finanças ---
  const financasPaths = ["/financeiro", "/contratos", "/notas-fiscais"];
  const isFinancasActive = financasPaths.includes(location.pathname);
  const [financasOpen, setFinancasOpen] = useState(isFinancasActive);

  const financasItems: MenuItem[] = [
    { icon: DollarSign, label: "Financeiro", path: "/financeiro" },
    { icon: FileSignature, label: "Contratos", path: "/contratos" },
    { icon: Receipt, label: "Notas Fiscais", path: "/notas-fiscais" },
  ];

  const bottomItems = [
    { icon: ClipboardList, label: "Logs de Auditoria", path: "/audit-log" },
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
        `flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 ${
          isActive
            ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
            : "text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/70"
        }`
      }
    >
      <item.icon className="h-[17px] w-[17px] shrink-0" strokeWidth={1.6} />
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

  return (
    <motion.aside
      animate={{ width: collapsed ? 60 : 232 }}
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
        {renderNavItem({ icon: LayoutDashboard, label: "Dashboard", path: "/" })}

        {renderSubmenu("Comercial", Briefcase, comercialItems, isComercialActive, comercialOpen, setComercialOpen)}
        {renderSubmenu("Operacional", Wrench, operacionalItems, isOperacionalActive, operacionalOpen, setOperacionalOpen)}
        {renderSubmenu("Finanças", Wallet, financasItems, isFinancasActive, financasOpen, setFinancasOpen)}

        <div className="pt-2 mt-2 border-t border-sidebar-border/40 space-y-0.5">
          {bottomItems.map(renderNavItem)}
        </div>
      </nav>

      {/* User + Logout */}
      <div className="border-t border-sidebar-border/60 p-2 space-y-0.5">
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
}
