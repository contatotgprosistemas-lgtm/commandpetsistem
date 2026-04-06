import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle, Eye, RefreshCw } from "lucide-react";
import { formatDateBR } from "@/lib/utils";
import { useState } from "react";

interface Props { empresaId: string }

export function NfeRejeicoes({ empresaId }: Props) {
  const queryClient = useQueryClient();
  const [selectedRej, setSelectedRej] = useState<any>(null);

  const { data: rejeicoes = [], isLoading } = useQuery({
    queryKey: ["nfe_rejections", empresaId],
    queryFn: async () => {
      const { data } = await supabase
        .from("nfe_rejections")
        .select("*, nfe_documents(reference, dest_nome, valor_total, status)")
        .eq("empresa_id", empresaId)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const resolverMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const { error } = await supabase
        .from("nfe_rejections")
        .update({ resolved: true, resolved_at: new Date().toISOString(), resolution_notes: notes })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Rejeição marcada como resolvida");
      setSelectedRej(null);
      queryClient.invalidateQueries({ queryKey: ["nfe_rejections"] });
    },
  });

  const pendentes = rejeicoes.filter((r: any) => !r.resolved);
  const resolvidas = rejeicoes.filter((r: any) => r.resolved);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            Rejeições Pendentes ({pendentes.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Referência</TableHead>
                <TableHead>Destinatário</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Mensagem</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendentes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                    Nenhuma rejeição pendente 🎉
                  </TableCell>
                </TableRow>
              ) : (
                pendentes.map((rej: any) => (
                  <TableRow key={rej.id}>
                    <TableCell className="font-mono text-xs">{rej.nfe_documents?.reference}</TableCell>
                    <TableCell>{rej.nfe_documents?.dest_nome || "—"}</TableCell>
                    <TableCell><Badge variant="destructive">{rej.rejection_code}</Badge></TableCell>
                    <TableCell className="max-w-[300px] truncate text-xs">{rej.rejection_message}</TableCell>
                    <TableCell className="text-xs">{formatDateBR(rej.created_at)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedRej(rej)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {resolvidas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Resolvidas ({resolvidas.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Referência</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Resolução</TableHead>
                  <TableHead>Data Resolução</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resolvidas.map((rej: any) => (
                  <TableRow key={rej.id}>
                    <TableCell className="font-mono text-xs">{rej.nfe_documents?.reference}</TableCell>
                    <TableCell>{rej.rejection_code}</TableCell>
                    <TableCell className="text-xs">{rej.resolution_notes || "—"}</TableCell>
                    <TableCell className="text-xs">{rej.resolved_at ? formatDateBR(rej.resolved_at) : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Detalhes da rejeição */}
      <Dialog open={!!selectedRej} onOpenChange={() => setSelectedRej(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes da Rejeição</DialogTitle>
          </DialogHeader>
          {selectedRej && (
            <div className="space-y-3">
              <div className="text-sm space-y-1">
                <p><strong>Referência:</strong> {selectedRej.nfe_documents?.reference}</p>
                <p><strong>Código:</strong> {selectedRej.rejection_code}</p>
                <p><strong>Mensagem:</strong></p>
                <p className="p-2 bg-destructive/10 rounded text-xs">{selectedRej.rejection_message}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Notas de resolução</p>
                <Textarea
                  id="resolution-notes"
                  placeholder="Descreva como foi resolvido..."
                  onChange={(e) => {
                    selectedRej._notes = e.target.value;
                  }}
                />
                <Button
                  size="sm"
                  onClick={() => resolverMutation.mutate({ id: selectedRej.id, notes: selectedRej._notes || "" })}
                >
                  <CheckCircle className="h-4 w-4 mr-1" /> Marcar como Resolvida
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
