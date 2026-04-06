import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Wrench } from "lucide-react";
import logoTgPro from "@/assets/logo-tgpro.jpeg";
import { useOperationalAuth } from "@/hooks/useOperationalAuth";

export default function OperacionalLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user, session, loading: authLoading } = useOperationalAuth();

  useEffect(() => {
    if (!authLoading && session && user) {
      navigate("/operacional", { replace: true });
    }
  }, [authLoading, session, user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast.error("Credenciais inválidas.");
      setLoading(false);
      return;
    }

    const { data: opUser } = await supabase
      .from("operational_users")
      .select("id")
      .eq("user_id", data.user.id)
      .eq("ativo", true)
      .maybeSingle();

    if (!opUser) {
      await supabase.auth.signOut();
      toast.error("Acesso não autorizado ao portal operacional.");
      setLoading(false);
      return;
    }

    toast.success("Login realizado!");
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm shadow-xl">
        <CardHeader className="text-center space-y-3 pb-2">
          <div className="flex justify-center">
            <img src={logoTgPro} alt="TG-PRO" className="h-16 w-16 rounded-xl object-cover" />
          </div>
          <div className="flex items-center justify-center gap-2">
            <Wrench className="h-5 w-5 text-primary" />
            <CardTitle className="text-xl">Portal Operacional</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">Acesso para equipe operacional</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="h-12 text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="h-12 text-base"
              />
            </div>
            <Button type="submit" className="w-full h-12 text-base" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Entrar
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
