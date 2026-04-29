import { useEffect, useState, useRef, useCallback } from "react";
import { MapPin, Navigation, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { usePortalCliente } from "@/hooks/usePortalCliente";
import { toast } from "sonner";

export default function PortalEstouChegandoPage() {
  const { cliente, loading: clienteLoading } = usePortalCliente();
  const [tracking, setTracking] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [arriving, setArriving] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Check if there's already an active session
  useEffect(() => {
    if (!cliente) return;
    supabase
      .from("estou_chegando")
      .select("id")
      .eq("cliente_id", cliente.id)
      .eq("active", true)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setSessionId(data.id);
          setTracking(true);
          startWatching(data.id);
        }
      });
    return () => stopWatching();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cliente]);

  const startWatching = useCallback((sid: string) => {
    if (!navigator.geolocation) {
      toast.error("Geolocalização não suportada neste dispositivo.");
      return;
    }

    const updatePosition = (pos: GeolocationPosition) => {
      supabase
        .from("estou_chegando")
        .update({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          updated_at: new Date().toISOString(),
        })
        .eq("id", sid)
        .then(({ error }) => {
          if (error) console.error("Erro ao atualizar posição:", error);
        });
    };

    // Watch with high accuracy
    watchIdRef.current = navigator.geolocation.watchPosition(
      updatePosition,
      (err) => console.error("Geo error:", err),
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
    );
  }, []);

  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const handleActivate = async () => {
    if (!cliente) return;
    setArriving(true);

    try {
      // Request permission
      const perm = await navigator.permissions.query({ name: "geolocation" });
      if (perm.state === "denied") {
        setPermissionDenied(true);
        setArriving(false);
        toast.error("Permissão de localização negada. Habilite nas configurações do navegador.");
        return;
      }

      // Get initial position
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
        });
      });

      // Get first pet for display on map
      const { data: pets } = await supabase
        .from("pets")
        .select("id")
        .eq("cliente_id", cliente.id)
        .limit(1);

      const petId = pets?.[0]?.id ?? null;

      const { data, error } = await supabase
        .from("estou_chegando")
        .insert({
          empresa_id: cliente.empresa_id,
          cliente_id: cliente.id,
          pet_id: petId,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          active: true,
        })
        .select("id")
        .single();

      if (error) throw error;

      setSessionId(data.id);
      setTracking(true);
      startWatching(data.id);
      toast.success("Estou Chegando ativado! A empresa pode acompanhar sua localização.");
    } catch (err: any) {
      console.error(err);
      if (err?.code === 1) {
        setPermissionDenied(true);
        toast.error("Permissão de localização negada.");
      } else {
        toast.error("Erro ao ativar localização.");
      }
    } finally {
      setArriving(false);
    }
  };

  const handleCheguei = async () => {
    if (!sessionId || !cliente) return;
    setArriving(true);

    try {
      stopWatching();

      // Deactivate session
      await supabase
        .from("estou_chegando")
        .update({ active: false, updated_at: new Date().toISOString() })
        .eq("id", sessionId);

      const now = new Date();
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      // Lógica resiliente: tenta check-in se houver pets pendentes hoje;
      // caso contrário, tenta check-out de pets que estão na empresa.
      const horaStr = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

      const { data: pendentes } = await supabase
        .from("agendamentos")
        .select("id")
        .eq("cliente_id", cliente.id)
        .gte("data_hora", todayStart.toISOString())
        .lte("data_hora", todayEnd.toISOString())
        .in("status", ["agendado", "confirmado", "pendente"]);

      if (pendentes && pendentes.length > 0) {
        const ids = pendentes.map((a) => a.id);
        await supabase
          .from("agendamentos")
          .update({
            status: "na_empresa",
            data_entrada: now.toISOString(),
            hora_entrada: horaStr,
          })
          .in("id", ids);

        toast.success(`Check-in realizado para ${pendentes.length} agendamento${pendentes.length > 1 ? "s" : ""}! 🎉`);
      } else {
        const { data: naEmpresa } = await supabase
          .from("agendamentos")
          .select("id")
          .eq("cliente_id", cliente.id)
          .gte("data_hora", todayStart.toISOString())
          .lte("data_hora", todayEnd.toISOString())
          .eq("status", "na_empresa");

        if (naEmpresa && naEmpresa.length > 0) {
          const ids = naEmpresa.map((a) => a.id);
          await supabase
            .from("agendamentos")
            .update({
              status: "concluido",
              data_saida: now.toISOString(),
              hora_saida: horaStr,
            })
            .in("id", ids);

          toast.success(`Check-out realizado para ${naEmpresa.length} agendamento${naEmpresa.length > 1 ? "s" : ""}! 🎉`);
        } else {
          toast.success("Chegada registrada! Nenhum agendamento ativo encontrado para hoje.");
        }
      }

      setTracking(false);
      setSessionId(null);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao registrar chegada.");
    } finally {
      setArriving(false);
    }
  };

  if (clienteLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Navigation className="h-5 w-5 text-primary" />
          Estou Chegando
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Avise a empresa que você está a caminho para agilizar o atendimento.
        </p>
      </div>

      <Card>
        <CardContent className="p-6 flex flex-col items-center text-center gap-4">
          {!tracking ? (
            <>
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                <MapPin className="h-10 w-10 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">Compartilhar sua localização</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Ao ativar, a empresa poderá acompanhar sua chegada em tempo real.
                </p>
              </div>
              {permissionDenied && (
                <p className="text-xs text-destructive">
                  Permissão negada. Habilite a localização nas configurações do navegador.
                </p>
              )}
              <Button
                size="lg"
                className="gap-2"
                onClick={handleActivate}
                disabled={arriving}
              >
                {arriving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Navigation className="h-4 w-4" />
                )}
                Estou Chegando!
              </Button>
            </>
          ) : (
            <>
              <div className="h-20 w-20 rounded-full bg-emerald-500/10 flex items-center justify-center animate-pulse">
                <Navigation className="h-10 w-10 text-emerald-500" />
              </div>
              <div>
                <p className="font-medium text-foreground">Localização ativa</p>
                <p className="text-sm text-muted-foreground mt-1">
                  A empresa está acompanhando sua chegada. Clique em "Cheguei" quando estiver no local.
                </p>
              </div>
              <Button
                size="lg"
                variant="default"
                className="gap-2 bg-emerald-500 hover:bg-emerald-600 text-white"
                onClick={handleCheguei}
                disabled={arriving}
              >
                {arriving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Cheguei!
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
