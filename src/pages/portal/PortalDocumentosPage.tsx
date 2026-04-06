import { useEffect, useState } from "react";
import { FolderOpen, Download, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { usePortalCliente } from "@/hooks/usePortalCliente";

interface Documento {
  id: string;
  title: string;
  file_url: string;
  type: string;
  created_at: string;
}

export default function PortalDocumentosPage() {
  const { cliente, loading: clienteLoading } = usePortalCliente();
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!cliente) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("customer_documents")
        .select("*")
        .eq("cliente_id", cliente.id)
        .order("created_at", { ascending: false });
      setDocumentos((data as Documento[]) ?? []);
      setLoading(false);
    };
    fetch();
  }, [cliente]);

  if (clienteLoading || loading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-32" />{[1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>;
  }

  return (
    <div className="space-y-4 pb-20 md:pb-0">
      <h1 className="text-xl font-bold text-foreground">Documentos</h1>

      {documentos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FolderOpen className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">Nenhum documento disponível.</p>
        </div>
      ) : (
        documentos.map((d) => (
          <Card key={d.id}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{d.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="secondary" className="text-[10px]">{d.type}</Badge>
                  <span className="text-[10px] text-muted-foreground">{(() => { const [yr,mo,dy] = d.created_at.split("T")[0].split("-").map(Number); return new Date(yr, mo-1, dy).toLocaleDateString("pt-BR"); })()}</span>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="shrink-0" onClick={() => window.open(d.file_url, "_blank")}>
                <Download className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
