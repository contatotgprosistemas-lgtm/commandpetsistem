import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { NovoClienteDialog } from "@/components/NovoClienteDialog";
import { ImportContatosDialog } from "@/components/ImportContatosDialog";
import { EditarClienteDialog } from "@/components/EditarClienteDialog";
import { Search, Phone, Mail, Trash2, Users, Link2, MessageCircle, Pencil, KeyRound, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const tagColors: Record<string, string> = {
  Frequente: "bg-primary/10 text-primary",
  Novo: "bg-success/10 text-success",
  Hotel: "bg-warning/10 text-warning",
  Daycare: "bg-primary/10 text-primary",
};

export default function ClientsPage() {
  const { profile } = useAuth();
  const empresaId = profile?.empresa_id;
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [editingCliente, setEditingCliente] = useState<any>(null);
  const [accessCliente, setAccessCliente] = useState<any>(null);
  const [accessEmail, setAccessEmail] = useState("");
  const [accessSenha, setAccessSenha] = useState("");
  const [creatingAccess, setCreatingAccess] = useState(false);

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

  const handleCreateAccess = async () => {
    if (!accessCliente || !accessEmail || !accessSenha) {
      toast.error("Preencha email e senha");
      return;
    }
    if (accessSenha.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    setCreatingAccess(true);
    try {
      const { data, error } = await supabase.functions.invoke("criar-acesso-cliente", {
        body: {
          cliente_id: accessCliente.id,
          email: accessEmail,
          senha: accessSenha,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Acesso criado para ${accessCliente.nome}! Email: ${accessEmail}`);
      setAccessCliente(null);
      setAccessEmail("");
      setAccessSenha("");
      handleRefresh();
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar acesso");
    } finally {
      setCreatingAccess(false);
    }
  };

  const openAccessDialog = (c: any) => {
    setAccessCliente(c);
    setAccessEmail(c.email || "");
    setAccessSenha("");
  };

  const filtered = clientes?.filter(c =>
    !searchQuery ||
    c.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
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
        <div className="grid grid-cols-[1fr_150px_200px_120px_120px] px-5 py-3 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wider">
          <span>Nome</span>
          <span>WhatsApp</span>
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
              <div key={c.id} className="grid grid-cols-[1fr_150px_200px_120px_120px] px-5 py-3 items-center hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8 border border-border shrink-0">
                    {(c as any).foto_url && <AvatarImage src={(c as any).foto_url} alt={c.nome} />}
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">{c.nome.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium text-foreground">{c.nome}</span>
                  {c.user_id && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary">
                      Portal
                    </span>
                  )}
                </div>
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
                <div className="flex justify-end gap-1">
                  {!c.user_id && (
                    <button
                      onClick={() => openAccessDialog(c)}
                      className="h-7 w-7 rounded hover:bg-primary/10 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
                      title="Gerar acesso ao portal"
                    >
                      <KeyRound className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </button>
                  )}
                  <button
                    onClick={() => setEditingCliente(c)}
                    className="h-7 w-7 rounded hover:bg-primary/10 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
                    title="Editar contato"
                  >
                    <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
                  </button>
                  {c.whatsapp && (
                    <button
                      onClick={() => navigate(`/crm?phone=${encodeURIComponent(c.whatsapp || "")}`)}
                      className="h-7 w-7 rounded hover:bg-primary/10 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
                      title="Abrir conversa no CRM"
                    >
                      <MessageCircle className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </button>
                  )}
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

      <EditarClienteDialog
        cliente={editingCliente}
        open={!!editingCliente}
        onOpenChange={(open) => { if (!open) setEditingCliente(null); }}
        onSuccess={() => { setEditingCliente(null); handleRefresh(); }}
      />

      {/* Dialog Gerar Acesso ao Portal */}
      <Dialog open={!!accessCliente} onOpenChange={(open) => { if (!open) { setAccessCliente(null); setAccessEmail(""); setAccessSenha(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              Gerar Acesso ao Portal
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Criar login para <strong>{accessCliente?.nome}</strong> acessar o portal do cliente.
            </p>
            <div className="space-y-2">
              <Label>Email de acesso</Label>
              <Input
                type="email"
                placeholder="email@exemplo.com"
                value={accessEmail}
                onChange={(e) => setAccessEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Senha</Label>
              <Input
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={accessSenha}
                onChange={(e) => setAccessSenha(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setAccessCliente(null); setAccessEmail(""); setAccessSenha(""); }}>
                Cancelar
              </Button>
              <Button onClick={handleCreateAccess} disabled={creatingAccess}>
                {creatingAccess && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Criar Acesso
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}