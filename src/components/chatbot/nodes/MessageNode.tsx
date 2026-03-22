import { memo, useCallback } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from '@xyflow/react';
import { MessageCircle, X } from 'lucide-react';

function MessageNode({ id, data, selected }: NodeProps) {
  const { setNodes, setEdges } = useReactFlow();
  const d = data as Record<string, any>;
  const continueMode = d.continue_mode || 'auto';

  const update = useCallback((key: string, value: any) => {
    setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...n.data, [key]: value } } : n));
  }, [id, setNodes]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setNodes(nds => nds.filter(n => n.id !== id));
    setEdges(eds => eds.filter(e => e.source !== id && e.target !== id));
  }, [id, setNodes, setEdges]);

  return (
    <div className={`w-72 rounded-lg border-2 bg-card shadow-md transition-all ${selected ? 'border-primary ring-2 ring-primary/20' : 'border-muted'}`}>
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border">
        <div className="flex items-center gap-1.5">
          <MessageCircle className="h-4 w-4 text-green-500" />
          <span className="text-xs font-semibold text-foreground">Mensagem</span>
        </div>
        <button onClick={handleDelete} className="text-red-500 hover:text-red-600 transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="p-3 space-y-2">
        <div>
          <label className="text-[10px] text-muted-foreground">Tipo de Mensagem</label>
          <select
            value={d.message_type || 'text'}
            onChange={e => update('message_type', e.target.value)}
            className="w-full text-xs bg-muted/50 border border-border rounded px-2 py-1 mt-0.5 focus:outline-none focus:ring-1 focus:ring-primary"
            onClick={e => e.stopPropagation()}
          >
            <option value="text">Texto</option>
            <option value="image">Imagem</option>
            <option value="audio">Áudio</option>
            <option value="video">Vídeo</option>
            <option value="document">Documento</option>
          </select>
        </div>
        <textarea
          value={d.message || ''}
          onChange={e => update('message', e.target.value)}
          placeholder="Digite a mensagem..."
          rows={3}
          className="w-full text-xs bg-muted/30 border border-border rounded px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-primary"
          onClick={e => e.stopPropagation()}
        />
        <div>
          <label className="text-[10px] text-muted-foreground">Continuar</label>
          <select
            value={continueMode}
            onChange={e => update('continue_mode', e.target.value)}
            className="w-full text-xs bg-muted/50 border border-border rounded px-2 py-1 mt-0.5 focus:outline-none focus:ring-1 focus:ring-primary"
            onClick={e => e.stopPropagation()}
          >
            <option value="auto">Automaticamente</option>
            <option value="after_reply">Após resposta</option>
          </select>
        </div>
      </div>
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-green-500 !border-2 !border-background" />
      <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-red-500 !border-2 !border-background" />
    </div>
  );
}

export default memo(MessageNode);
