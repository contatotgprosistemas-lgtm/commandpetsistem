-- Consolidate duplicate conversations per (empresa_id, contato_telefone)
-- Keep the most recent conversa per phone, move messages from older ones to it, then delete older.
DO $$
DECLARE
  r RECORD;
  keep_id uuid;
BEGIN
  FOR r IN
    SELECT empresa_id, contato_telefone
    FROM public.conversas
    GROUP BY empresa_id, contato_telefone
    HAVING COUNT(*) > 1
  LOOP
    SELECT id INTO keep_id
    FROM public.conversas
    WHERE empresa_id = r.empresa_id AND contato_telefone = r.contato_telefone
    ORDER BY ultima_mensagem_at DESC NULLS LAST, created_at DESC
    LIMIT 1;

    -- Move mensagens
    UPDATE public.mensagens
    SET conversa_id = keep_id
    WHERE conversa_id IN (
      SELECT id FROM public.conversas
      WHERE empresa_id = r.empresa_id AND contato_telefone = r.contato_telefone AND id <> keep_id
    );

    -- Delete duplicates
    DELETE FROM public.conversas
    WHERE empresa_id = r.empresa_id AND contato_telefone = r.contato_telefone AND id <> keep_id;
  END LOOP;
END $$;

-- Add unique index to prevent duplicates going forward
CREATE UNIQUE INDEX IF NOT EXISTS conversas_empresa_telefone_unique
ON public.conversas (empresa_id, contato_telefone);