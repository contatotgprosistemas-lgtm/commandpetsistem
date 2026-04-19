import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface NovaMovimentacaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

type Modo = "entrada" | "saida" | "transferencia";

export function NovaMovimentacaoDialog({ open, onOpenChange, onSuccess }: NovaMovimentacaoDialogProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [bancos, setBancos] = useState<{ id: string; label: string }[]>([]);
  const [planoContasOpts, setPlanoContasOpts] = useState<{ nome: string; tipo: string }[]>([]);

  const [dataMov, setDataMov] = useState(() => new Date().toISOString().split("T")[0]);
  const [planoContas, setPlanoContas] = useState("");
  const [pessoa, setPessoa] = useState("");
  const [complemento, setComplemento] = useState("");
  const [contaBancariaId, setContaBancariaId] = useState("");
  const [contaDestinoId, setContaDestinoId] = useState("");
  const [valor, setValor] = useState("");
  const [modo, setModo] = useState<Modo>("entrada");

  useEffect(() => {
    if (!open || !profile?.empresa_id) return;
    supabase
      .from("contas_bancarias")
      .select("id, banco, titular")
      .eq("empresa_id", profile.empresa_id)
      .order("created_at")
      .then(({ data }) => {
        if (data) setBancos(data.map((b: any) => ({ id: b.id, label: `${b.banco} - ${b.titular}` })));
      });

    // Buscar plano de contas (items + tipo da categoria)
    supabase
      .from("plano_contas_items")
      .select("nome, ativo, plano_contas_categorias!inner(tipo, empresa_id)")
      .eq("plano_contas_categorias.empresa_id", profile.empresa_id)
      .eq("ativo", true)
      .order("nome")
      .then(({ data }) => {
        if (data) {
          setPlanoContasOpts(
            (data as any[]).map(d => ({
              nome: d.nome,
              tipo: d.plano_contas_categorias?.tipo,
            }))
          );
        }
      });
  }, [open, profile?.empresa_id]);

  const filteredPlanoContas = planoContasOpts.filter(p =>
    modo === "entrada" ? p.tipo === "receita" : modo === "saida" ? p.tipo === "despesa" : true
  );

  const resetForm = () => {
    setDataMov(new Date().toISOString().split("T")[0]);
    setPlanoContas("");
    setPessoa("");
    setComplemento("");
    setContaBancariaId("");
    setContaDestinoId("");
    setValor("");
    setModo("entrada");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.empresa_id) return;
    const numValor = parseFloat(valor);
    if (!dataMov || !numValor || numValor <= 0) {
      toast.error("Preencha data e valor.");
      return;
    }

    setLoading(true);

    if (modo === "transferencia") {
      if (!contaBancariaId || !contaDestinoId) {
        toast.error("Selecione conta de origem e destino.");
        setLoading(false);
        return;
      }
      if (contaBancariaId === contaDestinoId) {
        toast.error("Conta de origem e destino devem ser diferentes.");
        setLoading(false);
        return;
      }

      const origemLabel = bancos.find(b => b.id === contaBancariaId)?.label || "";
      const destinoLabel = bancos.find(b => b.id === contaDestinoId)?.label || "";
      const absValor = Math.abs(numValor);
      const descComp = complemento || `Transferência ${origemLabel} → ${destinoLabel}`;

      const { error: errOut } = await supabase.from("movimentacoes").insert({
        empresa_id: profile.empresa_id,
        data_movimentacao: dataMov,
        plano_contas: "Transferência entre contas",
        pessoa: pessoa || null,
        complemento: descComp,
        banco: origemLabel,
        conta_bancaria_id: contaBancariaId,
        valor: -absValor,
        tipo: "transferencia",
      });

      if (errOut) {
        toast.error("Erro ao registrar saída: " + errOut.message);
        setLoading(false);
        return;
      }

      const { error: errIn } = await supabase.from("movimentacoes").insert({
        empresa_id: profile.empresa_id,
        data_movimentacao: dataMov,
        plano_contas: "Transferência entre contas",
        pessoa: pessoa || null,
        complemento: descComp,
        banco: destinoLabel,
        conta_bancaria_id: contaDestinoId,
        valor: absValor,
        tipo: "transferencia",
      });

      if (errIn) {
        toast.error("Erro ao registrar entrada: " + errIn.message);
        setLoading(false);
        return;
      }

      await Promise.all([
        supabase.rpc("sincronizar_saldo_bancario", { p_conta_bancaria_id: contaBancariaId }),
        supabase.rpc("sincronizar_saldo_bancario", { p_conta_bancaria_id: contaDestinoId }),
      ]);

      toast.success("Transferência realizada com sucesso!");
      setLoading(false);
      resetForm();
      onOpenChange(false);
      onSuccess();
      return;
    }

    // entrada / saida
    const bancoLabel = bancos.find(b => b.id === contaBancariaId)?.label || null;
    const finalValor = modo === "saida" ? -Math.abs(numValor) : Math.abs(numValor);

    const { error } = await supabase.from("movimentacoes").insert({
      empresa_id: profile.empresa_id,
      data_movimentacao: dataMov,
      plano_contas: planoContas || null,
      pessoa: pessoa || null,
      complemento: complemento || null,
      banco: bancoLabel,
      conta_bancaria_id: contaBancariaId || null,
      valor: finalValor,
      tipo: "avulso",
    });

    if (error) {
      toast.error("Erro ao criar movimentação: " + error.message);
      setLoading(false);
      return;
    }

    if (contaBancariaId) {
      await supabase.rpc("sincronizar_saldo_bancario", { p_conta_bancaria_id: contaBancariaId });
    }

    toast.success("Movimentação criada com sucesso!");
    setLoading(false);
    resetForm();
    onOpenChange(false);
    onSuccess();
  };

  const isTransfer = modo === "transferencia";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Movimentação</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Data</Label>
              <Input type="date" value={dataMov} onChange={e => setDataMov(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo</Label>
              <Select value={modo} onValueChange={(v) => setModo(v as Modo)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">Entrada</SelectItem>
                  <SelectItem value="saida">Saída</SelectItem>
                  <SelectItem value="transferencia">Transferência entre contas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {!isTransfer && (
            <div className="space-y-1.5">
              <Label className="text-xs">Plano de Contas</Label>
              <Select value={planoContas} onValueChange={setPlanoContas}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {filteredPlanoContas.length === 0 ? (
                    <div className="px-2 py-3 text-xs text-muted-foreground text-center">
                      Nenhuma conta cadastrada. Cadastre em Financeiro › Plano de Contas.
                    </div>
                  ) : (
                    filteredPlanoContas.map(p => (
                      <SelectItem key={p.nome} value={p.nome}>{p.nome}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">Pessoa</Label>
            <Input value={pessoa} onChange={e => setPessoa(e.target.value)} placeholder="Nome da pessoa (opcional)" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">{isTransfer ? "Descrição" : "Complemento"}</Label>
            <Input value={complemento} onChange={e => setComplemento(e.target.value)} placeholder={isTransfer ? "Motivo da transferência" : "Descrição adicional"} />
          </div>

          {isTransfer ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Conta Origem</Label>
                <Select value={contaBancariaId} onValueChange={setContaBancariaId}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {bancos.map(b => (
                      <SelectItem key={b.id} value={b.id}>{b.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Conta Destino</Label>
                <Select value={contaDestinoId} onValueChange={setContaDestinoId}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {bancos.filter(b => b.id !== contaBancariaId).map(b => (
                      <SelectItem key={b.id} value={b.id}>{b.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label className="text-xs">Conta Bancária</Label>
              <Select value={contaBancariaId} onValueChange={setContaBancariaId}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {bancos.map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">Valor (R$)</Label>
            <Input type="number" step="0.01" min="0.01" value={valor} onChange={e => setValor(e.target.value)} placeholder="0,00" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
