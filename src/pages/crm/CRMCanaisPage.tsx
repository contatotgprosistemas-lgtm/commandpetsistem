import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentEmpresa } from "@/lib/useCurrentEmpresa";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Phone, Plus, QrCode, Trash2, Power, RefreshCcw, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function CRMCanaisPage() {
  const qc = useQueryClient();
  const { data: empresaId } = useCurrentEmpresa();
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [setor, setSetor] = useState("");
  const [qrDialog, setQrDialog] = useState<{ canalId: string; qr: string | null; status: string } | null>(null);

  const { data: canais = [], isLoading } = useQuery({
    queryKey: ["crm-canais", empresaId],
    enabled: !!empresaId,
    queryFn: async () => {
      const { data, error } = await supabase.from("crm_canais")
        .select("*").eq("empresa_id", empresaId!).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("evolution-instance", {
        body: { action: "create", nome, setor: setor || null },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data;
    },
    onSuccess: (data: any) => {
      toast.success("Canal criado. Escaneie o QR Code.");
      setOpen(false);
      setNome(""); setSetor("");
      qc.invalidateQueries({ queryKey: ["crm-canais"] });
      setQrDialog({ canalId: data.canal.id, qr: data.qr, status: "conectando" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const refreshQr = async (canalId: string) => {
    const { data, error } = await supabase.functions.invoke("evolution-instance", {
      body: { action: "qr", canal_id: canalId },
    });
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error ?? error?.message ?? "Erro");
      return;
    }
    setQrDialog({ canalId, qr: (data as any).qr, status: (data as any).status });
    qc.invalidateQueries({ queryKey: ["crm-canais"] });
    if ((data as any).status === "conectado") toast.success("Conectado!");
  };

  const disconnect = useMutation({
    mutationFn: async (canalId: string) => {
      const { error } = await supabase.functions.invoke("evolution-instance", { body: { action: "disconnect", canal_id: canalId } });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Desconectado"); qc.invalidateQueries({ queryKey: ["crm-canais"] }); },
  });

  const remove = useMutation({
    mutationFn: async (canalId: string) => {
      const { error } = await supabase.functions.invoke("evolution-instance", { body: { action: "delete", canal_id: canalId } });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Canal removido"); qc.invalidateQueries({ queryKey: ["crm-canais"] }); },
  });

  return (
    <div className="h-full overflow-y-auto p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Canais</h1>
            <p className="text-sm text-muted-foreground mt-1">Conecte seus números de WhatsApp via QR Code.</p>
          </div>
          <Button onClick={() => setOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Novo canal
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : canais.length === 0 ? (
          <div className="border border-dashed rounded-xl p-12 text-center">
            <Phone className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-4">Nenhum canal conectado.</p>
            <Button onClick={() => setOpen(true)} variant="outline">Conectar primeiro WhatsApp</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {canais.map((c: any) => (
              <div key={c.id} className="rounded-xl border bg-card p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Phone className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-semibold text-sm">{c.nome}</div>
                      <div className="text-xs text-muted-foreground">{c.numero_telefone ?? "—"}</div>
                    </div>
                  </div>
                  <Badge variant={c.status === "conectado" ? "default" : "secondary"}
                    className={c.status === "conectado" ? "bg-success text-success-foreground" : ""}>
                    {c.status}
                  </Badge>
                </div>
                {c.setor && <div className="text-xs text-muted-foreground">Setor: {c.setor}</div>}
                <div className="flex gap-2 mt-auto pt-2">
                  <Button size="sm" variant="outline" className="flex-1 gap-1.5" onClick={() => refreshQr(c.id)}>
                    {c.status === "conectado" ? <RefreshCcw className="h-3.5 w-3.5" /> : <QrCode className="h-3.5 w-3.5" />}
                    {c.status === "conectado" ? "Atualizar" : "QR Code"}
                  </Button>
                  {c.status === "conectado" && (
                    <Button size="sm" variant="outline" onClick={() => disconnect.mutate(c.id)}>
                      <Power className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => { if (confirm("Remover canal?")) remove.mutate(c.id); }}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo canal WhatsApp</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Nome do canal *</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Atendimento Geral" />
            </div>
            <div className="space-y-1.5">
              <Label>Setor (opcional)</Label>
              <Input value={setor} onChange={(e) => setSetor(e.target.value)} placeholder="Ex: Vendas, Suporte" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => create.mutate()} disabled={!nome || create.isPending}>
              {create.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Criar e gerar QR
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!qrDialog} onOpenChange={(o) => !o && setQrDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{qrDialog?.status === "conectado" ? "Conectado ✓" : "Escaneie o QR Code"}</DialogTitle></DialogHeader>
          <div className="flex flex-col items-center gap-3 py-2">
            {qrDialog?.status === "conectado" ? (
              <div className="text-center py-6">
                <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-3">
                  <Power className="h-7 w-7 text-success" />
                </div>
                <p className="text-sm">WhatsApp conectado com sucesso.</p>
              </div>
            ) : qrDialog?.qr ? (
              <>
                <img
                  src={qrDialog.qr.startsWith("data:") ? qrDialog.qr : `data:image/png;base64,${qrDialog.qr}`}
                  alt="QR Code"
                  className="w-64 h-64 border rounded-lg"
                />
                <p className="text-xs text-muted-foreground text-center">
                  Abra o WhatsApp → Menu → Aparelhos conectados → Conectar aparelho
                </p>
                <Button variant="outline" size="sm" className="gap-2" onClick={() => qrDialog && refreshQr(qrDialog.canalId)}>
                  <RefreshCcw className="h-3.5 w-3.5" /> Já escaneei / Atualizar status
                </Button>
              </>
            ) : (
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}