import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MetricCard } from "@/components/MetricCard";
import { Fuel, Route, TrendingUp, DollarSign, Gauge, AlertTriangle, Trash2, Download } from "lucide-react";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { formatDateBR } from "@/lib/utils";
import FinalizarRotaDialog from "./FinalizarRotaDialog";

type Roteirizacao = {
  id: string;
  empresa_id: string;
  data: string;
  tipo: string;
  vehicle_id: string | null;
  driver_id: string | null;
  km_real: number | null;
  litros_consumidos: number | null;
  custo_combustivel: number | null;
  receita_total: number;
  lucro_estimado: number | null;
  status: string;
  paradas: any;
  created_at: string;
};

const TIPOS_COMB = ["gasolina", "etanol", "diesel", "flex", "gnv"];

export default function CombustivelTab() {
  const { profile } = useAuth();
  const [mesRef, setMesRef] = useState(format(new Date(), "yyyy-MM"));
  const [rotas, setRotas] = useState<Roteirizacao[]>([]);
  const [vehiclesMap, setVehiclesMap] = useState<Record<string, string>>({});
  const [driversMap, setDriversMap] = useState<Record<string, string>>({});
  const [precos, setPrecos] = useState<Record<string, number>>({});
  const [novoTipo, setNovoTipo] = useState("gasolina");
  const [novoPreco, setNovoPreco] = useState("");
  const [finalizar, setFinalizar] = useState<Roteirizacao | null>(null);

  const load = async () => {
    if (!profile?.empresa_id) return;
    const eid = profile.empresa_id;
    const inicio = startOfMonth(new Date(mesRef + "-01"));
    const fim = endOfMonth(inicio);

    const [{ data: rs }, { data: vs }, { data: ds }, { data: ps }] = await Promise.all([
      supabase
        .from("taxipet_roteirizacoes")
        .select("*")
        .eq("empresa_id", eid)
        .gte("data", format(inicio, "yyyy-MM-dd"))
        .lte("data", format(fim, "yyyy-MM-dd"))
        .order("data", { ascending: false }),
      supabase.from("vehicles").select("id, brand, model, plate").eq("empresa_id", eid),
      supabase.from("drivers").select("id, name").eq("empresa_id", eid),
      supabase
        .from("combustivel_precos")
        .select("tipo_combustivel, preco_litro, data_referencia")
        .eq("empresa_id", eid)
        .order("data_referencia", { ascending: false }),
    ]);

    setRotas((rs as any) || []);
    const vmap: Record<string, string> = {};
    (vs || []).forEach((v: any) => {
      vmap[v.id] = `${[v.brand, v.model].filter(Boolean).join(" ")}${v.plate ? ` (${v.plate})` : ""}`;
    });
    setVehiclesMap(vmap);
    const dmap: Record<string, string> = {};
    (ds || []).forEach((d: any) => { dmap[d.id] = d.name; });
    setDriversMap(dmap);

    // Pega último preço por tipo
    const pmap: Record<string, number> = {};
    (ps || []).forEach((p: any) => {
      if (!(p.tipo_combustivel in pmap)) pmap[p.tipo_combustivel] = Number(p.preco_litro);
    });
    setPrecos(pmap);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [profile?.empresa_id, mesRef]);

  const stats = useMemo(() => {
    const concluidas = rotas.filter((r) => r.status === "concluida");
    const km = concluidas.reduce((a, r) => a + (Number(r.km_real) || 0), 0);
    const litros = concluidas.reduce((a, r) => a + (Number(r.litros_consumidos) || 0), 0);
    const custo = concluidas.reduce((a, r) => a + (Number(r.custo_combustivel) || 0), 0);
    const receita = concluidas.reduce((a, r) => a + (Number(r.receita_total) || 0), 0);
    const lucro = receita - custo;
    const margem = receita > 0 ? (lucro / receita) * 100 : 0;
    return { km, litros, custo, receita, lucro, margem, totalRotas: rotas.length, ativas: rotas.filter((r) => r.status === "em_andamento").length };
  }, [rotas]);

  const salvarPreco = async () => {
    if (!profile?.empresa_id) return;
    const valor = parseFloat(novoPreco.replace(",", "."));
    if (!valor || valor <= 0) { toast.error("Preço inválido"); return; }
    const { error } = await supabase.from("combustivel_precos").insert({
      empresa_id: profile.empresa_id,
      tipo_combustivel: novoTipo,
      preco_litro: valor,
    });
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success("Preço atualizado");
    setNovoPreco("");
    load();
  };

  const excluirRota = async (id: string) => {
    if (!confirm("Excluir esta roteirização?")) return;
    const { error } = await supabase.from("taxipet_roteirizacoes").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Rota excluída");
    load();
  };

  const exportCSV = () => {
    const header = "Data;Tipo;Veiculo;Motorista;Paradas;Km;Litros;Custo;Receita;Lucro;Status";
    const rows = rotas.map((r) => {
      const paradasCount = Array.isArray(r.paradas) ? r.paradas.length : 0;
      return [
        formatDateBR(r.data), r.tipo,
        (r.vehicle_id && vehiclesMap[r.vehicle_id]) || "",
        (r.driver_id && driversMap[r.driver_id]) || "",
        paradasCount,
        r.km_real ?? "", r.litros_consumidos?.toFixed(2) ?? "",
        r.custo_combustivel?.toFixed(2) ?? "",
        r.receita_total.toFixed(2),
        r.lucro_estimado?.toFixed(2) ?? "",
        r.status,
      ].join(";");
    });
    const csv = [header, ...rows].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `taxipet-roteirizacoes-${mesRef}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const margemCor =
    stats.margem >= 40 ? "text-emerald-600" :
    stats.margem >= 20 ? "text-amber-600" : "text-destructive";

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 flex-wrap">
        <Input
          type="month"
          value={mesRef}
          onChange={(e) => setMesRef(e.target.value)}
          className="w-44"
        />
        <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5">
          <Download className="h-3.5 w-3.5" /> Exportar CSV
        </Button>
      </div>

      {/* Cards do mês */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard title="Rotas no mês" value={String(stats.totalRotas)} icon={<Route className="h-5 w-5" />} accent="blue" />
        <MetricCard title="Km rodados" value={`${stats.km.toFixed(0)}`} icon={<Gauge className="h-5 w-5" />} accent="violet" />
        <MetricCard title="Litros" value={`${stats.litros.toFixed(1)}`} icon={<Fuel className="h-5 w-5" />} accent="amber" />
        <MetricCard title="Custo combustível" value={`R$ ${stats.custo.toFixed(2)}`} icon={<DollarSign className="h-5 w-5" />} accent="amber" />
        <MetricCard title="Receita" value={`R$ ${stats.receita.toFixed(2)}`} icon={<TrendingUp className="h-5 w-5" />} accent="emerald" />
        <Card className="overflow-hidden">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Margem</p>
            <p className={`text-2xl font-semibold ${margemCor}`}>{stats.margem.toFixed(1)}%</p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Lucro: R$ {stats.lucro.toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {stats.receita > 0 && stats.margem < 30 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-3 flex items-start gap-2 text-xs">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <p>
              <strong>Margem abaixo de 30%.</strong> Considere reajustar o preço dos serviços de transporte
              ou otimizar as rotas para reduzir o consumo.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Atualizar preço de combustível */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Fuel className="h-4 w-4 text-primary" /> Preços de combustível
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {TIPOS_COMB.map((t) => (
              <div key={t} className="rounded-md border p-2 text-center">
                <p className="text-[10px] uppercase text-muted-foreground">{t}</p>
                <p className="text-sm font-semibold">
                  {precos[t] ? `R$ ${precos[t].toFixed(2)}` : "—"}
                </p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Tipo</Label>
              <Select value={novoTipo} onValueChange={setNovoTipo}>
                <SelectTrigger className="h-9 w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPOS_COMB.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Novo preço (R$/L)</Label>
              <Input
                type="number" step="0.01" placeholder="Ex: 5.89"
                value={novoPreco} onChange={(e) => setNovoPreco(e.target.value)}
                className="h-9 w-36"
              />
            </div>
            <Button size="sm" onClick={salvarPreco}>Atualizar</Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de rotas */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Roteirizações do mês</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Veículo</TableHead>
                <TableHead>Motorista</TableHead>
                <TableHead className="text-right">Paradas</TableHead>
                <TableHead className="text-right">Km</TableHead>
                <TableHead className="text-right">Litros</TableHead>
                <TableHead className="text-right">Custo</TableHead>
                <TableHead className="text-right">Receita</TableHead>
                <TableHead className="text-right">Lucro</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rotas.map((r) => {
                const paradasCount = Array.isArray(r.paradas) ? r.paradas.length : 0;
                return (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap">{formatDateBR(r.data)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {r.tipo === "buscar" ? "Coleta" : "Entrega"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{(r.vehicle_id && vehiclesMap[r.vehicle_id]) || "—"}</TableCell>
                    <TableCell className="text-xs">{(r.driver_id && driversMap[r.driver_id]) || "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{paradasCount}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.km_real?.toFixed(1) ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.litros_consumidos?.toFixed(2) ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums text-destructive">
                      {r.custo_combustivel ? `R$ ${r.custo_combustivel.toFixed(2)}` : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-emerald-600">
                      R$ {r.receita_total.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.lucro_estimado != null ? (
                        <span className={r.lucro_estimado >= 0 ? "text-emerald-600" : "text-destructive"}>
                          R$ {r.lucro_estimado.toFixed(2)}
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell>
                      {r.status === "em_andamento" ? (
                        <Badge className="text-[10px] bg-amber-500/10 text-amber-700 border-amber-500/20">Em andamento</Badge>
                      ) : r.status === "concluida" ? (
                        <Badge className="text-[10px] bg-emerald-500/10 text-emerald-700 border-emerald-500/20">Concluída</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">{r.status}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="flex gap-1">
                      {r.status === "em_andamento" && (
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setFinalizar(r)}>
                          Finalizar
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => excluirRota(r.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {rotas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={12} className="text-center text-muted-foreground py-8 text-xs">
                    Nenhuma roteirização neste mês
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <FinalizarRotaDialog
        open={!!finalizar}
        onOpenChange={(v) => !v && setFinalizar(null)}
        rota={finalizar}
        onFinalized={load}
      />
    </div>
  );
}
