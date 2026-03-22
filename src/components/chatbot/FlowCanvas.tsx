import { useState, useCallback, useRef, useEffect, type DragEvent } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Edge,
  Node,
  MarkerType,
  Panel,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  MessageCircle, List, GitBranch, Save, Variable,
  Settings, CornerDownLeft, CircleStop, Tag, Shuffle, Database,
} from 'lucide-react';
import MessageNode from './nodes/MessageNode';
import MenuNode from './nodes/MenuNode';
import ConditionNode from './nodes/ConditionNode';
import StartNode from './nodes/StartNode';
import RedirectNode from './nodes/RedirectNode';
import EndNode from './nodes/EndNode';
import TagNode from './nodes/TagNode';
import RandomMessageNode from './nodes/RandomMessageNode';
import DataNode from './nodes/DataNode';
import DeleteButtonEdge from './edges/DeleteButtonEdge';
import FlowVariablesPanel, { FlowVariable } from './FlowVariablesPanel';
import FlowConfigPopover from './FlowConfigPopover';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

const nodeTypes = {
  start: StartNode,
  message: MessageNode,
  menu: MenuNode,
  condition: ConditionNode,
  redirect: RedirectNode,
  end: EndNode,
  tag: TagNode,
  random: RandomMessageNode,
  data: DataNode,
};

const edgeTypes = {
  deletable: DeleteButtonEdge,
};

const edgeDefaults = {
  type: 'deletable' as const,
  animated: false,
  markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14 },
  style: { strokeWidth: 1.5, stroke: 'hsl(var(--muted-foreground))' },
};

type Props = {
  flowId: string;
  flowName: string;
  initialVariables: FlowVariable[];
};

const draggableSidebarItems = [
  { type: 'message', label: 'Mensagem', icon: MessageCircle, color: 'bg-green-500 hover:bg-green-600' },
  { type: 'menu', label: 'Menu', icon: List, color: 'bg-blue-500 hover:bg-blue-600' },
  { type: 'condition', label: 'Condição', icon: GitBranch, color: 'bg-emerald-500 hover:bg-emerald-600' },
  { type: 'redirect', label: 'Redirecionar', icon: CornerDownLeft, color: 'bg-teal-500 hover:bg-teal-600' },
  { type: 'end', label: 'Finalizar', icon: CircleStop, color: 'bg-red-500 hover:bg-red-600' },
  { type: 'tag', label: 'Etiqueta', icon: Tag, color: 'bg-yellow-500 hover:bg-yellow-600' },
  { type: 'random', label: 'Msg Aleatória', icon: Shuffle, color: 'bg-pink-500 hover:bg-pink-600' },
  { type: 'data', label: 'Dados', icon: Database, color: 'bg-cyan-500 hover:bg-cyan-600' },
];

export default function FlowCanvas({ flowId, flowName, initialVariables }: Props) {
  const { profile } = useAuth();
  const empresaId = profile?.empresa_id;
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [variables, setVariables] = useState<FlowVariable[]>(initialVariables);
  const [saving, setSaving] = useState(false);
  const [flowConfig, setFlowConfig] = useState({
    inactivity_active: false,
    inactivity_quantity: '',
    inactivity_time: '',
    inactivity_action: '',
    redirect_active: false,
    redirect_quantity: '',
    redirect_to: '',
    close_keywords: [] as string[],
    msg_inactivity_enabled: false,
    msg_inactivity_text: '',
    msg_invalid_option_enabled: false,
    msg_invalid_option_text: '',
    msg_finished_enabled: false,
    msg_finished_text: '',
    msg_transfer_user_enabled: false,
    msg_transfer_user_text: '',
    msg_transfer_sector_enabled: false,
    msg_transfer_sector_text: '',
  });
  const initialized = useRef(false);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    loadFlow();
  }, [flowId]);

  async function loadFlow() {
    const { data: steps } = await supabase
      .from('chatbot_flow_steps')
      .select('*')
      .eq('flow_id', flowId)
      .order('position');

    if (!steps || steps.length === 0) {
      setNodes([{
        id: 'start',
        type: 'start',
        position: { x: 300, y: 50 },
        data: {},
        deletable: false,
      }]);
      return;
    }

    const flowNodes: Node[] = [{
      id: 'start',
      type: 'start',
      position: { x: 300, y: 0 },
      data: {},
      deletable: false,
    }];

    const flowEdges: Edge[] = [];

    steps.forEach((step: any, idx: number) => {
      const validTypes = ['menu', 'condition', 'redirect', 'end', 'tag', 'random', 'data'];
      const nodeType = validTypes.includes(step.step_type) ? step.step_type : 'message';
      flowNodes.push({
        id: step.id,
        type: nodeType,
        position: {
          x: step.position_x !== undefined && step.position_x !== 0 ? step.position_x : 300,
          y: step.position_y !== undefined && step.position_y !== 0 ? step.position_y : (idx + 1) * 220,
        },
        data: {
          message: step.message,
          options: step.options || [],
          delay_seconds: step.delay_seconds || 0,
          condition_config: step.condition_config || {},
          step_type: step.step_type,
          db_id: step.id,
        },
      });

      if (idx === 0) {
        flowEdges.push({ id: `start-${step.id}`, source: 'start', target: step.id, ...edgeDefaults });
      }

      if (step.next_step_id) {
        flowEdges.push({ id: `${step.id}-${step.next_step_id}`, source: step.id, target: step.next_step_id, ...edgeDefaults });
      }
    });

    for (let i = 0; i < steps.length - 1; i++) {
      const current = steps[i] as any;
      const next = steps[i + 1] as any;
      const hasEdge = flowEdges.some(e => e.source === current.id);
      if (!hasEdge && current.step_type !== 'menu' && current.step_type !== 'condition') {
        flowEdges.push({ id: `auto-${current.id}-${next.id}`, source: current.id, target: next.id, ...edgeDefaults });
      }
    }

    setNodes(flowNodes);
    setEdges(flowEdges);
  }

  const onConnect = useCallback((connection: Connection) => {
    setEdges(eds => addEdge({ ...connection, ...edgeDefaults }, eds));
  }, [setEdges]);

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((event: DragEvent) => {
    event.preventDefault();
    const type = event.dataTransfer.getData('application/reactflow');
    if (!type || !reactFlowInstance) return;

    const position = reactFlowInstance.screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });

    const id = `new-${Date.now()}`;
    const defaultData: Record<string, any> = {
      message: type === 'menu' ? 'Escolha uma opção:' : type === 'end' ? 'Obrigado pelo contato!' : '',
      options: type === 'menu' ? [{ label: 'Opção 1' }, { label: 'Opção 2' }] : [],
      condition_config: type === 'condition' ? { variable: '', operator: 'equals', value: '' } : null,
      step_type: type,
      ...(type === 'random' ? { random_messages: [''] } : {}),
      ...(type === 'redirect' ? { redirect_type: 'flow' } : {}),
      ...(type === 'end' ? { end_action: 'close' } : {}),
      ...(type === 'tag' ? { tag_action: 'add', tag_color: '#3b82f6' } : {}),
      ...(type === 'data' ? { save_variable: '', data_type: 'text' } : {}),
    };

    setNodes(nds => [...nds, { id, type, position, data: defaultData }]);
  }, [reactFlowInstance, setNodes]);

  const onDragStart = (event: DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  async function saveFlow() {
    setSaving(true);
    try {
      await supabase.from('chatbot_flow_steps').delete().eq('flow_id', flowId);

      const edgeMap = new Map<string, string>();
      edges.forEach(e => { if (e.source !== 'start') edgeMap.set(e.source, e.target); });

      const startEdge = edges.find(e => e.source === 'start');
      const firstNodeId = startEdge?.target;

      const stepsToSave: any[] = [];
      const visited = new Set<string>();
      const queue: string[] = firstNodeId ? [firstNodeId] : [];
      let position = 0;
      const allStepNodes = nodes.filter(n => n.type !== 'start');

      while (queue.length > 0) {
        const nodeId = queue.shift()!;
        if (visited.has(nodeId)) continue;
        visited.add(nodeId);

        const node = nodes.find(n => n.id === nodeId);
        if (!node) continue;

        const data = node.data as Record<string, any>;
        const nextId = edgeMap.get(nodeId);

        stepsToSave.push({
          flow_id: flowId,
          empresa_id: empresaId,
          position: position++,
          message: data.message || '',
          step_type: data.step_type || node.type || 'message',
          options: data.options || [],
          delay_seconds: data.delay_seconds || 0,
          condition_config: data.condition_config || null,
          position_x: node.position.x,
          position_y: node.position.y,
          next_step_id: null,
        });

        if (nextId && !visited.has(nextId)) queue.push(nextId);
        const outEdges = edges.filter(e => e.source === nodeId && e.target !== nextId);
        outEdges.forEach(e => { if (!visited.has(e.target)) queue.push(e.target); });
      }

      allStepNodes.forEach(n => {
        if (!visited.has(n.id)) {
          const data = n.data as Record<string, any>;
          stepsToSave.push({
            flow_id: flowId,
            empresa_id: empresaId,
            position: position++,
            message: data.message || '',
            step_type: data.step_type || n.type || 'message',
            options: data.options || [],
            delay_seconds: data.delay_seconds || 0,
            condition_config: data.condition_config || null,
            position_x: n.position.x,
            position_y: n.position.y,
            next_step_id: null,
          });
        }
      });

      if (stepsToSave.length > 0) {
        const { data: inserted, error } = await supabase.from('chatbot_flow_steps').insert(stepsToSave).select('id, position');
        if (error) throw error;
        if (inserted && inserted.length > 1) {
          const posToId = new Map<number, string>();
          inserted.forEach((s: any) => posToId.set(s.position, s.id));
          for (let i = 0; i < inserted.length - 1; i++) {
            const cId = posToId.get(i);
            const nId = posToId.get(i + 1);
            if (cId && nId) await supabase.from('chatbot_flow_steps').update({ next_step_id: nId }).eq('id', cId);
          }
        }
      }

      await supabase.from('chatbot_flows').update({ variables: variables as any }).eq('id', flowId);
      toast.success('Fluxo salvo com sucesso!');
      initialized.current = false;
      loadFlow();
    } catch (err: any) {
      console.error('Save error:', err);
      toast.error('Erro ao salvar: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-12rem)] border rounded-lg overflow-hidden bg-background">
      <div className="w-48 border-r bg-card p-3 space-y-4 overflow-y-auto shrink-0">
        <div className="space-y-1.5">
          <FlowConfigPopover config={flowConfig} onChange={setFlowConfig} />
          {draggableSidebarItems.map(item => (
            <div
              key={item.type}
              draggable
              onDragStart={e => onDragStart(e, item.type)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-white text-xs font-semibold cursor-grab transition-all ${item.color} active:cursor-grabbing shadow-sm hover:shadow-md`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 relative" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={setReactFlowInstance}
          onDrop={onDrop}
          onDragOver={onDragOver}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          snapToGrid
          snapGrid={[16, 16]}
          defaultEdgeOptions={edgeDefaults}
          deleteKeyCode="Delete"
        >
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
          <Controls showInteractive={false} />
          <MiniMap nodeStrokeWidth={2} className="!bg-card !border" maskColor="hsl(var(--muted) / 0.5)" />

          <Panel position="top-right" className="flex gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button size="sm" variant="outline" className="text-xs shadow-md bg-card border-primary text-primary">
                  <Variable className="h-3.5 w-3.5 mr-1.5" /> Variáveis Disponíveis
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-96 overflow-y-auto">
                <SheetHeader>
                  <SheetTitle className="text-base font-semibold">Variáveis Disponíveis</SheetTitle>
                </SheetHeader>
                <p className="text-sm text-muted-foreground mt-3 mb-6">
                  Use estas variáveis nas suas mensagens para personalizar o conteúdo automaticamente
                </p>
                <FlowVariablesPanel variables={variables} onChange={setVariables} />
              </SheetContent>
            </Sheet>
            <Button size="sm" variant="outline" className="text-xs shadow-md bg-card" onClick={() => window.history.back()}>
              Cancelar
            </Button>
            <Button size="sm" onClick={saveFlow} disabled={saving} className="text-xs shadow-md">
              <Save className="h-3.5 w-3.5 mr-1.5" /> {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </Panel>
        </ReactFlow>
      </div>
    </div>
  );
}
