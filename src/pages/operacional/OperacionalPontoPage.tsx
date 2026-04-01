import { useState, useEffect, useRef, useCallback } from "react";
import { SignedImage } from "@/components/SignedImage";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useOperationalAuth } from "@/hooks/useOperationalAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Clock, Camera, MapPin, LogIn, LogOut, Coffee,
  Play, Loader2, CheckCircle2, AlertTriangle
} from "lucide-react";

type PunchType = "entrada" | "pausa_inicio" | "pausa_fim" | "saida";

interface PunchRecord {
  id: string;
  tipo: PunchType;
  data_hora: string;
  latitude: number | null;
  longitude: number | null;
  selfie_url: string | null;
}

const PUNCH_LABELS: Record<string, string> = {
  entrada: "Entrada",
  pausa_inicio: "Início Pausa",
  pausa_fim: "Fim Pausa",
  saida: "Saída",
};

const PUNCH_ICONS: Record<string, any> = {
  entrada: LogIn,
  pausa_inicio: Coffee,
  pausa_fim: Play,
  saida: LogOut,
};

const PUNCH_COLORS: Record<string, string> = {
  entrada: "bg-emerald-500 hover:bg-emerald-600",
  pausa_inicio: "bg-amber-500 hover:bg-amber-600",
  pausa_fim: "bg-blue-500 hover:bg-blue-600",
  saida: "bg-red-500 hover:bg-red-600",
};

const STATUS_LABELS: Record<string, string> = {
  idle: "Fora do expediente",
  working: "Trabalhando",
  break: "Em pausa",
};

export default function OperacionalPontoPage() {
  const { user } = useOperationalAuth();
  const [todayPunches, setTodayPunches] = useState<PunchRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [pendingGeo, setPendingGeo] = useState<{ lat: number; lng: number } | null>(null);
  const [pendingType, setPendingType] = useState<PunchType>("entrada");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [cameraReady, setCameraReady] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Live clock
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch today's punches
  const fetchTodayPunches = useCallback(async () => {
    if (!user) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data } = await supabase
      .from("ponto_registros")
      .select("id, tipo, data_hora, latitude, longitude, selfie_url")
      .eq("operational_user_id", user.id)
      .gte("data_hora", today.toISOString())
      .lt("data_hora", tomorrow.toISOString())
      .order("data_hora", { ascending: true });

    setTodayPunches((data as PunchRecord[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchTodayPunches(); }, [fetchTodayPunches]);

  // Determine status and next punch type
  const getStatus = (): "idle" | "working" | "break" => {
    if (todayPunches.length === 0) return "idle";
    const last = todayPunches[todayPunches.length - 1].tipo;
    if (last === "entrada" || last === "pausa_fim") return "working";
    if (last === "pausa_inicio") return "break";
    return "idle";
  };

  const getNextPunchType = (): PunchType => {
    if (todayPunches.length === 0) return "entrada";
    const last = todayPunches[todayPunches.length - 1].tipo;
    switch (last) {
      case "entrada": return "pausa_inicio";
      case "pausa_inicio": return "pausa_fim";
      case "pausa_fim": return "saida";
      case "saida": return "entrada";
      default: return "entrada";
    }
  };

  const getAvailableActions = (): PunchType[] => {
    if (todayPunches.length === 0) return ["entrada"];
    const last = todayPunches[todayPunches.length - 1].tipo;
    switch (last) {
      case "entrada": return ["pausa_inicio", "saida"];
      case "pausa_inicio": return ["pausa_fim"];
      case "pausa_fim": return ["pausa_inicio", "saida"];
      case "saida": return ["entrada"];
      default: return ["entrada"];
    }
  };

  const status = getStatus();
  const availableActions = getAvailableActions();

  // Start punch flow: get geo → open camera
  const handleStartPunch = async (tipo: PunchType) => {
    setPendingType(tipo);
    setRegistering(true);

    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
        });
      });

      setPendingGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      setCameraOpen(true);
      setCameraReady(false);
    } catch (err: any) {
      if (err?.code === 1) {
        toast.error("Permissão de localização negada. Habilite nas configurações.");
      } else {
        toast.error("Erro ao obter localização.");
      }
      setRegistering(false);
    }
  };

  // Start camera when dialog opens
  useEffect(() => {
    if (!cameraOpen) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      return;
    }

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: 480, height: 480 },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        setCameraReady(true);
      } catch {
        toast.error("Erro ao acessar câmera. Verifique as permissões.");
        setCameraOpen(false);
        setRegistering(false);
      }
    };

    // Small delay to ensure dialog DOM is ready
    const timer = setTimeout(startCamera, 300);
    return () => clearTimeout(timer);
  }, [cameraOpen]);

  // Capture selfie and register punch
  const handleCapture = async () => {
    if (!user || !pendingGeo || !videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 480;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Mirror horizontally for natural selfie
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Stop camera
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraOpen(false);

    try {
      // Convert to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(b => b ? resolve(b) : reject(new Error("Canvas empty")), "image/jpeg", 0.8);
      });

      // Upload to storage
      const fileName = `${user.empresa_id}/${user.id}/${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("ponto-selfies")
        .upload(fileName, blob, { contentType: "image/jpeg" });

      if (uploadError) throw uploadError;

      // Store the file path for signed URL resolution later
      const { data: signedData } = await supabase.storage.from("ponto-selfies").createSignedUrl(fileName, 3600);

      // Insert punch record
      const { error: insertError } = await supabase.from("ponto_registros").insert({
        empresa_id: user.empresa_id,
        operational_user_id: user.id,
        tipo: pendingType,
        data_hora: new Date().toISOString(),
        latitude: pendingGeo.lat,
        longitude: pendingGeo.lng,
        selfie_url: signedData?.signedUrl || fileName,
      });

      if (insertError) throw insertError;

      toast.success(`${PUNCH_LABELS[pendingType]} registrada com sucesso! ✅`);
      await fetchTodayPunches();

      // Update daily summary
      await updateJornada();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao registrar ponto.");
    } finally {
      setRegistering(false);
      setPendingGeo(null);
    }
  };

  // Update daily summary after punch
  const updateJornada = async () => {
    if (!user) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data: punches } = await supabase
      .from("ponto_registros")
      .select("tipo, data_hora")
      .eq("operational_user_id", user.id)
      .gte("data_hora", today.toISOString())
      .lt("data_hora", tomorrow.toISOString())
      .order("data_hora", { ascending: true });

    if (!punches || punches.length === 0) return;

    // Calculate worked minutes
    let workedMin = 0;
    let lastEntry: Date | null = null;
    let lastPauseStart: Date | null = null;
    let pauseMin = 0;

    for (const p of punches) {
      const t = new Date(p.data_hora);
      switch (p.tipo) {
        case "entrada":
          lastEntry = t;
          break;
        case "pausa_inicio":
          if (lastEntry) {
            workedMin += (t.getTime() - lastEntry.getTime()) / 60000;
            lastEntry = null;
          }
          lastPauseStart = t;
          break;
        case "pausa_fim":
          if (lastPauseStart) {
            pauseMin += (t.getTime() - lastPauseStart.getTime()) / 60000;
            lastPauseStart = null;
          }
          lastEntry = t;
          break;
        case "saida":
          if (lastEntry) {
            workedMin += (t.getTime() - lastEntry.getTime()) / 60000;
            lastEntry = null;
          }
          break;
      }
    }

    // If still working (no saida), count up to now
    if (lastEntry) {
      workedMin += (new Date().getTime() - lastEntry.getTime()) / 60000;
    }

    workedMin = Math.round(workedMin);

    // Get config for expected hours
    const { data: config } = await supabase
      .from("ponto_configuracoes")
      .select("jornada_diaria_min, intervalo_min")
      .eq("empresa_id", user.empresa_id)
      .maybeSingle();

    const expectedMin = config?.jornada_diaria_min || 480;
    const saldo = workedMin - expectedMin;
    const todayStr = format(today, "yyyy-MM-dd");

    // Upsert jornada
    const { data: existing } = await supabase
      .from("ponto_jornadas")
      .select("id")
      .eq("operational_user_id", user.id)
      .eq("data", todayStr)
      .maybeSingle();

    if (existing) {
      await supabase.from("ponto_jornadas").update({
        horas_trabalhadas_min: workedMin,
        horas_esperadas_min: expectedMin,
        saldo_min: saldo,
        updated_at: new Date().toISOString(),
      }).eq("id", existing.id);
    } else {
      await supabase.from("ponto_jornadas").insert({
        empresa_id: user.empresa_id,
        operational_user_id: user.id,
        data: todayStr,
        horas_trabalhadas_min: workedMin,
        horas_esperadas_min: expectedMin,
        saldo_min: saldo,
        status: "aberto",
      });
    }
  };

  // Calculate worked time today
  const getWorkedToday = (): number => {
    let workedMin = 0;
    let lastEntry: Date | null = null;

    for (const p of todayPunches) {
      const t = new Date(p.data_hora);
      switch (p.tipo) {
        case "entrada":
          lastEntry = t;
          break;
        case "pausa_inicio":
          if (lastEntry) {
            workedMin += (t.getTime() - lastEntry.getTime()) / 60000;
            lastEntry = null;
          }
          break;
        case "pausa_fim":
          lastEntry = t;
          break;
        case "saida":
          if (lastEntry) {
            workedMin += (t.getTime() - lastEntry.getTime()) / 60000;
            lastEntry = null;
          }
          break;
      }
    }

    if (lastEntry && status === "working") {
      workedMin += (currentTime.getTime() - lastEntry.getTime()) / 60000;
    }

    return Math.round(workedMin);
  };

  const formatMin = (min: number) => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${h}h${m.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const workedToday = getWorkedToday();

  return (
    <div className="space-y-6 pb-24 md:pb-0">
      <div className="text-center">
        <h1 className="text-xl font-bold text-foreground flex items-center justify-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Registro de Ponto
        </h1>
      </div>

      {/* Live Clock */}
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-4xl font-mono font-bold text-foreground tracking-wider">
            {format(currentTime, "HH:mm:ss")}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {format(currentTime, "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </p>

          {/* Status indicator */}
          <div className="mt-4">
            <Badge
              variant="secondary"
              className={`text-sm px-3 py-1 ${
                status === "working" ? "bg-emerald-500/10 text-emerald-600" :
                status === "break" ? "bg-amber-500/10 text-amber-600" :
                "bg-muted text-muted-foreground"
              }`}
            >
              {STATUS_LABELS[status]}
            </Badge>
          </div>

          {/* Worked time */}
          {todayPunches.length > 0 && (
            <p className="text-lg font-semibold text-foreground mt-3">
              {formatMin(workedToday)} trabalhadas
            </p>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3">
        {availableActions.map(tipo => {
          const Icon = PUNCH_ICONS[tipo] || Clock;
          return (
            <Button
              key={tipo}
              size="lg"
              onClick={() => handleStartPunch(tipo)}
              disabled={registering}
              className={`gap-3 text-lg py-6 text-white ${PUNCH_COLORS[tipo]}`}
            >
              {registering && pendingType === tipo ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Icon className="h-5 w-5" />
              )}
              {PUNCH_LABELS[tipo]}
            </Button>
          );
        })}
      </div>

      {/* Today's Punches */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Registros de Hoje</CardTitle>
        </CardHeader>
        <CardContent>
          {todayPunches.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum registro hoje.</p>
          ) : (
            <div className="space-y-2">
              {todayPunches.map(p => {
                const Icon = PUNCH_ICONS[p.tipo] || Clock;
                return (
                  <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/60">
                    {p.selfie_url && (
                      <SignedImage src={p.selfie_url} alt="" className="h-10 w-10 rounded-full object-cover border-2 border-border shrink-0" />
                    )}
                    <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground">{PUNCH_LABELS[p.tipo]}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(p.data_hora), "HH:mm:ss")}</p>
                    </div>
                    {p.latitude && (
                      <a
                        href={`https://www.google.com/maps?q=${p.latitude},${p.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <MapPin className="h-4 w-4 text-muted-foreground hover:text-primary" />
                      </a>
                    )}
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Camera Capture Dialog */}
      <Dialog open={cameraOpen} onOpenChange={(open) => {
        if (!open) {
          setCameraOpen(false);
          setRegistering(false);
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
          }
        }
      }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Capturar Selfie
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="relative rounded-lg overflow-hidden bg-black aspect-square">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ transform: "scaleX(-1)" }}
              />
              {!cameraReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <Loader2 className="h-8 w-8 animate-spin text-white" />
                </div>
              )}
            </div>

            {pendingGeo && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span>Localização: {pendingGeo.lat.toFixed(6)}, {pendingGeo.lng.toFixed(6)}</span>
              </div>
            )}

            <Button
              onClick={handleCapture}
              disabled={!cameraReady}
              className="w-full gap-2"
              size="lg"
            >
              <Camera className="h-5 w-5" />
              Capturar e Registrar
            </Button>
          </div>

          <canvas ref={canvasRef} className="hidden" />
        </DialogContent>
      </Dialog>
    </div>
  );
}
