import { memo, useCallback } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from '@xyflow/react';
import { CircleStop, X } from 'lucide-react';

function EndNode({ id, data, selected }: NodeProps) {
  const { setNodes, setEdges } = useReactFlow();
  const d = data as Record<string, any>;

  const update = useCallback((key: string, value: any) => {
    setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...n.data, [key]: value } } : n));
  }, [id, setNodes]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setNodes(nds => nds.filter(n => n.id !== id));
    setEdges(eds => eds.filter(e => e.source !== id && e.target !== id));
  }, [id, setNodes, setEdges]);

  return (
    <div className={`w-56 rounded-lg border-2 bg-card shadow-md transition-all ${selected ? 'border-primary ring-2 ring-primary/20' : 'border-muted'}`}>
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border">
        <div className="flex items-center gap-1.5">
          <CircleStop className="h-4 w-4 text-red-500" />
          <span className="text-xs font-semibold text-foreground">Finalizar</span>
        </div>
        <button onClick={handleDelete} className="text-red-500 hover:text-red-600 transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="p-3 space-y-2">
        <div>
          <label className="text-[10px] text-muted-foreground">Ação ao finalizar</label>
          <select
            value={d.end_action || 'close'}
            onChange={e => update('end_action', e.target.value)}
            className="w-full text-xs bg-muted/50 border border-border rounded px-2 py-1 mt-0.5 focus:outline-none focus:ring-1 focus:ring-primary"
            onClick={e => e.stopPropagation()}
          >
            <option value="close">Encerrar conversa</option>
            <option value="deactivate_bot">Desativar bot</option>
            <option value="restart">Reiniciar fluxo</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground">Mensagem final (opcional)</label>
          <textarea
            value={d.message || ''}
            onChange={e => update('message', e.target.value)}
            placeholder="Obrigado pelo contato!"
            rows={2}
            className="w-full text-xs bg-muted/30 border border-border rounded px-2 py-1.5 resize-none mt-0.5 focus:outline-none focus:ring-1 focus:ring-primary"
            onClick={e => e.stopPropagation()}
          />
        </div>
      </div>
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-green-500 !border-2 !border-background" />
    </div>
  );
}

export default memo(EndNode);
