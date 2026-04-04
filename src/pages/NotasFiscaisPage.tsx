import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { NfeDashboard } from "@/components/nfe/NfeDashboard";
import { NfeEmissao } from "@/components/nfe/NfeEmissao";
import { NfeListagem } from "@/components/nfe/NfeListagem";
import { NfeRejeicoes } from "@/components/nfe/NfeRejeicoes";
import { NfeConfiguracaoFiscal } from "@/components/nfe/NfeConfiguracaoFiscal";
import { NfeRelatorios } from "@/components/nfe/NfeRelatorios";
import { BarChart3, FileText, PlusCircle, AlertTriangle, Settings2, FileBarChart } from "lucide-react";

export default function NotasFiscaisPage() {
  const { profile } = useAuth();
  const empresaId = profile?.empresa_id;
  const [activeTab, setActiveTab] = useState("dashboard");

  if (!empresaId) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Empresa não encontrada.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Notas Fiscais Eletrônicas</h1>
        <p className="text-muted-foreground text-sm">Emissão, consulta e gestão de NF-e via Focus NFe</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex flex-wrap gap-1 h-auto bg-muted/50 p-1">
          <TabsTrigger value="dashboard" className="gap-1.5 text-xs sm:text-sm">
            <BarChart3 className="h-3.5 w-3.5" /> Dashboard
          </TabsTrigger>
          <TabsTrigger value="emissao" className="gap-1.5 text-xs sm:text-sm">
            <PlusCircle className="h-3.5 w-3.5" /> Emissão
          </TabsTrigger>
          <TabsTrigger value="notas" className="gap-1.5 text-xs sm:text-sm">
            <FileText className="h-3.5 w-3.5" /> Notas
          </TabsTrigger>
          <TabsTrigger value="rejeicoes" className="gap-1.5 text-xs sm:text-sm">
            <AlertTriangle className="h-3.5 w-3.5" /> Rejeições
          </TabsTrigger>
          <TabsTrigger value="configuracao" className="gap-1.5 text-xs sm:text-sm">
            <Settings2 className="h-3.5 w-3.5" /> Configuração
          </TabsTrigger>
          <TabsTrigger value="relatorios" className="gap-1.5 text-xs sm:text-sm">
            <FileBarChart className="h-3.5 w-3.5" /> Relatórios
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <NfeDashboard empresaId={empresaId} />
        </TabsContent>
        <TabsContent value="emissao">
          <NfeEmissao empresaId={empresaId} onSuccess={() => setActiveTab("notas")} />
        </TabsContent>
        <TabsContent value="notas">
          <NfeListagem empresaId={empresaId} />
        </TabsContent>
        <TabsContent value="rejeicoes">
          <NfeRejeicoes empresaId={empresaId} />
        </TabsContent>
        <TabsContent value="configuracao">
          <NfeConfiguracaoFiscal empresaId={empresaId} />
        </TabsContent>
        <TabsContent value="relatorios">
          <NfeRelatorios empresaId={empresaId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
