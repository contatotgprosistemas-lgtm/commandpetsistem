import { PawPrint, Search, Filter } from "lucide-react";
import { NovoPetDialog } from "@/components/NovoPetDialog";

export default function PetsPage() {
  return (
    <div className="p-6 space-y-6 max-w-[1400px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Pets</h1>
          <p className="text-sm text-muted-foreground">0 pets cadastrados</p>
        </div>
        <NovoPetDialog />
      </div>

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

      <div className="bg-card rounded-lg shadow-card">
        <div className="grid grid-cols-[1fr_1fr_1fr_80px_80px_100px] px-5 py-3 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wider">
          <span>Pet</span>
          <span>Raça</span>
          <span>Tutor</span>
          <span>Peso</span>
          <span>Idade</span>
          <span>Status</span>
        </div>
        <div className="flex flex-col items-center justify-center py-12">
          <PawPrint className="h-10 w-10 text-muted-foreground/30 mb-3" strokeWidth={1.5} />
          <p className="text-sm text-muted-foreground">Nenhum pet cadastrado</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Cadastre seus pets para começar</p>
        </div>
      </div>
    </div>
  );
}
