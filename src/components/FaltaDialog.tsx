import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, ShieldCheck, CalendarSync, AlertTriangle } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";

interface FaltaDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  agendamento: any;
  empresaId: string;
  allowsReplacement?: boolean;
  onSuccess: () => void;
}

const MAX_TROCAS_MES = 2;

export function FaltaDialog({ open, onOpenChange, agendamento, empresaId, allowsReplacement = true, onSuccess }: FaltaDialogProps) {
  const [tipo, setTipo] = useState<"com_reposicao" | "sem_reposicao" | "troca">("sem_reposicao");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [atestadoFile, setAtestadoFile] = useState<File | null>(null);
  const [authMethod, setAuthMethod] = useState<"atestado" | "admin">("atestado");
  const [trocaData, setTrocaData] = useState("");
  const [trocasUsadas, setTrocasUsadas] = useState(0);
  const [loadingTrocas, setLoadingTrocas] = useState(false);

  const reset = () => {
    setTipo("sem_reposicao");
    setNotes("");
    setAdminEmail("");
    setAdminPassword("");
    setAtestadoFile(null);
    setAuthMethod("atestado");
    setTrocaData("");
  };

  // Fetch monthly swap count for this client
  useEffect(() => {
    if (!open || !agendamento?.pet_id || !empresaId) return;
    setLoadingTrocas(true);
    const now = new Date();
    const monthStart = format(startOfMonth(now), "yyyy-MM-dd");
    const monthEnd = format(endOfMonth(now), "yyyy-MM-dd");

    // Get all swap absences this month
    supabase
      .from("agendamento_absences" as any)
      .select("id, agendamento_id")
      .eq("empresa_id", empresaId)
      .eq("tipo", "troca")
      .gte("created_at", monthStart)
      .lte("created_at", monthEnd + "T23:59:59")
      .then(async ({ data: absences }) => {
        if (!absences || absences.length === 0) {
          setTrocasUsadas(0);
          setLoadingTrocas(false);
          return;
        }
        // Filter by checking which agendamentos belong to this pet
        const agIds = absences.map((a: any) => a.agendamento_id);
        const { data: ags } = await supabase
          .from("agendamentos")
          .select("id")
          .in("id", agIds)
          .eq("pet_id", agendamento.pet_id);
        setTrocasUsadas(ags?.length ?? 0);
        setLoadingTrocas(false);
      });
  }, [open, agendamento?.pet_id, empresaId]);

  const trocasRestantes = MAX_TROCAS_MES - trocasUsadas;
  const podeTrocar = trocasRestantes > 0;

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

    if (tipo === "troca") {
      if (!trocaData) {
        toast.error("Selecione a nova data para a troca.");
        return;
      }
      if (!podeTrocar) {
        toast.error("Limite de trocas no mês atingido.");
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

      // Update agendamento status
      const newStatus = tipo === "troca" ? "troca" : "falta";
      const { error: updateError } = await supabase
        .from("agendamentos")
        .update({ status: newStatus })
        .eq("id", agendamento.id);

      if (updateError) {
        toast.error("Erro ao registrar: " + updateError.message);
        setSaving(false);
        return;
      }

      // Insert absence record
      const absenceData: any = {
        agendamento_id: agendamento.id,
        empresa_id: empresaId,
        tipo: tipo === "troca" ? "troca" : tipo,
        atestado_url: atestadoUrl,
        admin_authorized_by: adminUserId,
        notes: tipo === "troca" ? (notes || `Troca de dia para ${trocaData}`) : notes,
        troca_data: tipo === "troca" ? trocaData : null,
      };

      await supabase.from("agendamento_absences" as any).insert(absenceData);

      // If it's a swap, create the new appointment on the new date
      if (tipo === "troca") {
        // Extract the time from the original appointment
        const originalDateTime = new Date(agendamento.data_hora);
        const hours = originalDateTime.getHours().toString().padStart(2, "0");
        const minutes = originalDateTime.getMinutes().toString().padStart(2, "0");
        const newDateTime = `${trocaData}T${hours}:${minutes}:00`;

        const { error: insertError } = await supabase.from("agendamentos").insert({
          empresa_id: empresaId,
          pet_id: agendamento.pet_id,
          cliente_id: agendamento.cliente_id,
          tipo_servico: agendamento.tipo_servico,
          data_hora: newDateTime,
          duracao_min: agendamento.duracao_min,
          valor: agendamento.valor,
          status: "agendado",
          notas: `Troca de dia (original: ${format(originalDateTime, "dd/MM/yyyy")})`,
          subscription_id: agendamento.subscription_id,
          atendente_id: agendamento.atendente_id,
          hora_prevista_buscar: agendamento.hora_prevista_buscar,
          hora_prevista_levar: agendamento.hora_prevista_levar,
        });

        if (insertError) {
          console.error("Erro ao criar agendamento de troca:", insertError);
          toast.error("Falta registrada, mas houve erro ao criar o novo agendamento.");
          setSaving(false);
          reset();
          onOpenChange(false);
          onSuccess();
          return;
        }
      }

      if (tipo === "troca") {
        toast.success(`Troca registrada! Novo agendamento criado para ${trocaData}. (${trocasRestantes - 1} troca(s) restante(s) no mês)`);
      } else {
        toast.success(
          tipo === "com_reposicao"
            ? "Falta registrada com reposição. O saldo do plano não foi consumido."
            : "Falta registrada. O saldo do plano foi consumido."
        );
      }

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
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Falta / Troca</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-3 text-sm">
            <p className="font-medium text-foreground">{agendamento?.pet?.nome ?? "Pet"}</p>
            <p className="text-muted-foreground text-xs">{agendamento?.cliente?.nome ?? "—"} · {agendamento?.tipo_servico}</p>
          </div>

          <div className="space-y-2">
            <Label className="font-medium">Tipo</Label>
            <RadioGroup value={tipo} onValueChange={(v) => setTipo(v as any)} className="space-y-2">
              {/* Troca de dia */}
              <div className={`flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-muted/30 ${!podeTrocar ? "opacity-50" : ""}`}>
                <RadioGroupItem value="troca" id="troca" disabled={!podeTrocar} />
                <Label htmlFor="troca" className="cursor-pointer flex-1">
                  <span className="font-medium flex items-center gap-1.5">
                    <CalendarSync className="h-4 w-4 text-primary" />
                    Troca de dia
                  </span>
                  <p className="text-xs text-muted-foreground">
                    Reagendar para outro dia. {loadingTrocas ? "Carregando..." : `${trocasRestantes} troca(s) restante(s) no mês.`}
                  </p>
                </Label>
              </div>

              {allowsReplacement && (
                <div className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-muted/30">
                  <RadioGroupItem value="com_reposicao" id="com_rep" />
                  <Label htmlFor="com_rep" className="cursor-pointer flex-1">
                    <span className="font-medium">Com reposição</span>
                    <p className="text-xs text-muted-foreground">Não consome saldo do plano. Pode agendar outro dia.</p>
                  </Label>
                </div>
              )}

              <div className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-muted/30">
                <RadioGroupItem value="sem_reposicao" id="sem_rep" />
                <Label htmlFor="sem_rep" className="cursor-pointer flex-1">
                  <span className="font-medium">Sem reposição</span>
                  <p className="text-xs text-muted-foreground">Consome o saldo do plano. Falta registrada.</p>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Troca: date picker */}
          {tipo === "troca" && (
            <div className="space-y-2 border-t pt-3">
              {!podeTrocar && (
                <div className="flex items-center gap-2 p-2 rounded-md bg-destructive/10 text-destructive text-xs">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  Limite de {MAX_TROCAS_MES} trocas/mês atingido para este cliente.
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Nova data *</Label>
                <Input
                  type="date"
                  value={trocaData}
                  onChange={(e) => setTrocaData(e.target.value)}
                  min={format(new Date(), "yyyy-MM-dd")}
                />
              </div>
            </div>
          )}

          {/* Reposição: auth section */}
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

          {!allowsReplacement && tipo !== "troca" && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive">
              Este plano <strong>não permite reposição</strong>. A falta será registrada e o saldo do plano será consumido.
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">Observações</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Motivo da falta..." />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || (tipo === "troca" && !podeTrocar)} variant={tipo === "troca" ? "default" : "destructive"}>
            {saving ? "Registrando..." : tipo === "troca" ? "Confirmar Troca" : "Registrar Falta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
