import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Wrench, Eye, EyeOff } from "lucide-react";
import logo from "@/assets/logo.png";
import { useOperationalAuth } from "@/hooks/useOperationalAuth";

export default function OperacionalLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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

    // Check operational_users first
    const { data: opUser } = await supabase
      .from("operational_users")
      .select("id")
      .eq("user_id", data.user.id)
      .eq("ativo", true)
      .maybeSingle();

    if (opUser) {
      toast.success("Login realizado!");
      setLoading(false);
      navigate("/operacional", { replace: true });
      return;
    }

    // Fallback: allow admin/gerente with acesso_operacional
    const { data: profile } = await supabase
      .from("profiles")
      .select("cargo, acesso_operacional")
      .eq("user_id", data.user.id)
      .maybeSingle();

    const adminCargos = ["admin", "gerente"];
    if (profile && adminCargos.includes(profile.cargo ?? "") && profile.acesso_operacional !== false) {
      toast.success("Login realizado!");
      setLoading(false);
      navigate("/operacional", { replace: true });
      return;
    }

    await supabase.auth.signOut();
    toast.error("Acesso não autorizado ao portal operacional.");

    toast.success("Login realizado!");
    setLoading(false);
    navigate("/operacional", { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm shadow-xl">
        <CardHeader className="text-center space-y-3 pb-2">
          <div className="flex justify-center">
            <img src={logo} alt="PetControl System" className="h-20 w-20 object-contain" />
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
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="h-12 text-base pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full h-12 text-base" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Entrar
            </Button>
            <div className="text-center">
              <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                Esqueci minha senha
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
