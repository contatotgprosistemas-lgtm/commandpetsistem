import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { NfseConfig } from "@/components/nfse/NfseConfig";
import { NfseEmissaoLista } from "@/components/nfse/NfseEmissaoLista";
import { NfseDocumentos } from "@/components/nfse/NfseDocumentos";
import { FileText, PlusCircle, Settings2 } from "lucide-react";

export default function NotasFiscaisPage() {
  const { profile } = useAuth();
  const empresaId = profile?.empresa_id;
  const [tab, setTab] = useState("emitir");

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
        <h1 className="text-2xl font-bold text-foreground">Notas Fiscais (NFS-e)</h1>
        <p className="text-muted-foreground text-sm">
          Emissão de NFS-e via integração Asaas
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="emitir" className="gap-1.5">
            <PlusCircle className="h-4 w-4" /> Emitir
          </TabsTrigger>
          <TabsTrigger value="documentos" className="gap-1.5">
            <FileText className="h-4 w-4" /> Notas Emitidas
          </TabsTrigger>
          <TabsTrigger value="config" className="gap-1.5">
            <Settings2 className="h-4 w-4" /> Configuração
          </TabsTrigger>
        </TabsList>

        <TabsContent value="emitir">
          <NfseEmissaoLista empresaId={empresaId} />
        </TabsContent>
        <TabsContent value="documentos">
          <NfseDocumentos empresaId={empresaId} />
        </TabsContent>
        <TabsContent value="config">
          <NfseConfig empresaId={empresaId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
