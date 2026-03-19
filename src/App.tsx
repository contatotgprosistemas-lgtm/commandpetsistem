import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import Dashboard from "@/pages/Dashboard";
import CRMInbox from "@/pages/CRMInbox";
import PetsPage from "@/pages/PetsPage";
import AgendaPage from "@/pages/AgendaPage";
import FinancePage from "@/pages/FinancePage";
import ClientsPage from "@/pages/ClientsPage";
import SettingsPage from "@/pages/SettingsPage";
import SuperAdminPage from "@/pages/SuperAdminPage";
import ServicosPage from "@/pages/ServicosPage";
import ProdutosPage from "@/pages/ProdutosPage";
import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import CadastroPublicoPage from "@/pages/CadastroPublicoPage";
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
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/cadastro/:empresaId" element={<CadastroPublicoPage />} />

            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Dashboard />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/crm"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <CRMInbox />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/pets"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <PetsPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/agenda"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <AgendaPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/financeiro"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <FinancePage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/clientes"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <ClientsPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/configuracoes"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <SettingsPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin"
              element={
                <ProtectedRoute requireAdmin>
                  <AppLayout>
                    <SuperAdminPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;