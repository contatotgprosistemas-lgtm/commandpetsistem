import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { NovoClienteDialog } from "@/components/NovoClienteDialog";
import { ImportContatosDialog } from "@/components/ImportContatosDialog";
import { Search, Phone, Mail, Trash2, Users, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const tagColors: Record<string, string> = {
  VIP: "bg-accent/10 text-accent",
  Frequente: "bg-primary/10 text-primary",
  Novo: "bg-success/10 text-success",
  Hotel: "bg-warning/10 text-warning",
  Daycare: "bg-primary/10 text-primary",
};

export default function ClientsPage() {
  const { profile } = useAuth();
  const empresaId = profile?.empresa_id;
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: clientes, isLoading } = useQuery({
    queryKey: ["clientes", empresaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .order("nome", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!empresaId,
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["clientes", empresaId] });
  };

  const handleDelete = async (id: string, nome: string) => {
    if (!confirm(`Tem certeza que deseja excluir o contato "${nome}"?`)) return;
    const { error } = await supabase.from("clientes").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir contato: " + error.message);
    } else {
      toast.success("Contato excluído");
      handleRefresh();
    }
  };

  const filtered = clientes?.filter(c =>
    !searchQuery ||
    c.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.telefone?.includes(searchQuery) ||
    c.whatsapp?.includes(searchQuery) ||
    c.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Contatos</h1>
          <p className="text-sm text-muted-foreground">
            {isLoading ? "Carregando..." : `${filtered?.length || 0} contatos cadastrados`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={() => {
              if (!empresaId) {
                toast.error("Empresa não encontrada");
                return;
              }
              const url = `${window.location.origin}/cadastro/${empresaId}`;
              navigator.clipboard.writeText(url);
              toast.success("Link de cadastro copiado!");
            }}
          >
            <Link2 className="h-4 w-4" strokeWidth={1.5} />
            Link de Cadastro
          </Button>
          <ImportContatosDialog onSuccess={handleRefresh} />
          <NovoClienteDialog onSuccess={handleRefresh} />
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Buscar contatos..."
          className="w-full h-9 pl-9 pr-3 text-sm bg-card rounded-md shadow-card outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
        />
      </div>

      <div className="bg-card rounded-lg shadow-card">
        <div className="grid grid-cols-[1fr_150px_200px_120px_60px] px-5 py-3 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wider">
          <span>Nome</span>
          <span>Telefone</span>
          <span>Email</span>
          <span>Tags</span>
          <span></span>
        </div>
        <div className="divide-y divide-border">
          {isLoading ? (
            <div className="px-5 py-12 text-center text-sm text-muted-foreground">Carregando contatos...</div>
          ) : !filtered?.length ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Users className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">Nenhum contato encontrado</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Cadastre ou importe seus contatos</p>
            </div>
          ) : (
            filtered.map(c => (
              <div key={c.id} className="grid grid-cols-[1fr_150px_200px_120px_60px] px-5 py-3 items-center hover:bg-muted/50 transition-colors">
                <span className="text-sm font-medium text-foreground">{c.nome}</span>
                <span className="font-mono-tabular text-sm text-muted-foreground flex items-center gap-1.5">
                  <Phone className="h-3 w-3" strokeWidth={1.5} />
                  {c.whatsapp || c.telefone || "—"}
                </span>
                <span className="text-sm text-muted-foreground flex items-center gap-1.5 truncate">
                  <Mail className="h-3 w-3 shrink-0" strokeWidth={1.5} />
                  {c.email || "—"}
                </span>
                <div className="flex gap-1 flex-wrap">
                  {c.tags?.map((tag: string) => (
                    <span key={tag} className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${tagColors[tag] || "bg-muted text-muted-foreground"}`}>
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={() => handleDelete(c.id, c.nome)}
                    className="h-7 w-7 rounded hover:bg-destructive/10 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
