import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Zap, Plus, X, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface QuickRepliesMenuProps {
  onSelect: (content: string) => void;
}

export function QuickRepliesMenu({ onSelect }: QuickRepliesMenuProps) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [addMode, setAddMode] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newShortcut, setNewShortcut] = useState("");

  const { data: replies } = useQuery({
    queryKey: ["quick-replies", profile?.empresa_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quick_replies")
        .select("*")
        .order("title");
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.empresa_id,
  });

  const addReply = useMutation({
    mutationFn: async () => {
      if (!profile?.empresa_id) throw new Error("Missing empresa");
      const { error } = await supabase.from("quick_replies").insert({
        empresa_id: profile.empresa_id,
        title: newTitle,
        content: newContent,
        shortcut: newShortcut || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quick-replies"] });
      setAddMode(false);
      setNewTitle("");
      setNewContent("");
      setNewShortcut("");
      toast.success("Resposta rápida criada");
    },
  });

  const deleteReply = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("quick_replies").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quick-replies"] });
    },
  });

  const filtered = replies?.filter(r =>
    !search || r.title.toLowerCase().includes(search.toLowerCase()) || r.content.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="h-10 w-10 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground shrink-0 transition-colors"
        title="Respostas rápidas"
      >
        <Zap className="h-5 w-5" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Respostas Rápidas
            </DialogTitle>
          </DialogHeader>

          {!addMode ? (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar..."
                  className="pl-9"
                />
              </div>

              <div className="max-h-[300px] overflow-y-auto space-y-1">
                {!filtered?.length ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Nenhuma resposta rápida</p>
                ) : (
                  filtered.map(r => (
                    <div
                      key={r.id}
                      className="flex items-start gap-2 p-2.5 rounded-lg hover:bg-muted cursor-pointer group"
                      onClick={() => { onSelect(r.content); setOpen(false); }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{r.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{r.content}</p>
                        {r.shortcut && (
                          <span className="text-[10px] text-primary font-mono">/{r.shortcut}</span>
                        )}
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteReply.mutate(r.id); }}
                        className="h-6 w-6 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-destructive transition"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <Button variant="outline" size="sm" className="w-full" onClick={() => setAddMode(true)}>
                <Plus className="h-4 w-4 mr-1" /> Nova Resposta Rápida
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Título" />
              <Textarea value={newContent} onChange={e => setNewContent(e.target.value)} placeholder="Conteúdo da resposta" className="min-h-[80px]" />
              <Input value={newShortcut} onChange={e => setNewShortcut(e.target.value)} placeholder="Atalho (opcional, ex: saudacao)" />
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setAddMode(false)}>Cancelar</Button>
                <Button className="flex-1" disabled={!newTitle.trim() || !newContent.trim()} onClick={() => addReply.mutate()}>Salvar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
