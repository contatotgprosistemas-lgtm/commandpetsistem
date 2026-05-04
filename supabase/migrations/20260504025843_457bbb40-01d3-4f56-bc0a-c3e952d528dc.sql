
-- 1) Revoke SELECT on sensitive token columns from authenticated/anon
REVOKE SELECT (signing_token, token_expires_at) ON public.contracts FROM authenticated, anon;
REVOKE SELECT (edit_token) ON public.clientes FROM authenticated, anon;

-- 2) Restrict user_roles INSERT/DELETE to same-empresa for admins (super_admin still unrestricted)
DROP POLICY IF EXISTS "Only admins assign roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only admins delete roles" ON public.user_roles;

CREATE POLICY "Only admins assign roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin'::app_role)
  OR (
    public.has_role(auth.uid(), 'admin'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.profiles tgt
      WHERE tgt.user_id = user_roles.user_id
        AND tgt.empresa_id = public.get_user_empresa_id()
    )
    AND role <> 'super_admin'::app_role
  )
);

CREATE POLICY "Only admins delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin'::app_role)
  OR (
    public.has_role(auth.uid(), 'admin'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.profiles tgt
      WHERE tgt.user_id = user_roles.user_id
        AND tgt.empresa_id = public.get_user_empresa_id()
    )
    AND role <> 'super_admin'::app_role
  )
);

-- 3) Re-scope policies from {public} to {authenticated} (principle of least privilege)

-- sistema_asaas_config
DROP POLICY IF EXISTS "Super admin full access sistema_asaas_config" ON public.sistema_asaas_config;
CREATE POLICY "Super admin full access sistema_asaas_config"
ON public.sistema_asaas_config
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

-- esteira_notification_config
DROP POLICY IF EXISTS "esteira_notif_select_own_empresa" ON public.esteira_notification_config;
DROP POLICY IF EXISTS "esteira_notif_insert_own_empresa" ON public.esteira_notification_config;
DROP POLICY IF EXISTS "esteira_notif_update_own_empresa" ON public.esteira_notification_config;
DROP POLICY IF EXISTS "esteira_notif_delete_own_empresa" ON public.esteira_notification_config;
CREATE POLICY "esteira_notif_select_own_empresa" ON public.esteira_notification_config FOR SELECT TO authenticated USING (empresa_id = public.get_user_empresa_id());
CREATE POLICY "esteira_notif_insert_own_empresa" ON public.esteira_notification_config FOR INSERT TO authenticated WITH CHECK (empresa_id = public.get_user_empresa_id());
CREATE POLICY "esteira_notif_update_own_empresa" ON public.esteira_notification_config FOR UPDATE TO authenticated USING (empresa_id = public.get_user_empresa_id()) WITH CHECK (empresa_id = public.get_user_empresa_id());
CREATE POLICY "esteira_notif_delete_own_empresa" ON public.esteira_notification_config FOR DELETE TO authenticated USING (empresa_id = public.get_user_empresa_id());

-- esteira_notification_log
DROP POLICY IF EXISTS "esteira_notif_log_select_own_empresa" ON public.esteira_notification_log;
CREATE POLICY "esteira_notif_log_select_own_empresa" ON public.esteira_notification_log FOR SELECT TO authenticated USING (empresa_id = public.get_user_empresa_id());

-- taxipet_rota_ordem
DROP POLICY IF EXISTS "Empresa can view rota" ON public.taxipet_rota_ordem;
DROP POLICY IF EXISTS "Empresa can insert rota" ON public.taxipet_rota_ordem;
DROP POLICY IF EXISTS "Empresa can update rota" ON public.taxipet_rota_ordem;
DROP POLICY IF EXISTS "Empresa can delete rota" ON public.taxipet_rota_ordem;
CREATE POLICY "Empresa can view rota" ON public.taxipet_rota_ordem FOR SELECT TO authenticated USING (empresa_id = public.get_user_empresa_id());
CREATE POLICY "Empresa can insert rota" ON public.taxipet_rota_ordem FOR INSERT TO authenticated WITH CHECK (empresa_id = public.get_user_empresa_id());
CREATE POLICY "Empresa can update rota" ON public.taxipet_rota_ordem FOR UPDATE TO authenticated USING (empresa_id = public.get_user_empresa_id()) WITH CHECK (empresa_id = public.get_user_empresa_id());
CREATE POLICY "Empresa can delete rota" ON public.taxipet_rota_ordem FOR DELETE TO authenticated USING (empresa_id = public.get_user_empresa_id());

-- asaas_nfse_config
DROP POLICY IF EXISTS "asaas_nfse_config_select" ON public.asaas_nfse_config;
DROP POLICY IF EXISTS "asaas_nfse_config_insert" ON public.asaas_nfse_config;
DROP POLICY IF EXISTS "asaas_nfse_config_update" ON public.asaas_nfse_config;
DROP POLICY IF EXISTS "asaas_nfse_config_delete" ON public.asaas_nfse_config;
CREATE POLICY "asaas_nfse_config_select" ON public.asaas_nfse_config FOR SELECT TO authenticated USING (empresa_id = public.get_user_empresa_id());
CREATE POLICY "asaas_nfse_config_insert" ON public.asaas_nfse_config FOR INSERT TO authenticated WITH CHECK (empresa_id = public.get_user_empresa_id());
CREATE POLICY "asaas_nfse_config_update" ON public.asaas_nfse_config FOR UPDATE TO authenticated USING (empresa_id = public.get_user_empresa_id()) WITH CHECK (empresa_id = public.get_user_empresa_id());
CREATE POLICY "asaas_nfse_config_delete" ON public.asaas_nfse_config FOR DELETE TO authenticated USING (empresa_id = public.get_user_empresa_id());

-- asaas_nfse_documents
DROP POLICY IF EXISTS "asaas_nfse_docs_select" ON public.asaas_nfse_documents;
DROP POLICY IF EXISTS "asaas_nfse_docs_insert" ON public.asaas_nfse_documents;
DROP POLICY IF EXISTS "asaas_nfse_docs_update" ON public.asaas_nfse_documents;
DROP POLICY IF EXISTS "asaas_nfse_docs_delete" ON public.asaas_nfse_documents;
CREATE POLICY "asaas_nfse_docs_select" ON public.asaas_nfse_documents FOR SELECT TO authenticated USING (empresa_id = public.get_user_empresa_id());
CREATE POLICY "asaas_nfse_docs_insert" ON public.asaas_nfse_documents FOR INSERT TO authenticated WITH CHECK (empresa_id = public.get_user_empresa_id());
CREATE POLICY "asaas_nfse_docs_update" ON public.asaas_nfse_documents FOR UPDATE TO authenticated USING (empresa_id = public.get_user_empresa_id()) WITH CHECK (empresa_id = public.get_user_empresa_id());
CREATE POLICY "asaas_nfse_docs_delete" ON public.asaas_nfse_documents FOR DELETE TO authenticated USING (empresa_id = public.get_user_empresa_id());

-- movimentacoes_estoque (only update/delete are public-scoped)
DROP POLICY IF EXISTS "mov_estoque_delete" ON public.movimentacoes_estoque;
DROP POLICY IF EXISTS "mov_estoque_update" ON public.movimentacoes_estoque;
CREATE POLICY "mov_estoque_delete" ON public.movimentacoes_estoque FOR DELETE TO authenticated USING (empresa_id = public.get_user_empresa_id());
CREATE POLICY "mov_estoque_update" ON public.movimentacoes_estoque FOR UPDATE TO authenticated USING (empresa_id = public.get_user_empresa_id()) WITH CHECK (empresa_id = public.get_user_empresa_id());

-- tipo_servico_perguntas_checklist
DROP POLICY IF EXISTS "Empresa pode ver perguntas checklist" ON public.tipo_servico_perguntas_checklist;
DROP POLICY IF EXISTS "Empresa pode inserir perguntas checklist" ON public.tipo_servico_perguntas_checklist;
DROP POLICY IF EXISTS "Empresa pode atualizar perguntas checklist" ON public.tipo_servico_perguntas_checklist;
DROP POLICY IF EXISTS "Empresa pode excluir perguntas checklist" ON public.tipo_servico_perguntas_checklist;
CREATE POLICY "Empresa pode ver perguntas checklist" ON public.tipo_servico_perguntas_checklist FOR SELECT TO authenticated USING (empresa_id = public.get_user_empresa_id());
CREATE POLICY "Empresa pode inserir perguntas checklist" ON public.tipo_servico_perguntas_checklist FOR INSERT TO authenticated WITH CHECK (empresa_id = public.get_user_empresa_id());
CREATE POLICY "Empresa pode atualizar perguntas checklist" ON public.tipo_servico_perguntas_checklist FOR UPDATE TO authenticated USING (empresa_id = public.get_user_empresa_id()) WITH CHECK (empresa_id = public.get_user_empresa_id());
CREATE POLICY "Empresa pode excluir perguntas checklist" ON public.tipo_servico_perguntas_checklist FOR DELETE TO authenticated USING (empresa_id = public.get_user_empresa_id());

-- tipo_servico_perguntas_manejo
DROP POLICY IF EXISTS "Empresa pode ver perguntas manejo" ON public.tipo_servico_perguntas_manejo;
DROP POLICY IF EXISTS "Empresa pode inserir perguntas manejo" ON public.tipo_servico_perguntas_manejo;
DROP POLICY IF EXISTS "Empresa pode atualizar perguntas manejo" ON public.tipo_servico_perguntas_manejo;
DROP POLICY IF EXISTS "Empresa pode excluir perguntas manejo" ON public.tipo_servico_perguntas_manejo;
CREATE POLICY "Empresa pode ver perguntas manejo" ON public.tipo_servico_perguntas_manejo FOR SELECT TO authenticated USING (empresa_id = public.get_user_empresa_id());
CREATE POLICY "Empresa pode inserir perguntas manejo" ON public.tipo_servico_perguntas_manejo FOR INSERT TO authenticated WITH CHECK (empresa_id = public.get_user_empresa_id());
CREATE POLICY "Empresa pode atualizar perguntas manejo" ON public.tipo_servico_perguntas_manejo FOR UPDATE TO authenticated USING (empresa_id = public.get_user_empresa_id()) WITH CHECK (empresa_id = public.get_user_empresa_id());
CREATE POLICY "Empresa pode excluir perguntas manejo" ON public.tipo_servico_perguntas_manejo FOR DELETE TO authenticated USING (empresa_id = public.get_user_empresa_id());

-- faturas_sistema
DROP POLICY IF EXISTS "Super admin full access faturas_sistema" ON public.faturas_sistema;
DROP POLICY IF EXISTS "Admin empresa view faturas_sistema" ON public.faturas_sistema;
CREATE POLICY "Super admin full access faturas_sistema"
ON public.faturas_sistema
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Admin empresa view faturas_sistema"
ON public.faturas_sistema
FOR SELECT
TO authenticated
USING (
  empresa_id = public.get_user_empresa_id()
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

-- data_retention_config
DROP POLICY IF EXISTS "Admins manage retention config of their empresa" ON public.data_retention_config;
CREATE POLICY "Admins manage retention config of their empresa"
ON public.data_retention_config
FOR ALL
TO authenticated
USING (
  empresa_id = public.get_user_empresa_id()
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role))
)
WITH CHECK (
  empresa_id = public.get_user_empresa_id()
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role))
);

-- contas_receber_itens (only update is public-scoped)
DROP POLICY IF EXISTS "Usuários podem atualizar itens da sua empresa" ON public.contas_receber_itens;
CREATE POLICY "Usuários podem atualizar itens da sua empresa"
ON public.contas_receber_itens
FOR UPDATE
TO authenticated
USING (empresa_id = public.get_user_empresa_id())
WITH CHECK (empresa_id = public.get_user_empresa_id());
