import { useEffect, useState } from "react";
import { ClipboardList, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { usePortalCliente } from "@/hooks/usePortalCliente";
import { toast } from "sonner";

interface Solicitacao {
  id: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    aberto: "bg-primary/10 text-primary",
    em_analise: "bg-amber-500/10 text-amber-600",
    em_andamento: "bg-blue-500/10 text-blue-600",
    aguardando_cliente: "bg-purple-500/10 text-purple-600",
    concluido: "bg-emerald-500/10 text-emerald-600",
    cancelado: "bg-muted text-muted-foreground",
  };
  const labels: Record<string, string> = {
    aberto: "Aberto",
    em_analise: "Em Análise",
    em_andamento: "Em Andamento",
    aguardando_cliente: "Aguardando Cliente",
    concluido: "Concluído",
    cancelado: "Cancelado",
  };
  return <Badge className={map[status] ?? ""}>{labels[status] ?? status}</Badge>;
}

export default function PortalSolicitacoesPage() {
  const { cliente, loading: clienteLoading } = usePortalCliente();
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("media");
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    if (!cliente) return;
    const { data } = await supabase
      .from("customer_requests")
      .select("*")
      .eq("cliente_id", cliente.id)
      .order("created_at", { ascending: false });
    setSolicitacoes((data as Solicitacao[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { if (cliente) fetchData(); }, [cliente]);

  const handleCreate = async () => {
    if (!cliente || !subject.trim() || !description.trim()) { toast.error("Preencha todos os campos."); return; }
    setSaving(true);
    const { error } = await supabase.from("customer_requests").insert({
      empresa_id: cliente.empresa_id,
      cliente_id: cliente.id,
      subject: subject.trim(),
      description: description.trim(),
      priority,
    });
    if (error) { toast.error("Erro ao criar solicitação."); }
    else { toast.success("Solicitação criada!"); setDialogOpen(false); setSubject(""); setDescription(""); fetchData(); }
    setSaving(false);
  };

  if (clienteLoading || loading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-32" />{[1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>;
  }

  return (
    <div className="space-y-4 pb-20 md:pb-0">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Solicitações</h1>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Nova
        </Button>
      </div>

      {solicitacoes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ClipboardList className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">Nenhuma solicitação.</p>
        </div>
      ) : (
        solicitacoes.map((s) => (
          <Card key={s.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{s.subject}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{s.description}</p>
                </div>
                <div className="text-right shrink-0 ml-3 space-y-1">
                  {statusBadge(s.status)}
                  <p className="text-[10px] text-muted-foreground">{new Date(s.created_at).toLocaleDateString("pt-BR")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Solicitação</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Assunto</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Resumo do pedido" />
            </div>
            <div className="space-y-1">
              <Label>Descrição</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descreva em detalhes..." rows={4} />
            </div>
            <div className="space-y-1">
              <Label>Prioridade</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={saving}>{saving ? "Enviando..." : "Enviar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
