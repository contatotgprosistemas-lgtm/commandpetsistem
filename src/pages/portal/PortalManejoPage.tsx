import { useEffect, useState } from "react";
import { Stethoscope, PawPrint } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { usePortalCliente } from "@/hooks/usePortalCliente";
import { format } from "date-fns";

const defaultLabels: Record<string, string> = {
  interagiu_amigos: "Interagiu com os amiguinhos?",
  participou_atividades: "Participou das atividades?",
  almocou: "Almoçou?",
  participou_musicoterapia: "Participou da Musicoterapia?",
  banho_seco: "Banho à Seco",
  nota_obediencia: "Nota de obediência",
  observacoes: "Observações",
  ocorrencia: "Ocorrência?",
};

interface ManejoRecord {
  id: string;
  pet_id: string;
  created_at: string;
  respostas: Record<string, any>;
  pet: { nome: string; raca: string | null; especie: string } | null;
}

export default function PortalManejoPage() {
  const { cliente, loading: clienteLoading } = usePortalCliente();
  const [records, setRecords] = useState<ManejoRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!cliente) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("manejo_registros")
        .select("id, pet_id, created_at, respostas, pet:pets(nome, raca, especie)")
        .order("created_at", { ascending: false });
      setRecords((data as any) ?? []);
      setLoading(false);
    };
    fetch();
  }, [cliente]);

  if (clienteLoading || loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        {[1, 2].map((i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Stethoscope className="h-12 w-12 text-muted-foreground/30 mb-4" />
        <p className="text-muted-foreground">Nenhum boletim diário registrado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20 md:pb-0">
      <h1 className="text-xl font-bold text-foreground">Boletim Diário</h1>
      {records.map((rec) => {
        const respostas = rec.respostas || {};
        const customPerguntas = (respostas.custom_perguntas as Array<{ pergunta: string; resposta: string }>) || [];
        return (
          <Card key={rec.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <PawPrint className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{rec.pet?.nome ?? "Pet"}</CardTitle>
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
              <div className="divide-y divide-border">
                {Object.entries(respostas)
                  .filter(([key]) => key !== "custom_perguntas" && !key.startsWith("foto_"))
                  .map(([key, value]) => {
                    const fotoUrl = respostas[`foto_${key}`];
                    return (
                      <div key={key} className="py-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">{defaultLabels[key] || key}</span>
                          <span className="text-sm font-medium text-foreground capitalize">{String(value) || "—"}</span>
                        </div>
                        {fotoUrl && (
                          <img
                            src={fotoUrl}
                            alt={`Foto ${defaultLabels[key] || key}`}
                            className="mt-2 rounded-lg max-h-48 object-cover border border-border"
                          />
                        )}
                      </div>
                    );
                  })}
                {customPerguntas.map((cp, i) => (
                  <div key={i} className="flex items-center justify-between py-2">
                    <span className="text-sm text-muted-foreground">{cp.pergunta}</span>
                    <span className="text-sm font-medium text-foreground capitalize">{cp.resposta || "—"}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
