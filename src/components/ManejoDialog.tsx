import { useState } from "react";
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

interface ManejoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agendamentoId: string;
  petId: string;
  petName: string;
}

interface PerguntaCustom {
  id: string;
  pergunta: string;
  tipo: "sim_nao" | "select" | "texto" | "numero";
}

const defaultPerguntas = [
  { key: "interagiu_amigos", label: "Interagiu com os amiguinhos?", tipo: "sim_nao" as const },
  { key: "participou_atividades", label: "Participou das atividades?", tipo: "sim_nao" as const },
  { key: "almocou", label: "Almoçou?", tipo: "select" as const, opcoes: ["Sim", "Não", "Parcial"] },
  { key: "participou_musicoterapia", label: "Participou da Musicoterapia?", tipo: "sim_nao" as const },
  { key: "banho_seco", label: "Banho à Seco", tipo: "select" as const, opcoes: ["Sim", "Não", "Parcial"] },
  { key: "nota_obediencia", label: "Nota de obediência?", tipo: "numero" as const },
  { key: "observacoes", label: "Observações", tipo: "texto" as const },
  { key: "ocorrencia", label: "Ocorrência?", tipo: "sim_nao" as const },
];

export function ManejoDialog({ open, onOpenChange, agendamentoId, petId, petName }: ManejoDialogProps) {
  const { profile } = useAuth();
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [customPerguntas, setCustomPerguntas] = useState<PerguntaCustom[]>([]);
  const [novaPergunta, setNovaPergunta] = useState("");
  const [saving, setSaving] = useState(false);

  function setResposta(key: string, value: string) {
    setRespostas(prev => ({ ...prev, [key]: value }));
  }

  function addCustomPergunta() {
    if (!novaPergunta.trim()) return;
    setCustomPerguntas(prev => [...prev, { id: crypto.randomUUID(), pergunta: novaPergunta.trim(), tipo: "sim_nao" }]);
    setNovaPergunta("");
  }

  async function handleSave() {
    if (!profile?.empresa_id) return;
    setSaving(true);
    const { error } = await supabase.from("manejo_registros" as any).insert({
      empresa_id: profile.empresa_id,
      agendamento_id: agendamentoId,
      pet_id: petId,
      respostas: { ...respostas, custom_perguntas: customPerguntas.map(p => ({ pergunta: p.pergunta, resposta: respostas[`custom_${p.id}`] || "" })) },
    } as any);
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar manejo: " + error.message);
    } else {
      // Send notification to client
      const { data: petData } = await supabase.from("pets").select("cliente_id").eq("id", petId).single();
      if (petData?.cliente_id) {
        await supabase.from("customer_notifications").insert({
          empresa_id: profile.empresa_id,
          cliente_id: petData.cliente_id,
          title: `Boletim Diário — ${petName}`,
          message: `O boletim diário de ${petName} foi preenchido. Confira os detalhes no portal.`,
          type: "sistema",
        });
      }
      toast.success("Boletim diário salvo!");
      onOpenChange(false);
      setRespostas({});
      setCustomPerguntas([]);
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
          {defaultPerguntas.map(p => (
            <div key={p.key} className="grid grid-cols-[1fr_1fr] px-2 py-3 items-center gap-2">
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
          <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
