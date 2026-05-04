import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PawPrint, Search, Trash2, Pencil, ChevronLeft, ChevronRight, LayoutGrid, List as ListIcon, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { NovoPetDialog } from "@/components/NovoPetDialog";
import { PetMediaUploadDialog } from "@/components/PetMediaUploadDialog";
import { ImportPetsDialog } from "@/components/ImportPetsDialog";
import { EditarPetDialog } from "@/components/EditarPetDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const avatarPalette = [
  "bg-primary/15 text-primary",
  "bg-success/15 text-success",
  "bg-warning/15 text-warning",
  "bg-destructive/15 text-destructive",
  "bg-accent/20 text-accent-foreground",
  "bg-secondary text-secondary-foreground",
];
const colorFromString = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return avatarPalette[h % avatarPalette.length];
};

const especieEmoji: Record<string, string> = {
  cachorro: "🐶",
  cao: "🐶",
  cão: "🐶",
  gato: "🐱",
  ave: "🦜",
  passaro: "🦜",
  pássaro: "🦜",
  coelho: "🐰",
  hamster: "🐹",
  peixe: "🐠",
  tartaruga: "🐢",
};
const PAGE_SIZE = 24;

export default function PetsPage() {
  const { profile } = useAuth();
  const empresaId = profile?.empresa_id;
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [editingPet, setEditingPet] = useState<any>(null);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [page, setPage] = useState(1);

  const { data: pets, isLoading } = useQuery({
    queryKey: ["pets", empresaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pets")
        .select("*, cliente:clientes(id, nome, foto_url)")
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

  const total = filtered?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered?.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE) ?? [];
  const onSearchChange = (v: string) => { setSearchQuery(v); setPage(1); };

  return (
    <div className="p-3 md:p-6 space-y-6 max-w-[1400px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Pets</h1>
          <p className="text-sm text-muted-foreground">
            {isLoading ? "Carregando..." : `${total} pets cadastrados`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PetMediaUploadDialog />
          <ImportPetsDialog onSuccess={handleRefresh} />
          <NovoPetDialog onSuccess={handleRefresh} />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative max-w-sm flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
          <input
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Buscar pets, raça ou tutor..."
            className="w-full h-9 pl-9 pr-3 text-sm bg-card rounded-md shadow-card outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
          />
        </div>
        <div className="inline-flex items-center bg-muted/40 border border-border rounded-lg p-1 gap-1">
          <button
            onClick={() => setView("grid")}
            className={`h-7 px-2.5 rounded-md text-xs flex items-center gap-1.5 transition-colors ${view === "grid" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            <LayoutGrid className="h-3.5 w-3.5" /> Cards
          </button>
          <button
            onClick={() => setView("list")}
            className={`h-7 px-2.5 rounded-md text-xs flex items-center gap-1.5 transition-colors ${view === "list" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            <ListIcon className="h-3.5 w-3.5" /> Lista
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-card rounded-lg shadow-card px-5 py-12 text-center text-sm text-muted-foreground">Carregando pets...</div>
      ) : !total ? (
        <div className="bg-card rounded-lg shadow-card flex flex-col items-center justify-center py-16">
          <PawPrint className="h-10 w-10 text-muted-foreground/30 mb-3" strokeWidth={1.5} />
          <p className="text-sm text-muted-foreground">Nenhum pet cadastrado</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Cadastre seus pets para começar</p>
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {paged.map(p => {
            const palette = colorFromString(p.nome || p.id);
            const emoji = especieEmoji[(p.especie || "").toLowerCase()] || "🐾";
            return (
              <div
                key={p.id}
                className="group relative bg-card rounded-xl shadow-card border border-border/60 hover:border-primary/40 hover:shadow-md transition-all overflow-hidden"
              >
                <div className={`h-14 ${palette.split(" ")[0]} relative flex items-center justify-end pr-3`}>
                  <span className="text-2xl opacity-80">{emoji}</span>
                </div>
                <div className="px-4 pb-4 -mt-7">
                  <Avatar className="h-14 w-14 border-4 border-card shadow-sm">
                    {(p as any).foto_url && <AvatarImage src={(p as any).foto_url} alt={p.nome} />}
                    <AvatarFallback className={`${palette} font-semibold`}>{p.nome.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <p className="mt-2 text-sm font-semibold text-foreground truncate" title={p.nome}>{p.nome}</p>
                  <p className="text-xs text-muted-foreground truncate">{p.raca || p.especie || "—"}</p>
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <Avatar className="h-5 w-5 border border-border shrink-0">
                      {(p.cliente as any)?.foto_url && <AvatarImage src={(p.cliente as any).foto_url} />}
                      <AvatarFallback className="bg-primary/10 text-primary text-[8px] font-semibold">
                        {((p.cliente as any)?.nome || "—").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate">{(p.cliente as any)?.nome || "Sem tutor"}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    {p.peso && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground tabular-nums">
                        {p.peso}kg
                      </span>
                    )}
                    {p.especie && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-accent/20 text-accent-foreground capitalize">
                        {p.especie}
                      </span>
                    )}
                  </div>
                  <div className="mt-3 pt-3 border-t border-border/60 flex justify-end gap-1">
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
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-card rounded-lg shadow-card overflow-x-auto">
        <div className="grid grid-cols-[minmax(160px,1fr)_minmax(120px,1fr)_minmax(160px,1fr)_80px_80px_80px] min-w-[760px] px-3 md:px-5 py-3 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wider">
          <span>Pet</span>
          <span>Raça</span>
          <span>Tutor</span>
          <span>Espécie</span>
          <span>Peso</span>
          <span></span>
        </div>
        <div className="divide-y divide-border">
          {paged.map(p => {
            const palette = colorFromString(p.nome || p.id);
            return (
              <div key={p.id} className="grid grid-cols-[minmax(160px,1fr)_minmax(120px,1fr)_minmax(160px,1fr)_80px_80px_80px] min-w-[760px] px-3 md:px-5 py-3 items-center hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8 border border-border shrink-0">
                    {(p as any).foto_url && <AvatarImage src={(p as any).foto_url} alt={p.nome} />}
                    <AvatarFallback className={`${palette} text-xs font-semibold`}>{p.nome.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium text-foreground">{p.nome}</span>
                </div>
                <span className="text-sm text-muted-foreground">{p.raca || "—"}</span>
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6 border border-border shrink-0">
                    {(p.cliente as any)?.foto_url && <AvatarImage src={(p.cliente as any).foto_url} alt={(p.cliente as any)?.nome} />}
                    <AvatarFallback className="bg-primary/10 text-primary text-[9px] font-semibold">{((p.cliente as any)?.nome || "—").slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-muted-foreground">{(p.cliente as any)?.nome || "—"}</span>
                </div>
                <span className="text-sm text-muted-foreground capitalize">{p.especie}</span>
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
            );
          })}
        </div>
      </div>
      )}

      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Mostrando {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, total)} de {total}
          </span>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="outline" disabled={currentPage === 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="h-7 px-2">
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="px-2 font-medium text-foreground">
              {currentPage} / {totalPages}
            </span>
            <Button size="sm" variant="outline" disabled={currentPage === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} className="h-7 px-2">
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      <EditarPetDialog
        pet={editingPet}
        open={!!editingPet}
        onOpenChange={(o) => { if (!o) setEditingPet(null); }}
        onSuccess={() => { setEditingPet(null); handleRefresh(); }}
      />
    </div>
  );
}