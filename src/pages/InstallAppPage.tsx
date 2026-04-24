import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Smartphone, Share, Plus, MoreVertical, Download, ArrowLeft, CheckCircle2, Apple } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Platform = "ios" | "android" | "desktop" | "unknown";

function detectPlatform(): Platform {
  if (typeof window === "undefined") return "unknown";
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  if (/windows|macintosh|linux/.test(ua)) return "desktop";
  return "unknown";
}

export default function InstallAppPage() {
  const [platform, setPlatform] = useState<Platform>("unknown");
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [installed, setInstalled] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    setPlatform(detectPlatform());
    setIsStandalone(
      window.matchMedia("(display-mode: standalone)").matches ||
        // @ts-ignore
        window.navigator.standalone === true
    );

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setInstalled(true));
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setDeferredPrompt(null);
  };

  if (isStandalone) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <Card className="max-w-md w-full p-8 text-center space-y-4">
          <CheckCircle2 className="h-16 w-16 mx-auto text-emerald-500" />
          <h1 className="text-2xl font-bold">App já instalado!</h1>
          <p className="text-muted-foreground">Você está usando o app instalado. Aproveite!</p>
          <Link to="/portal">
            <Button className="w-full">Ir para o Portal</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <Link to="/portal" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>

        <div className="text-center space-y-3">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Smartphone className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">Instalar como aplicativo</h1>
          <p className="text-muted-foreground">
            Instale o PetControl no seu celular para acesso rápido, sem precisar abrir o navegador.
          </p>
        </div>

        {deferredPrompt && (
          <Card className="p-6 border-primary bg-primary/5">
            <div className="flex flex-col items-center gap-4 text-center">
              <Download className="h-10 w-10 text-primary" />
              <h2 className="text-lg font-semibold">Pronto para instalar!</h2>
              <p className="text-sm text-muted-foreground">Seu navegador suporta instalação direta.</p>
              <Button size="lg" onClick={handleInstall} className="w-full sm:w-auto">
                <Download className="h-4 w-4 mr-2" /> Instalar agora
              </Button>
            </div>
          </Card>
        )}

        {installed && (
          <Card className="p-4 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-center">
            <CheckCircle2 className="h-6 w-6 mx-auto text-emerald-600 mb-2" />
            <p className="font-medium text-emerald-800 dark:text-emerald-300">
              App instalado com sucesso! Procure o ícone na sua tela inicial.
            </p>
          </Card>
        )}

        {/* iOS instructions */}
        {(platform === "ios" || platform === "unknown") && (
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Apple className="h-6 w-6" />
              <h2 className="text-lg font-semibold">iPhone / iPad (Safari)</h2>
            </div>
            <ol className="space-y-3 text-sm">
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">1</span>
                <span>Abra este site pelo navegador <strong>Safari</strong> (não funciona em Chrome no iPhone).</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">2</span>
                <span className="flex items-center gap-1">
                  Toque no botão <Share className="h-4 w-4 inline" /> <strong>Compartilhar</strong> (na barra inferior).
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">3</span>
                <span className="flex items-center gap-1">
                  Role para baixo e toque em <Plus className="h-4 w-4 inline" /> <strong>Adicionar à Tela de Início</strong>.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">4</span>
                <span>Toque em <strong>Adicionar</strong> no canto superior direito. Pronto!</span>
              </li>
            </ol>
          </Card>
        )}

        {/* Android instructions */}
        {(platform === "android" || platform === "unknown") && (
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Smartphone className="h-6 w-6" />
              <h2 className="text-lg font-semibold">Android (Chrome)</h2>
            </div>
            <ol className="space-y-3 text-sm">
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">1</span>
                <span>Abra este site pelo <strong>Google Chrome</strong>.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">2</span>
                <span className="flex items-center gap-1">
                  Toque no menu <MoreVertical className="h-4 w-4 inline" /> (três pontos no canto superior direito).
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">3</span>
                <span>Toque em <strong>"Adicionar à tela inicial"</strong> ou <strong>"Instalar app"</strong>.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">4</span>
                <span>Confirme em <strong>Instalar</strong>. O ícone aparecerá na tela inicial!</span>
              </li>
            </ol>
            <div className="text-xs text-muted-foreground bg-muted p-3 rounded-md">
              💡 <strong>Dica:</strong> Se a opção não aparecer, certifique-se de estar em uma conexão segura (https) e tente atualizar a página.
            </div>
          </Card>
        )}

        {platform === "desktop" && (
          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-semibold">Computador (Chrome / Edge)</h2>
            <ol className="space-y-3 text-sm">
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">1</span>
                <span>Procure o ícone <Download className="h-4 w-4 inline" /> <strong>Instalar</strong> na barra de endereço (ao lado do cadeado).</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">2</span>
                <span>Clique e confirme em <strong>Instalar</strong>.</span>
              </li>
            </ol>
          </Card>
        )}

        <Card className="p-4 bg-muted/50">
          <p className="text-xs text-muted-foreground text-center">
            ⚠️ A instalação só funciona no app publicado (não no editor). Se estiver acessando pelo link de prévia do Lovable, abra pelo domínio definitivo do seu sistema.
          </p>
        </Card>
      </div>
    </div>
  );
}
