import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentEmpresa } from "@/lib/useCurrentEmpresa";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Timer, UserCheck, MessageSquare, AlertTriangle } from "lucide-react";
import { useMemo } from "react";

function fmtSec(s: number | null | undefined) {
  if (s == null) return "—";
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.round(s / 60)} min`;
  return `${(s / 3600).toFixed(1)} h`;
}

export default function CRMSLAPage() {
  const { data: empresaId } = useCurrentEmpresa();

  const { data: conversas = [], isLoading } = useQuery({
    queryKey: ["crm-sla-conv", empresaId],
    enabled: !!empresaId,
    queryFn: async () => {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("crm_conversas")
        .select("id, atendente_id, status, tempo_primeira_resposta_seg, primeira_resposta_em, assumida_em, created_at, ultima_mensagem_em")
        .eq("empresa_id", empresaId!)
        .gte("created_at", since)
        .limit(2000);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: membros = [] } = useQuery({
    queryKey: ["crm-sla-membros", empresaId],
    enabled: !!empresaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles").select("user_id, nome").eq("empresa_id", empresaId!);
      if (error) throw error;
      return data ?? [];
    },
  });

  const stats = useMemo(() => {
    const respondidas = conversas.filter((c: any) => c.tempo_primeira_resposta_seg != null);
    const semResposta = conversas.filter((c: any) => c.tempo_primeira_resposta_seg == null && c.status !== "fechada");
    const semResp = conversas.filter((c: any) => !c.atendente_id && c.status !== "fechada").length;

    const tempos = respondidas.map((c: any) => c.tempo_primeira_resposta_seg as number);
    const media = tempos.length ? Math.round(tempos.reduce((a, b) => a + b, 0) / tempos.length) : null;
    const sortedT = [...tempos].sort((a, b) => a - b);
    const mediana = sortedT.length ? sortedT[Math.floor(sortedT.length / 2)] : null;
    const min = sortedT[0] ?? null;
    const max = sortedT[sortedT.length - 1] ?? null;

    // Por atendente
    const byUser = new Map<string, { user_id: string; nome: string; total: number; respondidas: number; somaTempo: number; abertas: number }>();
    conversas.forEach((c: any) => {
      if (!c.atendente_id) return;
      const nome = membros.find((m: any) => m.user_id === c.atendente_id)?.nome ?? "—";
      const cur = byUser.get(c.atendente_id) ?? { user_id: c.atendente_id, nome, total: 0, respondidas: 0, somaTempo: 0, abertas: 0 };
      cur.total += 1;
      if (c.tempo_primeira_resposta_seg != null) {
        cur.respondidas += 1;
        cur.somaTempo += c.tempo_primeira_resposta_seg;
      }
      if (c.status !== "fechada") cur.abertas += 1;
      byUser.set(c.atendente_id, cur);
    });
    const ranking = [...byUser.values()].map((u) => ({
      ...u,
      mediaTempo: u.respondidas ? Math.round(u.somaTempo / u.respondidas) : null,
    })).sort((a, b) => b.total - a.total);

    // Distribuição em faixas
    const faixas = [
      { label: "< 1 min", count: tempos.filter((t) => t < 60).length, color: "bg-success" },
      { label: "1–5 min", count: tempos.filter((t) => t >= 60 && t < 300).length, color: "bg-success/70" },
      { label: "5–30 min", count: tempos.filter((t) => t >= 300 && t < 1800).length, color: "bg-amber-500" },
      { label: "30 min–2 h", count: tempos.filter((t) => t >= 1800 && t < 7200).length, color: "bg-orange-500" },
      { label: "> 2 h", count: tempos.filter((t) => t >= 7200).length, color: "bg-destructive" },
    ];
    const totalT = tempos.length || 1;

    return {
      total: conversas.length, respondidas: respondidas.length, semResposta: semResposta.length,
      semResp, media, mediana, min, max, ranking, faixas, totalT,
    };
  }, [conversas, membros]);

  if (isLoading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Timer className="h-6 w-6 text-primary" /> SLA & Tempo de resposta
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Últimos 30 dias · {stats.total} conversas</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1.5"><Timer className="h-3.5 w-3.5" /> Tempo médio</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-semibold">{fmtSec(stats.media)}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground font-medium">Mediana</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-semibold">{fmtSec(stats.mediana)}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1.5"><MessageSquare className="h-3.5 w-3.5" /> Respondidas</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{stats.respondidas}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {stats.total > 0 ? `${Math.round((stats.respondidas / stats.total) * 100)}% das conversas` : "—"}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> Sem responsável</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{stats.semResp}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">conversas abertas</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Distribuição do tempo de 1ª resposta</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {stats.faixas.map((f) => {
              const pct = Math.round((f.count / stats.totalT) * 100);
              return (
                <div key={f.label}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium">{f.label}</span>
                    <span className="text-muted-foreground">{f.count} ({pct}%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full ${f.color} transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-1.5"><UserCheck className="h-4 w-4 text-primary" /> Ranking por atendente</CardTitle></CardHeader>
          <CardContent>
            {stats.ranking.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhuma conversa atribuída no período.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="py-2 px-2">Atendente</th>
                      <th className="py-2 px-2">Total</th>
                      <th className="py-2 px-2">Respondidas</th>
                      <th className="py-2 px-2">Abertas</th>
                      <th className="py-2 px-2">Tempo médio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.ranking.map((u) => (
                      <tr key={u.user_id} className="border-b last:border-0">
                        <td className="py-2.5 px-2">
                          <div className="flex items-center gap-2">
                            <span className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
                              {(u.nome ?? "?").charAt(0).toUpperCase()}
                            </span>
                            <span className="font-medium">{u.nome}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-2">{u.total}</td>
                        <td className="py-2.5 px-2">{u.respondidas}</td>
                        <td className="py-2.5 px-2">
                          {u.abertas > 0 ? <Badge variant="secondary">{u.abertas}</Badge> : <span className="text-muted-foreground">0</span>}
                        </td>
                        <td className="py-2.5 px-2 font-medium">{fmtSec(u.mediaTempo)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}