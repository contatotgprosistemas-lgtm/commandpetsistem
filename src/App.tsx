import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { PortalProtectedRoute } from "@/components/portal/PortalProtectedRoute";
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
import PlanosPacotesPage from "@/pages/PlanosPacotesPage";
import KanbanPage from "@/pages/KanbanPage";
import ChatbotPage from "@/pages/ChatbotPage";
import TaxiPetPage from "@/pages/TaxiPetPage";
import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import CadastroPublicoPage from "@/pages/CadastroPublicoPage";
import NotFound from "@/pages/NotFound";

// Portal pages
import PortalLoginPage from "@/pages/portal/PortalLoginPage";
import PortalForgotPasswordPage from "@/pages/portal/PortalForgotPasswordPage";
import PortalResetPasswordPage from "@/pages/portal/PortalResetPasswordPage";
import PortalDashboard from "@/pages/portal/PortalDashboard";
import PortalPetsPage from "@/pages/portal/PortalPetsPage";
import PortalPagamentosPage from "@/pages/portal/PortalPagamentosPage";
import PortalMensagensPage from "@/pages/portal/PortalMensagensPage";
import PortalNotificacoesPage from "@/pages/portal/PortalNotificacoesPage";
import PortalSolicitacoesPage from "@/pages/portal/PortalSolicitacoesPage";
import PortalDocumentosPage from "@/pages/portal/PortalDocumentosPage";
import PortalHistoricoPage from "@/pages/portal/PortalHistoricoPage";
import PortalContaPage from "@/pages/portal/PortalContaPage";
import PortalFeedPage from "@/pages/portal/PortalFeedPage";
import PortalManejoPage from "@/pages/portal/PortalManejoPage";
import PortalChecklistPage from "@/pages/portal/PortalChecklistPage";
import PortalTransportePage from "@/pages/portal/PortalTransportePage";
import PortalEstouChegandoPage from "@/pages/portal/PortalEstouChegandoPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Admin auth */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/cadastro/:empresaId" element={<CadastroPublicoPage />} />

            {/* Portal do Cliente auth */}
            <Route path="/portal/login" element={<PortalLoginPage />} />
            <Route path="/portal/forgot-password" element={<PortalForgotPasswordPage />} />
            <Route path="/portal/reset-password" element={<PortalResetPasswordPage />} />

            {/* Portal do Cliente (protected) */}
            <Route
              path="/portal"
              element={
                <PortalProtectedRoute>
                  <PortalLayout />
                </PortalProtectedRoute>
              }
            >
              <Route index element={<PortalDashboard />} />
              <Route path="pets" element={<PortalPetsPage />} />
              <Route path="pagamentos" element={<PortalPagamentosPage />} />
              <Route path="mensagens" element={<PortalMensagensPage />} />
              <Route path="notificacoes" element={<PortalNotificacoesPage />} />
              <Route path="solicitacoes" element={<PortalSolicitacoesPage />} />
              
              <Route path="estou-chegando" element={<PortalEstouChegandoPage />} />
              <Route path="transporte" element={<PortalTransportePage />} />
              <Route path="historico" element={<PortalHistoricoPage />} />
              <Route path="galeria" element={<PortalFeedPage />} />
              <Route path="manejo" element={<PortalManejoPage />} />
              <Route path="checklist" element={<PortalChecklistPage />} />
              <Route path="conta" element={<PortalContaPage />} />
            </Route>

            {/* Admin panel */}
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
              path="/kanban"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <KanbanPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/chatbot"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <ChatbotPage />
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
              path="/taxipet"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <TaxiPetPage />
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
              path="/servicos"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <ServicosPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/produtos"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <ProdutosPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/planos-pacotes"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <PlanosPacotesPage />
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