import { memo, useCallback } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from '@xyflow/react';
import { Tag, X } from 'lucide-react';

const TAG_COLORS = [
  { label: 'Azul', value: '#3b82f6' },
  { label: 'Verde', value: '#22c55e' },
  { label: 'Vermelho', value: '#ef4444' },
  { label: 'Amarelo', value: '#eab308' },
  { label: 'Roxo', value: '#a855f7' },
  { label: 'Rosa', value: '#ec4899' },
  { label: 'Laranja', value: '#f97316' },
  { label: 'Cinza', value: '#6b7280' },
];

function TagNode({ id, data, selected }: NodeProps) {
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

  const tagColor = d.tag_color || '#3b82f6';

  return (
    <div className={`w-60 rounded-lg border-2 bg-card shadow-md transition-all ${selected ? 'border-primary ring-2 ring-primary/20' : 'border-muted'}`}>
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border">
        <div className="flex items-center gap-1.5">
          <Tag className="h-4 w-4 text-yellow-500" />
          <span className="text-xs font-semibold text-foreground">Etiqueta</span>
        </div>
        <button onClick={handleDelete} className="text-red-500 hover:text-red-600 transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="p-3 space-y-2">
        <div>
          <label className="text-[10px] text-muted-foreground">Ação</label>
          <select
            value={d.tag_action || 'add'}
            onChange={e => update('tag_action', e.target.value)}
            className="w-full text-xs bg-muted/50 border border-border rounded px-2 py-1 mt-0.5 focus:outline-none focus:ring-1 focus:ring-primary"
            onClick={e => e.stopPropagation()}
          >
            <option value="add">Adicionar etiqueta</option>
            <option value="remove">Remover etiqueta</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground">Nome da etiqueta</label>
          <input
            value={d.tag_name || ''}
            onChange={e => update('tag_name', e.target.value)}
            placeholder="Ex: Cliente VIP"
            className="w-full text-xs bg-muted/30 border border-border rounded px-2 py-1 mt-0.5 focus:outline-none focus:ring-1 focus:ring-primary"
            onClick={e => e.stopPropagation()}
          />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground">Cor</label>
          <div className="flex gap-1 mt-1 flex-wrap">
            {TAG_COLORS.map(c => (
              <button
                key={c.value}
                onClick={e => { e.stopPropagation(); update('tag_color', c.value); }}
                className={`w-5 h-5 rounded-full border-2 transition-all ${tagColor === c.value ? 'border-foreground scale-110' : 'border-transparent'}`}
                style={{ backgroundColor: c.value }}
                title={c.label}
              />
            ))}
          </div>
        </div>
      </div>
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-green-500 !border-2 !border-background" />
      <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-red-500 !border-2 !border-background" />
    </div>
  );
}

export default memo(TagNode);
