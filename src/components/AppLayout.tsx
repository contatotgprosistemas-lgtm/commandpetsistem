import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AppSidebar } from "./AppSidebar";
import { Loader2 } from "lucide-react";

interface AppLayoutProps {
  children: ReactNode;
}

const authRoutes = ["/login", "/signup", "/forgot-password", "/reset-password", "/cadastro", "/operacional"];

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const { user } = useAuth();
  const isAuthRoute = authRoutes.some(route =>
    location.pathname.startsWith(route)
  );

  if (isAuthRoute) {
    return <>{children}</>;
  }

  if (!user) return (
    <div className="flex items-center justify-center h-screen bg-background">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="flex min-h-screen w-full bg-background">
      {user && <AppSidebar />}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
