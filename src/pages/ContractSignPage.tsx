import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useEmpresaLogoById } from "@/hooks/useEmpresaLogo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CheckCircle2, FileText, Shield, AlertTriangle, Loader2, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ContractData {
  id: string;
  title: string;
  content: string;
  content_hash: string | null;
  status: string;
  empresa_id: string;
  token_expires_at: string | null;
  signed_at: string | null;
}

export default function ContractSignPage() {
  const { token } = useParams<{ token: string }>();
  const [contract, setContract] = useState<ContractData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signed, setSigned] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signatures, setSignatures] = useState<{ cliente: any; empresa: any }>({ cliente: null, empresa: null });
  const [alreadySignedByClient, setAlreadySignedByClient] = useState(false);

  // Form state
  const [signerName, setSignerName] = useState("");
  const [signerEmail, setSignerEmail] = useState("");
  const [signerDocument, setSignerDocument] = useState("");
  const [accepted, setAccepted] = useState(false);

  // Signature canvas
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  // Geolocation
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!token) return;
    loadContract();
    // Try geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {} // optional, ignore errors
      );
    }
  }, [token]);

  async function loadContract() {
    setLoading(true);
    const { data, error: err } = await supabase.functions.invoke("sign-contract", {
      body: {
        action: "load",
        signing_token: token,
        signer_user_agent: navigator.userAgent,
      },
    });

    if (err || !data?.contract) {
      setError(data?.error || "Contrato não encontrado ou link expirado.");
      setLoading(false);
      return;
    }

    const c = data.contract as ContractData;
    const sigs = data.signatures || { cliente: null, empresa: null };
    setSignatures(sigs);

    // Contract is fully signed (both parties)
    if (c.status === "assinado") {
      setSigned(true);
    }

    // Client already signed - show partial signed state
    if (sigs.cliente) {
      setAlreadySignedByClient(true);
    }

    setContract(c);
    setLoading(false);
  }

  // Canvas drawing
  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsDrawing(true);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "hsl(var(--foreground))";
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  }

  function endDraw() {
    setIsDrawing(false);
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  }

  async function handleSign() {
    if (!accepted) {
      toast.error("Você precisa aceitar os termos");
      return;
    }
    if (!signerName.trim()) {
      toast.error("Informe seu nome completo");
      return;
    }
    if (!contract) return;

    setSigning(true);

    // Get signature image
    let signatureImage: string | null = null;
    if (hasSignature && canvasRef.current) {
      signatureImage = canvasRef.current.toDataURL("image/png");
    }

    // Generate hash of content at signing time
    const encoder = new TextEncoder();
    const data = encoder.encode(contract.content);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const contentHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

    // Detect device
    const ua = navigator.userAgent;
    const isMobile = /Mobile|Android|iPhone/i.test(ua);
    const device = isMobile ? "Mobile" : "Desktop";

    const { data: result, error: signErr } = await supabase.functions.invoke("sign-contract", {
      body: {
        action: "sign",
        signing_token: token,
        signer_name: signerName.trim(),
        signer_email: signerEmail.trim() || null,
        signer_document: signerDocument.trim() || null,
        signer_user_agent: ua,
        signer_device: device,
        signer_latitude: geo?.lat || null,
        signer_longitude: geo?.lng || null,
        signature_image: signatureImage,
        content_hash: contentHash,
        acceptance_text: "Li e aceito os termos deste contrato",
        signer_type: "cliente",
      },
    });

    if (signErr || result?.error) {
      toast.error(result?.error || "Erro ao registrar assinatura");
      setSigning(false);
      return;
    }

    setAlreadySignedByClient(true);
    if (result?.both_signed) {
      setSigned(true);
      toast.success("Contrato concluído! Ambas as partes assinaram.");
    } else {
      toast.success("Sua assinatura foi registrada! Aguardando assinatura da empresa.");
    }
    setSigning(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
            <p className="text-lg font-medium">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (signed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto" />
            <h2 className="text-xl font-bold">Contrato Concluído!</h2>
            <p className="text-sm text-muted-foreground">
              O contrato <strong>"{contract?.title}"</strong> foi assinado por ambas as partes.
            </p>
            <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
              <Shield className="h-4 w-4 inline mr-1" />
              Documento protegido com hash SHA-256. ID: {contract?.id?.slice(0, 8)}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (alreadySignedByClient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <Clock className="h-16 w-16 text-amber-500 mx-auto" />
            <h2 className="text-xl font-bold">Assinatura Registrada!</h2>
            <p className="text-sm text-muted-foreground">
              Sua assinatura no contrato <strong>"{contract?.title}"</strong> foi registrada com sucesso.
            </p>
            <p className="text-sm text-muted-foreground">
              Aguardando a assinatura da empresa para conclusão do contrato.
            </p>
            <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
              <Shield className="h-4 w-4 inline mr-1" />
              Documento protegido com hash SHA-256. ID: {contract?.id?.slice(0, 8)}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <FileText className="h-6 w-6 text-primary" />
              <div>
                <CardTitle className="text-lg">{contract?.title}</CardTitle>
                <p className="text-sm text-muted-foreground">Documento para assinatura eletrônica</p>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Contract content */}
        <Card>
          <CardContent className="pt-6">
            <style>{`
              .contract-content img {
                max-width: 120px !important;
                max-height: 80px !important;
                width: auto !important;
                height: auto !important;
                display: block;
                margin: 0;
              }
              .contract-content p[style*="text-align: center"] {
                text-align: left !important;
              }
            `}</style>
            <div
              className="contract-content prose prose-sm max-w-none leading-relaxed"
              dangerouslySetInnerHTML={{ __html: contract?.content || "" }}
            />
          </CardContent>
        </Card>

        {/* Signing form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dados do Assinante</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Nome completo *</Label>
                <Input value={signerName} onChange={e => setSignerName(e.target.value)} placeholder="Seu nome completo" />
              </div>
              <div>
                <Label>CPF</Label>
                <Input value={signerDocument} onChange={e => setSignerDocument(e.target.value)} placeholder="000.000.000-00" />
              </div>
            </div>
            <div>
              <Label>E-mail</Label>
              <Input value={signerEmail} onChange={e => setSignerEmail(e.target.value)} placeholder="seu@email.com" type="email" />
            </div>

            {/* Signature canvas */}
            <div>
              <Label>Assinatura (opcional)</Label>
              <div className="border rounded-lg mt-1 bg-background">
                <canvas
                  ref={canvasRef}
                  width={500}
                  height={150}
                  className="w-full cursor-crosshair touch-none"
                  onMouseDown={startDraw}
                  onMouseMove={draw}
                  onMouseUp={endDraw}
                  onMouseLeave={endDraw}
                  onTouchStart={startDraw}
                  onTouchMove={draw}
                  onTouchEnd={endDraw}
                />
              </div>
              {hasSignature && (
                <Button variant="ghost" size="sm" onClick={clearCanvas} className="mt-1 text-xs">
                  Limpar assinatura
                </Button>
              )}
            </div>

            {/* Acceptance */}
            <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg border">
              <Checkbox
                id="accept"
                checked={accepted}
                onCheckedChange={v => setAccepted(v === true)}
              />
              <label htmlFor="accept" className="text-sm leading-relaxed cursor-pointer">
                <strong>Li e aceito os termos deste contrato.</strong> Declaro que as informações prestadas são verdadeiras e que estou de acordo com todas as cláusulas acima descritas.
              </label>
            </div>

            <Button onClick={handleSign} disabled={!accepted || !signerName.trim() || signing} className="w-full" size="lg">
              {signing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Assinar Contrato
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              <Shield className="h-3 w-3 inline mr-1" />
              Assinatura eletrônica com validade jurídica conforme MP 2.200-2/2001. 
              Todas as evidências são registradas e armazenadas de forma segura.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
