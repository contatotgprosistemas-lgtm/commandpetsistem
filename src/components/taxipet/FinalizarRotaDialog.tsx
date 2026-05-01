import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Fuel, CheckCircle } from "lucide-react";
import { toast } from "sonner";

type Roteirizacao = {
  id: string;
  empresa_id: string;
  tipo: string;
  data: string;
  vehicle_id: string | null;
  receita_total: number;
  paradas: any;
};

export default function FinalizarRotaDialog({
  open, onOpenChange, rota, onFinalized,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  rota: Roteirizacao | null;
  onFinalized?: () => void;
}) {
  const [kmRodados, setKmRodados] = useState("");
  const [consumo, setConsumo] = useState<number | null>(null);
  const [tipoComb, setTipoComb] = useState<string | null>(null);
  const [precoLitro, setPrecoLitro] = useState<number | null>(null);
  const [precoEdit, setPrecoEdit] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !rota) return;
    setKmRodados("");
    (async () => {
      // Veículo
      let consumoVal: number | null = null;
      let tipo: string | null = null;
      if (rota.vehicle_id) {
        const { data: v } = await supabase
          .from("vehicles")
          .select("consumo_km_litro, tipo_combustivel")
          .eq("id", rota.vehicle_id)
          .maybeSingle();
        consumoVal = (v as any)?.consumo_km_litro ?? null;
        tipo = (v as any)?.tipo_combustivel ?? null;
      }
      setConsumo(consumoVal);
      setTipoComb(tipo);

      // Último preço para o tipo
      let preco: number | null = null;
      if (tipo) {
        const { data: p } = await supabase
          .from("combustivel_precos")
          .select("preco_litro")
          .eq("empresa_id", rota.empresa_id)
          .eq("tipo_combustivel", tipo)
          .order("data_referencia", { ascending: false })
          .limit(1)
          .maybeSingle();
        preco = (p as any)?.preco_litro ?? null;
      }
      setPrecoLitro(preco);
      setPrecoEdit(preco ? String(preco) : "");
    })();
  }, [open, rota]);

  const km = parseFloat(kmRodados.replace(",", ".")) || 0;
  const precoUsado = parseFloat(precoEdit.replace(",", ".")) || 0;
  const litros = consumo && consumo > 0 && km > 0 ? km / consumo : 0;
  const custo = litros * precoUsado;
  const lucro = (rota?.receita_total || 0) - custo;

  const handleFinalize = async () => {
    if (!rota) return;
    if (km <= 0) {
      toast.error("Informe os km rodados");
      return;
    }
    setSaving(true);
    try {
      // Se preço foi alterado, salvar novo histórico
      if (tipoComb && precoUsado > 0 && precoUsado !== precoLitro) {
        await supabase.from("combustivel_precos").insert({
          empresa_id: rota.empresa_id,
          tipo_combustivel: tipoComb,
          preco_litro: precoUsado,
        });
      }
      const { error } = await supabase
        .from("taxipet_roteirizacoes")
        .update({
          km_real: km,
          litros_consumidos: litros || null,
          custo_combustivel: custo || null,
          lucro_estimado: custo > 0 ? lucro : null,
          preco_litro_usado: precoUsado || null,
          consumo_km_litro_usado: consumo || null,
          status: "concluida",
          finalizada_em: new Date().toISOString(),
        })
        .eq("id", rota.id);
      if (error) throw error;
      toast.success("Rota finalizada");
      onFinalized?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error("Erro ao finalizar: " + (e?.message || ""));
    } finally {
      setSaving(false);
    }
  };

  const semConsumo = !consumo || consumo <= 0;
  const semPreco = !precoUsado || precoUsado <= 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-emerald-600" /> Finalizar rota
          </DialogTitle>
          <DialogDescription>
            Informe os km rodados para calcular consumo e custo desta rota.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-xs">Km rodados</Label>
            <Input
              type="number"
              step="0.1"
              placeholder="Ex: 38.5"
              value={kmRodados}
              onChange={(e) => setKmRodados(e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <Label className="text-xs">Preço do combustível (R$/L) {tipoComb ? `— ${tipoComb}` : ""}</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="Ex: 5.89"
              value={precoEdit}
              onChange={(e) => setPrecoEdit(e.target.value)}
            />
            {semConsumo && (
              <p className="text-[11px] text-amber-600 mt-1">
                ⚠ Cadastre consumo (km/L) e tipo de combustível no veículo para calcular custo automaticamente.
              </p>
            )}
          </div>

          <Card className="bg-muted/30">
            <CardContent className="p-3 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Fuel className="h-3 w-3" /> Consumo do veículo
                </span>
                <span className="font-medium">{consumo ? `${consumo} km/L` : "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Litros consumidos</span>
                <span className="font-medium">{litros > 0 ? `${litros.toFixed(2)} L` : "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Custo combustível</span>
                <span className="font-medium text-destructive">
                  {custo > 0 ? `R$ ${custo.toFixed(2)}` : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Receita da rota</span>
                <span className="font-medium text-emerald-600">
                  R$ {(rota?.receita_total || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between border-t pt-1.5 mt-1">
                <span className="font-medium">Lucro estimado</span>
                <span className={`font-semibold ${lucro >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                  {custo > 0 ? `R$ ${lucro.toFixed(2)}` : "—"}
                </span>
              </div>
            </CardContent>
          </Card>

          {semPreco && !semConsumo && (
            <p className="text-[11px] text-muted-foreground">
              Sem preço de combustível, a rota será salva apenas com os km e litros.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleFinalize} disabled={saving || km <= 0}>
            Finalizar rota
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
