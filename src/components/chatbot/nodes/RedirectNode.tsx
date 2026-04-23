import { memo, useCallback, useEffect, useState } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from '@xyflow/react';
import { CornerDownLeft, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

function RedirectNode({ id, data, selected }: NodeProps) {
  const { setNodes, setEdges } = useReactFlow();
  const d = data as Record<string, any>;
  const [agents, setAgents] = useState<{ user_id: string; nome: string }[]>([]);

  const update = useCallback((key: string, value: any) => {
    setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...n.data, [key]: value } } : n));
  }, [id, setNodes]);

  useEffect(() => {
    if (d.redirect_type !== 'agent') return;
    (async () => {
      const { data: prof } = await supabase
        .from('profiles')
        .select('user_id, nome')
        .order('nome');
      if (prof) setAgents(prof.filter((p: any) => p.user_id) as any);
    })();
  }, [d.redirect_type]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setNodes(nds => nds.filter(n => n.id !== id));
    setEdges(eds => eds.filter(e => e.source !== id && e.target !== id));
  }, [id, setNodes, setEdges]);

  return (
    <div className={`w-64 rounded-lg border-2 bg-card shadow-md transition-all ${selected ? 'border-primary ring-2 ring-primary/20' : 'border-muted'}`}>
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border">
        <div className="flex items-center gap-1.5">
          <CornerDownLeft className="h-4 w-4 text-teal-500" />
          <span className="text-xs font-semibold text-foreground">Redirecionar</span>
        </div>
        <button onClick={handleDelete} className="text-red-500 hover:text-red-600 transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="p-3 space-y-2">
        <div>
          <label className="text-[10px] text-muted-foreground">Redirecionar para</label>
          <select
            value={d.redirect_type || 'flow'}
            onChange={e => update('redirect_type', e.target.value)}
            className="w-full text-xs bg-muted/50 border border-border rounded px-2 py-1 mt-0.5 focus:outline-none focus:ring-1 focus:ring-primary"
            onClick={e => e.stopPropagation()}
          >
            <option value="flow">Outro fluxo</option>
            <option value="agent">Atendente humano</option>
          </select>
        </div>
        {d.redirect_type === 'agent' ? (
          <>
            <div>
              <label className="text-[10px] text-muted-foreground">Atendente</label>
              <select
                value={d.agent_id || ''}
                onChange={e => {
                  const sel = agents.find(a => a.user_id === e.target.value);
                  update('agent_id', e.target.value);
                  update('agent_name', sel?.nome || '');
                }}
                className="w-full text-xs bg-muted/50 border border-border rounded px-2 py-1 mt-0.5 focus:outline-none focus:ring-1 focus:ring-primary"
                onClick={e => e.stopPropagation()}
              >
                <option value="">Qualquer atendente disponível</option>
                {agents.map(a => (
                  <option key={a.user_id} value={a.user_id}>{a.nome}</option>
                ))}
              </select>
            </div>
            <p className="text-[10px] text-muted-foreground italic">
              O bot será desativado e o cliente verá: "Você foi transferido para {d.agent_name || 'um atendente'}".
            </p>
          </>
        ) : (
          <div>
            <label className="text-[10px] text-muted-foreground">Nome do fluxo</label>
            <input
              value={d.redirect_flow || ''}
              onChange={e => update('redirect_flow', e.target.value)}
              placeholder="Ex: Atendimento"
              className="w-full text-xs bg-muted/30 border border-border rounded px-2 py-1 mt-0.5 focus:outline-none focus:ring-1 focus:ring-primary"
              onClick={e => e.stopPropagation()}
            />
          </div>
        )}
      </div>
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-green-500 !border-2 !border-background" />
    </div>
  );
}

export default memo(RedirectNode);
