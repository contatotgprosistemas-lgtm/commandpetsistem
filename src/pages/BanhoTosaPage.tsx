import { Scissors } from "lucide-react";

export default function BanhoTosaPage() {
  return (
    <div className="p-6 space-y-6 max-w-[1400px]">
      <div className="flex items-center gap-3">
        <Scissors className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-lg font-semibold text-foreground">Banho e Tosa</h1>
          <p className="text-sm text-muted-foreground">Gerencie os agendamentos de banho e tosa</p>
        </div>
      </div>
      <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
        Em breve — módulo de Banho e Tosa
      </div>
    </div>
  );
}
