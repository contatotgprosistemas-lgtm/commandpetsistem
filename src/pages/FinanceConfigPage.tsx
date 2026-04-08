import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2, CreditCard, QrCode } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TaxaFinanceira {
  id: string;
  tipo: string;
  bandeira: string | null;
  parcelas_de: number;
  parcelas_ate: number;
  percentual: number;
  valor_fixo: number;
  ativo: boolean;
}

const TIPOS = [
  { value: "cartao_credito", label: "Cartão de Crédito" },
  { value: "cartao_debito", label: "Cartão de Débito" },
  { value: "pix", label: "PIX" },
];

const BANDEIRAS = ["Visa", "Mastercard", "Elo", "Amex", "Hipercard", "Outras"];

const tipoLabel = (t: string) => TIPOS.find(x => x.value === t)?.label ?? t;

export default function FinanceConfigPage() {
  const { profile } = useAuth();
  const [taxas, setTaxas] = useState<TaxaFinanceira[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TaxaFinanceira | null>(null);

  const [tipo, setTipo] = useState("cartao_credito");
  const [bandeira, setBandeira] = useState("");
  const [parcelasDe, setParcelasDe] = useState(1);
  const [parcelasAte, setParcelasAte] = useState(1);
  const [percentual, setPercentual] = useState("");
  const [valorFixo, setValorFixo] = useState("");
  const [ativo, setAtivo] = useState(true);

  async function fetchTaxas() {
    setLoading(true);
    const { data } = await supabase
      .from("taxas_financeiras")
      .select("*")
      .order("tipo")
      .order("parcelas_de");
    if (data) setTaxas(data as any);
    setLoading(false);
  }

  useEffect(() => { fetchTaxas(); }, []);

  function openNew() {
    setEditing(null);
    setTipo("cartao_credito");
    setBandeira("");
    setParcelasDe(1);
    setParcelasAte(1);
    setPercentual("");
    setValorFixo("");
    setAtivo(true);
    setDialogOpen(true);
  }

  function openEdit(t: TaxaFinanceira) {
    setEditing(t);
    setTipo(t.tipo);
    setBandeira(t.bandeira ?? "");
    setParcelasDe(t.parcelas_de);
    setParcelasAte(t.parcelas_ate);
    setPercentual(String(t.percentual));
    setValorFixo(String(t.valor_fixo));
    setAtivo(t.ativo);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!profile?.empresa_id) { toast.error("Empresa não encontrada"); return; }
    const pct = parseFloat(percentual) || 0;
    const vf = parseFloat(valorFixo) || 0;

    const payload = {
      empresa_id: profile.empresa_id,
      tipo,
      bandeira: tipo === "pix" ? null : (bandeira || null),
      parcelas_de: tipo === "pix" ? 1 : parcelasDe,
      parcelas_ate: tipo === "pix" ? 1 : parcelasAte,
      percentual: pct,
      valor_fixo: vf,
      ativo,
    };

    if (editing) {
      const { error } = await supabase.from("taxas_financeiras").update(payload).eq("id", editing.id);
      if (error) { toast.error("Erro ao atualizar"); return; }
      toast.success("Taxa atualizada");
    } else {
      const { error } = await supabase.from("taxas_financeiras").insert(payload as any);
      if (error) { toast.error("Erro ao criar taxa"); return; }
      toast.success("Taxa cadastrada");
    }
    setDialogOpen(false);
    fetchTaxas();
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from("taxas_financeiras").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir"); return; }
    toast.success("Taxa excluída");
    fetchTaxas();
  }

  async function handleToggle(id: string, val: boolean) {
    await supabase.from("taxas_financeiras").update({ ativo: val }).eq("id", id);
    fetchTaxas();
  }

  const tipoIcon = (t: string) => t === "pix" ? <QrCode className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Configuração de Taxas</h2>
          <p className="text-sm text-muted-foreground">
            Configure as taxas de máquina de cartão e PIX. Ao dar baixa em faturas, as taxas serão lançadas automaticamente como despesas financeiras.
          </p>
        </div>
        <Button size="sm" className="gap-1" onClick={openNew}>
          <Plus className="h-4 w-4" /> Nova Taxa
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
        </div>
      ) : taxas.length === 0 ? (
        <div className="text-center py-12 text-sm text-muted-foreground">
          Nenhuma taxa configurada. Clique em "Nova Taxa" para começar.
        </div>
      ) : (
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Bandeira</TableHead>
                <TableHead>Parcelas</TableHead>
                <TableHead className="text-right">Taxa (%)</TableHead>
                <TableHead className="text-right">Valor Fixo (R$)</TableHead>
                <TableHead className="text-center">Ativo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {taxas.map(t => (
                <TableRow key={t.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {tipoIcon(t.tipo)}
                      <span className="text-sm font-medium">{tipoLabel(t.tipo)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{t.bandeira || "—"}</TableCell>
                  <TableCell className="text-sm">
                    {t.tipo === "pix" ? "—" : `${t.parcelas_de}x - ${t.parcelas_ate}x`}
                  </TableCell>
                  <TableCell className="text-sm text-right tabular-nums">{Number(t.percentual).toFixed(2)}%</TableCell>
                  <TableCell className="text-sm text-right tabular-nums">
                    {Number(t.valor_fixo) > 0 ? `R$ ${Number(t.valor_fixo).toFixed(2)}` : "—"}
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch checked={t.ativo} onCheckedChange={(v) => handleToggle(t.id, v)} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(t)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(t.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Taxa" : "Nova Taxa"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Tipo</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPOS.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {tipo !== "pix" && (
              <>
                <div>
                  <Label>Bandeira</Label>
                  <Select value={bandeira} onValueChange={setBandeira}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {BANDEIRAS.map(b => (
                        <SelectItem key={b} value={b}>{b}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Parcelas De</Label>
                    <Input type="number" min={1} value={parcelasDe} onChange={e => setParcelasDe(Number(e.target.value))} />
                  </div>
                  <div>
                    <Label>Parcelas Até</Label>
                    <Input type="number" min={1} value={parcelasAte} onChange={e => setParcelasAte(Number(e.target.value))} />
                  </div>
                </div>
              </>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Taxa (%)</Label>
                <Input type="number" step="0.01" min={0} placeholder="0.00" value={percentual} onChange={e => setPercentual(e.target.value)} />
              </div>
              <div>
                <Label>Valor Fixo (R$)</Label>
                <Input type="number" step="0.01" min={0} placeholder="0.00" value={valorFixo} onChange={e => setValorFixo(e.target.value)} />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={ativo} onCheckedChange={setAtivo} />
              <Label>Ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editing ? "Salvar" : "Cadastrar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
