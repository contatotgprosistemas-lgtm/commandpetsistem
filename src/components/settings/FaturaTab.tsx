import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Save, Receipt, Copy, ExternalLink, QrCode } from "lucide-react";
import { formatDateBR, parseLocalDate } from "@/lib/utils";

function fmtMoney(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function statusBadge(s: string) {
  const map: Record<string, { variant: any; label: string }> = {
    pendente: { variant: "secondary", label: "Pendente" },
    pago: { variant: "default", label: "Pago" },
    vencido: { variant: "destructive", label: "Vencido" },
    cancelado: { variant: "outline", label: "Cancelado" },
  };
  const m = map[s] || { variant: "outline", label: s };
  return <Badge variant={m.variant}>{m.label}</Badge>;
}

export function FaturaTab() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modulos, setModulos] = useState<any>(null);
  const [faturas, setFaturas] = useState<any[]>([]);
  const [diaVencimento, setDiaVencimento] = useState(10);
  const [pixDialog, setPixDialog] = useState<any>(null);

  async function load() {
    if (!profile?.empresa_id) return;
    setLoading(true);
    const [{ data: mod }, { data: fats }] = await Promise.all([
      supabase.from("empresa_modulos").select("*").eq("empresa_id", profile.empresa_id).maybeSingle(),
      supabase.from("faturas_sistema").select("*").eq("empresa_id", profile.empresa_id).order("competencia", { ascending: false }),
    ]);
    setModulos(mod);
    setDiaVencimento(mod?.dia_vencimento_fatura || 10);
    setFaturas(fats || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [profile?.empresa_id]);

  async function salvarDia() {
    if (!profile?.empresa_id) return;
    setSaving(true);
    const { error } = await supabase
      .from("empresa_modulos")
      .update({ dia_vencimento_fatura: diaVencimento })
      .eq("empresa_id", profile.empresa_id);
    setSaving(false);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Dia de vencimento atualizado" });
    }
  }

  if (profile?.cargo !== "admin") {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          Apenas o administrador da empresa pode gerenciar a fatura do sistema.
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return <div className="flex items-center justify-center p-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  const proxima = faturas.find((f) => f.status === "pendente" || f.status === "vencido");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Receipt className="h-5 w-5" /> Mensalidade do Sistema</CardTitle>
          <CardDescription>Plano contratado e configuração de cobrança</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground">Valor mensal</Label>
            <div className="text-2xl font-semibold">{fmtMoney(Number(modulos?.valor_mensal || 0))}</div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Próximo vencimento</Label>
            <div className="text-2xl font-semibold">
              {proxima ? formatDateBR(parseLocalDate(proxima.vencimento)) : "—"}
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Status</Label>
            <div className="pt-2">{proxima ? statusBadge(proxima.status) : <Badge variant="default">Em dia</Badge>}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dia de vencimento</CardTitle>
          <CardDescription>Escolha o dia do mês em que sua fatura vence (1 a 28).</CardDescription>
        </CardHeader>
        <CardContent className="flex items-end gap-3">
          <div className="w-32">
            <Label>Dia</Label>
            <Select value={String(diaVencimento)} onValueChange={(v) => setDiaVencimento(Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                  <SelectItem key={d} value={String(d)}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={salvarDia} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Salvar
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Faturas</CardTitle>
          <CardDescription>Histórico e faturas em aberto</CardDescription>
        </CardHeader>
        <CardContent>
          {faturas.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">Nenhuma fatura gerada ainda.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Competência</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {faturas.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell>{f.competencia.slice(0, 7).split("-").reverse().join("/")}</TableCell>
                    <TableCell>{formatDateBR(parseLocalDate(f.vencimento))}</TableCell>
                    <TableCell>{fmtMoney(Number(f.valor))}</TableCell>
                    <TableCell>{statusBadge(f.status)}</TableCell>
                    <TableCell className="text-right space-x-2">
                      {(f.status === "pendente" || f.status === "vencido") && (
                        <>
                          {f.pix_copia_cola && (
                            <Button size="sm" variant="outline" onClick={() => setPixDialog(f)}>
                              <QrCode className="h-3.5 w-3.5 mr-1" /> PIX
                            </Button>
                          )}
                          {f.boleto_url && (
                            <Button size="sm" variant="outline" asChild>
                              <a href={f.boleto_url} target="_blank" rel="noreferrer">
                                <ExternalLink className="h-3.5 w-3.5 mr-1" /> Boleto
                              </a>
                            </Button>
                          )}
                          {f.asaas_invoice_url && !f.boleto_url && !f.pix_copia_cola && (
                            <Button size="sm" variant="outline" asChild>
                              <a href={f.asaas_invoice_url} target="_blank" rel="noreferrer">
                                <ExternalLink className="h-3.5 w-3.5 mr-1" /> Pagar
                              </a>
                            </Button>
                          )}
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!pixDialog} onOpenChange={(o) => !o && setPixDialog(null)}>
        <DialogContent onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Pagar com PIX</DialogTitle>
          </DialogHeader>
          {pixDialog && (
            <div className="space-y-4">
              {pixDialog.pix_qr_code && (
                <div className="flex justify-center">
                  <img src={pixDialog.pix_qr_code} alt="QR Code PIX" className="w-56 h-56" />
                </div>
              )}
              {pixDialog.pix_copia_cola && (
                <div>
                  <Label className="text-xs">Código copia-e-cola</Label>
                  <div className="flex gap-2 mt-1">
                    <textarea
                      readOnly
                      value={pixDialog.pix_copia_cola}
                      className="flex-1 h-20 p-2 text-xs border rounded bg-muted font-mono"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(pixDialog.pix_copia_cola);
                        toast({ title: "Código copiado!" });
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
              <div className="text-sm text-muted-foreground text-center">
                Valor: <strong>{fmtMoney(Number(pixDialog.valor))}</strong> · Vence em{" "}
                {formatDateBR(parseLocalDate(pixDialog.vencimento))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}