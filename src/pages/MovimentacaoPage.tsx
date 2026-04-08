import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreVertical, Trash2, Search, Pencil } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

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
    <div className="bg-card rounded-lg shadow-card mt-4 overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{movs.length} movimentação(ões)</span>
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
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Data Movimentação</TableHead>
              <TableHead>Plano de Contas</TableHead>
              <TableHead>Pessoa/Complemento</TableHead>
              <TableHead>Banco</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movs.map((m, idx) => (
              <TableRow key={m.id}>
                <TableCell>
                  <p className="text-sm font-medium">{movs.length - idx}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {m.tipo === "contas_a_receber" ? "Contas a receber" : "Mov. Avulso"}
                  </p>
                </TableCell>
                <TableCell className="text-sm">
                  {format(new Date(m.data_movimentacao + "T00:00:00"), "dd/MM/yyyy")}
                </TableCell>
                <TableCell className="text-sm">{m.plano_contas || "—"}</TableCell>
                <TableCell>
                  <p className="text-sm">{m.pessoa || "—"}</p>
                  {m.complemento && <p className="text-xs text-muted-foreground">{m.complemento}</p>}
                </TableCell>
                <TableCell className="text-sm">{m.banco || "—"}</TableCell>
                <TableCell className={`text-sm text-right tabular-nums font-semibold ${m.valor >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                  {m.valor < 0 ? "-" : ""}R$ {Math.abs(m.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon" className="h-7 w-7">
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
    </div>
  );
}
