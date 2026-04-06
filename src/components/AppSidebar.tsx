import { useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useEmpresaLogo } from "@/hooks/useEmpresaLogo";
import logoTg from "@/assets/logo-tg.png";
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
} from "lucide-react";

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  
  const { isSuperAdmin, signOut, profile } = useAuth();
  const { logoUrl: empresaLogo } = useEmpresaLogo(logoTg);
  const navigate = useNavigate();
  const location = useLocation();

  const isCadastrosActive = ["/clientes", "/pets", "/servicos", "/produtos", "/planos-pacotes"].includes(location.pathname);
  const [cadastrosOpen, setCadastrosOpen] = useState(isCadastrosActive);
  const cadastrosExpanded = cadastrosOpen;

  const isAgendaActive = ["/agenda", "/banho-tosa", "/esteira-banho"].includes(location.pathname);
  const [agendaOpen, setAgendaOpen] = useState(isAgendaActive);
  const agendaExpanded = agendaOpen;

  const mainItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/" },
    { icon: MessageSquare, label: "CRM WhatsApp", path: "/crm" },
    { icon: Kanban, label: "Pipeline Vendas", path: "/kanban" },
    { icon: Bot, label: "Chatbot", path: "/chatbot" },
  ];

  const agendaItems = [
    { icon: CalendarDays, label: "Agenda", path: "/agenda" },
    { icon: Scissors, label: "Banho e Tosa", path: "/banho-tosa" },
    { icon: ListOrdered, label: "Esteira de Banho", path: "/esteira-banho" },
  ];
  const cadastrosItems = [
    { icon: Users, label: "Clientes", path: "/clientes" },
    { icon: PawPrint, label: "Pets", path: "/pets" },
    { icon: Package, label: "Serviços", path: "/servicos" },
    { icon: ShoppingBag, label: "Produtos", path: "/produtos" },
    { icon: Gift, label: "Planos e Pacotes", path: "/planos-pacotes" },
  ];

  const afterCadastrosItems = [
    { icon: DollarSign, label: "Financeiro", path: "/financeiro" },
    { icon: Car, label: "TaxiPet", path: "/taxipet" },
    { icon: FileSignature, label: "Contratos", path: "/contratos" },
    { icon: Receipt, label: "Notas Fiscais", path: "/notas-fiscais" },
    { icon: Clock, label: "Ponto", path: "/ponto" },
  ];

  const bottomItems = [
    ...(isSuperAdmin
      ? [{ icon: Shield, label: "Super Admin", path: "/admin" }]
      : []),
    { icon: Settings, label: "Configurações", path: "/configuracoes" },
  ];

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const renderNavItem = (item: { icon: any; label: string; path: string }) => (
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
        {mainItems.map(renderNavItem)}

        {/* Agenda submenu */}
        <button
          onClick={() => setAgendaOpen(!agendaExpanded)}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 ${
            isAgendaActive
              ? "text-sidebar-foreground"
              : "text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/70"
          }`}
        >
          <CalendarDays className="h-[17px] w-[17px] shrink-0" strokeWidth={1.6} />
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="whitespace-nowrap overflow-hidden flex-1 text-left"
              >
                Agenda
              </motion.span>
            )}
          </AnimatePresence>
          {!collapsed && (
            <ChevronDown
              className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${
                agendaExpanded ? "rotate-0" : "-rotate-90"
              }`}
            />
          )}
        </button>

        <AnimatePresence>
          {agendaExpanded && !collapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden pl-4 space-y-0.5"
            >
              {agendaItems.map(renderNavItem)}
            </motion.div>
          )}
        </AnimatePresence>

        {collapsed && agendaItems.map(renderNavItem)}

        {/* Cadastros submenu */}
        <button
          onClick={() => setCadastrosOpen(!cadastrosExpanded)}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 ${
            isCadastrosActive
              ? "text-sidebar-foreground"
              : "text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/70"
          }`}
        >
          <ClipboardList className="h-[17px] w-[17px] shrink-0" strokeWidth={1.6} />
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="whitespace-nowrap overflow-hidden flex-1 text-left"
              >
                Cadastros
              </motion.span>
            )}
          </AnimatePresence>
          {!collapsed && (
            <ChevronDown
              className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${
                cadastrosExpanded ? "rotate-0" : "-rotate-90"
              }`}
            />
          )}
        </button>

        <AnimatePresence>
          {cadastrosExpanded && !collapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden pl-4 space-y-0.5"
            >
              {cadastrosItems.map(renderNavItem)}
            </motion.div>
          )}
        </AnimatePresence>

        {collapsed && cadastrosItems.map(renderNavItem)}

        {afterCadastrosItems.map(renderNavItem)}

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
