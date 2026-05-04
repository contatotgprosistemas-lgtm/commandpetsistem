import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { PhotoUpload } from "@/components/PhotoUpload";

function isMealQuestion(label: string): boolean {
  const n = (label || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return /(cafe da manha|cafe-da-manha|almoco|almocou|janta|jantar|refeicao|comeu|alimentac)/.test(n);
}

interface ManejoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agendamentoId: string;
  petId: string;
  petName: string;
  empresaIdOverride?: string;
}

interface PerguntaCustom {
  id: string;
  pergunta: string;
  tipo: "sim_nao" | "select" | "texto" | "numero";
  opcoes?: string[];
}

const defaultPerguntasFallback = [
  { key: "interagiu_amigos", label: "Interagiu com os amiguinhos?", tipo: "sim_nao" as const },
  { key: "participou_atividades", label: "Participou das atividades?", tipo: "sim_nao" as const },
  { key: "almocou", label: "Almoçou?", tipo: "select" as const, opcoes: ["Sim", "Não", "Parcial"] },
  { key: "participou_musicoterapia", label: "Participou da Musicoterapia?", tipo: "sim_nao" as const },
  { key: "banho_seco", label: "Banho à Seco", tipo: "select" as const, opcoes: ["Sim", "Não", "Parcial"] },
  { key: "nota_obediencia", label: "Nota de obediência?", tipo: "numero" as const },
  { key: "observacoes", label: "Observações", tipo: "texto" as const },
  { key: "ocorrencia", label: "Ocorrência?", tipo: "sim_nao" as const },
];

function getTodayRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function ManejoDialog({ open, onOpenChange, agendamentoId, petId, petName, empresaIdOverride }: ManejoDialogProps) {
  const authCtx = useAuth();
  const empresaId = empresaIdOverride || authCtx.profile?.empresa_id;
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [customPerguntas, setCustomPerguntas] = useState<PerguntaCustom[]>([]);
  const [perguntasConfig, setPerguntasConfig] = useState<Array<{ key: string; label: string; tipo: any; opcoes?: string[] }>>(defaultPerguntasFallback as any);
  const [novaPergunta, setNovaPergunta] = useState("");
  const [saving, setSaving] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);

  // Load configured questions for this service type (if any)
  useEffect(() => {
    if (!open) return;
    const loadConfig = async () => {
      const { data: ag } = await supabase.from("agendamentos").select("tipo_servico").eq("id", agendamentoId).maybeSingle();
      const tipoNome = (ag as any)?.tipo_servico;
      if (!tipoNome || !empresaId) return;

      // Match the appointment service to a configured tipo_servico via keywords
      // (appointment names like "Plano Escola Premium" should match "Escola/Daycare")
      const { data: tipos } = await supabase
        .from("tipos_servico" as any)
        .select("id, nome")
        .eq("empresa_id", empresaId);
      const tiposList = ((tipos as any[]) || []) as Array<{ id: string; nome: string }>;
      if (tiposList.length === 0) return;

      const norm = (s: string) =>
        (s || "")
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");
      const agNome = norm(tipoNome);

      // Keyword groups: any keyword in the group matches the canonical tipo_servico
      const keywordGroups: Array<{ keys: string[]; match: (n: string) => boolean }> = [
        { keys: ["hotel", "hospedagem", "pernoite", "diaria"], match: (n) => /hotel|hospedagem|pernoite|diaria/.test(n) },
        { keys: ["escola", "creche", "daycare"], match: (n) => /escola|creche|daycare/.test(n) },
        { keys: ["banho", "tosa", "higien"], match: (n) => /banho|tosa|higien/.test(n) },
        { keys: ["taxi", "transporte"], match: (n) => /taxi|transporte/.test(n) },
        { keys: ["avaliacao", "comportament"], match: (n) => /avaliacao|comportament/.test(n) },
        { keys: ["adestr"], match: (n) => /adestr/.test(n) },
      ];

      let tipoId: string | undefined;

      // 1) Direct exact / contains match between agendamento name and tipo nome
      const exact = tiposList.find((t) => norm(t.nome) === agNome);
      if (exact) tipoId = exact.id;

      // 2) Keyword-group match
      if (!tipoId) {
        const group = keywordGroups.find((g) => g.keys.some((k) => agNome.includes(k)));
        if (group) {
          const found = tiposList.find((t) => group.match(norm(t.nome)));
          if (found) tipoId = found.id;
        }
      }

      // 3) Fallback: any tipo whose name shares a token with the agendamento name
      if (!tipoId) {
        const tokens = agNome.split(/\s+/).filter((t) => t.length > 3);
        const found = tiposList.find((t) => {
          const tn = norm(t.nome);
          return tokens.some((tok) => tn.includes(tok));
        });
        if (found) tipoId = found.id;
      }

      if (!tipoId) return;
      const { data: cfg } = await supabase.from("tipo_servico_perguntas_manejo" as any).select("*").eq("tipo_servico_id", tipoId).eq("ativo", true).order("ordem");
      const list = (cfg as any[]) || [];
      if (list.length > 0) {
        setPerguntasConfig(list.map((p: any) => ({
          key: `cfg_${p.id}`,
          label: p.pergunta,
          tipo: p.tipo,
          opcoes: Array.isArray(p.opcoes) ? p.opcoes : [],
        })));
      }
    };
    loadConfig();
  }, [open, agendamentoId, empresaId]);

  // Load today's record if exists
  useEffect(() => {
    if (!open) return;
    const load = async () => {
      const { start, end } = getTodayRange();
      const { data } = await supabase
        .from("manejo_registros")
        .select("id, respostas")
        .eq("agendamento_id", agendamentoId)
        .gte("created_at", start)
        .lte("created_at", end)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) {
        setExistingId(data.id);
        const saved = (data.respostas as Record<string, any>) || {};
        const customs = (saved.custom_perguntas as Array<{ pergunta: string; resposta: string }>) || [];
        const mapped: Record<string, string> = {};
        Object.entries(saved).forEach(([k, v]) => {
          if (k !== "custom_perguntas") mapped[k] = String(v);
        });
        const customItems: PerguntaCustom[] = customs.map((c) => {
          const id = crypto.randomUUID();
          mapped[`custom_${id}`] = c.resposta;
          return { id, pergunta: c.pergunta, tipo: "sim_nao" };
        });
        setRespostas(mapped);
        setCustomPerguntas(customItems);
      } else {
        setExistingId(null);
        setRespostas({});
        setCustomPerguntas([]);
      }
    };
    load();
  }, [open, agendamentoId]);

  function setResposta(key: string, value: string) {
    setRespostas(prev => ({ ...prev, [key]: value }));
  }

  function addCustomPergunta() {
    if (!novaPergunta.trim()) return;
    setCustomPerguntas(prev => [...prev, { id: crypto.randomUUID(), pergunta: novaPergunta.trim(), tipo: "sim_nao" }]);
    setNovaPergunta("");
  }

  async function handleSave() {
    if (!empresaId) return;
    setSaving(true);
    const payload = {
      respostas: { ...respostas, custom_perguntas: customPerguntas.map(p => ({ pergunta: p.pergunta, resposta: respostas[`custom_${p.id}`] || "" })) },
    };

    let error;
    if (existingId) {
      ({ error } = await supabase.from("manejo_registros").update(payload as any).eq("id", existingId));
    } else {
      ({ error } = await supabase.from("manejo_registros" as any).insert({
        empresa_id: empresaId,
        agendamento_id: agendamentoId,
        pet_id: petId,
        ...payload,
      } as any));
    }
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar manejo: " + error.message);
    } else {
      // Send notification to client
      const { data: petData } = await supabase.from("pets").select("cliente_id").eq("id", petId).single();
      if (petData?.cliente_id) {
        // Standard daily bulletin notification (only on new records)
        if (!existingId) {
          await supabase.from("customer_notifications").insert({
            empresa_id: empresaId,
            cliente_id: petData.cliente_id,
            title: `Boletim Diário — ${petName}`,
            message: `O boletim diário de ${petName} foi preenchido. Confira os detalhes no portal.`,
            type: "sistema",
          });
        }

        // Occurrence notification (new or updated with occurrence)
        if (respostas["ocorrencia"] === "sim" && respostas["ocorrencia_detalhes"]?.trim()) {
          await supabase.from("customer_notifications").insert({
            empresa_id: empresaId,
            cliente_id: petData.cliente_id,
            title: `⚠️ Ocorrência — ${petName}`,
            message: respostas["ocorrencia_detalhes"].trim(),
            type: "ocorrencia",
          });
        }
      }
      toast.success("Boletim diário salvo!");
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Boletim Diário — {petName}</DialogTitle>
        </DialogHeader>
        <div className="divide-y divide-border">
          <div className="grid grid-cols-[1fr_1fr] px-2 py-2 text-xs font-medium text-muted-foreground uppercase">
            <span>Pergunta</span>
            <span>Resposta</span>
          </div>
          {perguntasConfig.map(p => (
            <div key={p.key}>
              <div className="grid grid-cols-[1fr_1fr] px-2 py-3 items-center gap-2">
                <span className="text-sm text-foreground">{p.label}</span>
                <div>
                  {p.tipo === "sim_nao" && (
                    <RadioGroup value={respostas[p.key] || ""} onValueChange={v => setResposta(p.key, v)} className="flex gap-4">
                      <div className="flex items-center gap-1"><RadioGroupItem value="sim" id={`${p.key}-sim`} /><Label htmlFor={`${p.key}-sim`} className="text-sm">Sim</Label></div>
                      <div className="flex items-center gap-1"><RadioGroupItem value="nao" id={`${p.key}-nao`} /><Label htmlFor={`${p.key}-nao`} className="text-sm">Não</Label></div>
                    </RadioGroup>
                  )}
                  {p.tipo === "select" && (
                    <Select value={respostas[p.key] || ""} onValueChange={v => setResposta(p.key, v)}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{p.opcoes?.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                    </Select>
                  )}
                  {p.tipo === "numero" && <Input type="number" className="h-8 text-sm w-20" value={respostas[p.key] || ""} onChange={e => setResposta(p.key, e.target.value)} />}
                  {p.tipo === "texto" && <Textarea className="text-sm min-h-[60px]" value={respostas[p.key] || ""} onChange={e => setResposta(p.key, e.target.value)} />}
                </div>
              </div>
              {/* Show occurrence details field when "Ocorrência?" is answered "sim" */}
              {p.key === "ocorrencia" && respostas["ocorrencia"] === "sim" && (
                <div className="px-2 pb-3">
                  <Textarea
                    className="text-sm min-h-[80px] border-destructive/50"
                    placeholder="Descreva a ocorrência em detalhes..."
                    value={respostas["ocorrencia_detalhes"] || ""}
                    onChange={e => setResposta("ocorrencia_detalhes", e.target.value)}
                  />
                </div>
              )}
              {/* Meal photo upload — for café da manhã, almoço, janta etc. */}
              {isMealQuestion(p.label) && (
                <div className="px-2 pb-3 flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">Foto do pet comendo (opcional)</span>
                  <PhotoUpload
                    size="sm"
                    folder={`manejo/${petId}`}
                    empresaId={empresaId}
                    value={respostas[`foto_${p.key}`] || null}
                    onChange={(url) => setResposta(`foto_${p.key}`, url || "")}
                  />
                </div>
              )}
            </div>
          ))}
          {customPerguntas.map(p => (
            <div key={p.id} className="grid grid-cols-[1fr_1fr] px-2 py-3 items-center gap-2">
              <div className="flex items-center gap-1">
                <span className="text-sm text-foreground">{p.pergunta}</span>
                <button onClick={() => setCustomPerguntas(prev => prev.filter(x => x.id !== p.id))} className="text-destructive hover:text-destructive/80"><Trash2 className="h-3 w-3" /></button>
              </div>
              <RadioGroup value={respostas[`custom_${p.id}`] || ""} onValueChange={v => setResposta(`custom_${p.id}`, v)} className="flex gap-4">
                <div className="flex items-center gap-1"><RadioGroupItem value="sim" id={`c${p.id}-s`} /><Label htmlFor={`c${p.id}-s`} className="text-sm">Sim</Label></div>
                <div className="flex items-center gap-1"><RadioGroupItem value="nao" id={`c${p.id}-n`} /><Label htmlFor={`c${p.id}-n`} className="text-sm">Não</Label></div>
              </RadioGroup>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <Input placeholder="Nova pergunta..." value={novaPergunta} onChange={e => setNovaPergunta(e.target.value)} className="h-8 text-sm" onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addCustomPergunta())} />
          <Button variant="outline" size="sm" className="h-8 gap-1" onClick={addCustomPergunta}><Plus className="h-3.5 w-3.5" />Adicionar</Button>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : existingId ? "Atualizar" : "Salvar"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
