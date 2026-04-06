import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { NfeStatusBadge } from "./NfeStatusBadge";
import { NfeTimeline } from "./NfeTimeline";
import { toast } from "sonner";
import { Search, RefreshCw, Eye, Download, FileText, Ban, Loader2, RotateCcw } from "lucide-react";

interface Props { empresaId: string }

export function NfeListagem({ empresaId }: Props) {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("todos");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedNfe, setSelectedNfe] = useState<any>(null);
  const [showCancelar, setShowCancelar] = useState<string | null>(null);
  const [justificativa, setJustificativa] = useState("");

  const { data: notas = [], isLoading } = useQuery({
    queryKey: ["nfe_documents", empresaId, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("nfe_documents")
        .select("*")
        .eq("empresa_id", empresaId)
        .order("created_at", { ascending: false });
      if (statusFilter !== "todos") query = query.eq("status", statusFilter);
      const { data } = await query;
      return data || [];
    },
  });

  const filteredNotas = notas.filter((n: any) =>
    !searchTerm ||
    n.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    n.dest_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    n.dest_cpf_cnpj?.includes(searchTerm)
  );

  const consultarMutation = useMutation({
    mutationFn: async (nfeId: string) => {
      const { data, error } = await supabase.functions.invoke("focus-nfe-v2", {
        body: { action: "consultar", empresa_id: empresaId, nfe_id: nfeId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success("Status atualizado!");
      queryClient.invalidateQueries({ queryKey: ["nfe_documents"] });
      queryClient.invalidateQueries({ queryKey: ["nfe_documents_dashboard"] });
    },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });

  const reenviarMutation = useMutation({
    mutationFn: async (nfeId: string) => {
      const { data, error } = await supabase.functions.invoke("focus-nfe-v2", {
        body: { action: "reenviar", empresa_id: empresaId, nfe_id: nfeId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success("NFS-e reenviada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["nfe_documents"] });
      queryClient.invalidateQueries({ queryKey: ["nfe_documents_dashboard"] });
    },
    onError: (e: any) => toast.error("Erro ao reenviar: " + e.message),
  });

  const cancelarMutation = useMutation({
    mutationFn: async ({ nfeId, justificativa }: { nfeId: string; justificativa: string }) => {
      const { data, error } = await supabase.functions.invoke("focus-nfe-v2", {
        body: { action: "cancelar", empresa_id: empresaId, nfe_id: nfeId, justificativa },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success("Nota cancelada!");
      setShowCancelar(null);
      setJustificativa("");
      queryClient.invalidateQueries({ queryKey: ["nfe_documents"] });
    },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });

  const consultarLote = async () => {
    const pendentes = notas.filter((n: any) => n.status === "processando").map((n: any) => n.id);
    if (pendentes.length === 0) {
      toast.info("Nenhuma nota processando");
      return;
    }
    const { data, error } = await supabase.functions.invoke("focus-nfe-v2", {
      body: { action: "consultar_lote", empresa_id: empresaId, nfe_ids: pendentes },
    });
    if (error) toast.error("Erro na consulta em lote");
    else {
      toast.success(`${pendentes.length} nota(s) consultada(s)`);
      queryClient.invalidateQueries({ queryKey: ["nfe_documents"] });
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base">Notas Fiscais</CardTitle>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={consultarLote}>
              <RefreshCw className="h-4 w-4 mr-1" /> Consultar Pendentes
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por referência, nome ou CPF/CNPJ..." className="pl-8" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="rascunho">Rascunho</SelectItem>
                <SelectItem value="processando">Processando</SelectItem>
                <SelectItem value="autorizada">Autorizada</SelectItem>
                <SelectItem value="rejeitada">Rejeitada</SelectItem>
                <SelectItem value="cancelada">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Referência</TableHead>
                  <TableHead>Destinatário</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : filteredNotas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhuma nota encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredNotas.map((nota: any) => (
                    <TableRow key={nota.id}>
                      <TableCell className="font-mono text-xs">{nota.reference}</TableCell>
                      <TableCell>{nota.dest_nome || "—"}</TableCell>
                      <TableCell>{Number(nota.valor_total).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</TableCell>
                      <TableCell><NfeStatusBadge status={nota.status} /></TableCell>
                      <TableCell className="text-xs">{(() => { const [y,m,d] = nota.created_at.split("T")[0].split("-").map(Number); return new Date(y, m-1, d).toLocaleDateString("pt-BR"); })()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="sm" onClick={() => setSelectedNfe(nota)} title="Detalhes">
                            <Eye className="h-4 w-4" />
                          </Button>
                          {(nota.status === "processando" || nota.status === "rascunho") && (
                            <Button variant="ghost" size="sm" onClick={() => consultarMutation.mutate(nota.id)} title="Consultar">
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          )}
                          {nota.xml_url && (
                            <Button variant="ghost" size="sm" asChild title="XML">
                              <a href={nota.xml_url} target="_blank" rel="noopener"><FileText className="h-4 w-4" /></a>
                            </Button>
                          )}
                          {nota.pdf_url && (
                            <Button variant="ghost" size="sm" asChild title="DANFE">
                              <a href={nota.pdf_url} target="_blank" rel="noopener"><Download className="h-4 w-4" /></a>
                            </Button>
                          )}
                          {nota.status === "autorizada" && (
                            <Button variant="ghost" size="sm" onClick={() => setShowCancelar(nota.id)} title="Cancelar">
                              <Ban className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                          {(nota.status === "rejeitada" || nota.status === "erro") && (
                            <Button variant="ghost" size="sm" onClick={() => reenviarMutation.mutate(nota.id)} title="Reenviar" disabled={reenviarMutation.isPending}>
                              <RotateCcw className="h-4 w-4 text-orange-500" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Detalhes Dialog */}
      <Dialog open={!!selectedNfe} onOpenChange={() => setSelectedNfe(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da NF-e</DialogTitle>
          </DialogHeader>
          {selectedNfe && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Referência:</span> <span className="font-mono">{selectedNfe.reference}</span></div>
                <div><span className="text-muted-foreground">Status:</span> <NfeStatusBadge status={selectedNfe.status} /></div>
                <div><span className="text-muted-foreground">Destinatário:</span> {selectedNfe.dest_nome}</div>
                <div><span className="text-muted-foreground">CPF/CNPJ:</span> {selectedNfe.dest_cpf_cnpj}</div>
                <div><span className="text-muted-foreground">Valor:</span> {Number(selectedNfe.valor_total).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</div>
                <div><span className="text-muted-foreground">Chave:</span> <span className="font-mono text-xs">{selectedNfe.chave_nfe || "—"}</span></div>
                {selectedNfe.protocolo_autorizacao && <div><span className="text-muted-foreground">Protocolo:</span> {selectedNfe.protocolo_autorizacao}</div>}
                {selectedNfe.focus_message && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Mensagem Focus:</span>
                    <p className="text-xs mt-1 p-2 bg-muted rounded">{selectedNfe.focus_message}</p>
                  </div>
                )}
              </div>
              <NfeTimeline nfeId={selectedNfe.id} empresaId={empresaId} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancelar Dialog */}
      <Dialog open={!!showCancelar} onOpenChange={() => { setShowCancelar(null); setJustificativa(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar NF-e</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Informe a justificativa para o cancelamento (mínimo 15 caracteres).</p>
            <Textarea value={justificativa} onChange={(e) => setJustificativa(e.target.value)} placeholder="Justificativa do cancelamento..." rows={3} />
            <Button
              variant="destructive"
              onClick={() => showCancelar && cancelarMutation.mutate({ nfeId: showCancelar, justificativa })}
              disabled={justificativa.length < 15 || cancelarMutation.isPending}
            >
              Confirmar Cancelamento
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
