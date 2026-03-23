import { useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import {
  LayoutDashboard,
  MessageSquare,
  PawPrint,
  DollarSign,
  Calendar,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Building2,
  Shield,
  LogOut,
  ClipboardList,
  Package,
  ShoppingBag,
  Kanban,
  Bot,
  Receipt,
  TrendingUp,
  BarChart3,
  ArrowLeftRight,
  List,
} from "lucide-react";

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [cadastrosOpen, setCadastrosOpen] = useState(false);
  
  const { isSuperAdmin, signOut, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isCadastrosActive = ["/clientes", "/pets", "/servicos", "/produtos"].includes(location.pathname);

  const cadastrosExpanded = cadastrosOpen || isCadastrosActive;

  const mainItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/" },
    { icon: MessageSquare, label: "CRM WhatsApp", path: "/crm" },
    { icon: Kanban, label: "Pipeline Vendas", path: "/kanban" },
    { icon: Bot, label: "Chatbot", path: "/chatbot" },
  ];

  const cadastrosItems = [
    { icon: Users, label: "Clientes", path: "/clientes" },
    { icon: PawPrint, label: "Pets", path: "/pets" },
    { icon: Package, label: "Serviços", path: "/servicos" },
    { icon: ShoppingBag, label: "Produtos", path: "/produtos" },
  ];




  const bottomItems = [
    { icon: Calendar, label: "Agenda", path: "/agenda" },
    { icon: DollarSign, label: "Financeiro", path: "/financeiro" },
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
        `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors duration-150 ${
          isActive
            ? "bg-sidebar-primary text-sidebar-primary-foreground"
            : "text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent"
        }`
      }
    >
      <item.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.5} />
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
      animate={{ width: collapsed ? 64 : 240 }}
      transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
      className="h-screen bg-sidebar flex flex-col border-r border-sidebar-border sticky top-0 z-30 overflow-hidden"
    >
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-sidebar-border">
        <Building2 className="h-6 w-6 text-sidebar-primary shrink-0" />
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              className="ml-3 text-sm font-semibold text-sidebar-foreground whitespace-nowrap overflow-hidden"
            >
              PetCommand
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {mainItems.map(renderNavItem)}

        {/* Cadastros submenu */}
        <button
          onClick={() => setCadastrosOpen(!cadastrosExpanded)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors duration-150 ${
            isCadastrosActive
              ? "text-sidebar-foreground"
              : "text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent"
          }`}
        >
          <ClipboardList className="h-[18px] w-[18px] shrink-0" strokeWidth={1.5} />
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
              className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
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

        {/* When collapsed, show cadastros items directly */}
        {collapsed && cadastrosItems.map(renderNavItem)}

        {bottomItems.map(renderNavItem)}
      </nav>

      {/* User + Logout */}
      <div className="border-t border-sidebar-border p-2 space-y-1">
        {!collapsed && profile && (
          <div className="px-3 py-2 text-xs text-sidebar-muted truncate">
            {profile.nome}
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
        >
          <LogOut className="h-[18px] w-[18px] shrink-0" strokeWidth={1.5} />
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
          className="w-full flex items-center justify-center py-2 text-sidebar-muted hover:text-sidebar-foreground transition-colors"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
    </motion.aside>
  );
}
