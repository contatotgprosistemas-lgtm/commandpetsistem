import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Car, Users, Truck, Calendar, Route, BarChart3, History, Settings2, Fuel } from "lucide-react";
import TaxiPetDashboard from "@/components/taxipet/TaxiPetDashboard";
import TaxiPetDrivers from "@/components/taxipet/TaxiPetDrivers";
import TaxiPetVehicles from "@/components/taxipet/TaxiPetVehicles";
import TaxiPetBookings from "@/components/taxipet/TaxiPetBookings";
import TaxiPetOperational from "@/components/taxipet/TaxiPetOperational";
import TaxiPetHistory from "@/components/taxipet/TaxiPetHistory";
import TaxiPetTransportTypes from "@/components/taxipet/TaxiPetTransportTypes";
import CombustivelTab from "@/components/taxipet/CombustivelTab";

export default function TaxiPetPage() {
  const [tab, setTab] = useState("dashboard");

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
          <Car className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">TaxiPet</h1>
          <p className="text-sm text-muted-foreground">Gestão completa de transporte de pets</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-5">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/40 p-1 rounded-lg">
          <TabsTrigger value="dashboard" className="gap-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <BarChart3 className="h-3.5 w-3.5" /> Dashboard
          </TabsTrigger>
          <TabsTrigger value="operational" className="gap-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Route className="h-3.5 w-3.5" /> Painel Operacional
          </TabsTrigger>
          <TabsTrigger value="combustivel" className="gap-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Fuel className="h-3.5 w-3.5" /> Combustível & Custos
          </TabsTrigger>
          <TabsTrigger value="bookings" className="gap-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Calendar className="h-3.5 w-3.5" /> Corridas
          </TabsTrigger>
          <TabsTrigger value="drivers" className="gap-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Users className="h-3.5 w-3.5" /> Motoristas
          </TabsTrigger>
          <TabsTrigger value="vehicles" className="gap-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Truck className="h-3.5 w-3.5" /> Veículos
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <History className="h-3.5 w-3.5" /> Histórico
          </TabsTrigger>
          <TabsTrigger value="types" className="gap-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Settings2 className="h-3.5 w-3.5" /> Tipos de Corrida
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard"><TaxiPetDashboard /></TabsContent>
        <TabsContent value="operational"><TaxiPetOperational /></TabsContent>
        <TabsContent value="combustivel"><CombustivelTab /></TabsContent>
        <TabsContent value="bookings"><TaxiPetBookings /></TabsContent>
        <TabsContent value="drivers"><TaxiPetDrivers /></TabsContent>
        <TabsContent value="vehicles"><TaxiPetVehicles /></TabsContent>
        <TabsContent value="history"><TaxiPetHistory /></TabsContent>
        <TabsContent value="types"><TaxiPetTransportTypes /></TabsContent>
      </Tabs>
    </div>
  );
}
