import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEmpresaModulos } from "@/hooks/useEmpresaModulos";
import { isRouteAllowed } from "@/lib/modulos";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, LogOut, ShieldAlert, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

function PendingApprovalScreen() {
  const { signOut, profile } = useAuth();

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          <div className="mx-auto h-16 w-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-4">
            <Clock className="h-8 w-8 text-amber-600" />
          </div>
          <CardTitle className="text-xl">Acesso Pendente de Aprovação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Olá{profile?.nome ? `, ${profile.nome}` : ""}! Sua conta foi criada com sucesso, mas ainda precisa ser aprovada pelo administrador do sistema.
          </p>
          <p className="text-sm text-muted-foreground">
            Você será notificado quando seu acesso for liberado. Por favor, tente novamente mais tarde.
          </p>
          <Button variant="outline" onClick={signOut} className="gap-2">
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export function ProtectedRoute({ children, requireAdmin }: { children: React.ReactNode; requireAdmin?: boolean }) {
  const { user, loading, isSuperAdmin, isApproved } = useAuth();
  const modulos = useEmpresaModulos();
  const location = useLocation();

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // CRITICAL SECURITY: Clients (portal users) must NEVER access the management system.
  // They must use /portal exclusively.
  const userRole = (user as { role?: string | null })?.role;
  if (userRole === "cliente") {
    return <ClienteBlockedScreen />;
  }

  if (!isApproved) {
    return <PendingApprovalScreen />;
  }

  if (requireAdmin && !isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  // Module gating — super admin always passes
  if (!isSuperAdmin && modulos.loaded && !isRouteAllowed(location.pathname, modulos)) {
    return <ModuleLockedScreen />;
  }

  return <>{children}</>;
}

function ClienteBlockedScreen() {
  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/portal/login";
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          <div className="mx-auto h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <ShieldAlert className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-xl">Acesso restrito</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Esta área é exclusiva da equipe da empresa. O seu acesso é pelo Portal do Cliente.
          </p>
          <Button onClick={handleLogout} className="gap-2">
            <LogOut className="h-4 w-4" />
            Ir para o Portal do Cliente
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function ModuleLockedScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          <div className="mx-auto h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Lock className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardTitle className="text-xl">Módulo não contratado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Este recurso faz parte de um módulo que ainda não está incluído no plano da sua empresa.
            Entre em contato com o administrador do sistema para liberar o acesso.
          </p>
          <Button variant="outline" onClick={() => (window.location.href = "/")}>
            Voltar
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
