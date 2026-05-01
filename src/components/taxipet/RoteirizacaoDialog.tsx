import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  MapPin, Navigation2, Route, GripVertical, AlertTriangle, Info,
} from "lucide-react";
import { toast } from "sonner";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy, arrayMove, useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export type RouteStop = {
  id: string; // booking id (com :buscar / :levar)
  realId: string; // id sem prefixo
  source: "transport" | "agendamento";
  pet_nome: string;
  cliente_nome: string;
  cliente_endereco: string | null;
  time: string;
  final_price: number;
};

type Vehicle = { id: string; model: string; plate: string | null; brand: string | null };
type Driver = { id: string; name: string };

export default function RoteirizacaoDialog({
  open, onOpenChange, tipo, paradas, data,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tipo: "buscar" | "levar";
  paradas: RouteStop[];
  data: string;
}) {
  const { profile } = useAuth();
  const [list, setList] = useState<RouteStop[]>([]);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [origin, setOrigin] = useState<"empresa" | "atual" | "custom">("empresa");
  const [originCustom, setOriginCustom] = useState("");
  const [empresaEndereco, setEmpresaEndereco] = useState("");
  const [destinoFinal, setDestinoFinal] = useState<"empresa" | "ultima_parada" | "custom">(
    tipo === "levar" ? "empresa" : "ultima_parada",
  );
  const [destinoCustom, setDestinoCustom] = useState("");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicleId, setVehicleId] = useState<string>("");
  const [driverId, setDriverId] = useState<string>("");
  const [observacoes, setObservacoes] = useState("");
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    if (!open) return;
    setList(paradas);
    setExcluded(new Set());
    setObservacoes("");
    setDestinoFinal(tipo === "levar" ? "empresa" : "ultima_parada");
  }, [open, paradas, tipo]);

  useEffect(() => {
    if (!open || !profile?.empresa_id) return;
    (async () => {
      const eid = profile.empresa_id!;
      const [{ data: emp }, { data: v }, { data: d }] = await Promise.all([
        supabase.from("empresas").select("endereco, cidade, estado").eq("id", eid).maybeSingle(),
        supabase.from("vehicles").select("id, model, plate, brand").eq("empresa_id", eid).eq("status", "ativo").order("model"),
        supabase.from("drivers").select("id, name").eq("empresa_id", eid).eq("status", "ativo").order("name"),
      ]);
      const e = emp as any;
      const addr = [e?.endereco, e?.cidade, e?.estado].filter(Boolean).join(", ");
      setEmpresaEndereco(addr);
      setVehicles((v as Vehicle[]) || []);
      setDrivers((d as Driver[]) || []);
    })();
  }, [open, profile?.empresa_id]);

  const includedStops = useMemo(
    () => list.filter((s) => !excluded.has(s.id) && s.cliente_endereco),
    [list, excluded],
  );

  const handleEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const from = list.findIndex((i) => i.id === e.active.id);
    const to = list.findIndex((i) => i.id === e.over!.id);
    if (from < 0 || to < 0) return;
    setList(arrayMove(list, from, to));
  };

  const toggleExclude = (id: string) => {
    setExcluded((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const buildAddresses = (): {
    origemAddr: string; destinoAddr: string; waypoints: string[];
  } | null => {
    if (includedStops.length === 0) {
      toast.error("Inclua ao menos 1 parada com endereço");
      return null;
    }
    let origemAddr = "";
    if (origin === "empresa") origemAddr = empresaEndereco;
    else if (origin === "custom") origemAddr = originCustom.trim();
    // "atual" deixa origemAddr vazio — Google usa localização atual do dispositivo se origin omitido

    let destinoAddr = "";
    if (destinoFinal === "empresa") destinoAddr = empresaEndereco;
    else if (destinoFinal === "custom") destinoAddr = destinoCustom.trim();
    else destinoAddr = includedStops[includedStops.length - 1].cliente_endereco || "";

    const waypoints = (destinoFinal === "ultima_parada" ? includedStops.slice(0, -1) : includedStops)
      .map((s) => s.cliente_endereco!)
      .filter(Boolean);

    return { origemAddr, destinoAddr, waypoints };
  };

  const persistRoute = async (origemAddr: string, destinoAddr: string) => {
    if (!profile?.empresa_id) return null;
    const paradasJson = includedStops.map((s, idx) => ({
      ordem: idx + 1,
      booking_id: s.realId,
      source: s.source,
      pet_nome: s.pet_nome,
      cliente_nome: s.cliente_nome,
      endereco: s.cliente_endereco,
      horario: s.time,
      valor: s.final_price,
    }));
    const receita = includedStops.reduce((acc, s) => acc + (Number(s.final_price) || 0), 0);
    const { data: row, error } = await supabase
      .from("taxipet_roteirizacoes")
      .insert({
        empresa_id: profile.empresa_id,
        data,
        tipo,
        vehicle_id: vehicleId || null,
        driver_id: driverId || null,
        origem_endereco: origemAddr || null,
        destino_endereco: destinoAddr || null,
        paradas: paradasJson,
        receita_total: receita,
        status: "em_andamento",
        observacoes: observacoes || null,
      })
      .select("id")
      .single();
    if (error) {
      toast.error("Erro ao salvar rota: " + error.message);
      return null;
    }
    return row?.id as string;
  };

  const openInMaps = async () => {
    const built = buildAddresses();
    if (!built) return;
    setSaving(true);
    const { origemAddr, destinoAddr, waypoints } = built;
    const routeId = await persistRoute(origemAddr, destinoAddr);
    if (!routeId) {
      setSaving(false);
      return;
    }
    // Google Maps suporta até 9 waypoints. Se ultrapassar, divide em 2 abas.
    const MAX = 9;
    const chunks: string[][] = [];
    for (let i = 0; i < waypoints.length; i += MAX) {
      chunks.push(waypoints.slice(i, i + MAX));
    }
    if (chunks.length === 0) chunks.push([]);

    chunks.forEach((wp, idx) => {
      const params = new URLSearchParams();
      params.set("api", "1");
      if (origemAddr) params.set("origin", origemAddr);
      params.set("destination", destinoAddr);
      if (wp.length > 0) params.set("waypoints", wp.join("|"));
      params.set("travelmode", "driving");
      const url = `https://www.google.com/maps/dir/?${params.toString()}`;
      // Atrasa abas extras ligeiramente
      setTimeout(() => window.open(url, "_blank"), idx * 200);
    });
    if (chunks.length > 1) {
      toast.info(`Rota dividida em ${chunks.length} abas (limite de ${MAX} waypoints)`);
    } else {
      toast.success("Rota aberta no Google Maps");
    }
    setSaving(false);
    onOpenChange(false);
  };

  const openInWaze = async () => {
    const built = buildAddresses();
    if (!built) return;
    setSaving(true);
    const { origemAddr, destinoAddr } = built;
    await persistRoute(origemAddr, destinoAddr);
    // Waze não suporta multi-waypoints. Abre primeira parada e mostra toast.
    const first = includedStops[0];
    if (first?.cliente_endereco) {
      const url = `https://waze.com/ul?q=${encodeURIComponent(first.cliente_endereco)}&navigate=yes`;
      window.open(url, "_blank");
    }
    toast.info(
      `Waze não suporta múltiplas paradas. Aberto na 1ª parada — após chegar, abra a próxima manualmente. (${includedStops.length} paradas no total)`,
      { duration: 7000 },
    );
    setSaving(false);
    onOpenChange(false);
  };

  const titulo = tipo === "buscar" ? "Roteirizar Coletas" : "Roteirizar Entregas";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Route className="h-5 w-5 text-primary" /> {titulo}
          </DialogTitle>
          <DialogDescription>
            Ordene as paradas, selecione o veículo e dispare a rota para Maps ou Waze.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Origem */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Ponto de partida</Label>
              <Select value={origin} onValueChange={(v: any) => setOrigin(v)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="empresa">Endereço da empresa</SelectItem>
                  <SelectItem value="atual">Localização atual</SelectItem>
                  <SelectItem value="custom">Endereço customizado</SelectItem>
                </SelectContent>
              </Select>
              {origin === "empresa" && (
                <p className="text-[11px] text-muted-foreground truncate">{empresaEndereco || "(empresa sem endereço cadastrado)"}</p>
              )}
              {origin === "custom" && (
                <Input
                  placeholder="Digite o endereço de partida"
                  value={originCustom}
                  onChange={(e) => setOriginCustom(e.target.value)}
                  className="h-9"
                />
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Destino final</Label>
              <Select value={destinoFinal} onValueChange={(v: any) => setDestinoFinal(v)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ultima_parada">Última parada da lista</SelectItem>
                  <SelectItem value="empresa">Voltar para empresa</SelectItem>
                  <SelectItem value="custom">Endereço customizado</SelectItem>
                </SelectContent>
              </Select>
              {destinoFinal === "custom" && (
                <Input
                  placeholder="Endereço de destino"
                  value={destinoCustom}
                  onChange={(e) => setDestinoCustom(e.target.value)}
                  className="h-9"
                />
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Veículo (para gestão de combustível)</Label>
              <Select value={vehicleId} onValueChange={setVehicleId}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {[v.brand, v.model].filter(Boolean).join(" ")}{v.plate ? ` (${v.plate})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Motorista</Label>
              <Select value={driverId} onValueChange={setDriverId}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  {drivers.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Lista */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs">Paradas ({includedStops.length} incluídas)</Label>
              <span className="text-[10px] text-muted-foreground">Arraste para reordenar</span>
            </div>

            {list.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Sem paradas para roteirizar.</p>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleEnd}>
                <SortableContext items={list.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                    {list.map((s, idx) => (
                      <SortableStop
                        key={s.id}
                        stop={s}
                        index={idx + 1}
                        excluded={excluded.has(s.id)}
                        onToggle={() => toggleExclude(s.id)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>

          {includedStops.some((s) => !s.cliente_endereco) && (
            <Alert variant="default" className="border-amber-500/30 bg-amber-500/5">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Algumas paradas não têm endereço cadastrado e foram ignoradas.
              </AlertDescription>
            </Alert>
          )}

          {includedStops.length > 9 && (
            <Alert className="border-sky-500/30 bg-sky-500/5">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Você tem {includedStops.length} paradas. O Google Maps suporta até 9 waypoints — a rota será dividida em múltiplas abas.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">Observações (opcional)</Label>
            <Input
              placeholder="Ex: motorista deve passar no posto antes de iniciar"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              className="h-9"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button
            variant="outline"
            onClick={openInWaze}
            disabled={saving || includedStops.length === 0}
            className="gap-1.5"
          >
            <Navigation2 className="h-4 w-4 text-violet-600" /> Abrir no Waze
          </Button>
          <Button
            onClick={openInMaps}
            disabled={saving || includedStops.length === 0}
            className="gap-1.5"
          >
            <MapPin className="h-4 w-4" /> Abrir no Google Maps
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SortableStop({
  stop, index, excluded, onToggle,
}: {
  stop: RouteStop; index: number; excluded: boolean; onToggle: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: stop.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 rounded-md border border-border/60 p-2 bg-card text-xs ${excluded ? "opacity-50" : ""}`}
    >
      <button
        {...attributes} {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
        aria-label="Reordenar"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <Checkbox
        checked={!excluded}
        onCheckedChange={onToggle}
        className="shrink-0"
      />
      <Badge variant="outline" className="text-[10px] shrink-0">{index}</Badge>
      <span className="font-medium tabular-nums shrink-0">{stop.time || "—"}</span>
      <div className="flex-1 min-w-0">
        <div className="truncate">
          <span className="font-medium">{stop.pet_nome}</span>
          <span className="text-muted-foreground"> · {stop.cliente_nome}</span>
        </div>
        {stop.cliente_endereco ? (
          <p className="text-[10px] text-muted-foreground truncate">{stop.cliente_endereco}</p>
        ) : (
          <p className="text-[10px] text-destructive">Sem endereço</p>
        )}
      </div>
    </div>
  );
}
