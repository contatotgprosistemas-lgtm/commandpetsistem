import { memo, useCallback } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from '@xyflow/react';
import { List, X, Plus, GripVertical } from 'lucide-react';

function MenuNode({ id, data, selected }: NodeProps) {
  const { setNodes, setEdges } = useReactFlow();
  const d = data as Record<string, any>;
  const options = (d.options || []) as { label: string }[];
  const message = d.message || '';
  const title = d.menu_title || '';

  const update = useCallback((key: string, value: any) => {
    setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...n.data, [key]: value } } : n));
  }, [id, setNodes]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setNodes(nds => nds.filter(n => n.id !== id));
    setEdges(eds => eds.filter(e => e.source !== id && e.target !== id));
  }, [id, setNodes, setEdges]);

  const addOption = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    update('options', [...options, { label: '' }]);
  }, [options, update]);

  const removeOption = useCallback((e: React.MouseEvent, idx: number) => {
    e.stopPropagation();
    update('options', options.filter((_, i) => i !== idx));
    setEdges(eds => eds
      .filter(edge => !(edge.source === id && edge.sourceHandle === `option-${idx}`))
      .map(edge => {
        if (edge.source !== id || !edge.sourceHandle?.startsWith('option-')) return edge;
        const optionIndex = Number(edge.sourceHandle.replace('option-', ''));
        if (Number.isNaN(optionIndex) || optionIndex < idx) return edge;
        const nextHandle = `option-${optionIndex - 1}`;
        return {
          ...edge,
          id: `${edge.source}:${nextHandle}:${edge.target}`,
          sourceHandle: nextHandle,
        };
      }));
  }, [id, options, setEdges, update]);

  const updateOption = useCallback((idx: number, label: string) => {
    const newOpts = [...options];
    newOpts[idx] = { ...newOpts[idx], label };
    update('options', newOpts);
  }, [options, update]);

  return (
    <div className={`w-72 rounded-lg border-2 bg-card shadow-md transition-all ${selected ? 'border-primary ring-2 ring-primary/20' : 'border-muted'}`}>
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border">
        <div className="flex items-center gap-1.5">
          <List className="h-4 w-4 text-amber-500" />
          <span className="text-xs font-semibold text-foreground">Menu</span>
        </div>
        <button onClick={handleDelete} className="text-red-500 hover:text-red-600 transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="p-3 space-y-2">
        <input
          value={title}
          onChange={e => update('menu_title', e.target.value)}
          placeholder="Título do menu"
          className="w-full text-xs bg-muted/30 border border-border rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
          onClick={e => e.stopPropagation()}
        />
        <div className="relative">
          <textarea
            value={message}
            onChange={e => { if (e.target.value.length <= 500) update('message', e.target.value); }}
            placeholder="Mensagem do menu..."
            rows={2}
            className="w-full text-xs bg-muted/30 border border-border rounded px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-primary"
            onClick={e => e.stopPropagation()}
          />
          <span className="absolute bottom-2 right-2 text-[9px] text-muted-foreground">{message.length}/500</span>
        </div>
        <button
          onClick={addOption}
          className="w-full flex items-center justify-center gap-1 text-xs text-primary border border-dashed border-primary/50 rounded py-1.5 hover:bg-primary/5 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> Adicionar Opção
        </button>
        {options.length > 0 && (
          <div className="space-y-1.5">
            {options.map((opt, i) => (
              <div key={i} className="relative flex items-center gap-1.5 pr-3">
                <span className="flex items-center justify-center w-6 h-6 rounded bg-primary/10 text-[10px] font-bold text-primary shrink-0">
                  {i + 1}
                </span>
                <input
                  value={opt.label}
                  onChange={e => updateOption(i, e.target.value)}
                  placeholder={`Opção ${i + 1}`}
                  className="flex-1 text-xs bg-muted/30 border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary min-w-0"
                  onClick={e => e.stopPropagation()}
                />
                <GripVertical className="h-3.5 w-3.5 text-muted-foreground shrink-0 cursor-grab" />
                <button onClick={e => removeOption(e, i)} className="text-red-500 hover:text-red-600 shrink-0">
                  <X className="h-3 w-3" />
                </button>
                <Handle
                  type="source"
                  position={Position.Right}
                  id={`option-${i}`}
                  className="!w-2.5 !h-2.5 !bg-red-500 !border-2 !border-background !absolute !right-0 !top-1/2 !-translate-y-1/2 !translate-x-1/2"
                />
              </div>
            ))}
          </div>
        )}
      </div>
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-green-500 !border-2 !border-background" />
      {options.length === 0 && (
        <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-red-500 !border-2 !border-background" />
      )}
    </div>
  );
}

export default memo(MenuNode);
