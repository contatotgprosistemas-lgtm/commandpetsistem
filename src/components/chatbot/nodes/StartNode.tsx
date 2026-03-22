import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';

function StartNode({ selected }: NodeProps) {
  return (
    <div className={`w-32 rounded-lg bg-card border-2 shadow-sm text-center transition-all ${selected ? 'border-primary ring-2 ring-primary/20' : 'border-muted'}`}>
      <div className="flex items-center justify-center gap-1.5 px-3 py-2.5">
        <div className="w-3 h-3 rounded-full bg-green-500" />
        <span className="text-sm font-semibold text-foreground">Início</span>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-red-500 !border-2 !border-background"
      />
    </div>
  );
}

export default memo(StartNode);
