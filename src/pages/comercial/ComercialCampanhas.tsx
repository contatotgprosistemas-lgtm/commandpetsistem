import { ComercialLayout } from "@/components/comercial/ComercialLayout";
import { Card } from "@/components/ui/card";
import { Megaphone, Sparkles } from "lucide-react";

export default function ComercialCampanhas() {
  return (
    <ComercialLayout title="Campanhas" subtitle="Disparos em massa e templates">
      <Card className="flex flex-col items-center justify-center p-12 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl shadow-[var(--shadow-glow)]" style={{ background: "var(--gradient-primary)" }}>
          <Megaphone className="h-7 w-7 text-primary-foreground" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">Campanhas em construção</h3>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Em breve você poderá criar disparos segmentados, gerenciar templates aprovados pela Meta e acompanhar métricas de leitura e resposta em tempo real.
        </p>
        <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <Sparkles className="h-3 w-3" /> Próxima entrega
        </div>
      </Card>
    </ComercialLayout>
  );
}