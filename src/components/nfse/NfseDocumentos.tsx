import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2, RefreshCw, ExternalLink, Ban, Download } from "lucide-react";
import { format } from "date-fns";

interface Props { empresaId: string }

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  authorized: "default",
  scheduled: "secondary",
  processing_cancellation: "secondary",
  enviando: "secondary",
  pendente: "outline",
  cancelada: "destructive",
  cancelled: "destructive",
  erro: "destructive",
  error: "destructive",
};

export function NfseDocumentos({ empresaId }: Props) {
  const qc = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["asaas_nfse_documents", empresaId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("asaas_nfse_documents")
        .select("*, clientes:cliente_id(nome)")
        .eq("empresa_id", empresaId)
        .order("created_at", { ascending: false })
        .limit(200);
      return data || [];
    },
  });

  const consultar = async (id: string) => {
    setBusyId(id);
    try {
      const { data, error } = await supabase.functions.invoke("asaas-nfse", {
        body: { action: "consultar", document_id: id },
      });
      if (error) throw error;
      toast.success("Status atualizado");
      qc.invalidateQueries({ queryKey: ["asaas_nfse_documents"] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const cancelar = async (id: string) => {
    const motivo = prompt("Motivo do cancelamento:");
    if (!motivo) return;
    setBusyId(id);
    try {
      const { data, error } = await supabase.functions.invoke("asaas-nfse", {
        body: { action: "cancelar", document_id: id, motivo },
      });
      if (error) throw error;
      if (!data?.ok) {
        toast.error(data?.response?.errors?.[0]?.description || "Falha ao cancelar");
      } else {
        toast.success("NF cancelada");
      }
      qc.invalidateQueries({ queryKey: ["asaas_nfse_documents"] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Notas Emitidas</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Número</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {docs.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">Nenhuma nota emitida ainda</TableCell></TableRow>
                ) : docs.map((d: any) => (
                  <TableRow key={d.id}>
                    <TableCell>{d.created_at ? format(new Date(d.created_at), "dd/MM/yyyy HH:mm") : "-"}</TableCell>
                    <TableCell>{d.clientes?.nome || d.tomador_nome || "-"}</TableCell>
                    <TableCell className="max-w-[260px] truncate">{d.descricao}</TableCell>
                    <TableCell>{d.numero || "—"}</TableCell>
                    <TableCell className="text-right">R$ {Number(d.valor_servico).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[d.status] || "outline"}>{d.status}</Badge>
                      {d.erro_mensagem && (
                        <div className="text-xs text-destructive mt-1 max-w-[220px] truncate" title={d.erro_mensagem}>{d.erro_mensagem}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="icon" variant="ghost" disabled={busyId === d.id} onClick={() => consultar(d.id)} title="Atualizar status">
                        {busyId === d.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                      </Button>
                      {d.link_visualizacao && (
                        <Button size="icon" variant="ghost" asChild title="Visualizar">
                          <a href={d.link_visualizacao} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a>
                        </Button>
                      )}
                      {d.pdf_url && (
                        <Button size="icon" variant="ghost" asChild title="PDF">
                          <a href={d.pdf_url} target="_blank" rel="noreferrer"><Download className="h-4 w-4" /></a>
                        </Button>
                      )}
                      {d.status !== "cancelada" && d.asaas_nfse_id && (
                        <Button size="icon" variant="ghost" onClick={() => cancelar(d.id)} title="Cancelar">
                          <Ban className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
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
