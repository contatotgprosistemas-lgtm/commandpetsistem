import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentEmpresa } from "@/lib/useCurrentEmpresa";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2, Clock, Users, Save, CalendarOff, Settings as SettingsIcon } from "lucide-react";
import { toast } from "sonner";

const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

type Slot = { inicio: string; fim: string };
type Horarios = Record<string, Slot[]>;

export default function CRMConfiguracoesPage() {
  const qc = useQueryClient();
  const { data: empresaId } = useCurrentEmpresa();

  // ====== HORÁRIO COMERCIAL ======
  const { data: hc, isLoading: loadingHc } = useQuery({
    queryKey: ["crm-hc", empresaId],
    enabled: !!empresaId,
    queryFn: async () => {
      const { data, error } = await supabase.from("crm_horario_comercial")
        .select("*").eq("empresa_id", empresaId!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [ativo, setAtivo] = useState(false);
  const [fuso, setFuso] = useState("America/Sao_Paulo");
  const [horarios, setHorarios] = useState<Horarios>({
    "0": [], "1": [{ inicio: "09:00", fim: "18:00" }], "2": [{ inicio: "09:00", fim: "18:00" }],
    "3": [{ inicio: "09:00", fim: "18:00" }], "4": [{ inicio: "09:00", fim: "18:00" }],
    "5": [{ inicio: "09:00", fim: "18:00" }], "6": [],
  });
  const [feriados, setFeriados] = useState<string[]>([]);
  const [novoFeriado, setNovoFeriado] = useState("");
  const [mensagemAusencia, setMensagemAusencia] = useState("");
  const [enviarUmaVez, setEnviarUmaVez] = useState(true);
  const [savingHc, setSavingHc] = useState(false);

  useEffect(() => {
    if (hc) {
      setAtivo(hc.ativo);
      setFuso(hc.fuso);
      setHorarios(hc.horarios as Horarios);
      setFeriados((hc.feriados as string[]) ?? []);
      setMensagemAusencia(hc.mensagem_fora_expediente ?? "");
      setEnviarUmaVez(hc.enviar_apenas_uma_vez);
    }
  }, [hc]);

  const salvarHc = async () => {
    if (!empresaId) return;
    setSavingHc(true);
    try {
      const payload = {
        empresa_id: empresaId, ativo, fuso, horarios: horarios as any, feriados: feriados as any,
        mensagem_fora_expediente: mensagemAusencia, enviar_apenas_uma_vez: enviarUmaVez,
      };
      const { error } = hc
        ? await supabase.from("crm_horario_comercial").update(payload).eq("id", hc.id)
        : await supabase.from("crm_horario_comercial").insert(payload);
      if (error) throw error;
      toast.success("Horário salvo");
      qc.invalidateQueries({ queryKey: ["crm-hc"] });
    } catch (e: any) { toast.error(e.message); }
    finally { setSavingHc(false); }
  };

  const addSlot = (dia: string) => {
    setHorarios((prev) => ({ ...prev, [dia]: [...(prev[dia] ?? []), { inicio: "09:00", fim: "18:00" }] }));
  };
  const updSlot = (dia: string, idx: number, field: "inicio" | "fim", value: string) => {
    setHorarios((prev) => ({
      ...prev, [dia]: prev[dia].map((s, i) => i === idx ? { ...s, [field]: value } : s),
    }));
  };
  const rmSlot = (dia: string, idx: number) => {
    setHorarios((prev) => ({ ...prev, [dia]: prev[dia].filter((_, i) => i !== idx) }));
  };

  // ====== ROTEAMENTO POR CANAL ======
  const { data: canais = [] } = useQuery({
    queryKey: ["crm-canais-rt", empresaId],
    enabled: !!empresaId,
    queryFn: async () => {
      const { data, error } = await supabase.from("crm_canais")
        .select("id, nome, tipo, status, roteamento, roteamento_atendentes")
        .eq("empresa_id", empresaId!).order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: membros = [] } = useQuery({
    queryKey: ["crm-membros-cfg", empresaId],
    enabled: !!empresaId,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles")
        .select("user_id, nome, cargo").eq("empresa_id", empresaId!).order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });

  const updRoteamento = async (canalId: string, patch: any) => {
    const { error } = await supabase.from("crm_canais").update(patch).eq("id", canalId);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["crm-canais-rt"] });
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <SettingsIcon className="h-6 w-6 text-primary" /> Configurações do CRM
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Horário de atendimento, roteamento e equipe.</p>
        </div>

        <Tabs defaultValue="horario" className="space-y-4">
          <TabsList>
            <TabsTrigger value="horario" className="gap-1.5"><Clock className="h-3.5 w-3.5" />Horário comercial</TabsTrigger>
            <TabsTrigger value="roteamento" className="gap-1.5"><Users className="h-3.5 w-3.5" />Roteamento</TabsTrigger>
          </TabsList>

          {/* HORÁRIO */}
          <TabsContent value="horario" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Horário de atendimento</CardTitle>
                    <CardDescription className="text-xs">Defina os dias/horas em que sua equipe atende.</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={ativo} onCheckedChange={setAtivo} />
                    <Label className="text-sm">{ativo ? "Ativo" : "Inativo"}</Label>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingHc ? (
                  <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label className="text-xs">Fuso horário</Label>
                      <Select value={fuso} onValueChange={setFuso}>
                        <SelectTrigger className="w-full sm:w-72"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="America/Sao_Paulo">Brasília (GMT-3)</SelectItem>
                          <SelectItem value="America/Manaus">Manaus (GMT-4)</SelectItem>
                          <SelectItem value="America/Belem">Belém (GMT-3)</SelectItem>
                          <SelectItem value="America/Recife">Recife (GMT-3)</SelectItem>
                          <SelectItem value="America/Noronha">Fernando de Noronha (GMT-2)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">Dias e horários</Label>
                      <div className="rounded-lg border divide-y">
                        {DIAS.map((nome, i) => {
                          const slots = horarios[String(i)] ?? [];
                          return (
                            <div key={i} className="p-3 flex flex-col sm:flex-row sm:items-center gap-2">
                              <div className="w-24 text-sm font-medium">{nome}</div>
                              <div className="flex-1 flex flex-wrap gap-2">
                                {slots.length === 0 && <span className="text-xs text-muted-foreground">Fechado</span>}
                                {slots.map((s, idx) => (
                                  <div key={idx} className="flex items-center gap-1.5 bg-muted/50 rounded-md px-2 py-1">
                                    <Input type="time" value={s.inicio} onChange={(e) => updSlot(String(i), idx, "inicio", e.target.value)}
                                      className="h-7 w-24 text-xs" />
                                    <span className="text-xs text-muted-foreground">às</span>
                                    <Input type="time" value={s.fim} onChange={(e) => updSlot(String(i), idx, "fim", e.target.value)}
                                      className="h-7 w-24 text-xs" />
                                    <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => rmSlot(String(i), idx)}>
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ))}
                                <Button size="sm" variant="outline" className="h-7 gap-1 text-[11px]" onClick={() => addSlot(String(i))}>
                                  <Plus className="h-3 w-3" /> Adicionar
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs flex items-center gap-1.5"><CalendarOff className="h-3.5 w-3.5" /> Feriados / dias bloqueados</Label>
                      <div className="flex gap-2">
                        <Input type="date" value={novoFeriado} onChange={(e) => setNovoFeriado(e.target.value)} className="w-44 h-9" />
                        <Button variant="outline" size="sm" onClick={() => {
                          if (novoFeriado && !feriados.includes(novoFeriado)) {
                            setFeriados([...feriados, novoFeriado].sort());
                            setNovoFeriado("");
                          }
                        }}>
                          <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {feriados.map((f) => (
                          <Badge key={f} variant="secondary" className="gap-1.5">
                            {new Date(f + "T12:00:00").toLocaleDateString("pt-BR")}
                            <button onClick={() => setFeriados(feriados.filter((x) => x !== f))} className="hover:text-destructive">
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                        {feriados.length === 0 && <span className="text-xs text-muted-foreground">Nenhum feriado adicionado.</span>}
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t">
                      <Label className="text-xs">Mensagem automática (fora do expediente)</Label>
                      <Textarea rows={3} value={mensagemAusencia} onChange={(e) => setMensagemAusencia(e.target.value)}
                        placeholder="Olá {{primeiro_nome}}, recebemos sua mensagem fora do horário..." />
                      <div className="text-[11px] text-muted-foreground">Variáveis: <code>{`{{nome}}`}</code>, <code>{`{{primeiro_nome}}`}</code></div>
                      <div className="flex items-center gap-2 pt-1">
                        <Switch checked={enviarUmaVez} onCheckedChange={setEnviarUmaVez} />
                        <Label className="text-sm">Enviar apenas uma vez por conversa</Label>
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <Button onClick={salvarHc} disabled={savingHc} className="gap-1.5">
                        {savingHc ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Salvar configurações
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ROTEAMENTO */}
          <TabsContent value="roteamento" className="space-y-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Roteamento automático de novas conversas</CardTitle>
                <CardDescription className="text-xs">
                  Configure como cada canal distribui novas conversas entre atendentes.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {canais.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Nenhum canal cadastrado.</p>
                ) : canais.map((c: any) => (
                  <CanalRoteamento key={c.id} canal={c} membros={membros} onSave={updRoteamento} />
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function CanalRoteamento({ canal, membros, onSave }: { canal: any; membros: any[]; onSave: (id: string, patch: any) => void }) {
  const [modo, setModo] = useState<string>(canal.roteamento ?? "nenhum");
  const [pool, setPool] = useState<string[]>((canal.roteamento_atendentes ?? []) as string[]);

  useEffect(() => {
    setModo(canal.roteamento ?? "nenhum");
    setPool((canal.roteamento_atendentes ?? []) as string[]);
  }, [canal.id]);

  const dirty = useMemo(() =>
    modo !== (canal.roteamento ?? "nenhum") ||
    JSON.stringify(pool.sort()) !== JSON.stringify(((canal.roteamento_atendentes ?? []) as string[]).sort()),
    [modo, pool, canal]);

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-semibold">{canal.nome}</span>
          <Badge variant="outline" className="text-[10px]">{canal.tipo}</Badge>
          <Badge variant={canal.status === "conectado" ? "default" : "secondary"} className="text-[10px]">{canal.status}</Badge>
        </div>
        <Select value={modo} onValueChange={setModo}>
          <SelectTrigger className="w-56 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="nenhum">Sem roteamento</SelectItem>
            <SelectItem value="round_robin">Round-robin (rodízio)</SelectItem>
            <SelectItem value="menos_carga">Menos conversas abertas</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {modo !== "nenhum" && (
        <div className="space-y-1.5">
          <Label className="text-xs">Atendentes elegíveis ({pool.length})</Label>
          <div className="flex flex-wrap gap-1.5">
            {membros.map((m: any) => {
              const on = pool.includes(m.user_id);
              return (
                <button key={m.user_id} type="button"
                  onClick={() => setPool(on ? pool.filter((p) => p !== m.user_id) : [...pool, m.user_id])}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border transition-colors ${
                    on ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"
                  }`}>
                  <span className="h-4 w-4 rounded-full bg-primary/20 text-[10px] flex items-center justify-center">
                    {(m.nome ?? "?").charAt(0).toUpperCase()}
                  </span>
                  {m.nome}
                </button>
              );
            })}
            {membros.length === 0 && <span className="text-xs text-muted-foreground">Nenhum membro na empresa.</span>}
          </div>
        </div>
      )}
      {dirty && (
        <div className="flex justify-end pt-1">
          <Button size="sm" onClick={() => onSave(canal.id, { roteamento: modo, roteamento_atendentes: pool, roteamento_ultimo_idx: 0 })}>
            <Save className="h-3.5 w-3.5 mr-1" /> Salvar
          </Button>
        </div>
      )}
    </div>
  );
}