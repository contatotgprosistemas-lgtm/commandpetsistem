import { StatusTag } from "@/components/StatusTag";
import { PawPrint, Search, Filter } from "lucide-react";
import { NovoPetDialog } from "@/components/NovoPetDialog";

const pets = [
  { name: "Rex", breed: "Golden Retriever", tutor: "João Santos", weight: "32kg", age: "4 anos", status: "in-bath" as const },
  { name: "Luna", breed: "Shih Tzu", tutor: "Ana Paula", weight: "5kg", age: "3 anos", status: "ready" as const },
  { name: "Bob", breed: "Labrador", tutor: "Carlos Lima", weight: "28kg", age: "6 anos", status: "hosted" as const },
  { name: "Mel", breed: "Poodle", tutor: "Fernanda Costa", weight: "8kg", age: "2 anos", status: "waiting" as const },
  { name: "Thor", breed: "Bulldog Francês", tutor: "Pedro Alves", weight: "12kg", age: "5 anos", status: "in-bath" as const },
  { name: "Nina", breed: "Yorkshire", tutor: "Juliana Reis", weight: "3kg", age: "1 ano", status: "daycare" as const },
  { name: "Max", breed: "Pastor Alemão", tutor: "Roberto Dias", weight: "35kg", age: "7 anos", status: "ready" as const },
  { name: "Bella", breed: "Maltês", tutor: "Patricia Souza", weight: "4kg", age: "2 anos", status: "hosted" as const },
];

export default function PetsPage() {
  return (
    <div className="p-6 space-y-6 max-w-[1400px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Pets</h1>
          <p className="text-sm text-muted-foreground">{pets.length} pets cadastrados</p>
        </div>
        <NovoPetDialog />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
          <input
            placeholder="Buscar pets..."
            className="w-full h-9 pl-9 pr-3 text-sm bg-card rounded-md shadow-card outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
          />
        </div>
        <button className="h-9 px-3 rounded-md bg-card shadow-card text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2">
          <Filter className="h-4 w-4" strokeWidth={1.5} />
          Filtrar
        </button>
      </div>

      {/* Pet List */}
      <div className="bg-card rounded-lg shadow-card">
        <div className="grid grid-cols-[1fr_1fr_1fr_80px_80px_100px] px-5 py-3 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wider">
          <span>Pet</span>
          <span>Raça</span>
          <span>Tutor</span>
          <span>Peso</span>
          <span>Idade</span>
          <span>Status</span>
        </div>
        <div className="divide-y divide-border">
          {pets.map((pet, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_1fr_80px_80px_100px] px-5 py-3 items-center hover:bg-muted/50 transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <PawPrint className="h-3.5 w-3.5 text-primary" strokeWidth={1.5} />
                </div>
                <span className="text-sm font-medium text-foreground">{pet.name}</span>
              </div>
              <span className="text-sm text-muted-foreground">{pet.breed}</span>
              <span className="text-sm text-muted-foreground">{pet.tutor}</span>
              <span className="font-mono-tabular text-sm text-muted-foreground">{pet.weight}</span>
              <span className="text-sm text-muted-foreground">{pet.age}</span>
              <StatusTag status={pet.status} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
