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
import { Loader2, Plus, Trash2, Clock, Users, Save, CalendarOff, Settings as SettingsIcon, Building2, X } from "lucide-react";
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
        .select("id, nome, tipo, status, roteamento, roteamento_atendentes, setor_padrao_id, roteamento_modo, menu_config, palavras_chave_config")
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

  const { data: setores = [] } = useQuery({
    queryKey: ["crm-setores", empresaId],
    enabled: !!empresaId,
    queryFn: async () => {
      const { data, error } = await supabase.from("crm_setores")
        .select("*").eq("empresa_id", empresaId!).order("ordem").order("nome");
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
            <TabsTrigger value="setores" className="gap-1.5"><Building2 className="h-3.5 w-3.5" />Setores</TabsTrigger>
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
                <CardTitle className="text-base">Roteamento de novas conversas por canal</CardTitle>
                <CardDescription className="text-xs">
                  Defina como cada canal direciona novas conversas para os setores e atendentes.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {canais.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Nenhum canal cadastrado.</p>
                ) : canais.map((c: any) => (
                  <CanalRoteamento key={c.id} canal={c} membros={membros} setores={setores} onSave={updRoteamento} />
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* SETORES */}
          <TabsContent value="setores" className="space-y-3">
            <SetoresPanel empresaId={empresaId ?? null} setores={setores} membros={membros} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function CanalRoteamento({ canal, membros, setores, onSave }: { canal: any; membros: any[]; setores: any[]; onSave: (id: string, patch: any) => void }) {
  const [modo, setModo] = useState<string>(canal.roteamento_modo ?? "nenhum");
  const [setorPadrao, setSetorPadrao] = useState<string>(canal.setor_padrao_id ?? "__none__");
  const [menuTexto, setMenuTexto] = useState<string>(canal.menu_config?.texto ?? "Olá! Para um melhor atendimento, escolha uma opção:");
  const [menuOpcoes, setMenuOpcoes] = useState<{ tecla: string; setor_id: string; rotulo: string }[]>(
    (canal.menu_config?.opcoes ?? []) as any,
  );
  const [palavras, setPalavras] = useState<{ setor_id: string; palavras: string }[]>(
    (canal.palavras_chave_config?.regras ?? []) as any,
  );

  useEffect(() => {
    setModo(canal.roteamento_modo ?? "nenhum");
    setSetorPadrao(canal.setor_padrao_id ?? "__none__");
    setMenuTexto(canal.menu_config?.texto ?? "Olá! Para um melhor atendimento, escolha uma opção:");
    setMenuOpcoes((canal.menu_config?.opcoes ?? []) as any);
    setPalavras((canal.palavras_chave_config?.regras ?? []) as any);
  }, [canal.id]);

  const dirty = useMemo(() => {
    return JSON.stringify({
      modo,
      setorPadrao: setorPadrao === "__none__" ? null : setorPadrao,
      menu: { texto: menuTexto, opcoes: menuOpcoes },
      palavras: { regras: palavras },
    }) !== JSON.stringify({
      modo: canal.roteamento_modo ?? "nenhum",
      setorPadrao: canal.setor_padrao_id ?? null,
      menu: { texto: canal.menu_config?.texto ?? "Olá! Para um melhor atendimento, escolha uma opção:", opcoes: canal.menu_config?.opcoes ?? [] },
      palavras: { regras: canal.palavras_chave_config?.regras ?? [] },
    });
  }, [modo, setorPadrao, menuTexto, menuOpcoes, palavras, canal]);

  const salvar = () => onSave(canal.id, {
    roteamento_modo: modo,
    setor_padrao_id: setorPadrao === "__none__" ? null : setorPadrao,
    menu_config: { texto: menuTexto, opcoes: menuOpcoes },
    palavras_chave_config: { regras: palavras },
  });

  return (
    <div className="rounded-lg border p-4 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-semibold">{canal.nome}</span>
          <Badge variant="outline" className="text-[10px]">{canal.tipo}</Badge>
          <Badge variant={canal.status === "conectado" ? "default" : "secondary"} className="text-[10px]">{canal.status}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Modo de roteamento</Label>
          <Select value={modo} onValueChange={setModo}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="nenhum">Sem roteamento (caixa única)</SelectItem>
              <SelectItem value="manual">Manual — atendente escolhe o setor</SelectItem>
              <SelectItem value="menu">Menu automático (URA por número)</SelectItem>
              <SelectItem value="palavras_chave">Por palavras-chave</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Setor padrão (fallback)</Label>
          <Select value={setorPadrao} onValueChange={setSetorPadrao}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Nenhum" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Nenhum</SelectItem>
              {setores.map((s: any) => (
                <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {modo === "menu" && (
        <div className="space-y-2 rounded-md border bg-muted/30 p-3">
          <Label className="text-xs">Mensagem do menu</Label>
          <Textarea rows={3} value={menuTexto} onChange={(e) => setMenuTexto(e.target.value)} />
          <Label className="text-xs">Opções (cliente responde com a tecla)</Label>
          <div className="space-y-1.5">
            {menuOpcoes.map((op, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input value={op.tecla} maxLength={4} onChange={(e) => {
                  const v = [...menuOpcoes]; v[i] = { ...op, tecla: e.target.value }; setMenuOpcoes(v);
                }} className="h-8 w-14" placeholder="1" />
                <Input value={op.rotulo} onChange={(e) => {
                  const v = [...menuOpcoes]; v[i] = { ...op, rotulo: e.target.value }; setMenuOpcoes(v);
                }} className="h-8 flex-1" placeholder="Rótulo (ex: Financeiro)" />
                <Select value={op.setor_id || "__none__"} onValueChange={(val) => {
                  const v = [...menuOpcoes]; v[i] = { ...op, setor_id: val === "__none__" ? "" : val }; setMenuOpcoes(v);
                }}>
                  <SelectTrigger className="h-8 w-44"><SelectValue placeholder="Setor" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    {setores.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                  onClick={() => setMenuOpcoes(menuOpcoes.filter((_, j) => j !== i))}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <Button size="sm" variant="outline" className="h-7 gap-1 text-[11px]"
              onClick={() => setMenuOpcoes([...menuOpcoes, { tecla: String(menuOpcoes.length + 1), rotulo: "", setor_id: "" }])}>
              <Plus className="h-3 w-3" /> Adicionar opção
            </Button>
          </div>
        </div>
      )}

      {modo === "palavras_chave" && (
        <div className="space-y-2 rounded-md border bg-muted/30 p-3">
          <Label className="text-xs">Regras (separe palavras por vírgula)</Label>
          {palavras.map((r, i) => (
            <div key={i} className="flex items-center gap-2">
              <Select value={r.setor_id || "__none__"} onValueChange={(val) => {
                const v = [...palavras]; v[i] = { ...r, setor_id: val === "__none__" ? "" : val }; setPalavras(v);
              }}>
                <SelectTrigger className="h-8 w-44"><SelectValue placeholder="Setor" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  {setores.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input value={r.palavras} onChange={(e) => {
                const v = [...palavras]; v[i] = { ...r, palavras: e.target.value }; setPalavras(v);
              }} className="h-8 flex-1" placeholder="boleto, fatura, pagamento" />
              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                onClick={() => setPalavras(palavras.filter((_, j) => j !== i))}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
          <Button size="sm" variant="outline" className="h-7 gap-1 text-[11px]"
            onClick={() => setPalavras([...palavras, { setor_id: "", palavras: "" }])}>
            <Plus className="h-3 w-3" /> Adicionar regra
          </Button>
        </div>
      )}

      {dirty && (
        <div className="flex justify-end pt-1">
          <Button size="sm" onClick={salvar}>
            <Save className="h-3.5 w-3.5 mr-1" /> Salvar
          </Button>
        </div>
      )}
    </div>
  );
}

function SetoresPanel({ empresaId, setores, membros }: { empresaId: string | null; setores: any[]; membros: any[] }) {
  const qc = useQueryClient();
  const [novoNome, setNovoNome] = useState("");
  const [novaCor, setNovaCor] = useState("#3B82F6");

  const criar = async () => {
    if (!empresaId || !novoNome.trim()) return;
    const { error } = await supabase.from("crm_setores").insert({
      empresa_id: empresaId, nome: novoNome.trim(), cor: novaCor, ordem: setores.length,
    });
    if (error) { toast.error(error.message); return; }
    setNovoNome(""); setNovaCor("#3B82F6");
    toast.success("Setor criado");
    qc.invalidateQueries({ queryKey: ["crm-setores"] });
  };

  const excluir = async (id: string) => {
    if (!confirm("Excluir este setor?")) return;
    const { error } = await supabase.from("crm_setores").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Setor removido");
    qc.invalidateQueries({ queryKey: ["crm-setores"] });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Setores de atendimento</CardTitle>
        <CardDescription className="text-xs">
          Crie setores (Financeiro, Comercial, Operacional...) e vincule os atendentes que respondem cada setor.
          Um mesmo número de WhatsApp pode atender vários setores ao mesmo tempo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end gap-2 flex-wrap">
          <div className="flex-1 min-w-[180px] space-y-1">
            <Label className="text-xs">Nome do setor</Label>
            <Input value={novoNome} onChange={(e) => setNovoNome(e.target.value)} placeholder="Ex: Financeiro" className="h-9" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Cor</Label>
            <Input type="color" value={novaCor} onChange={(e) => setNovaCor(e.target.value)} className="h-9 w-16 p-1" />
          </div>
          <Button onClick={criar} className="gap-1.5 h-9"><Plus className="h-4 w-4" /> Criar</Button>
        </div>

        {setores.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhum setor cadastrado.</p>
        ) : (
          <div className="space-y-2">
            {setores.map((s: any) => (
              <SetorRow key={s.id} setor={s} membros={membros} onDelete={() => excluir(s.id)} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SetorRow({ setor, membros, onDelete }: { setor: any; membros: any[]; onDelete: () => void }) {
  const qc = useQueryClient();
  const { data: vinculos = [] } = useQuery({
    queryKey: ["crm-setor-atendentes", setor.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("crm_setor_atendentes")
        .select("user_id").eq("setor_id", setor.id);
      if (error) throw error;
      return (data ?? []).map((r) => r.user_id);
    },
  });

  const toggle = async (userId: string) => {
    const isOn = vinculos.includes(userId);
    if (isOn) {
      const { error } = await supabase.from("crm_setor_atendentes")
        .delete().eq("setor_id", setor.id).eq("user_id", userId);
      if (error) { toast.error(error.message); return; }
    } else {
      const { error } = await supabase.from("crm_setor_atendentes")
        .insert({ setor_id: setor.id, user_id: userId, empresa_id: setor.empresa_id });
      if (error) { toast.error(error.message); return; }
    }
    qc.invalidateQueries({ queryKey: ["crm-setor-atendentes", setor.id] });
  };

  return (
    <div className="rounded-lg border p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="h-4 w-4 rounded-full border" style={{ backgroundColor: setor.cor }} />
          <span className="text-sm font-semibold">{setor.nome}</span>
          <Badge variant="secondary" className="text-[10px]">{vinculos.length} atendente(s)</Badge>
        </div>
        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={onDelete}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {membros.map((m: any) => {
          const on = vinculos.includes(m.user_id);
          return (
            <button key={m.user_id} type="button" onClick={() => toggle(m.user_id)}
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
  );
}