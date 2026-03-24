import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Car, Users, Truck, MapPin, Calendar, Route, BarChart3, History, Settings2 } from "lucide-react";
import TaxiPetDashboard from "@/components/taxipet/TaxiPetDashboard";
import TaxiPetDrivers from "@/components/taxipet/TaxiPetDrivers";
import TaxiPetVehicles from "@/components/taxipet/TaxiPetVehicles";
import TaxiPetBookings from "@/components/taxipet/TaxiPetBookings";
import TaxiPetOperational from "@/components/taxipet/TaxiPetOperational";
import TaxiPetHistory from "@/components/taxipet/TaxiPetHistory";
import TaxiPetTransportTypes from "@/components/taxipet/TaxiPetTransportTypes";

export default function TaxiPetPage() {
  const [tab, setTab] = useState("dashboard");

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Car className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">TaxiPet</h1>
          <p className="text-sm text-muted-foreground">Gestão completa de transporte de pets</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          <TabsTrigger value="dashboard" className="gap-1.5 text-xs">
            <BarChart3 className="h-3.5 w-3.5" /> Dashboard
          </TabsTrigger>
          <TabsTrigger value="operational" className="gap-1.5 text-xs">
            <Route className="h-3.5 w-3.5" /> Painel Operacional
          </TabsTrigger>
          <TabsTrigger value="bookings" className="gap-1.5 text-xs">
            <Calendar className="h-3.5 w-3.5" /> Corridas
          </TabsTrigger>
          <TabsTrigger value="drivers" className="gap-1.5 text-xs">
            <Users className="h-3.5 w-3.5" /> Motoristas
          </TabsTrigger>
          <TabsTrigger value="vehicles" className="gap-1.5 text-xs">
            <Truck className="h-3.5 w-3.5" /> Veículos
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5 text-xs">
            <History className="h-3.5 w-3.5" /> Histórico
          </TabsTrigger>
          <TabsTrigger value="types" className="gap-1.5 text-xs">
            <Settings2 className="h-3.5 w-3.5" /> Tipos de Corrida
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard"><TaxiPetDashboard /></TabsContent>
        <TabsContent value="operational"><TaxiPetOperational /></TabsContent>
        <TabsContent value="bookings"><TaxiPetBookings /></TabsContent>
        <TabsContent value="drivers"><TaxiPetDrivers /></TabsContent>
        <TabsContent value="vehicles"><TaxiPetVehicles /></TabsContent>
        <TabsContent value="history"><TaxiPetHistory /></TabsContent>
        <TabsContent value="types"><TaxiPetTransportTypes /></TabsContent>
      </Tabs>
    </div>
  );
}
