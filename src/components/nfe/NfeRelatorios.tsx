import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NfeStatusBadge } from "./NfeStatusBadge";
import { formatDateBR } from "@/lib/utils";
import { Download, FileSpreadsheet } from "lucide-react";

interface Props { empresaId: string }

export function NfeRelatorios({ empresaId }: Props) {
  const [filters, setFilters] = useState({
    status: "todos",
    dataInicio: "",
    dataFim: "",
    cliente: "",
  });

  const { data: notas = [] } = useQuery({
    queryKey: ["nfe_relatorios", empresaId, filters],
    queryFn: async () => {
      let query = supabase
        .from("nfe_documents")
        .select("*")
        .eq("empresa_id", empresaId)
        .order("created_at", { ascending: false });

      if (filters.status !== "todos") query = query.eq("status", filters.status);
      if (filters.dataInicio) query = query.gte("data_emissao", filters.dataInicio);
      if (filters.dataFim) query = query.lte("data_emissao", filters.dataFim + "T23:59:59");
      if (filters.cliente) query = query.ilike("dest_nome", `%${filters.cliente}%`);

      const { data } = await query;
      return data || [];
    },
  });

  const totalValor = notas.reduce((acc: number, n: any) => acc + (Number(n.valor_total) || 0), 0);

  const exportCSV = () => {
    const headers = ["Referência", "Destinatário", "CPF/CNPJ", "Valor", "Status", "Data Emissão", "Chave NF-e"];
    const rows = notas.map((n: any) => [
      n.reference,
      n.dest_nome,
      n.dest_cpf_cnpj,
      Number(n.valor_total).toFixed(2),
      n.status,
      n.data_emissao ? formatDateBR(n.data_emissao) : "",
      n.chave_nfe || "",
    ]);

    const csv = [headers.join(";"), ...rows.map((r: any) => r.join(";"))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-nfe-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div>
            <Label className="text-xs">Status</Label>
            <Select value={filters.status} onValueChange={(v) => setFilters((p) => ({ ...p, status: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="autorizada">Autorizada</SelectItem>
                <SelectItem value="rejeitada">Rejeitada</SelectItem>
                <SelectItem value="cancelada">Cancelada</SelectItem>
                <SelectItem value="processando">Processando</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Data Início</Label>
            <Input type="date" value={filters.dataInicio} onChange={(e) => setFilters((p) => ({ ...p, dataInicio: e.target.value }))} />
          </div>
          <div>
            <Label className="text-xs">Data Fim</Label>
            <Input type="date" value={filters.dataFim} onChange={(e) => setFilters((p) => ({ ...p, dataFim: e.target.value }))} />
          </div>
          <div>
            <Label className="text-xs">Cliente</Label>
            <Input value={filters.cliente} onChange={(e) => setFilters((p) => ({ ...p, cliente: e.target.value }))} placeholder="Nome..." />
          </div>
          <div className="flex items-end">
            <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1">
              <FileSpreadsheet className="h-4 w-4" /> Exportar CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">{notas.length} nota(s) encontrada(s)</CardTitle>
          <p className="text-sm font-medium">
            Total: {totalValor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Referência</TableHead>
                  <TableHead>Destinatário</TableHead>
                  <TableHead>CPF/CNPJ</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Chave NF-e</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notas.map((n: any) => (
                  <TableRow key={n.id}>
                    <TableCell className="font-mono text-xs">{n.reference}</TableCell>
                    <TableCell>{n.dest_nome || "—"}</TableCell>
                    <TableCell className="text-xs">{n.dest_cpf_cnpj || "—"}</TableCell>
                    <TableCell>{Number(n.valor_total).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</TableCell>
                    <TableCell><NfeStatusBadge status={n.status} /></TableCell>
                    <TableCell className="text-xs">{n.data_emissao ? formatDateBR(n.data_emissao) : "—"}</TableCell>
                    <TableCell className="font-mono text-xs max-w-[150px] truncate">{n.chave_nfe || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
