import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bot, Plus, Trash2, MessageSquare, Clock,
  Hand, List, Search, Moon, GripVertical, Pencil,
} from "lucide-react";

const TIPOS = [
  { key: "boas_vindas", label: "Boas-vindas", icon: Hand, description: "Enviada quando um novo contato inicia conversa" },
  { key: "menu", label: "Menu Interativo", icon: List, description: "Menu de opções acionado por gatilho (ex: 'menu', '0')" },
  { key: "palavra_chave", label: "Palavra-chave", icon: Search, description: "Resposta automática ao detectar palavras-chave" },
  { key: "ausencia", label: "Ausência", icon: Moon, description: "Resposta fora do horário comercial" },
];

const DIAS_SEMANA = [
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sáb" },
  { value: 7, label: "Dom" },
];

interface RegraForm {
  tipo: string;
  nome: string;
  gatilho: string;
  resposta: string;
  ativo: boolean;
  horario_inicio: string;
  horario_fim: string;
  dias_semana: number[];
}

const defaultForm: RegraForm = {
  tipo: "palavra_chave",
  nome: "",
  gatilho: "",
  resposta: "",
  ativo: true,
  horario_inicio: "08:00",
  horario_fim: "18:00",
  dias_semana: [1, 2, 3, 4, 5],
};

export default function ChatbotPage() {
  const { profile } = useAuth();
  const empresaId = profile?.empresa_id;
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<RegraForm>(defaultForm);
  const [activeTab, setActiveTab] = useState("todas");

  const { data: regras, isLoading } = useQuery({
    queryKey: ["chatbot-regras", empresaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chatbot_regras")
        .select("*")
        .order("ordem", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!empresaId,
  });

  const saveMutation = useMutation({
    mutationFn: async (formData: RegraForm) => {
      if (!empresaId) throw new Error("Sem empresa");
      const payload = {
        empresa_id: empresaId,
        tipo: formData.tipo,
        nome: formData.nome,
        gatilho: formData.gatilho || null,
        resposta: formData.resposta,
        ativo: formData.ativo,
        horario_inicio: formData.tipo === "ausencia" ? formData.horario_inicio : null,
        horario_fim: formData.tipo === "ausencia" ? formData.horario_fim : null,
        dias_semana: formData.dias_semana,
        ordem: regras?.length ?? 0,
      };

      if (editingId) {
        const { error } = await supabase.from("chatbot_regras").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("chatbot_regras").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chatbot-regras"] });
      setDialogOpen(false);
      setEditingId(null);
      setForm(defaultForm);
      toast.success(editingId ? "Regra atualizada" : "Regra criada");
    },
    onError: () => toast.error("Erro ao salvar regra"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("chatbot_regras").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chatbot-regras"] });
      toast.success("Regra removida");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase.from("chatbot_regras").update({ ativo }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chatbot-regras"] });
    },
  });

  const handleEdit = (regra: any) => {
    setEditingId(regra.id);
    setForm({
      tipo: regra.tipo,
      nome: regra.nome,
      gatilho: regra.gatilho || "",
      resposta: regra.resposta,
      ativo: regra.ativo,
      horario_inicio: regra.horario_inicio || "08:00",
      horario_fim: regra.horario_fim || "18:00",
      dias_semana: regra.dias_semana || [1, 2, 3, 4, 5],
    });
    setDialogOpen(true);
  };

  const handleNew = (tipo?: string) => {
    setEditingId(null);
    setForm({ ...defaultForm, tipo: tipo || "palavra_chave" });
    setDialogOpen(true);
  };

  const filteredRegras = regras?.filter(r => activeTab === "todas" || r.tipo === activeTab) ?? [];

  const getTipoConfig = (tipo: string) => TIPOS.find(t => t.key === tipo) || TIPOS[2];

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="h-14 px-6 flex items-center justify-between border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-3">
          <Bot className="h-5 w-5 text-primary" />
          <div>
            <h1 className="text-lg font-semibold text-foreground">Chatbot & Automação</h1>
            <p className="text-xs text-muted-foreground">{regras?.filter(r => r.ativo).length ?? 0} regras ativas</p>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => handleNew()}>
              <Plus className="h-4 w-4 mr-1" />
              Nova Regra
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Regra" : "Nova Regra de Automação"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Tipo</label>
                <Select value={form.tipo} onValueChange={v => setForm({ ...form, tipo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIPOS.map(t => (
                      <SelectItem key={t.key} value={t.key}>
                        <span className="flex items-center gap-2">
                          <t.icon className="h-4 w-4" />
                          {t.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {getTipoConfig(form.tipo).description}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Nome da regra</label>
                <Input
                  value={form.nome}
                  onChange={e => setForm({ ...form, nome: e.target.value })}
                  placeholder="Ex: Boas-vindas principal"
                />
              </div>

              {(form.tipo === "palavra_chave" || form.tipo === "menu") && (
                <div>
                  <label className="text-sm font-medium mb-1.5 block">
                    {form.tipo === "menu" ? "Gatilho (ex: menu, 0)" : "Palavras-chave (separadas por vírgula)"}
                  </label>
                  <Input
                    value={form.gatilho}
                    onChange={e => setForm({ ...form, gatilho: e.target.value })}
                    placeholder={form.tipo === "menu" ? "menu" : "preço, valor, quanto custa"}
                  />
                </div>
              )}

              <div>
                <label className="text-sm font-medium mb-1.5 block">Resposta</label>
                <Textarea
                  value={form.resposta}
                  onChange={e => setForm({ ...form, resposta: e.target.value })}
                  placeholder={
                    form.tipo === "menu"
                      ? "Olá! Escolha uma opção:\n\n1 - Comercial\n2 - Suporte\n3 - Financeiro"
                      : form.tipo === "boas_vindas"
                      ? "Olá! Bem-vindo à nossa empresa. Como podemos ajudá-lo?"
                      : form.tipo === "ausencia"
                      ? "Estamos fora do horário de atendimento. Retornaremos em breve!"
                      : "Obrigado pelo interesse! Um atendente entrará em contato."
                  }
                  className="min-h-[120px]"
                />
              </div>

              {form.tipo === "ausencia" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Horário início</label>
                      <Input
                        type="time"
                        value={form.horario_inicio}
                        onChange={e => setForm({ ...form, horario_inicio: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Horário fim</label>
                      <Input
                        type="time"
                        value={form.horario_fim}
                        onChange={e => setForm({ ...form, horario_fim: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Dias da semana</label>
                    <div className="flex gap-1.5">
                      {DIAS_SEMANA.map(dia => (
                        <button
                          key={dia.value}
                          type="button"
                          onClick={() => {
                            const dias = form.dias_semana.includes(dia.value)
                              ? form.dias_semana.filter(d => d !== dia.value)
                              : [...form.dias_semana, dia.value];
                            setForm({ ...form, dias_semana: dias });
                          }}
                          className={`px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
                            form.dias_semana.includes(dia.value)
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {dia.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <Button
                className="w-full"
                disabled={!form.nome.trim() || !form.resposta.trim() || saveMutation.isPending}
                onClick={() => saveMutation.mutate(form)}
              >
                {editingId ? "Salvar Alterações" : "Criar Regra"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Quick-add cards */}
      <div className="px-6 py-4 border-b border-border bg-muted/20">
        <div className="grid grid-cols-4 gap-3">
          {TIPOS.map(tipo => {
            const count = regras?.filter(r => r.tipo === tipo.key).length ?? 0;
            return (
              <button
                key={tipo.key}
                onClick={() => handleNew(tipo.key)}
                className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors text-left"
              >
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <tipo.icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-medium text-foreground">{tipo.label}</p>
                  <p className="text-[10px] text-muted-foreground">{count} regra{count !== 1 ? "s" : ""}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Rules list */}
      <div className="flex-1 flex flex-col min-h-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <div className="px-6 pt-3">
            <TabsList>
              <TabsTrigger value="todas" className="text-xs">Todas ({regras?.length ?? 0})</TabsTrigger>
              {TIPOS.map(t => (
                <TabsTrigger key={t.key} value={t.key} className="text-xs">
                  {t.label} ({regras?.filter(r => r.tipo === t.key).length ?? 0})
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <ScrollArea className="flex-1">
            <div className="px-6 py-4 space-y-3">
              {filteredRegras.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <Bot className="h-12 w-12 text-muted-foreground/20 mb-3" />
                  <p className="text-sm text-muted-foreground">Nenhuma regra configurada</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Crie sua primeira regra de automação</p>
                </div>
              ) : (
                filteredRegras.map(regra => {
                  const tipoConfig = getTipoConfig(regra.tipo);
                  return (
                    <Card key={regra.id} className={`transition-opacity ${!regra.ativo ? "opacity-50" : ""}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                            <tipoConfig.icon className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-medium text-foreground">{regra.nome}</h3>
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground">
                                {tipoConfig.label}
                              </span>
                            </div>
                            {regra.gatilho && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Gatilho: <span className="font-mono bg-muted px-1 rounded">{regra.gatilho}</span>
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2 whitespace-pre-line">
                              {regra.resposta}
                            </p>
                            {regra.tipo === "ausencia" && regra.horario_inicio && (
                              <p className="text-[10px] text-muted-foreground/70 mt-1 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Horário comercial: {regra.horario_inicio} - {regra.horario_fim}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Switch
                              checked={regra.ativo}
                              onCheckedChange={ativo => toggleMutation.mutate({ id: regra.id, ativo })}
                            />
                            <button
                              onClick={() => handleEdit(regra)}
                              className="h-8 w-8 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => deleteMutation.mutate(regra.id)}
                              className="h-8 w-8 rounded-md hover:bg-destructive/10 flex items-center justify-center text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </Tabs>
      </div>
    </div>
  );
}
