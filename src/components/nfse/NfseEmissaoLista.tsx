import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { FileText, Loader2, Search } from "lucide-react";
import { format } from "date-fns";

interface Props { empresaId: string }

export function NfseEmissaoLista({ empresaId }: Props) {
  const qc = useQueryClient();
  const [busca, setBusca] = useState("");
  const [emitindoId, setEmitindoId] = useState<string | null>(null);

  const { data: contas = [], isLoading } = useQuery({
    queryKey: ["contas_pagas_sem_nfse", empresaId],
    queryFn: async () => {
      // Pull last 200 paid invoices
      const { data: pagas } = await supabase
        .from("contas_receber")
        .select("id, descricao, valor, valor_pago, data_baixa, vencimento, cliente_id, clientes:cliente_id(nome, cpf)")
        .eq("empresa_id", empresaId)
        .eq("status", "pago")
        .order("data_baixa", { ascending: false })
        .limit(200);
      const ids = (pagas || []).map((p: any) => p.id);
      if (!ids.length) return [];
      const { data: docs } = await (supabase as any)
        .from("asaas_nfse_documents")
        .select("conta_receber_id,status")
        .in("conta_receber_id", ids);
      const docMap = new Map<string, string>();
      (docs || []).forEach((d: any) => docMap.set(d.conta_receber_id, d.status));
      return (pagas || []).map((p: any) => ({ ...p, nfse_status: docMap.get(p.id) || null }));
    },
  });

  const filtradas = contas.filter((c: any) => {
    if (!busca) return true;
    const q = busca.toLowerCase();
    return (
      c.descricao?.toLowerCase().includes(q) ||
      c.clientes?.nome?.toLowerCase().includes(q)
    );
  });

  const emitir = async (contaId: string) => {
    setEmitindoId(contaId);
    try {
      const { data, error } = await supabase.functions.invoke("asaas-nfse", {
        body: { action: "emitir", conta_receber_id: contaId },
      });
      if (error) throw error;
      if (!data?.ok) {
        const msg = data?.response?.errors?.[0]?.description || data?.error || "Falha ao emitir";
        toast.error(msg);
      } else {
        toast.success("NFS-e enviada para processamento!");
      }
      qc.invalidateQueries({ queryKey: ["contas_pagas_sem_nfse"] });
      qc.invalidateQueries({ queryKey: ["asaas_nfse_documents"] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setEmitindoId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Faturas pagas — emitir NFS-e</CardTitle>
        <CardDescription>Apenas faturas com status "pago" podem ter nota fiscal emitida</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative mb-3">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Buscar por descrição ou cliente..." value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Pago em</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>NFS-e</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtradas.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Nenhuma fatura paga</TableCell></TableRow>
                ) : filtradas.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.clientes?.nome || "-"}</TableCell>
                    <TableCell className="max-w-[280px] truncate">{c.descricao}</TableCell>
                    <TableCell>{c.data_baixa ? format(new Date(c.data_baixa), "dd/MM/yyyy") : "-"}</TableCell>
                    <TableCell className="text-right">R$ {Number(c.valor_pago ?? c.valor).toFixed(2)}</TableCell>
                    <TableCell>
                      {c.nfse_status ? <Badge variant="outline">{c.nfse_status}</Badge> : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant={c.nfse_status ? "outline" : "default"}
                        disabled={emitindoId === c.id}
                        onClick={() => emitir(c.id)}
                      >
                        {emitindoId === c.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <><FileText className="h-3.5 w-3.5 mr-1" /> {c.nfse_status ? "Reemitir" : "Emitir NF"}</>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
