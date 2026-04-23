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

const buildEdgeId = (source: string, target: string, sourceHandle?: string | null) =>
  `${source}:${sourceHandle ?? 'default'}:${target}`;

const createFlowEdge = (source: string, target: string, sourceHandle?: string | null): Edge => ({
  id: buildEdgeId(source, target, sourceHandle),
  source,
  target,
  ...(sourceHandle ? { sourceHandle } : {}),
  ...edgeDefaults,
});

const getStepConfig = (step: any): Record<string, any> => {
  if (!step?.condition_config || typeof step.condition_config !== 'object' || Array.isArray(step.condition_config)) {
    return {};
  }

  return step.condition_config as Record<string, any>;
};

const getNodeDataFromStep = (step: any) => {
  const config = getStepConfig(step);
  const baseData = {
    message: step.message || '',
    options: Array.isArray(step.options) ? step.options : [],
    delay_seconds: step.delay_seconds || 0,
    step_type: step.step_type,
    db_id: step.id,
  };

  if (step.step_type === 'condition') {
    return {
      ...baseData,
      condition_config: config,
    };
  }

  return {
    ...baseData,
    ...config,
  };
};

const extractNodeConfig = (nodeType: string | undefined, data: Record<string, any>) => {
  if (nodeType === 'condition') {
    return data.condition_config && typeof data.condition_config === 'object' && !Array.isArray(data.condition_config)
      ? { ...data.condition_config }
      : {};
  }

  const ignoredKeys = new Set([
    'message',
    'options',
    'delay_seconds',
    'condition_config',
    'step_type',
    'db_id',
  ]);

  return Object.fromEntries(
    Object.entries(data).filter(([key, value]) => !ignoredKeys.has(key) && value !== undefined)
  );
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
    const { data: flowRow } = await supabase
      .from('chatbot_flows')
      .select('start_position')
      .eq('id', flowId)
      .maybeSingle();

    const startPos = (flowRow as any)?.start_position && typeof (flowRow as any).start_position === 'object'
      ? { x: Number((flowRow as any).start_position.x ?? 300), y: Number((flowRow as any).start_position.y ?? 0) }
      : { x: 300, y: 0 };

    const { data: steps } = await supabase
      .from('chatbot_flow_steps')
      .select('*')
      .eq('flow_id', flowId)
      .order('position');

    if (!steps || steps.length === 0) {
      setNodes([{
        id: 'start',
        type: 'start',
        position: startPos,
        data: {},
        deletable: false,
      }]);
      return;
    }

    const flowNodes: Node[] = [{
      id: 'start',
      type: 'start',
      position: startPos,
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
        data: getNodeDataFromStep(step),
      });

      if (idx === 0) {
        flowEdges.push(createFlowEdge('start', step.id));
      }

      const config = getStepConfig(step);

      if (nodeType === 'menu') {
        const options = Array.isArray(step.options) ? step.options : [];
        options.forEach((option: any, optionIndex: number) => {
          if (option?.next_step_id) {
            flowEdges.push(createFlowEdge(step.id, option.next_step_id, `option-${optionIndex}`));
          }
        });

        if (!options.length && step.next_step_id) {
          flowEdges.push(createFlowEdge(step.id, step.next_step_id));
        }
      } else if (nodeType === 'condition') {
        if (config.true_step_id) {
          flowEdges.push(createFlowEdge(step.id, config.true_step_id, 'true'));
        }
        if (config.false_step_id) {
          flowEdges.push(createFlowEdge(step.id, config.false_step_id, 'false'));
        }
        if (!config.true_step_id && !config.false_step_id && step.next_step_id) {
          flowEdges.push(createFlowEdge(step.id, step.next_step_id, 'true'));
        }
      } else if (step.next_step_id) {
        flowEdges.push(createFlowEdge(step.id, step.next_step_id));
      }
    });

    setNodes(flowNodes);
    setEdges(flowEdges);
  }

  const onConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) return;

    const newHandle = connection.sourceHandle ?? '__default__';

    setEdges(eds => {
      const filtered = eds.filter(edge => {
        if (edge.source !== connection.source) return true;
        return (edge.sourceHandle ?? '__default__') !== newHandle;
      });

      return addEdge({
        ...connection,
        id: buildEdgeId(connection.source, connection.target, connection.sourceHandle),
        ...edgeDefaults,
      }, filtered);
    });
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

      const edgeMap = new Map<string, Edge[]>();
      edges.forEach(edge => {
        if (!edge.source || edge.source === 'start') return;
        const current = edgeMap.get(edge.source) || [];
        current.push(edge);
        edgeMap.set(edge.source, current);
      });

      const startEdge = edges.find(e => e.source === 'start');
      const firstNodeId = startEdge?.target;

      type StepDraft = { tempId: string; nextTempId: string | null; payload: any };
      const stepsToSave: StepDraft[] = [];
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
        const nodeEdges = edgeMap.get(nodeId) || [];
        const config = extractNodeConfig(node.type, data);
        const options = Array.isArray(data.options)
          ? data.options.map((option: any) => ({ ...option, next_step_id: null }))
          : [];

        let nextStepId: string | null = null;

        if (node.type === 'menu') {
          const fallbackEdge = nodeEdges.find(edge => !edge.sourceHandle);
          nextStepId = fallbackEdge?.target ?? null;

          nodeEdges.forEach(edge => {
            if (!edge.sourceHandle?.startsWith('option-')) return;
            const optionIndex = Number(edge.sourceHandle.replace('option-', ''));
            if (Number.isNaN(optionIndex) || !options[optionIndex]) return;
            options[optionIndex] = { ...options[optionIndex], next_step_id: edge.target };
          });
        } else if (node.type === 'condition') {
          const trueEdge = nodeEdges.find(edge => edge.sourceHandle === 'true');
          const falseEdge = nodeEdges.find(edge => edge.sourceHandle === 'false');
          config.true_step_id = trueEdge?.target ?? null;
          config.false_step_id = falseEdge?.target ?? null;
          nextStepId = trueEdge?.target ?? null;
        } else {
          nextStepId = nodeEdges[0]?.target ?? null;
        }

        stepsToSave.push({
          tempId: nodeId,
          nextTempId: nextStepId,
          payload: {
            flow_id: flowId,
            empresa_id: empresaId,
            position: position++,
            message: data.message || '',
            step_type: data.step_type || node.type || 'message',
            options,
            delay_seconds: data.delay_seconds || 0,
            condition_config: Object.keys(config).length > 0 ? config : null,
            position_x: node.position.x,
            position_y: node.position.y,
            next_step_id: null,
          },
        });

        nodeEdges.forEach(edge => {
          if (edge.target && !visited.has(edge.target)) queue.push(edge.target);
        });
      }

      allStepNodes.forEach(n => {
        if (!visited.has(n.id)) {
          const data = n.data as Record<string, any>;
          const nodeEdges = edgeMap.get(n.id) || [];
          const config = extractNodeConfig(n.type, data);
          const options = Array.isArray(data.options)
            ? data.options.map((option: any) => ({ ...option, next_step_id: null }))
            : [];

          let nextStepId: string | null = null;

          if (n.type === 'menu') {
            const fallbackEdge = nodeEdges.find(edge => !edge.sourceHandle);
            nextStepId = fallbackEdge?.target ?? null;

            nodeEdges.forEach(edge => {
              if (!edge.sourceHandle?.startsWith('option-')) return;
              const optionIndex = Number(edge.sourceHandle.replace('option-', ''));
              if (Number.isNaN(optionIndex) || !options[optionIndex]) return;
              options[optionIndex] = { ...options[optionIndex], next_step_id: edge.target };
            });
          } else if (n.type === 'condition') {
            const trueEdge = nodeEdges.find(edge => edge.sourceHandle === 'true');
            const falseEdge = nodeEdges.find(edge => edge.sourceHandle === 'false');
            config.true_step_id = trueEdge?.target ?? null;
            config.false_step_id = falseEdge?.target ?? null;
            nextStepId = trueEdge?.target ?? null;
          } else {
            nextStepId = nodeEdges[0]?.target ?? null;
          }

          stepsToSave.push({
            tempId: n.id,
            nextTempId: nextStepId,
            payload: {
              flow_id: flowId,
              empresa_id: empresaId,
              position: position++,
              message: data.message || '',
              step_type: data.step_type || n.type || 'message',
              options,
              delay_seconds: data.delay_seconds || 0,
              condition_config: Object.keys(config).length > 0 ? config : null,
              position_x: n.position.x,
              position_y: n.position.y,
              next_step_id: null,
            },
          });
        }
      });

      if (stepsToSave.length > 0) {
        const { data: inserted, error } = await supabase
          .from('chatbot_flow_steps')
          .insert(stepsToSave.map(s => s.payload))
          .select('id, position');
        if (error) throw error;
        // Map tempId -> real DB id (via position which is unique per draft)
        const posToRealId = new Map<number, string>();
        (inserted || []).forEach((s: any) => posToRealId.set(s.position, s.id));
        const tempToRealId = new Map<string, string>();
        stepsToSave.forEach(s => {
          const realId = posToRealId.get(s.payload.position);
          if (realId) tempToRealId.set(s.tempId, realId);
        });
        // Rewrite internal ids inside the saved JSON after insert
        for (const s of stepsToSave) {
          const cId = tempToRealId.get(s.tempId);
          if (!cId) continue;

          const payload = { ...s.payload };

          payload.next_step_id = s.nextTempId ? tempToRealId.get(s.nextTempId) ?? null : null;

          if (Array.isArray(payload.options)) {
            payload.options = payload.options.map((option: any) => ({
              ...option,
              next_step_id: option?.next_step_id ? tempToRealId.get(option.next_step_id) ?? null : null,
            }));
          }

          if (payload.condition_config && typeof payload.condition_config === 'object' && !Array.isArray(payload.condition_config)) {
            payload.condition_config = {
              ...payload.condition_config,
              true_step_id: payload.condition_config.true_step_id
                ? tempToRealId.get(payload.condition_config.true_step_id) ?? null
                : null,
              false_step_id: payload.condition_config.false_step_id
                ? tempToRealId.get(payload.condition_config.false_step_id) ?? null
                : null,
            };
          }

          await supabase.from('chatbot_flow_steps').update({
            next_step_id: payload.next_step_id,
            options: payload.options,
            condition_config: payload.condition_config,
          }).eq('id', cId);
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
