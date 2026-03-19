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
  const isAuthRoute = authRoutes.some(route =>
  location.pathname.startsWith(route)
);

  if (isAuthRoute) {
    return <>{children}</>;
  }

  if (!user) return <div>Loading...</div>;

  return (
  <div className="flex min-h-screen w-full bg-background">
    {user && <AppSidebar />}

    <main className="flex-1 overflow-auto">
      {!user ? (
        <div className="flex items-center justify-center h-full">
          Loading...
        </div>
      ) : (
        children
      )}
    </main>
  </div>
  );
}