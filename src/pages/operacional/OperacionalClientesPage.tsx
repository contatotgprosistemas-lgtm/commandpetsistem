import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOperationalAuth } from "@/hooks/useOperationalAuth";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { NovoClienteDialog } from "@/components/NovoClienteDialog";
import { EditarClienteDialog } from "@/components/EditarClienteDialog";
import { Search, Phone, Link2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

export default function OperacionalClientesPage() {
  const { user } = useOperationalAuth();
  const [clientes, setClientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingCliente, setEditingCliente] = useState<any>(null);

  const fetchClientes = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("clientes")
      .select("*")
      .eq("empresa_id", user.empresa_id)
      .is("deleted_at", null)
      .order("nome");
    setClientes(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchClientes(); }, [user]);

  const filtered = clientes.filter(c =>
    c.nome.toLowerCase().includes(search.toLowerCase()) ||
    (c.whatsapp ?? "").includes(search)
  );

  const linkCadastro = user?.empresa_id
    ? `${window.location.origin}/cadastro/${user.empresa_id}`
    : "";

  const copiarLink = async () => {
    if (!linkCadastro) return;
    try {
      await navigator.clipboard.writeText(linkCadastro);
      toast({ title: "Link copiado!", description: "Envie ao cliente para que ele faça o cadastro." });
    } catch {
      toast({ title: "Erro ao copiar", variant: "destructive" });
    }
  };

  const enviarWhatsapp = () => {
    if (!linkCadastro) return;
    const msg = encodeURIComponent(`Olá! Faça seu cadastro através deste link: ${linkCadastro}`);
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  return (
    <div className="space-y-6 pb-24 md:pb-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
        <NovoClienteDialog onSuccess={fetchClientes} empresaId={user?.empresa_id} />
      </div>

      {linkCadastro && (
        <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Link2 className="h-4 w-4" /> Link de cadastro público
          </div>
          <p className="text-xs text-muted-foreground">
            Compartilhe este link para que o cliente faça o próprio cadastro.
          </p>
          <div className="flex gap-2">
            <Input value={linkCadastro} readOnly className="text-xs" onFocus={(e) => e.currentTarget.select()} />
            <Button type="button" variant="outline" size="icon" onClick={copiarLink} title="Copiar link">
              <Link2 className="h-4 w-4" />
            </Button>
            <Button type="button" variant="outline" size="icon" onClick={enviarWhatsapp} title="Enviar via WhatsApp">
              <MessageCircle className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="Buscar cliente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 h-12 text-base rounded-xl"
        />
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">Nenhum cliente encontrado.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map(c => (
            <Card key={c.id} className="rounded-xl cursor-pointer hover:shadow-md transition-shadow" onClick={() => setEditingCliente(c)}>
              <CardContent className="p-4 flex items-center gap-4">
                <Avatar className="h-12 w-12">
                  {c.foto_url && <AvatarImage src={c.foto_url} />}
                  <AvatarFallback className="bg-primary/10 text-primary font-bold">
                    {c.nome.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-base truncate">{c.nome}</p>
                  {c.whatsapp && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Phone className="h-3 w-3" /> {c.whatsapp}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {editingCliente && (
        <EditarClienteDialog
          cliente={editingCliente}
          open={!!editingCliente}
          onOpenChange={(o) => { if (!o) setEditingCliente(null); }}
          onSuccess={() => { setEditingCliente(null); fetchClientes(); }}
        />
      )}
    </div>
  );
}
