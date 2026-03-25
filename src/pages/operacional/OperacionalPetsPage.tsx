import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOperationalAuth } from "@/hooks/useOperationalAuth";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { NovoPetDialog } from "@/components/NovoPetDialog";
import { EditarPetDialog } from "@/components/EditarPetDialog";
import { Search } from "lucide-react";

export default function OperacionalPetsPage() {
  const { user } = useOperationalAuth();
  const [pets, setPets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingPet, setEditingPet] = useState<any>(null);

  const fetchPets = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("pets")
      .select("*, cliente:clientes(id, nome)")
      .eq("empresa_id", user.empresa_id)
      .order("nome");
    setPets(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchPets(); }, [user]);

  const filtered = pets.filter(p =>
    p.nome.toLowerCase().includes(search.toLowerCase()) ||
    (p.cliente?.nome ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-24 md:pb-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Pets</h1>
        <NovoPetDialog onSuccess={fetchPets} />
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="Buscar pet ou tutor..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 h-12 text-base rounded-xl"
        />
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">Nenhum pet encontrado.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map(p => (
            <Card key={p.id} className="rounded-xl cursor-pointer hover:shadow-md transition-shadow" onClick={() => setEditingPet(p)}>
              <CardContent className="p-4 flex items-center gap-4">
                <Avatar className="h-12 w-12">
                  {p.foto_url && <AvatarImage src={p.foto_url} />}
                  <AvatarFallback className="bg-accent text-accent-foreground font-bold">
                    {p.nome.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-base truncate">{p.nome}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">{p.cliente?.nome ?? "—"}</span>
                    {p.raca && <Badge variant="outline" className="text-[10px]">{p.raca}</Badge>}
                  </div>
                </div>
                <Badge variant="secondary" className="text-[10px]">{p.especie}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {editingPet && (
        <EditarPetDialog
          pet={editingPet}
          open={!!editingPet}
          onOpenChange={(o) => { if (!o) setEditingPet(null); }}
          onSuccess={() => { setEditingPet(null); fetchPets(); }}
        />
      )}
    </div>
  );
}
