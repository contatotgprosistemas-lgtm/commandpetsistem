import { ComercialLayout } from "@/components/comercial/ComercialLayout";
import { Card } from "@/components/ui/card";
import { Bot, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function ComercialAutomacao() {
  return (
    <ComercialLayout title="Automação & Chatbot" subtitle="Construtor visual de fluxos">
      <Card className="flex flex-col items-center justify-center p-12 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl shadow-[var(--shadow-glow)]" style={{ background: "var(--gradient-primary)" }}>
          <Bot className="h-7 w-7 text-primary-foreground" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">Use o Chatbot do sistema</h3>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          O construtor visual já existente do PetControl está disponível em <strong>Comercial → Chatbot</strong>. Em breve, fluxos vinculados a este novo módulo também serão suportados aqui.
        </p>
        <Button asChild className="mt-5 gap-1.5">
          <Link to="/chatbot"><Sparkles className="h-4 w-4" /> Abrir Chatbot</Link>
        </Button>
      </Card>
    </ComercialLayout>
  );
}