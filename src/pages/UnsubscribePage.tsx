import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, MailX, CheckCircle, AlertTriangle } from "lucide-react";

type Status = "loading" | "valid" | "already" | "invalid" | "success" | "error";

export default function UnsubscribePage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<Status>("loading");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!token) { setStatus("invalid"); return; }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    fetch(`${supabaseUrl}/functions/v1/handle-email-unsubscribe?token=${token}`, {
      headers: { apikey: anonKey },
    })
      .then(r => r.json())
      .then(data => {
        if (data.valid === true) setStatus("valid");
        else if (data.reason === "already_unsubscribed") setStatus("already");
        else setStatus("invalid");
      })
      .catch(() => setStatus("error"));
  }, [token]);

  async function handleUnsubscribe() {
    if (!token) return;
    setProcessing(true);
    try {
      const { data } = await supabase.functions.invoke("handle-email-unsubscribe", { body: { token } });
      if (data?.success) setStatus("success");
      else if (data?.reason === "already_unsubscribed") setStatus("already");
      else setStatus("error");
    } catch { setStatus("error"); }
    setProcessing(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          {status === "loading" && (
            <>
              <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
              <p className="text-muted-foreground">Verificando...</p>
            </>
          )}
          {status === "valid" && (
            <>
              <MailX className="h-12 w-12 mx-auto text-destructive" />
              <h2 className="text-xl font-semibold">Cancelar inscrição</h2>
              <p className="text-muted-foreground text-sm">
                Ao confirmar, você deixará de receber e-mails do nosso sistema.
              </p>
              <Button onClick={handleUnsubscribe} disabled={processing} variant="destructive">
                {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Confirmar cancelamento
              </Button>
            </>
          )}
          {status === "success" && (
            <>
              <CheckCircle className="h-12 w-12 mx-auto text-emerald-500" />
              <h2 className="text-xl font-semibold">Inscrição cancelada</h2>
              <p className="text-muted-foreground text-sm">Você não receberá mais e-mails.</p>
            </>
          )}
          {status === "already" && (
            <>
              <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground" />
              <h2 className="text-xl font-semibold">Já cancelado</h2>
              <p className="text-muted-foreground text-sm">Sua inscrição já foi cancelada anteriormente.</p>
            </>
          )}
          {status === "invalid" && (
            <>
              <AlertTriangle className="h-12 w-12 mx-auto text-warning" />
              <h2 className="text-xl font-semibold">Link inválido</h2>
              <p className="text-muted-foreground text-sm">Este link de cancelamento é inválido ou expirou.</p>
            </>
          )}
          {status === "error" && (
            <>
              <AlertTriangle className="h-12 w-12 mx-auto text-destructive" />
              <h2 className="text-xl font-semibold">Erro</h2>
              <p className="text-muted-foreground text-sm">Ocorreu um erro. Tente novamente mais tarde.</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
