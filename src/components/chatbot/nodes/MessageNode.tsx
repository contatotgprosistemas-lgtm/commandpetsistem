import { memo, useCallback } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from '@xyflow/react';
import { MessageCircle, X, Upload, Loader2 } from 'lucide-react';
import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

function MessageNode({ id, data, selected }: NodeProps) {
  const { setNodes, setEdges } = useReactFlow();
  const d = data as Record<string, any>;
  const continueMode = d.continue_mode || 'auto';
  const messageType = d.message_type || 'text';
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const update = useCallback((key: string, value: any) => {
    setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...n.data, [key]: value } } : n));
  }, [id, setNodes]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setNodes(nds => nds.filter(n => n.id !== id));
    setEdges(eds => eds.filter(e => e.source !== id && e.target !== id));
  }, [id, setNodes, setEdges]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;
      if (!userId) throw new Error('Você precisa estar logado para enviar arquivos.');
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('empresa_id')
        .eq('user_id', userId)
        .maybeSingle();
      if (profileErr) throw profileErr;
      const empresaId = profile?.empresa_id;
      if (!empresaId) throw new Error('Sua conta não está vinculada a nenhuma empresa. Configure em Configurações.');
      const ext = file.name.split('.').pop() || 'bin';
      const path = `${empresaId}/chatbot_${messageType}_${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from('chat-media')
        .upload(path, file, { contentType: file.type });
      if (error) throw error;
      // Long-lived signed URL (1 year)
      const { data: signed } = await supabase.storage
        .from('chat-media')
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      if (!signed?.signedUrl) throw new Error('Não foi possível gerar URL');
      update('media_url', signed.signedUrl);
      update('media_filename', file.name);
      toast({ title: 'Arquivo enviado', description: file.name });
    } catch (err: any) {
      toast({ title: 'Erro no upload', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const acceptByType: Record<string, string> = {
    image: 'image/*',
    audio: 'audio/*',
    video: 'video/*',
    document: '.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip',
  };
  const isMedia = messageType !== 'text';

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
            value={messageType}
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
        {isMedia && (
          <div className="space-y-1.5" onClick={e => e.stopPropagation()}>
            <input
              type="text"
              value={d.media_url || ''}
              onChange={e => update('media_url', e.target.value)}
              placeholder="URL do arquivo (https://...)"
              className="w-full text-xs bg-muted/30 border border-border rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full flex items-center justify-center gap-1.5 text-[11px] bg-primary/10 hover:bg-primary/20 text-primary rounded px-2 py-1.5 transition-colors disabled:opacity-50"
            >
              {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
              {uploading ? 'Enviando...' : (d.media_filename ? d.media_filename : 'Enviar arquivo')}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept={acceptByType[messageType]}
              className="hidden"
              onChange={handleUpload}
            />
          </div>
        )}
        <textarea
          value={d.message || ''}
          onChange={e => update('message', e.target.value)}
          placeholder={isMedia ? 'Legenda (opcional)...' : 'Digite a mensagem...'}
          rows={isMedia ? 2 : 3}
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
