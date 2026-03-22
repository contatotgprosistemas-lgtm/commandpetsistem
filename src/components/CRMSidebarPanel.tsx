import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  User, History, TrendingUp, StickyNote,
  Phone, Mail, MapPin, Tag, ChevronRight,
  Plus, Send as SendIcon,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";

interface CRMSidebarPanelProps {
  clienteId: string | null;
  telefone?: string;
}

const FUNNEL_STAGES = [
  { key: "novo_lead", label: "Novo Lead", color: "bg-muted text-muted-foreground" },
  { key: "contato_iniciado", label: "Contato Iniciado", color: "bg-primary/10 text-primary" },
  { key: "qualificacao", label: "Qualificação", color: "bg-primary/10 text-primary" },
  { key: "proposta", label: "Proposta", color: "bg-warning/10 text-warning" },
  { key: "negociacao", label: "Negociação", color: "bg-warning/10 text-warning" },
  { key: "fechado_ganho", label: "Fechado Ganho", color: "bg-success/10 text-success" },
  { key: "fechado_perdido", label: "Fechado Perdido", color: "bg-destructive/10 text-destructive" },
];

export function CRMSidebarPanel({ clienteId, telefone }: CRMSidebarPanelProps) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [newNote, setNewNote] = useState("");
  const empresaId = profile?.empresa_id;

  // Fetch client data
  const { data: cliente, isLoading: loadingCliente } = useQuery({
    queryKey: ["crm-cliente", clienteId],
    queryFn: async () => {
      if (!clienteId) return null;
      const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .eq("id", clienteId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!clienteId,
  });

  // Fetch funnel data
  const { data: funil } = useQuery({
    queryKey: ["crm-funil", clienteId],
    queryFn: async () => {
      if (!clienteId) return null;
      const { data, error } = await supabase
        .from("funil_vendas")
        .select("*")
        .eq("cliente_id", clienteId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!clienteId,
  });

  // Fetch notes
  const { data: notas } = useQuery({
    queryKey: ["crm-notas", clienteId],
    queryFn: async () => {
      if (!clienteId) return [];
      const { data, error } = await supabase
        .from("notas_contato")
        .select("*, profiles:autor_id(nome)")
        .eq("cliente_id", clienteId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!clienteId,
  });

  // Fetch history
  const { data: historico } = useQuery({
    queryKey: ["crm-historico", clienteId],
    queryFn: async () => {
      if (!clienteId) return [];
      const { data, error } = await supabase
        .from("historico_interacoes")
        .select("*, profiles:user_id(nome)")
        .eq("cliente_id", clienteId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!clienteId,
  });

  // Add note mutation
  const addNote = useMutation({
    mutationFn: async (conteudo: string) => {
      if (!clienteId || !empresaId) throw new Error("Missing data");
      const { error } = await supabase.from("notas_contato").insert({
        cliente_id: clienteId,
        empresa_id: empresaId,
        conteudo,
        autor_id: profile?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-notas", clienteId] });
      setNewNote("");
      toast.success("Nota adicionada");
    },
    onError: () => toast.error("Erro ao adicionar nota"),
  });

  // Update funnel stage mutation
  const updateFunnel = useMutation({
    mutationFn: async (estagio: string) => {
      if (!clienteId || !empresaId) throw new Error("Missing data");
      if (funil) {
        const { error } = await supabase
          .from("funil_vendas")
          .update({ estagio })
          .eq("id", funil.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("funil_vendas").insert({
          cliente_id: clienteId,
          empresa_id: empresaId,
          estagio,
        });
        if (error) throw error;
      }
      // Log interaction
      await supabase.from("historico_interacoes").insert({
        cliente_id: clienteId,
        empresa_id: empresaId,
        tipo: "funil",
        descricao: `Movido para: ${FUNNEL_STAGES.find(s => s.key === estagio)?.label}`,
        user_id: profile?.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-funil", clienteId] });
      queryClient.invalidateQueries({ queryKey: ["crm-historico", clienteId] });
      toast.success("Funil atualizado");
    },
    onError: () => toast.error("Erro ao atualizar funil"),
  });

  if (!clienteId) {
    return null;
  }

  if (loadingCliente) {
    return (
      <div className="w-80 border-l border-border bg-card p-4 space-y-4 shrink-0">
        <Skeleton className="h-12 w-12 rounded-full mx-auto" />
        <Skeleton className="h-4 w-32 mx-auto" />
        <Skeleton className="h-4 w-24 mx-auto" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const currentStageIndex = FUNNEL_STAGES.findIndex(s => s.key === (funil?.estagio || "novo_lead"));

  return (
    <div className="w-80 border-l border-border bg-card flex flex-col shrink-0">
      {/* Header */}
      <div className="p-4 border-b border-border text-center">
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
          <User className="h-5 w-5 text-primary" strokeWidth={1.5} />
        </div>
        <h3 className="text-sm font-semibold text-foreground">{cliente?.nome}</h3>
        <p className="text-xs text-muted-foreground">{cliente?.telefone || cliente?.whatsapp || telefone}</p>
        {funil && (
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mt-2 ${
            FUNNEL_STAGES.find(s => s.key === funil.estagio)?.color
          }`}>
            {FUNNEL_STAGES.find(s => s.key === funil.estagio)?.label}
          </span>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="contato" className="flex-1 flex flex-col min-h-0">
        <TabsList className="mx-2 mt-2 grid grid-cols-4">
          <TabsTrigger value="contato" className="text-xs px-1">Contato</TabsTrigger>
          <TabsTrigger value="historico" className="text-xs px-1">Histórico</TabsTrigger>
          <TabsTrigger value="funil" className="text-xs px-1">Funil</TabsTrigger>
          <TabsTrigger value="notas" className="text-xs px-1">Notas</TabsTrigger>
        </TabsList>

        {/* Contato Tab */}
        <TabsContent value="contato" className="flex-1 m-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-3">
              {[
                { icon: Phone, label: "Telefone", value: cliente?.telefone || "—" },
                { icon: Phone, label: "WhatsApp", value: cliente?.whatsapp || "—" },
                { icon: Mail, label: "Email", value: cliente?.email || "—" },
                { icon: MapPin, label: "Endereço", value: cliente?.endereco || "—" },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-2 text-xs">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" strokeWidth={1.5} />
                  <div>
                    <p className="text-muted-foreground">{label}</p>
                    <p className="text-foreground font-medium">{value}</p>
                  </div>
                </div>
              ))}
              {cliente?.tags && cliente.tags.length > 0 && (
                <div className="flex items-start gap-2 text-xs">
                  <Tag className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" strokeWidth={1.5} />
                  <div>
                    <p className="text-muted-foreground">Tags</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {cliente.tags.map((tag: string) => (
                        <span key={tag} className="px-1.5 py-0.5 bg-primary/10 text-primary rounded text-[10px] font-medium">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {cliente?.notas && (
                <div className="bg-muted/50 rounded-md p-3 mt-3">
                  <p className="text-xs text-muted-foreground">{cliente.notas}</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Histórico Tab */}
        <TabsContent value="historico" className="flex-1 m-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-3">
              {!historico?.length ? (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhuma interação registrada</p>
              ) : (
                historico.map((item: any) => (
                  <div key={item.id} className="border-l-2 border-border pl-3 py-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                        item.tipo === "funil" ? "bg-warning" : item.tipo === "nota" ? "bg-primary" : "bg-muted-foreground"
                      }`} />
                      <span className="text-xs font-medium text-foreground">{item.tipo}</span>
                      <span className="text-[10px] text-muted-foreground ml-auto font-mono-tabular">
                        {format(new Date(item.created_at), "dd/MM HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.descricao}</p>
                    {item.profiles?.nome && (
                      <p className="text-[10px] text-muted-foreground/70 mt-0.5">por {item.profiles.nome}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Funil Tab */}
        <TabsContent value="funil" className="flex-1 m-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-2">
              <p className="text-xs text-muted-foreground mb-3">Mover contato no funil:</p>
              {FUNNEL_STAGES.map((stage, idx) => {
                const isActive = stage.key === (funil?.estagio || "novo_lead");
                const isPast = idx < currentStageIndex;
                return (
                  <button
                    key={stage.key}
                    onClick={() => updateFunnel.mutate(stage.key)}
                    disabled={updateFunnel.isPending}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-md text-left text-xs transition-colors ${
                      isActive
                        ? "bg-primary/10 border border-primary/30 text-primary font-medium"
                        : isPast
                        ? "bg-muted/50 text-muted-foreground"
                        : "hover:bg-muted/50 text-foreground"
                    }`}
                  >
                    <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      isActive ? "bg-primary text-primary-foreground" : isPast ? "bg-muted-foreground/30 text-muted-foreground" : "bg-muted text-muted-foreground"
                    }`}>
                      {idx + 1}
                    </div>
                    <span>{stage.label}</span>
                    {isActive && <ChevronRight className="h-3.5 w-3.5 ml-auto" />}
                  </button>
                );
              })}
              {funil?.valor_estimado != null && funil.valor_estimado > 0 && (
                <div className="bg-muted/50 rounded-md p-3 mt-3">
                  <p className="text-xs text-muted-foreground">Valor estimado</p>
                  <p className="text-sm font-semibold text-foreground">
                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(funil.valor_estimado)}
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Notas Tab */}
        <TabsContent value="notas" className="flex-1 m-0 flex flex-col">
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-3">
              {!notas?.length ? (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhuma nota ainda</p>
              ) : (
                notas.map((nota: any) => (
                  <div key={nota.id} className="bg-muted/50 rounded-md p-3">
                    <p className="text-xs text-foreground">{nota.conteudo}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] text-muted-foreground">
                        {nota.profiles?.nome || "Sistema"}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono-tabular">
                        {format(new Date(nota.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
          <div className="p-3 border-t border-border">
            <div className="flex gap-2">
              <Textarea
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                placeholder="Adicionar nota..."
                className="min-h-[60px] text-xs resize-none"
              />
            </div>
            <Button
              size="sm"
              className="w-full mt-2"
              disabled={!newNote.trim() || addNote.isPending}
              onClick={() => addNote.mutate(newNote.trim())}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Adicionar Nota
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
