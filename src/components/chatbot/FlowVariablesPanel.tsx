import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export type FlowVariable = {
  name: string;
  default_value: string;
  description?: string;
};

const systemVariables = [
  { name: 'sector', description: 'Setor para transferência' },
  { name: 'user', description: 'Usuário para transferência' },
  { name: 'greeting', description: 'Saudação baseada no horário (Bom dia, Boa tarde, Boa noite)' },
  { name: 'name', description: 'Nome do contato salvo ou nome que vem do WhatsApp' },
  { name: 'protocol', description: 'Protocolo de atendimento' },
  { name: 'date', description: 'Data atual formatada' },
  { name: 'time', description: 'Hora atual formatada' },
  { name: 'account_name', description: 'Nome da conta/empresa' },
  { name: 'phone', description: 'Número do WhatsApp do contato' },
  { name: 'channel_name', description: 'Nome do canal' },
];

type Props = {
  variables: FlowVariable[];
  onChange: (variables: FlowVariable[]) => void;
};

export default function FlowVariablesPanel({ variables, onChange }: Props) {
  const [newName, setNewName] = useState('');
  const [newDefault, setNewDefault] = useState('');

  function addVariable() {
    if (!newName.trim()) return toast.error('Nome da variável é obrigatório');
    if (variables.some(v => v.name === newName.trim()) || systemVariables.some(v => v.name === newName.trim())) {
      return toast.error('Variável já existe');
    }
    onChange([...variables, { name: newName.trim(), default_value: newDefault }]);
    setNewName('');
    setNewDefault('');
  }

  function removeVariable(name: string) {
    onChange(variables.filter(v => v.name !== name));
  }

  function copyVariable(name: string) {
    navigator.clipboard.writeText(`{{${name}}}`);
    toast.success(`{{${name}}} copiado!`);
  }

  return (
    <div className="space-y-1">
      {systemVariables.map(v => (
        <div
          key={v.name}
          className="py-3 border-b border-border/50 cursor-pointer hover:bg-accent/30 px-1 rounded transition-colors"
          onClick={() => copyVariable(v.name)}
        >
          <span className="text-sm font-bold text-primary">{`{{ ${v.name} }}`}</span>
          <p className="text-sm text-muted-foreground mt-0.5">{v.description}</p>
        </div>
      ))}

      {variables.length > 0 && (
        <div className="pt-4">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Variáveis personalizadas</Label>
          {variables.map(v => (
            <div key={v.name} className="py-3 border-b border-border/50 flex items-start justify-between group">
              <div className="cursor-pointer hover:bg-accent/30 flex-1 rounded px-1" onClick={() => copyVariable(v.name)}>
                <span className="text-sm font-bold text-primary">{`{{ ${v.name} }}`}</span>
                <p className="text-sm text-muted-foreground mt-0.5">{v.default_value || 'Sem valor padrão'}</p>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 shrink-0" onClick={() => removeVariable(v.name)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="pt-4">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Adicionar variável</Label>
        <div className="flex gap-2 mt-2">
          <Input
            value={newName}
            onChange={e => setNewName(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
            placeholder="nome_variavel"
            className="text-xs h-8"
          />
          <Input
            value={newDefault}
            onChange={e => setNewDefault(e.target.value)}
            placeholder="Valor padrão"
            className="text-xs h-8"
          />
          <Button size="sm" variant="outline" className="h-8 shrink-0" onClick={addVariable}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
