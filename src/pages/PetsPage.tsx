import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PawPrint, Search, Trash2, Pencil } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NovoPetDialog } from "@/components/NovoPetDialog";
import { PetMediaUploadDialog } from "@/components/PetMediaUploadDialog";
import { ImportPetsDialog } from "@/components/ImportPetsDialog";
import { EditarPetDialog } from "@/components/EditarPetDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export default function PetsPage() {
  const { profile } = useAuth();
  const empresaId = profile?.empresa_id;
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [editingPet, setEditingPet] = useState<any>(null);

  const { data: pets, isLoading } = useQuery({
    queryKey: ["pets", empresaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pets")
        .select("*, cliente:clientes(id, nome)")
        .order("nome", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!empresaId,
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["pets", empresaId] });
  };

  const handleDelete = async (id: string, nome: string) => {
    if (!confirm(`Tem certeza que deseja excluir o pet "${nome}"?`)) return;
    const { error } = await supabase.from("pets").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir pet: " + error.message);
    } else {
      toast.success("Pet excluído");
      handleRefresh();
    }
  };

  const filtered = pets?.filter(p =>
    !searchQuery ||
    p.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.raca?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.cliente as any)?.nome?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Pets</h1>
          <p className="text-sm text-muted-foreground">
            {isLoading ? "Carregando..." : `${filtered?.length || 0} pets cadastrados`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PetMediaUploadDialog />
          <ImportPetsDialog onSuccess={handleRefresh} />
          <NovoPetDialog onSuccess={handleRefresh} />
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Buscar pets..."
          className="w-full h-9 pl-9 pr-3 text-sm bg-card rounded-md shadow-card outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
        />
      </div>

      <div className="bg-card rounded-lg shadow-card">
        <div className="grid grid-cols-[1fr_1fr_1fr_80px_80px_80px] px-5 py-3 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wider">
          <span>Pet</span>
          <span>Raça</span>
          <span>Tutor</span>
          <span>Espécie</span>
          <span>Peso</span>
          <span></span>
        </div>
        <div className="divide-y divide-border">
          {isLoading ? (
            <div className="px-5 py-12 text-center text-sm text-muted-foreground">Carregando pets...</div>
          ) : !filtered?.length ? (
            <div className="flex flex-col items-center justify-center py-12">
              <PawPrint className="h-10 w-10 text-muted-foreground/30 mb-3" strokeWidth={1.5} />
              <p className="text-sm text-muted-foreground">Nenhum pet cadastrado</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Cadastre seus pets para começar</p>
            </div>
          ) : (
            filtered.map(p => (
              <div key={p.id} className="grid grid-cols-[1fr_1fr_1fr_80px_80px_80px] px-5 py-3 items-center hover:bg-muted/50 transition-colors">
                <span className="text-sm font-medium text-foreground">{p.nome}</span>
                <span className="text-sm text-muted-foreground">{p.raca || "—"}</span>
                <span className="text-sm text-muted-foreground">{(p.cliente as any)?.nome || "—"}</span>
                <span className="text-sm text-muted-foreground">{p.especie}</span>
                <span className="text-sm text-muted-foreground tabular-nums">{p.peso ? `${p.peso}kg` : "—"}</span>
                <div className="flex justify-end gap-1">
                  <button
                    onClick={() => setEditingPet(p)}
                    className="h-7 w-7 rounded hover:bg-primary/10 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
                    title="Editar pet"
                  >
                    <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
                  </button>
                  <button
                    onClick={() => handleDelete(p.id, p.nome)}
                    className="h-7 w-7 rounded hover:bg-destructive/10 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
                    title="Excluir pet"
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <EditarPetDialog
        pet={editingPet}
        open={!!editingPet}
        onOpenChange={(o) => { if (!o) setEditingPet(null); }}
        onSuccess={() => { setEditingPet(null); handleRefresh(); }}
      />
    </div>
  );
}