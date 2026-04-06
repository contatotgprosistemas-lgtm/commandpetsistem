import { ListOrdered } from "lucide-react";

export default function EsteiraBanhoPage() {
  return (
    <div className="p-6 space-y-6 max-w-[1400px]">
      <div className="flex items-center gap-3">
        <ListOrdered className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-lg font-semibold text-foreground">Esteira de Banho</h1>
          <p className="text-sm text-muted-foreground">Acompanhe a fila e o fluxo de banhos</p>
        </div>
      </div>
      <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
        Em breve — módulo de Esteira de Banho
      </div>
    </div>
  );
}
