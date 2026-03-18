import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Download, Loader2, Users, CheckCircle2, Search } from "lucide-react";

interface WhatsAppContact {
  name: string;
  number: string;
  profilePicUrl?: string | null;
  selected?: boolean;
}

export function ImportWhatsAppContatosDialog({ onSuccess }: { onSuccess?: () => void }) {
  const { profile } = useAuth();
  const empresaId = profile?.empresa_id;
  const [open, setOpen] = useState(false);
  const [contacts, setContacts] = useState<WhatsAppContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const fetchContacts = async () => {
    setLoading(true);
    setContacts([]);
    setSelectedIds(new Set());
    try {
      const { data, error } = await supabase.functions.invoke("evolution-api", {
        body: { action: "fetch_contacts" },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erro ao buscar contatos");

      const list: WhatsAppContact[] = data.contacts || [];
      setContacts(list);
      setSelectedIds(new Set(list.map(c => c.number)));
    } catch (err: any) {
      toast.error("Erro ao buscar contatos: " + (err.message || "Falha na conexão"));
    } finally {
      setLoading(false);
    }
  };

  const toggleContact = (number: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(number)) next.delete(number);
      else next.add(number);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === contacts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(contacts.map(c => c.number)));
    }
  };

  const handleImport = async () => {
    if (!empresaId || selectedIds.size === 0) return;
    setImporting(true);

    try {
      const selected = contacts.filter(c => selectedIds.has(c.number));

      // Create conversas for each selected contact (skip existing)
      let created = 0;
      for (const contact of selected) {
        const formattedNumber = contact.number.startsWith("+") ? contact.number : `+${contact.number}`;

        // Check if conversa already exists
        const { data: existing } = await supabase
          .from("conversas")
          .select("id")
          .eq("empresa_id", empresaId)
          .eq("contato_telefone", formattedNumber)
          .maybeSingle();

        if (!existing) {
          const { error } = await supabase.from("conversas").insert({
            empresa_id: empresaId,
            contato_nome: contact.name,
            contato_telefone: formattedNumber,
            status: "novo",
          });
          if (!error) created++;
        }
      }

      toast.success(`${created} contatos importados para o CRM`);
      setOpen(false);
      onSuccess?.();
    } catch (err: any) {
      toast.error("Erro na importação: " + err.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v && !contacts.length) fetchContacts(); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-2 text-xs">
          <Download className="h-3.5 w-3.5" strokeWidth={1.5} />
          Importar do WhatsApp
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Importar Contatos do WhatsApp</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
              <p className="text-sm text-muted-foreground">Buscando contatos do WhatsApp...</p>
            </div>
          ) : contacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Users className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">Nenhum contato encontrado</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={fetchContacts}>
                Tentar novamente
              </Button>
            </div>
          ) : (
            <>
              {/* Header with count and select all */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <span className="text-sm font-medium text-foreground">
                    {contacts.length} contatos encontrados
                  </span>
                </div>
                <button
                  onClick={toggleAll}
                  className="text-xs text-primary hover:underline"
                >
                  {selectedIds.size === contacts.length ? "Desmarcar todos" : "Selecionar todos"}
                </button>
              </div>

              {/* Contact list */}
              <ScrollArea className="h-64 border border-border rounded-md">
                <div className="p-1">
                  {contacts.map(c => (
                    <label
                      key={c.number}
                      className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted/50 cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedIds.has(c.number)}
                        onCheckedChange={() => toggleContact(c.number)}
                      />
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary shrink-0">
                        {c.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">+{c.number}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </ScrollArea>

              <p className="text-xs text-muted-foreground">
                {selectedIds.size} contatos selecionados — serão adicionados como conversas no CRM
              </p>
            </>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button
              disabled={selectedIds.size === 0 || importing || loading}
              onClick={handleImport}
            >
              {importing ? "Importando..." : `Importar ${selectedIds.size} contatos`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
