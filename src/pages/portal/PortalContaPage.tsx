import { useState } from "react";
import { User, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { usePortalCliente } from "@/hooks/usePortalCliente";
import { toast } from "sonner";

export default function PortalContaPage() {
  const { cliente, loading: clienteLoading } = usePortalCliente();
  const [editing, setEditing] = useState(false);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [endereco, setEndereco] = useState("");
  const [saving, setSaving] = useState(false);

  const [changingPassword, setChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const startEdit = () => {
    if (!cliente) return;
    setNome(cliente.nome);
    setTelefone(cliente.telefone ?? "");
    setEndereco(cliente.endereco ?? "");
    setEditing(true);
  };

  const handleSave = async () => {
    if (!cliente) return;
    setSaving(true);
    const { error } = await supabase.from("clientes").update({
      nome,
      telefone: telefone || null,
      endereco: endereco || null,
    }).eq("id", cliente.id);
    if (error) { toast.error("Erro ao salvar."); }
    else { toast.success("Dados atualizados!"); setEditing(false); window.location.reload(); }
    setSaving(false);
  };

  const handlePasswordChange = async () => {
    if (newPassword.length < 6) { toast.error("Senha deve ter pelo menos 6 caracteres."); return; }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) { toast.error("Erro: " + error.message); }
    else { toast.success("Senha atualizada!"); setChangingPassword(false); setNewPassword(""); }
    setSavingPassword(false);
  };

  if (clienteLoading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-32" /><Skeleton className="h-64 rounded-xl" /></div>;
  }

  if (!cliente) {
    return <p className="text-muted-foreground text-center py-20">Dados não encontrados.</p>;
  }

  return (
    <div className="space-y-4 pb-20 md:pb-0 max-w-lg">
      <h1 className="text-xl font-bold text-foreground">Minha Conta</h1>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4" /> Dados Pessoais</CardTitle>
            {!editing && <Button variant="outline" size="sm" onClick={startEdit}>Editar</Button>}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {editing ? (
            <>
              <div className="space-y-1">
                <Label>Nome</Label>
                <Input value={nome} onChange={(e) => setNome(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>E-mail</Label>
                <Input value={cliente.email ?? ""} disabled className="opacity-60" />
              </div>
              <div className="space-y-1">
                <Label>CPF</Label>
                <Input value={cliente.cpf ?? ""} disabled className="opacity-60" />
              </div>
              <div className="space-y-1">
                <Label>Endereço</Label>
                <Input value={endereco} onChange={(e) => setEndereco(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
                <Button variant="outline" onClick={() => setEditing(false)}>Cancelar</Button>
              </div>
            </>
          ) : (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Nome</span><span className="text-foreground">{cliente.nome}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">E-mail</span><span className="text-foreground">{cliente.email ?? "—"}</span></div>
              
              <div className="flex justify-between"><span className="text-muted-foreground">CPF</span><span className="text-foreground">{cliente.cpf ?? "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">WhatsApp</span><span className="text-foreground">{cliente.whatsapp ?? "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Endereço</span><span className="text-foreground">{cliente.endereco ?? "—"}</span></div>
              {cliente.data_nascimento && (
                <div className="flex justify-between"><span className="text-muted-foreground">Nascimento</span><span className="text-foreground">{(() => { const [y,m,d] = cliente.data_nascimento!.split("-").map(Number); return new Date(y, m-1, d).toLocaleDateString("pt-BR"); })()}</span></div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><Lock className="h-4 w-4" /> Segurança</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {changingPassword ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Nova Senha</Label>
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
              </div>
              <div className="flex gap-2">
                <Button onClick={handlePasswordChange} disabled={savingPassword}>{savingPassword ? "Salvando..." : "Atualizar Senha"}</Button>
                <Button variant="outline" onClick={() => setChangingPassword(false)}>Cancelar</Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setChangingPassword(true)}>Alterar Senha</Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
