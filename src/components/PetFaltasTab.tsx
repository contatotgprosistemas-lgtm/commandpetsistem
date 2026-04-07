import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { XCircle, RotateCcw, FileText, ShieldCheck } from "lucide-react";

interface Absence {
  id: string;
  tipo: string;
  reposicao_utilizada: boolean;
  atestado_url: string | null;
  admin_authorized_by: string | null;
  notes: string | null;
  created_at: string;
  agendamento: {
    id: string;
    data_hora: string;
    tipo_servico: string;
  } | null;
  reposicao_agendamento: {
    id: string;
    data_hora: string;
  } | null;
}

export function PetFaltasTab({ petId }: { petId: string }) {
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!petId) return;

    const fetch = async () => {
      setLoading(true);

      // Get agendamento IDs for this pet
      const { data: agendamentos } = await supabase
        .from("agendamentos")
        .select("id, data_hora, tipo_servico")
        .eq("pet_id", petId)
        .eq("status", "falta");

      if (!agendamentos || agendamentos.length === 0) {
        setAbsences([]);
        setLoading(false);
        return;
      }

      const agIds = agendamentos.map(a => a.id);

      const { data: absData } = await supabase
        .from("agendamento_absences" as any)
        .select("id, tipo, reposicao_utilizada, atestado_url, admin_authorized_by, notes, created_at, agendamento_id, reposicao_agendamento_id")
        .in("agendamento_id", agIds)
        .order("created_at", { ascending: false });

      if (!absData) {
        setAbsences([]);
        setLoading(false);
        return;
      }

      // Get replacement agendamento dates if any
      const replIds = (absData as any[])
        .map((a: any) => a.reposicao_agendamento_id)
        .filter(Boolean);

      let replMap: Record<string, any> = {};
      if (replIds.length > 0) {
        const { data: replData } = await supabase
          .from("agendamentos")
          .select("id, data_hora")
          .in("id", replIds);
        if (replData) {
          replData.forEach((r: any) => { replMap[r.id] = r; });
        }
      }

      const mapped: Absence[] = (absData as any[]).map((abs: any) => ({
        ...abs,
        agendamento: agendamentos.find(a => a.id === abs.agendamento_id) || null,
        reposicao_agendamento: abs.reposicao_agendamento_id
          ? replMap[abs.reposicao_agendamento_id] || null
          : null,
      }));

      setAbsences(mapped);
      setLoading(false);
    };

    fetch();
  }, [petId]);

  if (loading) {
    return (
      <div className="space-y-3 py-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
      </div>
    );
  }

  if (absences.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <XCircle className="h-8 w-8 text-muted-foreground/30 mb-2" strokeWidth={1.5} />
        <p className="text-sm text-muted-foreground">Nenhuma falta registrada</p>
      </div>
    );
  }

  const totalFaltas = absences.length;
  const comReposicao = absences.filter(a => a.tipo === "com_reposicao").length;
  const semReposicao = absences.filter(a => a.tipo === "sem_reposicao").length;
  const reposicoesUsadas = absences.filter(a => a.reposicao_utilizada).length;
  const reposicoesPendentes = comReposicao - reposicoesUsadas;

  return (
    <div className="space-y-4 py-2">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-muted/50 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-foreground">{totalFaltas}</p>
          <p className="text-[10px] text-muted-foreground">Total Faltas</p>
        </div>
        <div className="bg-muted/50 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-foreground">{comReposicao}</p>
          <p className="text-[10px] text-muted-foreground">Com Reposição</p>
        </div>
        <div className="bg-muted/50 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-foreground">{semReposicao}</p>
          <p className="text-[10px] text-muted-foreground">Sem Reposição</p>
        </div>
        <div className="bg-primary/10 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-primary">{reposicoesPendentes}</p>
          <p className="text-[10px] text-muted-foreground">Reposições Pendentes</p>
        </div>
      </div>

      {/* List */}
      <div className="divide-y divide-border rounded-lg border">
        {absences.map(abs => (
          <div key={abs.id} className="p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">
                  {abs.agendamento
                    ? format(new Date(abs.agendamento.data_hora), "dd/MM/yyyy", { locale: ptBR })
                    : "—"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {abs.agendamento?.tipo_servico}
                </span>
              </div>
              <Badge
                variant={abs.tipo === "com_reposicao" ? "default" : "secondary"}
                className="text-[10px]"
              >
                {abs.tipo === "com_reposicao" ? (
                  <><RotateCcw className="h-3 w-3 mr-1" /> Com reposição</>
                ) : (
                  "Sem reposição"
                )}
              </Badge>
            </div>

            {abs.tipo === "com_reposicao" && (
              <div className="flex items-center gap-2 text-xs">
                {abs.reposicao_utilizada ? (
                  <span className="text-primary flex items-center gap-1">
                    ✓ Reposição utilizada
                    {abs.reposicao_agendamento && (
                      <> em {format(new Date(abs.reposicao_agendamento.data_hora), "dd/MM/yyyy")}</>
                    )}
                  </span>
                ) : (
                  <span className="text-amber-600 flex items-center gap-1">
                    ⏳ Reposição pendente
                  </span>
                )}
              </div>
            )}

            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              {abs.atestado_url && (
                <a
                  href={abs.atestado_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-primary hover:underline"
                >
                  <FileText className="h-3 w-3" /> Atestado
                </a>
              )}
              {abs.admin_authorized_by && (
                <span className="flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" /> Autorizado por admin
                </span>
              )}
              {abs.notes && <span>Obs: {abs.notes}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
