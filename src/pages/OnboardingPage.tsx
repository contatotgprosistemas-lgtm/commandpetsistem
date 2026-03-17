import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function OnboardingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [nomeEmpresa, setNomeEmpresa] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [telefone, setTelefone] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    // 1. Create empresa
    const { data: empresa, error: empError } = await supabase
      .from("empresas")
      .insert({ nome_empresa: nomeEmpresa, cnpj: cnpj || null, telefone: telefone || null, email: user.email })
      .select("id")
      .single();

    if (empError || !empresa) {
      toast.error("Erro ao criar empresa: " + empError?.message);
      setLoading(false);
      return;
    }

    // 2. Link profile to empresa
    const { error: profError } = await supabase
      .from("profiles")
      .update({ empresa_id: empresa.id, cargo: "Proprietário" })
      .eq("user_id", user.id);

    if (profError) {
      toast.error("Erro ao vincular perfil: " + profError.message);
      setLoading(false);
      return;
    }

    // 3. Assign admin role
    const { error: roleError } = await supabase
      .from("user_roles")
      .insert({ user_id: user.id, role: "admin" as const });

    if (roleError && !roleError.message.includes("duplicate")) {
      toast.error("Erro ao definir permissão: " + roleError.message);
    }

    toast.success("Empresa criada com sucesso!");
    // Force reload to update context
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto h-12 w-12 rounded-xl bg-primary flex items-center justify-center">
            <Building2 className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Configure sua empresa</CardTitle>
          <CardDescription>Preencha os dados para começar a usar o PetCommand</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nomeEmpresa">Nome da empresa *</Label>
              <Input id="nomeEmpresa" value={nomeEmpresa} onChange={e => setNomeEmpresa(e.target.value)} required placeholder="Pet Shop Exemplo" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input id="cnpj" value={cnpj} onChange={e => setCnpj(e.target.value)} placeholder="00.000.000/0001-00" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input id="telefone" value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="(11) 99999-9999" />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Começar a usar
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
