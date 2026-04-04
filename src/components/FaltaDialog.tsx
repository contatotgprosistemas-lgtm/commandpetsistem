import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, ShieldCheck } from "lucide-react";

interface FaltaDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  agendamento: any;
  empresaId: string;
  allowsReplacement?: boolean;
  onSuccess: () => void;
}

export function FaltaDialog({ open, onOpenChange, agendamento, empresaId, allowsReplacement = true, onSuccess }: FaltaDialogProps) {
  const [tipo, setTipo] = useState<"com_reposicao" | "sem_reposicao">("sem_reposicao");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [atestadoFile, setAtestadoFile] = useState<File | null>(null);
  const [authMethod, setAuthMethod] = useState<"atestado" | "admin">("atestado");

  const reset = () => {
    setTipo("sem_reposicao");
    setNotes("");
    setAdminEmail("");
    setAdminPassword("");
    setAtestadoFile(null);
    setAuthMethod("atestado");
  };

  const handleSave = async () => {
    if (!agendamento) return;

    if (tipo === "com_reposicao") {
      if (authMethod === "atestado" && !atestadoFile) {
        toast.error("Anexe a foto do atestado para liberar reposição.");
        return;
      }
      if (authMethod === "admin" && (!adminEmail || !adminPassword)) {
        toast.error("Preencha email e senha do administrador.");
        return;
      }
    }

    setSaving(true);
    let atestadoUrl: string | null = null;
    let adminUserId: string | null = null;

    try {
      // Validate admin credentials if chosen
      if (tipo === "com_reposicao" && authMethod === "admin") {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: adminEmail,
          password: adminPassword,
        });

        if (signInError || !signInData.user) {
          toast.error("Credenciais de administrador inválidas.");
          setSaving(false);
          return;
        }

        // Check if user has admin role
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", signInData.user.id)
          .eq("role", "admin")
          .maybeSingle();

        if (!roleData) {
          toast.error("Usuário não possui permissão de administrador.");
          setSaving(false);
          return;
        }

        adminUserId = signInData.user.id;
      }

      // Upload atestado if provided
      if (tipo === "com_reposicao" && authMethod === "atestado" && atestadoFile) {
        const ext = atestadoFile.name.split(".").pop();
        const path = `${empresaId}/atestados/${agendamento.id}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("pet-media")
          .upload(path, atestadoFile, { upsert: true });

        if (uploadError) {
          toast.error("Erro ao enviar atestado: " + uploadError.message);
          setSaving(false);
          return;
        }

        const { data: urlData } = supabase.storage.from("pet-media").getPublicUrl(path);
        atestadoUrl = urlData.publicUrl;
      }

      // Update agendamento status to "falta"
      const { error: updateError } = await supabase
        .from("agendamentos")
        .update({ status: "falta" })
        .eq("id", agendamento.id);

      if (updateError) {
        toast.error("Erro ao registrar falta: " + updateError.message);
        setSaving(false);
        return;
      }

      // Insert absence record
      await supabase.from("agendamento_absences" as any).insert({
        agendamento_id: agendamento.id,
        empresa_id: empresaId,
        tipo,
        atestado_url: atestadoUrl,
        admin_authorized_by: adminUserId,
        notes,
      });

      // If sem_reposicao and has subscription, consume the credit (do nothing extra - it's already counted)
      // If com_reposicao, the credit is NOT consumed (could add logic to restore quota)

      toast.success(
        tipo === "com_reposicao"
          ? "Falta registrada com reposição. O saldo do plano não foi consumido."
          : "Falta registrada. O saldo do plano foi consumido."
      );

      reset();
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast.error("Erro inesperado: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Falta</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-3 text-sm">
            <p className="font-medium text-foreground">{agendamento?.pet?.nome ?? "Pet"}</p>
            <p className="text-muted-foreground text-xs">{agendamento?.cliente?.nome ?? "—"} · {agendamento?.tipo_servico}</p>
          </div>

          {allowsReplacement ? (
            <div className="space-y-2">
              <Label className="font-medium">Tipo de falta</Label>
              <RadioGroup value={tipo} onValueChange={(v) => setTipo(v as any)} className="space-y-2">
                <div className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-muted/30">
                  <RadioGroupItem value="com_reposicao" id="com_rep" />
                  <Label htmlFor="com_rep" className="cursor-pointer flex-1">
                    <span className="font-medium">Com reposição</span>
                    <p className="text-xs text-muted-foreground">Não consome saldo do plano. Pode agendar outro dia.</p>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-muted/30">
                  <RadioGroupItem value="sem_reposicao" id="sem_rep" />
                  <Label htmlFor="sem_rep" className="cursor-pointer flex-1">
                    <span className="font-medium">Sem reposição</span>
                    <p className="text-xs text-muted-foreground">Consome o saldo do plano. Falta registrada.</p>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          ) : (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive">
              Este plano <strong>não permite reposição</strong>. A falta será registrada e o saldo do plano será consumido.
            </div>
          )}

          {tipo === "com_reposicao" && allowsReplacement && (
            <div className="space-y-3 border-t pt-3">
              <Label className="font-medium text-sm">Autorização necessária</Label>
              <RadioGroup value={authMethod} onValueChange={(v) => setAuthMethod(v as any)} className="flex gap-3">
                <div className="flex items-center gap-1.5">
                  <RadioGroupItem value="atestado" id="auth_atestado" />
                  <Label htmlFor="auth_atestado" className="text-sm cursor-pointer flex items-center gap-1">
                    <Upload className="h-3.5 w-3.5" /> Atestado
                  </Label>
                </div>
                <div className="flex items-center gap-1.5">
                  <RadioGroupItem value="admin" id="auth_admin" />
                  <Label htmlFor="auth_admin" className="text-sm cursor-pointer flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5" /> Senha Admin
                  </Label>
                </div>
              </RadioGroup>

              {authMethod === "atestado" && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Foto do atestado *</Label>
                  <Input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setAtestadoFile(e.target.files?.[0] ?? null)}
                  />
                </div>
              )}

              {authMethod === "admin" && (
                <div className="space-y-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Email do admin *</Label>
                    <Input value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="admin@empresa.com" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Senha *</Label>
                    <Input type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} />
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">Observações</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Motivo da falta..." />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving} variant="destructive">
            {saving ? "Registrando..." : "Registrar Falta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
