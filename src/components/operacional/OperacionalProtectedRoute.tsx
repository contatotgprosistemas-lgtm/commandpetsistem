import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useOperationalAuth } from "@/hooks/useOperationalAuth";
import { Loader2 } from "lucide-react";

export function OperacionalProtectedRoute({ children }: { children: ReactNode }) {
  const { user, session, loading } = useOperationalAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) return <Navigate to="/operacional/login" replace />;
  if (!user) return <Navigate to="/operacional/login" replace />;

  return <>{children}</>;
}
