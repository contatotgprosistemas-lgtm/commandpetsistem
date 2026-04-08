import { useEffect, useState, useRef } from "react";
import { MapPin, X, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TrackingEntry {
  id: string;
  cliente_id: string;
  pet_id: string | null;
  latitude: number | null;
  longitude: number | null;
  updated_at: string;
  cliente?: { nome: string; foto_url: string | null } | null;
  pet?: { nome: string; foto_url: string | null } | null;
}

interface EstouChegandoMapDialogProps {
  empresaId?: string;
}

export function EstouChegandoMapDialog({ empresaId }: EstouChegandoMapDialogProps = {}) {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<TrackingEntry[]>([]);
  const [count, setCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Poll count for badge (lightweight)
  useEffect(() => {
    const fetchCount = async () => {
      let q = supabase
        .from("estou_chegando")
        .select("id", { count: "exact", head: true })
        .eq("active", true);
      if (empresaId) q = q.eq("empresa_id", empresaId);
      const { count: c } = await q;
      setCount(c ?? 0);
    };
    fetchCount();

    // Subscribe to realtime changes
    const channel = supabase
      .channel("estou-chegando-count")
      .on("postgres_changes", { event: "*", schema: "public", table: "estou_chegando" }, () => {
        fetchCount();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [empresaId]);

  // When dialog is open, poll positions every 5 seconds
  useEffect(() => {
    if (!open) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    const fetchEntries = async () => {
      let q = supabase
        .from("estou_chegando")
        .select("id, cliente_id, pet_id, latitude, longitude, updated_at, cliente:clientes(nome, foto_url), pet:pets(nome, foto_url)")
        .eq("active", true);
      if (empresaId) q = q.eq("empresa_id", empresaId);
      const { data, error } = await q;

      if (!error && data) {
        setEntries(data as unknown as TrackingEntry[]);
      }
    };

    fetchEntries();
    intervalRef.current = setInterval(fetchEntries, 5000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [open, empresaId]);

  const timeSince = (dateStr: string) => {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return `${diff}s atrás`;
    if (diff < 3600) return `${Math.floor(diff / 60)}min atrás`;
    return `${Math.floor(diff / 3600)}h atrás`;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 relative">
          <MapPin className="h-4 w-4" strokeWidth={1.5} />
          Mapa
          {count > 0 && (
            <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-[10px] bg-emerald-500 text-white border-0 animate-pulse">
              {count}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Clientes a caminho
            {entries.length > 0 && (
              <Badge variant="secondary" className="ml-2">{entries.length} ativo{entries.length > 1 ? "s" : ""}</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <MapPin className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-sm font-medium">Nenhum cliente a caminho</p>
              <p className="text-xs mt-1">Quando um cliente ativar "Estou Chegando", aparecerá aqui.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Map visualization using CSS grid positions */}
              <div className="relative bg-muted/30 rounded-xl border border-border overflow-hidden" style={{ height: 400 }}>
                {/* Map grid background */}
                <div className="absolute inset-0 opacity-10" style={{
                  backgroundImage: "radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)",
                  backgroundSize: "20px 20px"
                }} />

                {/* Center marker = empresa */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center">
                  <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center shadow-lg border-2 border-primary-foreground">
                    <MapPin className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <span className="text-[10px] font-semibold text-primary mt-1 bg-card/80 px-1.5 py-0.5 rounded">Empresa</span>
                </div>

                {/* Client markers distributed around center */}
                {entries.map((entry, idx) => {
                  const angle = (idx / entries.length) * 2 * Math.PI - Math.PI / 2;
                  const radius = 120 + (idx % 3) * 40;
                  const x = 50 + (Math.cos(angle) * radius / 4);
                  const y = 50 + (Math.sin(angle) * radius / 4);
                  const petName = (entry.pet as any)?.nome ?? "Pet";
                  const petFoto = (entry.pet as any)?.foto_url;
                  const clienteNome = (entry.cliente as any)?.nome ?? "Cliente";

                  return (
                    <div
                      key={entry.id}
                      className="absolute z-20 flex flex-col items-center transition-all duration-1000 ease-in-out"
                      style={{ top: `${Math.min(90, Math.max(10, y))}%`, left: `${Math.min(90, Math.max(10, x))}%`, transform: "translate(-50%, -50%)" }}
                    >
                      <div className="relative">
                        <Avatar className="h-10 w-10 border-2 border-emerald-500 shadow-lg">
                          {petFoto && <AvatarImage src={petFoto} alt={petName} />}
                          <AvatarFallback className="bg-emerald-500/10 text-emerald-700 text-xs font-bold">
                            {petName.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-emerald-500 rounded-full border-2 border-card animate-pulse" />
                      </div>
                      <span className="text-[10px] font-medium text-foreground mt-1 bg-card/90 px-1.5 py-0.5 rounded shadow-sm max-w-[80px] truncate text-center">
                        {petName}
                      </span>
                      <span className="text-[9px] text-muted-foreground">{clienteNome.split(" ")[0]}</span>
                    </div>
                  );
                })}
              </div>

              {/* List view */}
              <div className="space-y-1.5 mt-3">
                {entries.map((entry) => {
                  const petName = (entry.pet as any)?.nome ?? "Pet";
                  const petFoto = (entry.pet as any)?.foto_url;
                  const clienteNome = (entry.cliente as any)?.nome ?? "Cliente";
                  const clienteFoto = (entry.cliente as any)?.foto_url;

                  return (
                    <div key={entry.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border border-border">
                      <div className="flex items-center -space-x-2">
                        <Avatar className="h-9 w-9 border-2 border-card z-10">
                          {petFoto && <AvatarImage src={petFoto} alt={petName} />}
                          <AvatarFallback className="bg-accent text-accent-foreground text-xs">{petName.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <Avatar className="h-7 w-7 border-2 border-card">
                          {clienteFoto && <AvatarImage src={clienteFoto} alt={clienteNome} />}
                          <AvatarFallback className="bg-primary/10 text-primary text-[9px]">{clienteNome.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{petName} <span className="text-muted-foreground font-normal">• {clienteNome}</span></p>
                        <p className="text-xs text-muted-foreground">
                          {entry.latitude && entry.longitude
                            ? `${Number(entry.latitude).toFixed(4)}, ${Number(entry.longitude).toFixed(4)}`
                            : "Aguardando localização..."}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />
                        <span className="text-xs text-muted-foreground">{timeSince(entry.updated_at)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
