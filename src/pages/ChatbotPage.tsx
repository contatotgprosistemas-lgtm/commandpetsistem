import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, Edit, GitBranch, ArrowLeft } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import FlowCanvas from "@/components/chatbot/FlowCanvas";

type Flow = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  trigger_keyword: string | null;
  created_at: string;
  variables?: any;
};

export default function ChatbotPage() {
  const { profile } = useAuth();
  const empresaId = profile?.empresa_id;
  const queryClient = useQueryClient();
  const [selectedFlow, setSelectedFlow] = useState<Flow | null>(null);
  const [showFlowDialog, setShowFlowDialog] = useState(false);
  const [editingFlow, setEditingFlow] = useState<Partial<Flow>>({});

  const { data: flows = [], isLoading } = useQuery({
    queryKey: ["chatbot-flows", empresaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chatbot_flows")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Flow[];
    },
    enabled: !!empresaId,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!editingFlow.name) throw new Error("Nome é obrigatório");
      if (editingFlow.id) {
        const { error } = await supabase.from("chatbot_flows").update({
          name: editingFlow.name,
          description: editingFlow.description,
        }).eq("id", editingFlow.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("chatbot_flows").insert({
          name: editingFlow.name,
          description: editingFlow.description || null,
          empresa_id: empresaId!,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chatbot-flows"] });
      setShowFlowDialog(false);
      setEditingFlow({});
      toast.success("Fluxo salvo!");
    },
    onError: () => toast.error("Erro ao salvar fluxo"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("chatbot_flow_steps").delete().eq("flow_id", id);
      const { error } = await supabase.from("chatbot_flows").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chatbot-flows"] });
      toast.success("Fluxo removido");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("chatbot_flows").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chatbot-flows"] });
    },
  });

  // If a flow is selected, show the visual editor
  if (selectedFlow) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setSelectedFlow(null)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">{selectedFlow.name}</h1>
            <p className="text-xs text-muted-foreground">
              {selectedFlow.description || 'Editor visual de fluxo'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Ativo</span>
            <Switch
              checked={selectedFlow.active}
              onCheckedChange={v => {
                toggleMutation.mutate({ id: selectedFlow.id, active: v });
                setSelectedFlow({ ...selectedFlow, active: v });
              }}
            />
          </div>
        </div>
        <FlowCanvas
          flowId={selectedFlow.id}
          flowName={selectedFlow.name}
          initialVariables={Array.isArray(selectedFlow.variables) ? selectedFlow.variables : []}
        />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Fluxos do ChatBot</h1>
          <p className="text-sm text-muted-foreground">Crie conversas visuais com arrastar e soltar</p>
        </div>
        <Button onClick={() => { setEditingFlow({}); setShowFlowDialog(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Novo Fluxo
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Carregando...</p>
      ) : flows.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <GitBranch className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium mb-2">Nenhum fluxo criado</p>
            <p className="text-sm mb-4">Crie seu primeiro fluxo para começar a automatizar conversas</p>
            <Button onClick={() => { setEditingFlow({}); setShowFlowDialog(true); }}>
              <Plus className="h-4 w-4 mr-2" /> Criar Fluxo
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {flows.map(flow => (
            <Card
              key={flow.id}
              className="cursor-pointer transition-all hover:shadow-lg hover:border-primary/50 group"
              onClick={() => setSelectedFlow(flow)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <GitBranch className="h-5 w-5 text-primary shrink-0" />
                      <h3 className="font-semibold truncate">{flow.name}</h3>
                    </div>
                    {flow.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{flow.description}</p>
                    )}
                    <Badge variant={flow.active ? "default" : "outline"} className="text-xs">
                      {flow.active ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                  <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={e => { e.stopPropagation(); setEditingFlow(flow); setShowFlowDialog(true); }}
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={e => { e.stopPropagation(); deleteMutation.mutate(flow.id); }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showFlowDialog} onOpenChange={setShowFlowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingFlow.id ? "Editar Fluxo" : "Novo Fluxo"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input value={editingFlow.name || ""} onChange={e => setEditingFlow(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Boas vindas" />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={editingFlow.description || ""} onChange={e => setEditingFlow(p => ({ ...p, description: e.target.value }))} placeholder="Descreva o objetivo do fluxo" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFlowDialog(false)}>Cancelar</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
