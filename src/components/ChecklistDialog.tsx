import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface ChecklistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agendamentoId: string;
  petId: string;
  petName: string;
}

const defaultPerguntas = [
  "Olhos Ok?",
  "Orelhas Ok?",
  "Focinho Ok?",
  "Boca Ok?",
  "Dentes Ok?",
  "Pelagem Ok?",
  "Pele Ok?",
  "Corpo Ok?",
  "Rabo Ok?",
  "Patas Ok?",
  "Urina Ok?",
  "Fezes Ok?",
];

export function ChecklistDialog({ open, onOpenChange, agendamentoId, petId, petName }: ChecklistDialogProps) {
  const { profile } = useAuth();
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [customPerguntas, setCustomPerguntas] = useState<{ id: string; pergunta: string }[]>([]);
  const [novaPergunta, setNovaPergunta] = useState("");
  const [saving, setSaving] = useState(false);

  function setResposta(key: string, value: string) {
    setRespostas(prev => ({ ...prev, [key]: value }));
  }

  function addCustomPergunta() {
    if (!novaPergunta.trim()) return;
    setCustomPerguntas(prev => [...prev, { id: crypto.randomUUID(), pergunta: novaPergunta.trim() }]);
    setNovaPergunta("");
  }

  async function handleSave() {
    if (!profile?.empresa_id) return;
    setSaving(true);
    const { error } = await supabase.from("checklist_registros" as any).insert({
      empresa_id: profile.empresa_id,
      agendamento_id: agendamentoId,
      pet_id: petId,
      respostas: { ...respostas, custom_perguntas: customPerguntas.map(p => ({ pergunta: p.pergunta, resposta: respostas[`custom_${p.id}`] || "" })) },
    } as any);
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar checklist: " + error.message);
    } else {
      toast.success("Checklist salvo!");
      onOpenChange(false);
      setRespostas({});
      setCustomPerguntas([]);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Checklist — {petName}</DialogTitle>
        </DialogHeader>
        <div className="divide-y divide-border">
          <div className="grid grid-cols-[1fr_1fr] px-2 py-2 text-xs font-medium text-muted-foreground uppercase">
            <span>Pergunta</span>
            <span>Resposta</span>
          </div>
          {defaultPerguntas.map(p => {
            const key = p.toLowerCase().replace(/[^a-z]/g, "_");
            return (
              <div key={key} className="grid grid-cols-[1fr_1fr] px-2 py-3 items-center gap-2">
                <span className="text-sm text-foreground">{p}</span>
                <RadioGroup value={respostas[key] || ""} onValueChange={v => setResposta(key, v)} className="flex gap-4">
                  <div className="flex items-center gap-1"><RadioGroupItem value="sim" id={`${key}-s`} /><Label htmlFor={`${key}-s`} className="text-sm">Sim</Label></div>
                  <div className="flex items-center gap-1"><RadioGroupItem value="nao" id={`${key}-n`} /><Label htmlFor={`${key}-n`} className="text-sm">Não</Label></div>
                </RadioGroup>
              </div>
            );
          })}
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
