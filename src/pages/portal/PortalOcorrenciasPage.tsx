import { useEffect, useState } from "react";
import { AlertTriangle, PawPrint } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { usePortalCliente } from "@/hooks/usePortalCliente";
import { format } from "date-fns";

interface OcorrenciaRecord {
  id: string;
  pet_id: string;
  created_at: string;
  detalhes: string;
  pet: { nome: string; raca: string | null; especie: string } | null;
}

export default function PortalOcorrenciasPage() {
  const { cliente, loading: clienteLoading } = usePortalCliente();
  const [records, setRecords] = useState<OcorrenciaRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!cliente) return;
    const fetch = async () => {
      const { data: pets } = await supabase
        .from("pets")
        .select("id")
        .eq("cliente_id", cliente.id);
      const petIds = (pets ?? []).map((p: any) => p.id);
      if (petIds.length === 0) {
        setRecords([]);
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("manejo_registros")
        .select("id, pet_id, created_at, respostas, pet:pets(nome, raca, especie)")
        .in("pet_id", petIds)
        .order("created_at", { ascending: false });

      const filtered = ((data as any[]) ?? [])
        .filter((r) => {
          const r2 = r.respostas || {};
          return r2.ocorrencia === "sim" && (r2.ocorrencia_detalhes || "").toString().trim();
        })
        .map((r) => ({
          id: r.id,
          pet_id: r.pet_id,
          created_at: r.created_at,
          detalhes: (r.respostas?.ocorrencia_detalhes || "").toString().trim(),
          pet: r.pet,
        }));
      setRecords(filtered);
      setLoading(false);
    };
    fetch();
  }, [cliente]);

  if (clienteLoading || loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        {[1, 2].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertTriangle className="h-12 w-12 text-muted-foreground/30 mb-4" />
        <p className="text-muted-foreground">Nenhuma ocorrência registrada.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20 md:pb-0">
      <h1 className="text-xl font-bold text-foreground">Ocorrências</h1>
      {records.map((rec) => (
        <Card key={rec.id} className="border-l-4 border-l-destructive">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <CardTitle className="text-base flex items-center gap-1.5">
                    <PawPrint className="h-4 w-4 text-muted-foreground" />
                    {rec.pet?.nome ?? "Pet"}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {rec.pet?.especie} {rec.pet?.raca ? `• ${rec.pet.raca}` : ""}
                  </p>
                </div>
              </div>
              <Badge variant="secondary" className="text-[10px]">
                {format(new Date(rec.created_at), "dd/MM/yyyy HH:mm")}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground whitespace-pre-wrap">{rec.detalhes}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}