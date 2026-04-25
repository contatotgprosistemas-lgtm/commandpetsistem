import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreVertical, Trash2, Search, Pencil, Plus } from "lucide-react";
import { NovaMovimentacaoDialog } from "@/components/NovaMovimentacaoDialog";
import { format } from "date-fns";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface Movimentacao {
  id: string;
  data_movimentacao: string;
  plano_contas: string | null;
  pessoa: string | null;
  complemento: string | null;
  banco: string | null;
  valor: number;
  tipo: string;
}

export default function MovimentacaoPage() {
  const [movs, setMovs] = useState<Movimentacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [novaMovOpen, setNovaMovOpen] = useState(false);

  async function fetchMovs() {
    setLoading(true);
    const { data } = await supabase
      .from("movimentacoes")
      .select("*")
      .order("data_movimentacao", { ascending: false });
    if (data) setMovs(data as any);
    setLoading(false);
  }

  useEffect(() => { fetchMovs(); }, []);

  const handleDelete = async (id: string) => {
    const { data, error } = await supabase.rpc("excluir_movimentacao", { p_movimentacao_id: id });
    if (error) { toast.error("Erro ao excluir: " + error.message); return; }
    const result = data as any;
    if (result && !result.success) { toast.error(result.error); return; }
    toast.success("Movimentação excluída e valores revertidos");
    fetchMovs();
  };

  return (
    <div className="bg-card rounded-xl border border-border/60 shadow-sm mt-4 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-border flex items-center justify-between bg-muted/20">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-foreground">Movimentações</h2>
          <Badge variant="secondary" className="text-[10px] font-medium rounded-full px-2 py-0">{movs.length}</Badge>
        </div>
        <Button size="sm" className="gap-1 h-8" onClick={() => setNovaMovOpen(true)}>
          <Plus className="h-4 w-4" />
          Nova Movimentação
        </Button>
      </div>

      {loading ? (
        <div className="p-5 space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
        </div>
      ) : movs.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
          Nenhuma movimentação encontrada
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border">
              <TableHead className="h-11 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Código</TableHead>
              <TableHead className="h-11 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Data</TableHead>
              <TableHead className="h-11 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Plano de Contas</TableHead>
              <TableHead className="h-11 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Pessoa / Complemento</TableHead>
              <TableHead className="h-11 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Banco</TableHead>
              <TableHead className="h-11 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-right">Valor</TableHead>
              <TableHead className="h-11 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movs.map((m, idx) => (
              <TableRow key={m.id} className="group transition-colors hover:bg-muted/30">
                <TableCell className="py-3">
                  <p className="text-sm font-semibold text-foreground tabular-nums">#{movs.length - idx}</p>
                  <Badge variant="outline" className="text-[9px] font-medium mt-0.5 px-1.5 py-0">
                    {m.tipo === "contas_a_receber" ? "Contas a receber" : "Mov. Avulso"}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm py-3 tabular-nums text-muted-foreground">
                  {format(new Date(m.data_movimentacao + "T00:00:00"), "dd/MM/yyyy")}
                </TableCell>
                <TableCell className="text-sm py-3">
                  {m.plano_contas ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted text-foreground text-xs font-medium">{m.plano_contas}</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="py-3">
                  <p className="text-sm font-medium text-foreground">{m.pessoa || "—"}</p>
                  {m.complemento && <p className="text-xs text-muted-foreground truncate max-w-[240px]">{m.complemento}</p>}
                </TableCell>
                <TableCell className="text-sm py-3 text-muted-foreground">{m.banco || "—"}</TableCell>
                <TableCell className={`text-sm py-3 text-right tabular-nums font-semibold ${m.valor >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                  {m.valor < 0 ? "−" : "+"} R$ {Math.abs(m.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </TableCell>
                <TableCell className="text-right py-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-60 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Search className="h-4 w-4 mr-2" />
                        Detalhes
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => handleDelete(m.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <NovaMovimentacaoDialog
        open={novaMovOpen}
        onOpenChange={setNovaMovOpen}
        onSuccess={fetchMovs}
      />
    </div>
  );
}
