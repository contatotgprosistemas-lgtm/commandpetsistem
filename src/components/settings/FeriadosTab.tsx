import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, CalendarDays, Sparkles, Loader2 } from "lucide-react";
import { formatDateBR } from "@/lib/utils";

type Feriado = {
  id: string;
  data: string;
  descricao: string;
  tipo: string;
};

// Feriados nacionais fixos + cálculo de Carnaval, Sexta-Feira Santa e Corpus Christi
function calcularPascoa(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function addDaysLocal(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function fmtLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getFeriadosNacionais(year: number): { data: string; descricao: string }[] {
  const pascoa = calcularPascoa(year);
  const carnaval = addDaysLocal(pascoa, -47); // Terça-feira de Carnaval
  const sextaSanta = addDaysLocal(pascoa, -2);
  const corpus = addDaysLocal(pascoa, 60);
  return [
    { data: `${year}-01-01`, descricao: "Confraternização Universal" },
    { data: fmtLocal(carnaval), descricao: "Carnaval" },
    { data: fmtLocal(sextaSanta), descricao: "Sexta-feira Santa" },
    { data: `${year}-04-21`, descricao: "Tiradentes" },
    { data: `${year}-05-01`, descricao: "Dia do Trabalho" },
    { data: fmtLocal(corpus), descricao: "Corpus Christi" },
    { data: `${year}-09-07`, descricao: "Independência do Brasil" },
    { data: `${year}-10-12`, descricao: "Nossa Senhora Aparecida" },
    { data: `${year}-11-02`, descricao: "Finados" },
    { data: `${year}-11-15`, descricao: "Proclamação da República" },
    { data: `${year}-11-20`, descricao: "Dia da Consciência Negra" },
    { data: `${year}-12-25`, descricao: "Natal" },
  ];
}

export function FeriadosTab() {
  const { profile } = useAuth();
  const [feriados, setFeriados] = useState<Feriado[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ data: "", descricao: "" });
  const [year, setYear] = useState(new Date().getFullYear());

  async function load() {
    if (!profile?.empresa_id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("feriados")
      .select("id, data, descricao, tipo")
      .eq("empresa_id", profile.empresa_id)
      .order("data", { ascending: true });
    if (error) {
      toast({ title: "Erro ao carregar feriados", description: error.message, variant: "destructive" });
    } else {
      setFeriados((data || []) as Feriado[]);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, [profile?.empresa_id]);

  async function handleAdd() {
    if (!profile?.empresa_id) return;
    if (!form.data || !form.descricao.trim()) {
      toast({ title: "Preencha data e descrição", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("feriados").insert({
      empresa_id: profile.empresa_id,
      data: form.data,
      descricao: form.descricao.trim(),
      tipo: "manual",
    });
    setSaving(false);
    if (error) {
      toast({
        title: "Erro ao salvar",
        description: error.code === "23505" ? "Já existe feriado nesta data" : error.message,
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Feriado cadastrado" });
    setForm({ data: "", descricao: "" });
    setOpen(false);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover este feriado?")) return;
    const { error } = await supabase.from("feriados").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao remover", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Feriado removido" });
    load();
  }

  async function handleImportarNacionais() {
    if (!profile?.empresa_id) return;
    setImporting(true);
    try {
      const sugestoes = getFeriadosNacionais(year);
      const existentes = new Set(feriados.map((f) => f.data));
      const novos = sugestoes
        .filter((s) => !existentes.has(s.data))
        .map((s) => ({
          empresa_id: profile.empresa_id,
          data: s.data,
          descricao: s.descricao,
          tipo: "nacional",
        }));
      if (novos.length === 0) {
        toast({ title: "Nenhum feriado novo para importar" });
        return;
      }
      const { error } = await supabase.from("feriados").insert(novos);
      if (error) throw error;
      toast({ title: `${novos.length} feriado(s) importado(s)` });
      load();
    } catch (err: any) {
      toast({ title: "Erro ao importar", description: err.message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  }

  const sorted = useMemo(
    () => [...feriados].sort((a, b) => a.data.localeCompare(b.data)),
    [feriados],
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" /> Feriados
            </CardTitle>
            <CardDescription>
              Datas em que a empresa estará fechada. Agendamentos automáticos não serão criados nesses dias e a fatura não é afetada.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Input
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value) || new Date().getFullYear())}
              className="w-24"
              min={2020}
              max={2099}
            />
            <Button variant="outline" onClick={handleImportarNacionais} disabled={importing}>
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Importar nacionais
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4" /> Novo feriado</Button>
              </DialogTrigger>
              <DialogContent
                onPointerDownOutside={(e) => e.preventDefault()}
                onInteractOutside={(e) => e.preventDefault()}
              >
                <DialogHeader>
                  <DialogTitle>Cadastrar feriado</DialogTitle>
                  <DialogDescription>Adicione uma data em que a empresa não funcionará.</DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Data</Label>
                    <Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
                  </div>
                  <div>
                    <Label>Descrição</Label>
                    <Input
                      placeholder="Ex: Aniversário da cidade"
                      value={form.descricao}
                      onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                  <Button onClick={handleAdd} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    Salvar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Nenhum feriado cadastrado. Use "Importar nacionais" para começar.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((f) => (
                <TableRow key={f.id}>
                  <TableCell>{formatDateBR(f.data)}</TableCell>
                  <TableCell>{f.descricao}</TableCell>
                  <TableCell>
                    <Badge variant={f.tipo === "nacional" ? "secondary" : "outline"}>
                      {f.tipo === "nacional" ? "Nacional" : "Manual"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(f.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}