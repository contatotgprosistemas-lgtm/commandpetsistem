import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AppSidebar } from "./AppSidebar";

interface AppLayoutProps {
  children: ReactNode;
}

const authRoutes = ["/login", "/signup", "/forgot-password", "/reset-password"];

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const { user } = useAuth();
  const isAuthRoute = authRoutes.includes(location.pathname);

  if (isAuthRoute) {
    return <>{children}</>;
  }

  if (!user) return <div>Loading...</div>;

  return (
    <div className="flex min-h-screen w-full bg-background">
      <AppSidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
