import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Eye, CheckCircle2, Clock, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { extractContractSigningToken } from "@/lib/contract-links";

interface Contract {
  id: string;
  title: string;
  content: string;
  status: string;
  signing_token: string;
  signed_at: string | null;
  created_at: string;
}

const statusMap: Record<string, { label: string; icon: any; color: string }> = {
  enviado: { label: "Pendente", icon: Clock, color: "bg-amber-100 text-amber-800" },
  assinado: { label: "Assinado", icon: CheckCircle2, color: "bg-emerald-100 text-emerald-800" },
  rascunho: { label: "Rascunho", icon: FileText, color: "bg-muted text-muted-foreground" },
};

export default function PortalContratosPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [preview, setPreview] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    supabase
      .from("contracts")
      .select("id, title, content, status, signed_at, created_at")
      .in("status", ["enviado", "assinado"])
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setContracts((data as any) || []);
        setLoading(false);
      });
  }, []);

  async function goToSign(contract: Contract) {
    const { data: tokenRows } = await supabase.rpc(
      "get_contract_signing_token" as any,
      { p_contract_id: contract.id }
    );
    const tk = extractContractSigningToken(tokenRows);
    if (!tk) return;
    window.open(`/assinar/${tk}`, "_blank");
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Meus Contratos</h1>

      {loading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : contracts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-40" />
            Nenhum contrato disponível
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {contracts.map(c => {
            const st = statusMap[c.status] || statusMap.rascunho;
            const Icon = st.icon;
            return (
              <Card key={c.id}>
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{c.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(c.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={st.color}>
                      <Icon className="h-3 w-3 mr-1" />
                      {st.label}
                    </Badge>
                    <Button variant="ghost" size="icon" onClick={() => setPreview(c)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    {c.status === "enviado" && (
                      <Button size="sm" onClick={() => goToSign(c)}>
                        Assinar <ExternalLink className="h-3 w-3 ml-1" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!preview} onOpenChange={() => setPreview(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{preview?.title}</DialogTitle>
            <DialogDescription>
              {preview?.signed_at
                ? `Assinado em ${format(new Date(preview.signed_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}`
                : "Pendente de assinatura"}
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted/30 rounded-lg p-6 border">
            <pre className="whitespace-pre-wrap text-sm font-mono">{preview?.content}</pre>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
