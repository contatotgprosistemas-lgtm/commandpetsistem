import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, PawPrint, LogIn, LogOut as LogOutIcon, XCircle, ClipboardList, Camera, CheckSquare, Plus, Hotel, Scissors, TreePine, HelpCircle, Car } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useOperationalAuth } from "@/hooks/useOperationalAuth";
import { format, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { FaltaDialog } from "@/components/FaltaDialog";
import { ManejoDialog } from "@/components/ManejoDialog";
import { OperacionalGaleriaDialog } from "@/components/operacional/OperacionalGaleriaDialog";
import { EstouChegandoMapDialog } from "@/components/EstouChegandoMapDialog";
import { NovoAgendamentoDialog } from "@/components/NovoAgendamentoDialog";
import { addToEsteiraIfApplicable, removeFromEsteira } from "@/lib/esteira";
import { useAgendamentoExtras } from "@/hooks/useAgendamentoExtras";

// Service type visuals (same palette used in ReservasPage)
const serviceTypeMap: Array<{
  keywords: string[];
  icon: typeof Hotel;
  color: string;
  bg: string;
  label: string;
}> = [
  { keywords: ["hotel", "hospedagem", "diaria", "diária", "pernoite"], icon: Hotel, color: "text-lime-600", bg: "bg-lime-500/15", label: "Hotel" },
  { keywords: ["escola", "daycare", "creche", "day_care"], icon: TreePine, color: "text-violet-600", bg: "bg-violet-500/15", label: "Daycare" },
  { keywords: ["banho", "tosa", "grooming", "estética", "estetica"], icon: Scissors, color: "text-amber-600", bg: "bg-amber-500/15", label: "Banho" },
  { keywords: ["taxi", "táxi", "transporte", "leva", "busca", "translado"], icon: Car, color: "text-sky-600", bg: "bg-sky-500/15", label: "TaxiPet" },
];

function getServiceVisual(tipoServico: string) {
  const t = (tipoServico || "").toLowerCase();
  for (const s of serviceTypeMap) {
    if (s.keywords.some((k) => t.includes(k))) return s;
  }
  return { keywords: [], icon: HelpCircle, color: "text-muted-foreground", bg: "bg-muted", label: "Outros" };
}

function isHospedagem(tipoServico: string) {
  const t = (tipoServico || "").toLowerCase();
  return ["hotel", "hospedagem", "diaria", "diária", "pernoite"].some((k) => t.includes(k));
}

export default function OperacionalDashboard() {
  const { user } = useOperationalAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ agendamentosHoje: 0, petsHospedados: 0, checkinsHoje: 0, checkoutsHoje: 0, petsDaycare: 0 });
  const [petsNaEmpresa, setPetsNaEmpresa] = useState<any[]>([]);
  const [faltaOpen, setFaltaOpen] = useState<any>(null);
  const [pendingCheckins, setPendingCheckins] = useState<any[]>([]);
  const [manejoTarget, setManejoTarget] = useState<any>(null);
  const [galeriaTarget, setGaleriaTarget] = useState<any>(null);
  const [manejoFilledIds, setManejoFilledIds] = useState<Set<string>>(new Set());
  const [selectedCheckins, setSelectedCheckins] = useState<Set<string>>(new Set());
  const [selectedNaEmpresa, setSelectedNaEmpresa] = useState<Set<string>>(new Set());
  const [massLoading, setMassLoading] = useState(false);
  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const today = startOfDay(new Date());
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data: agendamentos } = await supabase
        .from("agendamentos")
        .select("id, data_hora, tipo_servico, status, pet:pets(id, nome, foto_url, especie), cliente:clientes(id, nome), subscription_id")
        .eq("empresa_id", user.empresa_id)
        .order("data_hora", { ascending: true });

      const all = agendamentos ?? [];
      // Fetch plan/package names for subscription-linked appointments
      const subIds = [...new Set(all.filter(a => a.subscription_id).map(a => a.subscription_id))];
      let subsMap: Record<string, { plan_name?: string; package_name?: string }> = {};
      if (subIds.length > 0) {
        const { data: subs } = await supabase
          .from("customer_pet_subscriptions")
          .select("id, plan:service_plans(nome), package:service_packages(nome)")
          .in("id", subIds);
        for (const s of subs ?? []) {
          subsMap[s.id] = { plan_name: (s.plan as any)?.nome, package_name: (s.package as any)?.nome };
        }
      }

      // Helper to get the service label (plan/package name or tipo_servico)
      const getServiceLabel = (a: any) => {
        if (a.subscription_id && subsMap[a.subscription_id]) {
          const sub = subsMap[a.subscription_id];
          return sub.plan_name || sub.package_name || a.tipo_servico;
        }
        return a.tipo_servico;
      };

      const agHoje = all.filter(a => {
        const d = startOfDay(new Date(a.data_hora));
        return d >= today && d < tomorrow && a.status !== "cancelado";
      });
      const naEmpresa = all.filter(a => a.status === "na_empresa");

      const hotelKeywords = ["hotel", "hospedagem", "diaria", "diária", "pernoite"];
      const daycareKeywords = ["escola", "daycare", "creche", "day_care"];

      const matchesKeywords = (a: any, keywords: string[]) => {
        const label = getServiceLabel(a).toLowerCase();
        const tipo = a.tipo_servico.toLowerCase();
        return keywords.some(k => label.includes(k) || tipo.includes(k));
      };

      const hospedados = naEmpresa.filter(a => matchesKeywords(a, hotelKeywords));
      const daycare = naEmpresa.filter(a => matchesKeywords(a, daycareKeywords));
      const checkinsHoje = agHoje.filter(a => a.status === "pendente" || a.status === "confirmado" || a.status === "agendado");

      setStats({
        agendamentosHoje: agHoje.length,
        petsHospedados: hospedados.length,
        checkinsHoje: checkinsHoje.length,
        checkoutsHoje: naEmpresa.length,
        petsDaycare: daycare.length,
      });
      const sortByPetName = (a: any, b: any) => (a.pet?.nome ?? "").localeCompare(b.pet?.nome ?? "");
      setPetsNaEmpresa(naEmpresa.map(a => ({ ...a, _serviceLabel: getServiceLabel(a) })).sort(sortByPetName));
      setPendingCheckins([...checkinsHoje].sort(sortByPetName));

      // Check which agendamentos already have manejo records
      const naEmpresaIds = naEmpresa.map(a => a.id);
      if (naEmpresaIds.length > 0) {
        const { data: manejoData } = await supabase
          .from("manejo_registros")
          .select("agendamento_id")
          .in("agendamento_id", naEmpresaIds);
        setManejoFilledIds(new Set((manejoData ?? []).map((m: any) => m.agendamento_id)));
      }

      setLoading(false);
    };
    fetchData();
  }, [user]);

  const handleCheckin = async (item: any) => {
    const now = new Date();
    const { error } = await supabase.from("agendamentos").update({
      status: "na_empresa",
      data_entrada: now.toISOString(),
      hora_entrada: format(now, "HH:mm"),
    }).eq("id", item.id);
    if (error) { toast.error("Erro: " + error.message); return; }
    await addToEsteiraIfApplicable({ empresaId: item.empresa_id, agendamentoId: item.id, tipoServico: item.tipo_servico });
    toast.success("Check-in realizado!");
    window.location.reload();
  };

  const handleCheckout = async (item: any) => {
    const now = new Date();
    const { error } = await supabase.from("agendamentos").update({
      status: "concluido",
      data_saida: now.toISOString(),
      hora_saida: format(now, "HH:mm"),
    }).eq("id", item.id);
    if (error) { toast.error("Erro: " + error.message); return; }
    await removeFromEsteira(item.id);
    toast.success("Check-out realizado!");
    window.location.reload();
  };

  const handleMassCheckin = async () => {
    const targets = pendingCheckins.filter(p => selectedCheckins.has(p.id));
    if (targets.length === 0) return;
    setMassLoading(true);
    for (const item of targets) {
      const now = new Date();
      await supabase.from("agendamentos").update({
        status: "na_empresa", data_entrada: now.toISOString(), hora_entrada: format(now, "HH:mm"),
      }).eq("id", item.id);
    }
    setMassLoading(false);
    toast.success(`Check-in em massa: ${targets.length} pet(s).`);
    window.location.reload();
  };

  const handleMassCheckout = async () => {
    const targets = petsNaEmpresa.filter(p => selectedNaEmpresa.has(p.id));
    if (targets.length === 0) return;
    setMassLoading(true);
    const now = new Date();
    for (const item of targets) {
      await supabase.from("agendamentos").update({
        status: "concluido", data_saida: now.toISOString(), hora_saida: format(now, "HH:mm"),
      }).eq("id", item.id);
      await removeFromEsteira(item.id);
    }
    setMassLoading(false);
    toast.success(`Check-out em massa: ${targets.length} pet(s).`);
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  const cards = [
    { label: "Agendamentos Hoje", value: stats.agendamentosHoje, icon: CalendarDays, color: "text-primary", bg: "bg-primary/10" },
    { label: "Pets Hospedados", value: stats.petsHospedados, icon: PawPrint, color: "text-orange-500", bg: "bg-orange-500/10" },
    { label: "Check-ins Pendentes", value: stats.checkinsHoje, icon: LogIn, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "Pets em Daycare", value: stats.petsDaycare, icon: PawPrint, color: "text-violet-500", bg: "bg-violet-500/10" },
  ];

  // Compute extras for both lists
  const extrasFlags = useAgendamentoExtras([
    ...pendingCheckins.map((p) => ({
      id: p.id,
      cliente_id: p.cliente?.id || "",
      empresa_id: user?.empresa_id,
      tipo_servico: p.tipo_servico,
      pet: p.pet,
    })),
    ...petsNaEmpresa.map((p) => ({
      id: p.id,
      cliente_id: p.cliente?.id || "",
      empresa_id: user?.empresa_id,
      tipo_servico: p.tipo_servico,
      pet: p.pet,
    })),
  ]);

  return (
    <div className="space-y-6 pb-24 md:pb-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Olá, {user?.nome?.split(" ")[0]}! 👋
          </h1>
          <p className="text-sm text-muted-foreground capitalize">
            {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <EstouChegandoMapDialog empresaId={user?.empresa_id} />
          <NovoAgendamentoDialog onSuccess={() => window.location.reload()} />
        </div>
      </div>

      {/* Stats cards - large and touch-friendly */}
      <div className="grid grid-cols-2 gap-4">
        {cards.map((card) => (
          <Card key={card.label} className="rounded-2xl border-border/50 shadow-sm">
            <CardContent className="p-5 flex flex-col items-center text-center gap-3">
              <div className={`h-14 w-14 rounded-xl ${card.bg} flex items-center justify-center`}>
                <card.icon className={`h-7 w-7 ${card.color}`} />
              </div>
              <span className="text-3xl font-bold text-foreground">{card.value}</span>
              <span className="text-xs text-muted-foreground font-medium">{card.label}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pending check-ins with Falta button */}
      {pendingCheckins.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Check-ins Pendentes</h2>
            {selectedCheckins.size > 0 && (
              <Button size="sm" variant="outline" onClick={handleMassCheckin} disabled={massLoading} className="gap-1.5 text-xs">
                <LogIn className="h-3.5 w-3.5" /> {massLoading ? "Processando..." : `Check-in (${selectedCheckins.size})`}
              </Button>
            )}
          </div>
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <Checkbox
              checked={selectedCheckins.size === pendingCheckins.length && pendingCheckins.length > 0}
              onCheckedChange={(checked) => setSelectedCheckins(checked ? new Set(pendingCheckins.map(p => p.id)) : new Set())}
            />
            Selecionar todos
          </label>
          <div className="space-y-2">
            {pendingCheckins.map((item) => (
              <Card key={item.id} className="rounded-xl">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={selectedCheckins.has(item.id)}
                      onCheckedChange={() => {
                        setSelectedCheckins(prev => {
                          const next = new Set(prev);
                          next.has(item.id) ? next.delete(item.id) : next.add(item.id);
                          return next;
                        });
                      }}
                    />
                    <div className="relative">
                      <Avatar className="h-10 w-10 shrink-0">
                        {item.pet?.foto_url && <AvatarImage src={item.pet.foto_url} />}
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                          {(item.pet?.nome ?? "P").slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {(() => {
                        const sv = getServiceVisual(item.tipo_servico);
                        const Icon = sv.icon;
                        return (
                          <div className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-full ${sv.bg} flex items-center justify-center ring-2 ring-card`} title={sv.label}>
                            <Icon className={`h-3 w-3 ${sv.color}`} />
                          </div>
                        );
                      })()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground text-sm">{item.pet?.nome ?? "Pet"}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.cliente?.nome ?? "—"}</p>
                      <div className="mt-1 flex items-center gap-1 flex-wrap">
                        <Badge variant="outline" className="text-[10px]">{item.tipo_servico}</Badge>
                        {isHospedagem(item.tipo_servico) && extrasFlags[item.id]?.hasBanho && (
                          <Badge className="text-[10px] bg-amber-500/15 text-amber-700 border-amber-500/30 gap-1" variant="outline" title="Inclui Banho/Tosa">
                            <Scissors className="h-2.5 w-2.5" /> Banho
                          </Badge>
                        )}
                        {isHospedagem(item.tipo_servico) && extrasFlags[item.id]?.hasTaxiPet && (
                          <Badge className="text-[10px] bg-sky-500/15 text-sky-700 border-sky-500/30 gap-1" variant="outline" title="Inclui TaxiPet">
                            <Car className="h-2.5 w-2.5" /> TaxiPet
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleCheckin(item)} className="flex-1 gap-1.5 h-9 text-xs">
                      <LogIn className="h-3.5 w-3.5" /> Entrada
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setFaltaOpen(item)} className="flex-1 gap-1.5 h-9 text-xs text-destructive hover:text-destructive">
                      <XCircle className="h-3.5 w-3.5" /> Falta
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Pets na empresa */}
      {petsNaEmpresa.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Pets na Empresa</h2>
            {selectedNaEmpresa.size > 0 && (
              <Button size="sm" variant="outline" onClick={handleMassCheckout} disabled={massLoading} className="gap-1.5 text-xs">
                <LogOutIcon className="h-3.5 w-3.5" /> {massLoading ? "Processando..." : `Saída (${selectedNaEmpresa.size})`}
              </Button>
            )}
          </div>
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <Checkbox
              checked={selectedNaEmpresa.size === petsNaEmpresa.length && petsNaEmpresa.length > 0}
              onCheckedChange={(checked) => setSelectedNaEmpresa(checked ? new Set(petsNaEmpresa.map(p => p.id)) : new Set())}
            />
            Selecionar todos
          </label>
          <div className="space-y-2">
            {petsNaEmpresa.map((item) => (
              <Card key={item.id} className="rounded-xl">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={selectedNaEmpresa.has(item.id)}
                      onCheckedChange={() => {
                        setSelectedNaEmpresa(prev => {
                          const next = new Set(prev);
                          next.has(item.id) ? next.delete(item.id) : next.add(item.id);
                          return next;
                        });
                      }}
                    />
                    <div className="relative">
                      <Avatar className="h-10 w-10 shrink-0">
                        {item.pet?.foto_url && <AvatarImage src={item.pet.foto_url} />}
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                          {(item.pet?.nome ?? "P").slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {(() => {
                        const sv = getServiceVisual(item.tipo_servico);
                        const Icon = sv.icon;
                        return (
                          <div className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-full ${sv.bg} flex items-center justify-center ring-2 ring-card`} title={sv.label}>
                            <Icon className={`h-3 w-3 ${sv.color}`} />
                          </div>
                        );
                      })()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground text-sm">{item.pet?.nome ?? "Pet"}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.cliente?.nome ?? "—"}</p>
                      <div className="mt-1 flex items-center gap-1 flex-wrap">
                        <Badge variant="outline" className="text-[10px]">{item._serviceLabel || item.tipo_servico}</Badge>
                        {isHospedagem(item.tipo_servico) && extrasFlags[item.id]?.hasBanho && (
                          <Badge className="text-[10px] bg-amber-500/15 text-amber-700 border-amber-500/30 gap-1" variant="outline" title="Inclui Banho/Tosa">
                            <Scissors className="h-2.5 w-2.5" /> Banho
                          </Badge>
                        )}
                        {isHospedagem(item.tipo_servico) && extrasFlags[item.id]?.hasTaxiPet && (
                          <Badge className="text-[10px] bg-sky-500/15 text-sky-700 border-sky-500/30 gap-1" variant="outline" title="Inclui TaxiPet">
                            <Car className="h-2.5 w-2.5" /> TaxiPet
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Button size="sm" variant="outline" onClick={() => setManejoTarget(item)}
                      className={`gap-1 h-9 text-xs ${manejoFilledIds.has(item.id) ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 hover:text-emerald-700" : ""}`}>
                      <ClipboardList className="h-3.5 w-3.5" /> Manejo
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setGaleriaTarget(item)} className="gap-1 h-9 text-xs">
                      <Camera className="h-3.5 w-3.5" /> Galeria
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleCheckout(item)} className="gap-1 h-9 text-xs">
                      <LogOutIcon className="h-3.5 w-3.5" /> Saída
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {faltaOpen && (
        <FaltaDialog
          open={!!faltaOpen}
          onOpenChange={(o) => { if (!o) setFaltaOpen(null); }}
          agendamento={faltaOpen}
          empresaId={user?.empresa_id ?? ""}
          allowsReplacement={true}
          onSuccess={() => window.location.reload()}
        />
      )}

      {manejoTarget && (
        <ManejoDialog
          open={!!manejoTarget}
          onOpenChange={(o) => { if (!o) setManejoTarget(null); }}
          agendamentoId={manejoTarget.id}
          petId={manejoTarget.pet?.id ?? ""}
          petName={manejoTarget.pet?.nome ?? "Pet"}
          empresaIdOverride={user?.empresa_id}
        />
      )}

      {galeriaTarget && (
        <OperacionalGaleriaDialog
          open={!!galeriaTarget}
          onOpenChange={(o) => { if (!o) setGaleriaTarget(null); }}
          petId={galeriaTarget.pet?.id ?? ""}
          petName={galeriaTarget.pet?.nome ?? "Pet"}
          clienteId={galeriaTarget.cliente?.id ?? ""}
          empresaId={user?.empresa_id ?? ""}
        />
      )}
    </div>
  );
}
