import { Gift } from "lucide-react";

export default function PlanosPacotesPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Gift className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Planos e Pacotes</h1>
      </div>
      <div className="bg-card rounded-lg shadow-card p-8 text-center">
        <p className="text-muted-foreground">Em breve: cadastro de planos e pacotes de serviços.</p>
      </div>
    </div>
  );
}
