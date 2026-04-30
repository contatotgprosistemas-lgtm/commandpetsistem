import { useEffect, useState } from "react";
import { ClipboardCheck, PawPrint } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { usePortalCliente } from "@/hooks/usePortalCliente";
import { format } from "date-fns";

const defaultLabels: Record<string, string> = {
  olhos_ok_: "Olhos Ok?",
  orelhas_ok_: "Orelhas Ok?",
  focinho_ok_: "Focinho Ok?",
  boca_ok_: "Boca Ok?",
  dentes_ok_: "Dentes Ok?",
  pelagem_ok_: "Pelagem Ok?",
  pele_ok_: "Pele Ok?",
  corpo_ok_: "Corpo Ok?",
  rabo_ok_: "Rabo Ok?",
  patas_ok_: "Patas Ok?",
  urina_ok_: "Urina Ok?",
  fezes_ok_: "Fezes Ok?",
  observacoes: "Observações",
};

interface ChecklistRecord {
  id: string;
  pet_id: string;
  created_at: string;
  respostas: Record<string, any>;
  pet: { nome: string; raca: string | null; especie: string } | null;
}

export default function PortalChecklistPage() {
  const { cliente, loading: clienteLoading } = usePortalCliente();
  const [records, setRecords] = useState<ChecklistRecord[]>([]);
  const [perguntasMap, setPerguntasMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!cliente) return;
    const fetchData = async () => {
      // Get pets of this client to filter records
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
        .from("checklist_registros")
        .select("id, pet_id, created_at, respostas, pet:pets(nome, raca, especie)")
        .in("pet_id", petIds)
        .order("created_at", { ascending: false });
      const recs = (data as any[]) ?? [];
      setRecords(recs);

      // Load configured-question labels (cfg_<id> -> pergunta) via RPC
      // (RPC bypasses RLS that blocks cliente users from reading the table directly)
      const { data: cfg } = await supabase.rpc("get_perguntas_checklist_for_cliente" as any);
      const map: Record<string, string> = {};
      ((cfg as any[]) ?? []).forEach((p: any) => {
        map[`cfg_${p.id}`] = p.pergunta;
      });
      setPerguntasMap(map);
      setLoading(false);
    };
    fetchData();
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
        <ClipboardCheck className="h-12 w-12 text-muted-foreground/30 mb-4" />
        <p className="text-muted-foreground">Nenhum checklist registrado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20 md:pb-0">
      <h1 className="text-xl font-bold text-foreground">Checklist</h1>
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
                  .filter(([key]) => key !== "custom_perguntas")
                  .map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between py-2">
                      <span className="text-sm text-muted-foreground">{defaultLabels[key] || perguntasMap[key] || key}</span>
                      <Badge variant={String(value) === "sim" ? "default" : String(value) === "nao" ? "destructive" : "secondary"} className="text-xs capitalize">
                        {String(value) === "sim" ? "Sim" : String(value) === "nao" ? "Não" : String(value) || "—"}
                      </Badge>
                    </div>
                  ))}
                {customPerguntas.map((cp, i) => (
                  <div key={i} className="flex items-center justify-between py-2">
                    <span className="text-sm text-muted-foreground">{cp.pergunta}</span>
                    <Badge variant={cp.resposta === "sim" ? "default" : cp.resposta === "nao" ? "destructive" : "secondary"} className="text-xs capitalize">
                      {cp.resposta === "sim" ? "Sim" : cp.resposta === "nao" ? "Não" : cp.resposta || "—"}
                    </Badge>
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
