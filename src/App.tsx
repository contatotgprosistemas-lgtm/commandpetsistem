import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import Dashboard from "@/pages/Dashboard";
import CRMInbox from "@/pages/CRMInbox";
import PetsPage from "@/pages/PetsPage";
import AgendaPage from "@/pages/AgendaPage";
import FinancePage from "@/pages/FinancePage";
import ClientsPage from "@/pages/ClientsPage";
import SettingsPage from "@/pages/SettingsPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/crm" element={<CRMInbox />} />
            <Route path="/pets" element={<PetsPage />} />
            <Route path="/agenda" element={<AgendaPage />} />
            <Route path="/financeiro" element={<FinancePage />} />
            <Route path="/clientes" element={<ClientsPage />} />
            <Route path="/configuracoes" element={<SettingsPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
