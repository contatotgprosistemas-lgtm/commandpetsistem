import { memo, useCallback } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from '@xyflow/react';
import { Shuffle, X, Plus, Trash2 } from 'lucide-react';

function RandomMessageNode({ id, data, selected }: NodeProps) {
  const { setNodes, setEdges } = useReactFlow();
  const d = data as Record<string, any>;
  const messages = (d.random_messages || ['']) as string[];

  const update = useCallback((key: string, value: any) => {
    setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...n.data, [key]: value } } : n));
  }, [id, setNodes]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setNodes(nds => nds.filter(n => n.id !== id));
    setEdges(eds => eds.filter(e => e.source !== id && e.target !== id));
  }, [id, setNodes, setEdges]);

  const addMessage = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    update('random_messages', [...messages, '']);
  }, [messages, update]);

  const removeMessage = useCallback((e: React.MouseEvent, idx: number) => {
    e.stopPropagation();
    update('random_messages', messages.filter((_, i) => i !== idx));
  }, [messages, update]);

  const updateMessage = useCallback((idx: number, value: string) => {
    const newMsgs = [...messages];
    newMsgs[idx] = value;
    update('random_messages', newMsgs);
  }, [messages, update]);

  return (
    <div className={`w-72 rounded-lg border-2 bg-card shadow-md transition-all ${selected ? 'border-primary ring-2 ring-primary/20' : 'border-muted'}`}>
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border">
        <div className="flex items-center gap-1.5">
          <Shuffle className="h-4 w-4 text-pink-500" />
          <span className="text-xs font-semibold text-foreground">Mensagem Aleatória</span>
        </div>
        <button onClick={handleDelete} className="text-red-500 hover:text-red-600 transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="p-3 space-y-2">
        <p className="text-[10px] text-muted-foreground">Uma mensagem será escolhida aleatoriamente:</p>
        {messages.map((msg, i) => (
          <div key={i} className="flex gap-1.5 items-start">
            <span className="text-[10px] font-bold text-muted-foreground mt-1.5 shrink-0">{i + 1}.</span>
            <textarea
              value={msg}
              onChange={e => updateMessage(i, e.target.value)}
              placeholder={`Mensagem ${i + 1}`}
              rows={2}
              className="flex-1 text-xs bg-muted/30 border border-border rounded px-2 py-1 resize-none focus:outline-none focus:ring-1 focus:ring-primary"
              onClick={e => e.stopPropagation()}
            />
            {messages.length > 1 && (
              <button onClick={e => removeMessage(e, i)} className="text-red-500 hover:text-red-600 mt-1 shrink-0">
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
        <button
          onClick={addMessage}
          className="w-full flex items-center justify-center gap-1 text-xs text-primary border border-dashed border-primary/50 rounded py-1.5 hover:bg-primary/5 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> Adicionar Mensagem
        </button>
      </div>
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-green-500 !border-2 !border-background" />
      <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-red-500 !border-2 !border-background" />
    </div>
  );
}

export default memo(RandomMessageNode);
