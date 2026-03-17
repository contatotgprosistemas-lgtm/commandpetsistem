import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { RequireAuth, RequireNoAuth } from "@/components/AuthGuard";
import { AppLayout } from "@/components/AppLayout";
import Dashboard from "@/pages/Dashboard";
import CRMInbox from "@/pages/CRMInbox";
import PetsPage from "@/pages/PetsPage";
import AgendaPage from "@/pages/AgendaPage";
import FinancePage from "@/pages/FinancePage";
import ClientsPage from "@/pages/ClientsPage";
import SettingsPage from "@/pages/SettingsPage";
import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
import OnboardingPage from "@/pages/OnboardingPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<RequireNoAuth><LoginPage /></RequireNoAuth>} />
            <Route path="/cadastro" element={<RequireNoAuth><SignupPage /></RequireNoAuth>} />
            <Route path="/onboarding" element={<OnboardingPage />} />

            {/* Protected routes */}
            <Route path="/" element={<RequireAuth><AppLayout><Dashboard /></AppLayout></RequireAuth>} />
            <Route path="/crm" element={<RequireAuth><AppLayout><CRMInbox /></AppLayout></RequireAuth>} />
            <Route path="/pets" element={<RequireAuth><AppLayout><PetsPage /></AppLayout></RequireAuth>} />
            <Route path="/agenda" element={<RequireAuth><AppLayout><AgendaPage /></AppLayout></RequireAuth>} />
            <Route path="/financeiro" element={<RequireAuth><AppLayout><FinancePage /></AppLayout></RequireAuth>} />
            <Route path="/clientes" element={<RequireAuth><AppLayout><ClientsPage /></AppLayout></RequireAuth>} />
            <Route path="/configuracoes" element={<RequireAuth><AppLayout><SettingsPage /></AppLayout></RequireAuth>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
