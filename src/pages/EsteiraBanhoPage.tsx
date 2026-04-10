import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { ListOrdered, Play, Square, Clock, PawPrint, User, Timer, CheckCircle2, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEmpresaLogo } from "@/hooks/useEmpresaLogo";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { SignedImage } from "@/components/SignedImage";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface EsteiraItem {
  id: string;
  agendamento_id: string;
  banhista_nome: string | null;
  status: string;
  inicio_at: string | null;
  fim_at: string | null;
  duracao_segundos: number | null;
  created_at: string;
  agendamento: {
    id: string;
    tipo_servico: string;
    status: string;
    pet: { id: string; nome: string; raca: string | null; foto_url: string | null } | null;
    cliente: { id: string; nome: string } | null;
  } | null;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
  return `${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
}

function LiveTimer({ startTime }: { startTime: string }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = new Date(startTime).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startTime]);
  return <span className="font-mono text-lg font-bold text-primary">{formatDuration(elapsed)}</span>;
}

export default function EsteiraBanhoPage() {
  const { profile } = useAuth();
  const { logoUrl } = useEmpresaLogo();
  const [items, setItems] = useState<EsteiraItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [esteiraAtiva, setEsteiraAtiva] = useState<boolean | null>(null);
  const [toggling, setToggling] = useState(false);

  const empresaId = profile?.empresa_id;

  const fetchEsteira = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data } = await supabase
      .from("esteira_banho")
      .select("id, agendamento_id, banhista_nome, status, inicio_at, fim_at, duracao_segundos, created_at, agendamento:agendamentos(id, tipo_servico, status, pet:pets(id, nome, raca, foto_url), cliente:clientes(id, nome))")
      .eq("empresa_id", empresaId)
      .gte("created_at", today.toISOString())
      .order("created_at", { ascending: true });

    if (data) setItems(data as any);
    setLoading(false);
  }, [empresaId]);

  const fetchToggle = useCallback(async () => {
    if (!empresaId) return;
    const { data } = await supabase
      .from("empresas")
      .select("esteira_banho_ativa")
      .eq("id", empresaId)
      .single();
    if (data) setEsteiraAtiva(data.esteira_banho_ativa);
  }, [empresaId]);

  useEffect(() => { fetchEsteira(); fetchToggle(); }, [fetchEsteira, fetchToggle]);

  // Realtime
  useEffect(() => {
    if (!empresaId) return;
    const channel = supabase
      .channel("esteira-banho-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "esteira_banho", filter: `empresa_id=eq.${empresaId}` }, () => fetchEsteira())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [empresaId, fetchEsteira]);

  async function handleToggle(checked: boolean) {
    if (!empresaId) return;
    setToggling(true);
    const { error } = await supabase.from("empresas").update({ esteira_banho_ativa: checked } as any).eq("id", empresaId);
    if (error) { toast.error("Erro ao alterar configuração"); setToggling(false); return; }
    setEsteiraAtiva(checked);
    toast.success(checked ? "Esteira de Banho ativada" : "Esteira de Banho desativada");
    setToggling(false);
  }

  async function handleStart(item: EsteiraItem) {
    const banhista = prompt("Nome do banhista:");
    if (!banhista) return;

    const { error } = await supabase
      .from("esteira_banho")
      .update({ status: "em_andamento", inicio_at: new Date().toISOString(), banhista_nome: banhista } as any)
      .eq("id", item.id);
    if (error) { toast.error("Erro ao iniciar"); return; }
    toast.success("Serviço iniciado!");
    fetchEsteira();
  }

  async function handleFinish(item: EsteiraItem) {
    const now = new Date();
    const inicio = new Date(item.inicio_at!);
    const duracao = Math.floor((now.getTime() - inicio.getTime()) / 1000);

    const { error } = await supabase
      .from("esteira_banho")
      .update({ status: "finalizado", fim_at: now.toISOString(), duracao_segundos: duracao } as any)
      .eq("id", item.id);
    if (error) { toast.error("Erro ao finalizar"); return; }

    // Update agendamento status to concluido
    await supabase.from("agendamentos").update({
      status: "concluido",
      data_saida: now.toISOString(),
      hora_saida: format(now, "HH:mm"),
    }).eq("id", item.agendamento_id);

    // Send notification to client
    if (item.agendamento?.cliente?.id) {
      const petName = item.agendamento?.pet?.nome || "Pet";
      await supabase.from("customer_notifications").insert({
        empresa_id: empresaId!,
        cliente_id: item.agendamento.cliente.id,
        title: "🐾 Pet pronto!",
        message: `O serviço de ${item.agendamento.tipo_servico} do(a) ${petName} foi finalizado! Tempo: ${formatDuration(duracao)}. Pode vir buscar!`,
        type: "servico",
      });
    }

    toast.success(`Serviço finalizado! Duração: ${formatDuration(duracao)}`);
    fetchEsteira();
  }

  const aguardando = items.filter(i => i.status === "aguardando");
  const emAndamento = items.filter(i => i.status === "em_andamento");
  const finalizados = items.filter(i => i.status === "finalizado");

  if (esteiraAtiva === null) {
    return (
      <div className="p-6 space-y-6 max-w-[1400px]">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5 max-w-[1400px]">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <ListOrdered className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-lg font-semibold text-foreground">Esteira de Banho</h1>
            <p className="text-xs text-muted-foreground">Acompanhe a fila e o fluxo de banhos em tempo real</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Label htmlFor="esteira-toggle" className="text-sm text-muted-foreground">
            {esteiraAtiva ? "Ativada" : "Desativada"}
          </Label>
          <Switch
            id="esteira-toggle"
            checked={esteiraAtiva}
            onCheckedChange={handleToggle}
            disabled={toggling}
          />
        </div>
      </div>

      {!esteiraAtiva ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ListOrdered className="h-12 w-12 text-muted-foreground/30 mb-4" strokeWidth={1.5} />
          <p className="text-sm text-muted-foreground mb-1">Esteira de Banho desativada</p>
          <p className="text-xs text-muted-foreground/70">Ative o botão acima para usar a funcionalidade de controle de tempo de banho</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Em Andamento */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Timer className="h-4 w-4 text-amber-500" />
              <h2 className="text-sm font-semibold text-foreground">Em Andamento ({emAndamento.length})</h2>
            </div>
            {emAndamento.length === 0 ? (
              <p className="text-xs text-muted-foreground pl-6">Nenhum serviço em andamento</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {emAndamento.map(item => (
                  <EsteiraCard key={item.id} item={item} onStart={handleStart} onFinish={handleFinish} logoUrl={logoUrl} />
                ))}
              </div>
            )}
          </section>

          {/* Aguardando */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-blue-500" />
              <h2 className="text-sm font-semibold text-foreground">Aguardando ({aguardando.length})</h2>
            </div>
            {aguardando.length === 0 ? (
              <p className="text-xs text-muted-foreground pl-6">Nenhum pet aguardando</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {aguardando.map(item => (
                  <EsteiraCard key={item.id} item={item} onStart={handleStart} onFinish={handleFinish} logoUrl={logoUrl} />
                ))}
              </div>
            )}
          </section>

          {/* Finalizados */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <h2 className="text-sm font-semibold text-foreground">Finalizados Hoje ({finalizados.length})</h2>
            </div>
            {finalizados.length === 0 ? (
              <p className="text-xs text-muted-foreground pl-6">Nenhum serviço finalizado hoje</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {finalizados.map(item => (
                  <EsteiraCard key={item.id} item={item} onStart={handleStart} onFinish={handleFinish} logoUrl={logoUrl} />
                ))}
              </div>
            )}
          </section>

          {loading && items.length === 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 rounded-lg" />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EsteiraCard({
  item,
  onStart,
  onFinish,
  logoUrl,
}: {
  item: EsteiraItem;
  onStart: (item: EsteiraItem) => void;
  onFinish: (item: EsteiraItem) => void;
  logoUrl: string;
}) {
  const pet = item.agendamento?.pet;
  const cliente = item.agendamento?.cliente;
  const servico = item.agendamento?.tipo_servico || "Serviço";

  const statusConfig = {
    aguardando: { label: "Aguardando", color: "bg-blue-100 text-blue-800 border-blue-200", border: "border-l-blue-500" },
    em_andamento: { label: "Em Andamento", color: "bg-amber-100 text-amber-800 border-amber-200", border: "border-l-amber-500" },
    finalizado: { label: "Finalizado", color: "bg-emerald-100 text-emerald-800 border-emerald-200", border: "border-l-emerald-500" },
  };

  const cfg = statusConfig[item.status as keyof typeof statusConfig] || statusConfig.aguardando;

  return (
    <Card className={`border-l-4 ${cfg.border} overflow-hidden`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-muted">
            {pet?.foto_url ? (
              <SignedImage path={pet.foto_url} alt={pet.nome} className="w-full h-full object-cover" bucket="pet-media" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <img src={logoUrl} alt="Logo" className="w-3/5 h-3/5 object-contain opacity-40" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-foreground truncate">{pet?.nome || "Pet"}</p>
            {pet?.raca && <p className="text-xs text-muted-foreground">{pet.raca}</p>}
            <div className="flex items-center gap-1 mt-0.5">
              <User className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground truncate">{cliente?.nome || "—"}</span>
            </div>
          </div>
          <Badge className={`${cfg.color} text-[10px] shrink-0`}>{cfg.label}</Badge>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{servico}</span>
          {item.banhista_nome && <span className="font-medium text-foreground">🧑‍🔧 {item.banhista_nome}</span>}
        </div>

        {/* Timer / Duration */}
        <div className="flex items-center justify-center py-2">
          {item.status === "em_andamento" && item.inicio_at && (
            <LiveTimer startTime={item.inicio_at} />
          )}
          {item.status === "finalizado" && item.duracao_segundos != null && (
            <span className="font-mono text-lg font-bold text-emerald-600">{formatDuration(item.duracao_segundos)}</span>
          )}
          {item.status === "aguardando" && (
            <span className="text-sm text-muted-foreground">⏳ Na fila</span>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {item.status === "aguardando" && (
            <Button onClick={() => onStart(item)} className="flex-1 gap-1.5" size="sm">
              <Play className="h-3.5 w-3.5" /> Iniciar
            </Button>
          )}
          {item.status === "em_andamento" && (
            <Button onClick={() => onFinish(item)} variant="destructive" className="flex-1 gap-1.5" size="sm">
              <Square className="h-3.5 w-3.5" /> Finalizar
            </Button>
          )}
          {item.status === "finalizado" && item.fim_at && (
            <p className="text-xs text-muted-foreground w-full text-center">
              Finalizado às {format(new Date(item.fim_at), "HH:mm")}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
