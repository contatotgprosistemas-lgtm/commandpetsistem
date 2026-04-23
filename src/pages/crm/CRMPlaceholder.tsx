import { Card } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

export default function CRMPlaceholder({ title, description }: { title: string; description: string }) {
  return (
    <div className="h-full overflow-y-auto p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </header>
      <Card className="p-12 border-border/60 flex flex-col items-center justify-center text-center">
        <div className="h-14 w-14 rounded-2xl flex items-center justify-center mb-4"
             style={{ background: "var(--gradient-brand)" }}>
          <Sparkles className="h-6 w-6 text-white" />
        </div>
        <h2 className="text-lg font-semibold mb-1">Em construção</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          Este módulo será liberado nas próximas ondas. A fundação (banco de dados, design system,
          rotas e layout) já está pronta para receber a implementação.
        </p>
      </Card>
    </div>
  );
}