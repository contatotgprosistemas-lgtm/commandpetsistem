import { memo, useCallback } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from '@xyflow/react';
import { GitBranch, X } from 'lucide-react';

function ConditionNode({ id, data, selected }: NodeProps) {
  const { setNodes, setEdges } = useReactFlow();
  const d = data as Record<string, any>;
  const config = d.condition_config || {};

  const update = useCallback((key: string, value: any) => {
    setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...n.data, [key]: value } } : n));
  }, [id, setNodes]);

  const updateConfig = useCallback((field: string, value: string) => {
    const newConfig = { ...config, [field]: value };
    update('condition_config', newConfig);
  }, [config, update]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setNodes(nds => nds.filter(n => n.id !== id));
    setEdges(eds => eds.filter(e => e.source !== id && e.target !== id));
  }, [id, setNodes, setEdges]);

  return (
    <div className={`w-64 rounded-lg border-2 bg-card shadow-md transition-all ${selected ? 'border-primary ring-2 ring-primary/20' : 'border-muted'}`}>
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border">
        <div className="flex items-center gap-1.5">
          <GitBranch className="h-4 w-4 text-emerald-500" />
          <span className="text-xs font-semibold text-foreground">Condição</span>
        </div>
        <button onClick={handleDelete} className="text-red-500 hover:text-red-600 transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="p-3 space-y-2">
        <div>
          <label className="text-[10px] text-muted-foreground">Variável</label>
          <input
            value={config.variable || ''}
            onChange={e => updateConfig('variable', e.target.value)}
            placeholder="Ex: nome, telefone"
            className="w-full text-xs bg-muted/30 border border-border rounded px-2 py-1 mt-0.5 focus:outline-none focus:ring-1 focus:ring-primary"
            onClick={e => e.stopPropagation()}
          />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground">Operador</label>
          <select
            value={config.operator || 'equals'}
            onChange={e => updateConfig('operator', e.target.value)}
            className="w-full text-xs bg-muted/50 border border-border rounded px-2 py-1 mt-0.5 focus:outline-none focus:ring-1 focus:ring-primary"
            onClick={e => e.stopPropagation()}
          >
            <option value="equals">Igual a</option>
            <option value="contains">Contém</option>
            <option value="starts_with">Começa com</option>
            <option value="not_equals">Diferente de</option>
            <option value="is_empty">Está vazio</option>
            <option value="is_not_empty">Não está vazio</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground">Valor</label>
          <input
            value={config.value || ''}
            onChange={e => updateConfig('value', e.target.value)}
            placeholder="Valor para comparar"
            className="w-full text-xs bg-muted/30 border border-border rounded px-2 py-1 mt-0.5 focus:outline-none focus:ring-1 focus:ring-primary"
            onClick={e => e.stopPropagation()}
          />
        </div>
        <div className="flex justify-between pt-1">
          <span className="text-[10px] font-semibold text-green-600">✓ Sim</span>
          <span className="text-[10px] font-semibold text-red-500">✗ Não</span>
        </div>
      </div>
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-green-500 !border-2 !border-background" />
      <Handle type="source" position={Position.Bottom} id="true" className="!w-2.5 !h-2.5 !bg-green-500 !border-2 !border-background" style={{ left: '30%' }} />
      <Handle type="source" position={Position.Bottom} id="false" className="!w-2.5 !h-2.5 !bg-red-500 !border-2 !border-background" style={{ left: '70%' }} />
    </div>
  );
}

export default memo(ConditionNode);
