
-- Helper: verifica se o usuário pode acessar uma conversa específica
CREATE OR REPLACE FUNCTION public.can_access_crm_conversa(_conversa_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.crm_conversas c
    WHERE c.id = _conversa_id
      AND c.empresa_id = public.get_user_empresa_id()
      AND (
        public.has_role(auth.uid(), 'admin'::app_role)
        OR public.has_role(auth.uid(), 'gerente'::app_role)
        OR public.has_role(auth.uid(), 'super_admin'::app_role)
        OR c.atendente_id = auth.uid()
        OR (
          c.atendente_id IS NULL
          AND (
            c.setor_id IS NULL
            OR c.setor_id IN (SELECT public.get_user_setor_ids())
          )
        )
      )
  )
$$;

-- ===== crm_mensagens =====
DROP POLICY IF EXISTS empresa_select_crm_mensagens ON public.crm_mensagens;
DROP POLICY IF EXISTS empresa_update_crm_mensagens ON public.crm_mensagens;
DROP POLICY IF EXISTS empresa_delete_crm_mensagens ON public.crm_mensagens;
DROP POLICY IF EXISTS crm_mensagens_select_scoped ON public.crm_mensagens;
DROP POLICY IF EXISTS crm_mensagens_update_scoped ON public.crm_mensagens;
DROP POLICY IF EXISTS crm_mensagens_delete_scoped ON public.crm_mensagens;

CREATE POLICY crm_mensagens_select_scoped ON public.crm_mensagens
FOR SELECT TO authenticated
USING (empresa_id = public.get_user_empresa_id() AND public.can_access_crm_conversa(conversa_id));

CREATE POLICY crm_mensagens_update_scoped ON public.crm_mensagens
FOR UPDATE TO authenticated
USING (empresa_id = public.get_user_empresa_id() AND public.can_access_crm_conversa(conversa_id));

CREATE POLICY crm_mensagens_delete_scoped ON public.crm_mensagens
FOR DELETE TO authenticated
USING (empresa_id = public.get_user_empresa_id() AND public.can_access_crm_conversa(conversa_id));

-- ===== crm_notas_conversa =====
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='crm_notas_conversa') THEN
    EXECUTE 'DROP POLICY IF EXISTS empresa_select_crm_notas_conversa ON public.crm_notas_conversa';
    EXECUTE 'DROP POLICY IF EXISTS empresa_update_crm_notas_conversa ON public.crm_notas_conversa';
    EXECUTE 'DROP POLICY IF EXISTS empresa_delete_crm_notas_conversa ON public.crm_notas_conversa';
    EXECUTE 'DROP POLICY IF EXISTS crm_notas_conversa_select_scoped ON public.crm_notas_conversa';
    EXECUTE 'DROP POLICY IF EXISTS crm_notas_conversa_update_scoped ON public.crm_notas_conversa';
    EXECUTE 'DROP POLICY IF EXISTS crm_notas_conversa_delete_scoped ON public.crm_notas_conversa';
    EXECUTE 'CREATE POLICY crm_notas_conversa_select_scoped ON public.crm_notas_conversa FOR SELECT TO authenticated USING (empresa_id = public.get_user_empresa_id() AND public.can_access_crm_conversa(conversa_id))';
    EXECUTE 'CREATE POLICY crm_notas_conversa_update_scoped ON public.crm_notas_conversa FOR UPDATE TO authenticated USING (empresa_id = public.get_user_empresa_id() AND public.can_access_crm_conversa(conversa_id))';
    EXECUTE 'CREATE POLICY crm_notas_conversa_delete_scoped ON public.crm_notas_conversa FOR DELETE TO authenticated USING (empresa_id = public.get_user_empresa_id() AND public.can_access_crm_conversa(conversa_id))';
  END IF;
END $$;

-- ===== crm_mensagens_agendadas =====
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='crm_mensagens_agendadas') THEN
    EXECUTE 'DROP POLICY IF EXISTS empresa_select_crm_mensagens_agendadas ON public.crm_mensagens_agendadas';
    EXECUTE 'DROP POLICY IF EXISTS empresa_update_crm_mensagens_agendadas ON public.crm_mensagens_agendadas';
    EXECUTE 'DROP POLICY IF EXISTS empresa_delete_crm_mensagens_agendadas ON public.crm_mensagens_agendadas';
    EXECUTE 'DROP POLICY IF EXISTS crm_mensagens_agendadas_select_scoped ON public.crm_mensagens_agendadas';
    EXECUTE 'DROP POLICY IF EXISTS crm_mensagens_agendadas_update_scoped ON public.crm_mensagens_agendadas';
    EXECUTE 'DROP POLICY IF EXISTS crm_mensagens_agendadas_delete_scoped ON public.crm_mensagens_agendadas';
    EXECUTE 'CREATE POLICY crm_mensagens_agendadas_select_scoped ON public.crm_mensagens_agendadas FOR SELECT TO authenticated USING (empresa_id = public.get_user_empresa_id() AND public.can_access_crm_conversa(conversa_id))';
    EXECUTE 'CREATE POLICY crm_mensagens_agendadas_update_scoped ON public.crm_mensagens_agendadas FOR UPDATE TO authenticated USING (empresa_id = public.get_user_empresa_id() AND public.can_access_crm_conversa(conversa_id))';
    EXECUTE 'CREATE POLICY crm_mensagens_agendadas_delete_scoped ON public.crm_mensagens_agendadas FOR DELETE TO authenticated USING (empresa_id = public.get_user_empresa_id() AND public.can_access_crm_conversa(conversa_id))';
  END IF;
END $$;
