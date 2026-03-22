import { useState, useCallback } from 'react';
import { Settings, X } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';

type FlowConfig = {
  inactivity_active: boolean;
  inactivity_quantity: string;
  inactivity_time: string;
  inactivity_action: string;
  redirect_active: boolean;
  redirect_quantity: string;
  redirect_to: string;
  close_keywords: string[];
  msg_inactivity_enabled: boolean;
  msg_inactivity_text: string;
  msg_invalid_option_enabled: boolean;
  msg_invalid_option_text: string;
  msg_finished_enabled: boolean;
  msg_finished_text: string;
  msg_transfer_user_enabled: boolean;
  msg_transfer_user_text: string;
  msg_transfer_sector_enabled: boolean;
  msg_transfer_sector_text: string;
};

type Props = {
  config: FlowConfig;
  onChange: (config: FlowConfig) => void;
};

export default function FlowConfigPopover({ config, onChange }: Props) {
  const [keywordInput, setKeywordInput] = useState('');

  const update = useCallback((key: keyof FlowConfig, value: any) => {
    onChange({ ...config, [key]: value });
  }, [config, onChange]);

  const addKeywords = useCallback((input: string) => {
    const words = input.trim().split(/\s+/).filter(w => w.length > 0);
    if (words.length === 0) return;
    const existing = new Set(config.close_keywords);
    words.forEach(w => existing.add(w.toLowerCase()));
    update('close_keywords', Array.from(existing));
    setKeywordInput('');
  }, [config.close_keywords, update]);

  const removeKeyword = useCallback((keyword: string) => {
    update('close_keywords', config.close_keywords.filter(k => k !== keyword));
  }, [config.close_keywords, update]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-2 px-3 py-2 rounded-lg text-white text-xs font-semibold w-full transition-all bg-purple-500 hover:bg-purple-600 shadow-sm hover:shadow-md">
          <Settings className="h-4 w-4" />
          Configuração
        </button>
      </PopoverTrigger>
      <PopoverContent side="right" align="start" className="w-[420px] p-0">
        <Tabs defaultValue="recursos" className="w-full">
          <TabsList className="w-full rounded-b-none">
            <TabsTrigger value="recursos" className="flex-1 text-xs">Recursos</TabsTrigger>
            <TabsTrigger value="mensagens" className="flex-1 text-xs">Mensagens</TabsTrigger>
          </TabsList>

          <TabsContent value="recursos" className="p-0 max-h-[70vh] overflow-y-auto">
            <div className="space-y-0">
              <div className="border-b border-border p-4 space-y-3">
                <div className="border-l-4 border-primary pl-3">
                  <h4 className="text-sm font-bold text-foreground">Alerta de inatividade</h4>
                  <p className="text-xs text-muted-foreground">Configure alertas automáticos quando o usuário ficar inativo</p>
                </div>
                <div className="space-y-3 pl-1">
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">Alerta de inatividade</label>
                    <select
                      value={config.inactivity_active ? 'active' : 'inactive'}
                      onChange={e => update('inactivity_active', e.target.value === 'active')}
                      className="w-full text-sm bg-background border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="active">Ativo</option>
                      <option value="inactive">Inativo</option>
                    </select>
                  </div>
                  {config.inactivity_active && (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-xs text-muted-foreground">Quantidade de alerta</label>
                        <Input type="number" value={config.inactivity_quantity} onChange={e => update('inactivity_quantity', e.target.value)} placeholder="Ex: 3" className="text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs text-muted-foreground">Tempo de alerta (minutos)</label>
                        <Input type="number" value={config.inactivity_time} onChange={e => update('inactivity_time', e.target.value)} placeholder="Ex: 5" className="text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs text-muted-foreground">Ação</label>
                        <select
                          value={config.inactivity_action}
                          onChange={e => update('inactivity_action', e.target.value)}
                          className="w-full text-sm bg-background border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          <option value="">Selecione uma ação</option>
                          <option value="send_message">Enviar mensagem</option>
                          <option value="close">Encerrar conversa</option>
                          <option value="redirect">Redirecionar</option>
                        </select>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="border-b border-border p-4 space-y-3">
                <div className="border-l-4 border-primary pl-3">
                  <h4 className="text-sm font-bold text-foreground">Redirecionar tentativas erradas</h4>
                  <p className="text-xs text-muted-foreground">Redirecione após múltiplas tentativas incorretas</p>
                </div>
                <div className="space-y-3 pl-1">
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">Redirecionar tentativas erradas</label>
                    <select
                      value={config.redirect_active ? 'active' : 'inactive'}
                      onChange={e => update('redirect_active', e.target.value === 'active')}
                      className="w-full text-sm bg-background border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="active">Ativo</option>
                      <option value="inactive">Inativo</option>
                    </select>
                  </div>
                  {config.redirect_active && (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-xs text-muted-foreground">Quantidade</label>
                        <Input type="number" value={config.redirect_quantity} onChange={e => update('redirect_quantity', e.target.value)} placeholder="Ex: 3" className="text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs text-muted-foreground">Redirecionar para:</label>
                        <select
                          value={config.redirect_to}
                          onChange={e => update('redirect_to', e.target.value)}
                          className="w-full text-sm bg-background border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          <option value="">Selecione</option>
                          <option value="human">Atendimento humano</option>
                          <option value="flow">Outro fluxo</option>
                          <option value="close">Encerrar</option>
                        </select>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="p-4 space-y-3">
                <div className="border-l-4 border-primary pl-3">
                  <h4 className="text-sm font-bold text-foreground">Gatilho de encerramento</h4>
                  <p className="text-xs text-muted-foreground">Palavras que encerram automaticamente o atendimento do chatbot</p>
                </div>
                <div className="space-y-1.5 pl-1">
                  <label className="text-xs text-muted-foreground">Palavras gatilho</label>
                  <Input
                    value={keywordInput}
                    onChange={e => setKeywordInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addKeywords(keywordInput); } }}
                    placeholder="Digite uma palavra e pressione Enter"
                    className="text-sm"
                  />
                  {config.close_keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {config.close_keywords.map(kw => (
                        <Badge key={kw} variant="secondary" className="text-xs gap-1 pr-1">
                          {kw}
                          <button onClick={() => removeKeyword(kw)} className="hover:text-destructive">
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="mensagens" className="p-0 max-h-[70vh] overflow-y-auto">
            <div className="space-y-0">
              {[
                { key: 'msg_inactivity', title: 'Mensagem de Inatividade', desc: 'Mensagem quando o usuário ficar inativo', placeholder: 'Olá! Percebemos que você está inativo. Podemos ajudar em algo mais?' },
                { key: 'msg_invalid_option', title: 'Mensagem de opção inválida', desc: 'Quando o usuário seleciona uma opção inválida', placeholder: 'Desculpe, não consegui identificar a opção escolhida.' },
                { key: 'msg_finished', title: 'Mensagem de atendimento finalizado', desc: 'Quando o atendimento é finalizado', placeholder: 'Atendimento finalizado' },
                { key: 'msg_transfer_user', title: 'Mensagem de transferência (Usuário)', desc: 'Quando acontece transferência para usuário', placeholder: 'Você foi transferido para o atendente {{ user }}' },
                { key: 'msg_transfer_sector', title: 'Mensagem de transferência (Setor)', desc: 'Quando acontece transferência para setor', placeholder: 'Você foi transferido para o setor {{ sector }}' },
              ].map(item => (
                <div key={item.key} className="border-b border-border p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="border-l-4 border-primary pl-3">
                      <h4 className="text-sm font-bold text-foreground">{item.title}</h4>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    <Switch
                      checked={(config as any)[`${item.key}_enabled`]}
                      onCheckedChange={v => update(`${item.key}_enabled` as keyof FlowConfig, v)}
                    />
                  </div>
                  {(config as any)[`${item.key}_enabled`] && (
                    <div className="space-y-1.5 pl-1">
                      <Textarea
                        value={(config as any)[`${item.key}_text`]}
                        onChange={e => update(`${item.key}_text` as keyof FlowConfig, e.target.value)}
                        placeholder={item.placeholder}
                        className="text-sm min-h-[80px]"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
