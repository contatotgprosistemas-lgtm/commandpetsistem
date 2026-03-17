import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";

interface AppLayoutProps {
  children: ReactNode;
}

const authRoutes = ["/login", "/signup", "/forgot-password", "/reset-password"];

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const isAuthRoute = authRoutes.includes(location.pathname);

  if (isAuthRoute) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
      <AppSidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
