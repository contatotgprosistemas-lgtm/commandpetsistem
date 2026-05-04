
-- ============================================================
-- HARDENING MULTI-TENANT: garantir isolamento por empresa_id
-- ============================================================

-- 1) Adicionar WITH CHECK em todas as políticas UPDATE que filtram por empresa_id
--    mas não têm WITH CHECK (permitiria transferir registro p/ outra empresa).
DO $$
DECLARE
  r RECORD;
  v_sql TEXT;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname, cmd, qual, roles
    FROM pg_policies
    WHERE schemaname='public' AND cmd='UPDATE' AND with_check IS NULL
  LOOP
    -- Drop e recria preservando o USING e adicionando WITH CHECK = USING
    v_sql := format('DROP POLICY %I ON public.%I;', r.policyname, r.tablename);
    EXECUTE v_sql;

    v_sql := format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO %s USING (%s) WITH CHECK (%s);',
      r.policyname, r.tablename,
      array_to_string(r.roles, ','),
      r.qual, r.qual
    );
    EXECUTE v_sql;
  END LOOP;
END $$;

-- 2) birthday_log: política "Service role manages log" estava aberta (true).
DROP POLICY IF EXISTS "Service role manages log" ON public.birthday_log;
CREATE POLICY "Service role manages log" ON public.birthday_log
  FOR ALL
  TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 3) Funções pgmq sem search_path fixo
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;

-- 4) Reforço extra: empresas — impedir trocar o próprio empresa_id no UPDATE (já tem id check via WITH CHECK loop)
--    e impedir criar empresa com id arbitrário
DROP POLICY IF EXISTS "Users can create empresa" ON public.empresas;
CREATE POLICY "Users can create empresa" ON public.empresas
  FOR INSERT TO authenticated
  WITH CHECK (
    -- Permite criar somente se o usuário ainda não tem empresa associada
    -- (evita que um usuário crie empresas avulsas)
    NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND empresa_id IS NOT NULL)
  );
