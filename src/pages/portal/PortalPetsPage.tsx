import { useEffect, useState } from "react";
import { PawPrint, Calendar, Weight, Scissors, Pencil } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { usePortalCliente } from "@/hooks/usePortalCliente";
import { formatDateBR, formatDateBRCustom } from "@/lib/utils";
import { EditarPetDialog } from "@/components/EditarPetDialog";

interface Pet {
  id: string;
  nome: string;
  especie: string;
  raca: string | null;
  sexo: string | null;
  peso: number | null;
  pelagem: string | null;
  foto_url: string | null;
  data_nascimento: string | null;
  vacinas: string | null;
  comportamento: string | null;
  restricoes_alimentares: string | null;
  medicacoes: string | null;
  v10_data: string | null;
  raiva_data: string | null;
  antiparasitario_data: string | null;
  gripe_data: string | null;
  giardia_data: string | null;
}

interface Agendamento {
  id: string;
  data_hora: string;
  tipo_servico: string;
  status: string;
}

export default function PortalPetsPage() {
  const { cliente, loading: clienteLoading } = usePortalCliente();
  const [pets, setPets] = useState<Pet[]>([]);
  const [agendamentos, setAgendamentos] = useState<Record<string, Agendamento[]>>({});
  const [loading, setLoading] = useState(true);
  const [editingPet, setEditingPet] = useState<any>(null);

  const fetchPets = async () => {
    if (!cliente) return;
    const { data: petsData } = await supabase
      .from("pets")
      .select("*")
      .eq("cliente_id", cliente.id);
    setPets((petsData as Pet[]) ?? []);

    const { data: agData } = await supabase
      .from("agendamentos")
      .select("id, data_hora, tipo_servico, status, pet_id")
      .eq("cliente_id", cliente.id)
      .gte("data_hora", new Date().toISOString())
      .order("data_hora", { ascending: true });

    const grouped: Record<string, Agendamento[]> = {};
    (agData ?? []).forEach((a: any) => {
      if (!grouped[a.pet_id]) grouped[a.pet_id] = [];
      grouped[a.pet_id].push(a);
    });
    setAgendamentos(grouped);
    setLoading(false);
  };

  useEffect(() => {
    if (!cliente) return;
    fetchPets();
  }, [cliente]);

  if (clienteLoading || loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        {[1, 2].map((i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
      </div>
    );
  }

  if (pets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <PawPrint className="h-12 w-12 text-muted-foreground/30 mb-4" />
        <p className="text-muted-foreground">Nenhum pet cadastrado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20 md:pb-0">
      <h1 className="text-xl font-bold text-foreground">Meus Pets</h1>
      {pets.map((pet) => (
        <Card key={pet.id}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {pet.foto_url ? (
                  <img src={pet.foto_url} alt={pet.nome} className="h-12 w-12 rounded-xl object-cover" />
                ) : (
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <PawPrint className="h-6 w-6 text-primary" />
                  </div>
                )}
                <div>
                  <CardTitle className="text-base">{pet.nome}</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {pet.especie} {pet.raca ? `• ${pet.raca}` : ""} {pet.sexo ? `• ${pet.sexo}` : ""}
                  </p>
                </div>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => setEditingPet(pet)}
                title="Editar pet"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              {pet.peso && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Weight className="h-3.5 w-3.5" /> {pet.peso} kg
                </div>
              )}
              {pet.pelagem && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Scissors className="h-3.5 w-3.5" /> {pet.pelagem}
                </div>
              )}
              {pet.data_nascimento && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" /> {formatDateBR(pet.data_nascimento)}
                </div>
              )}
            </div>

            {/* Vaccines */}
            <div className="space-y-1">
              <p className="text-xs font-medium text-foreground">Vacinas</p>
              <div className="flex flex-wrap gap-1">
                {pet.v10_data && <Badge variant="secondary" className="text-[10px]">V10: {formatDateBR(pet.v10_data)}</Badge>}
                {pet.raiva_data && <Badge variant="secondary" className="text-[10px]">Raiva: {formatDateBR(pet.raiva_data)}</Badge>}
                {pet.antiparasitario_data && <Badge variant="secondary" className="text-[10px]">Antiparasitário: {formatDateBR(pet.antiparasitario_data)}</Badge>}
                {pet.gripe_data && <Badge variant="secondary" className="text-[10px]">Gripe: {formatDateBR(pet.gripe_data)}</Badge>}
                {pet.giardia_data && <Badge variant="secondary" className="text-[10px]">Giárdia: {formatDateBR(pet.giardia_data)}</Badge>}
                {!pet.v10_data && !pet.raiva_data && !pet.antiparasitario_data && !pet.gripe_data && !pet.giardia_data && (
                  <span className="text-xs text-muted-foreground">Sem registros</span>
                )}
              </div>
            </div>

            {pet.restricoes_alimentares && (
              <div>
                <p className="text-xs font-medium text-foreground">Restrições Alimentares</p>
                <p className="text-xs text-muted-foreground">{pet.restricoes_alimentares}</p>
              </div>
            )}

            {pet.medicacoes && (
              <div>
                <p className="text-xs font-medium text-foreground">Medicações</p>
                <p className="text-xs text-muted-foreground">{pet.medicacoes}</p>
              </div>
            )}

            {pet.comportamento && (
              <div>
                <p className="text-xs font-medium text-foreground">Comportamento</p>
                <p className="text-xs text-muted-foreground">{pet.comportamento}</p>
              </div>
            )}

            {/* Upcoming appointments */}
            {agendamentos[pet.id]?.length > 0 && (
              <div>
                <p className="text-xs font-medium text-foreground mb-1">Próximos Agendamentos</p>
                {agendamentos[pet.id].slice(0, 3).map((ag) => (
                  <div key={ag.id} className="flex items-center justify-between text-xs py-1 border-b border-border last:border-0">
                    <span className="text-muted-foreground">{ag.tipo_servico}</span>
                    <span className="text-foreground">
                      {formatDateBRCustom(ag.data_hora, { day: "2-digit", month: "short" })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      <EditarPetDialog
        pet={editingPet}
        open={!!editingPet}
        onOpenChange={(open) => { if (!open) setEditingPet(null); }}
        onSuccess={() => { setEditingPet(null); fetchPets(); }}
      />
    </div>
  );
}
