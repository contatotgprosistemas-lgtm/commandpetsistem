
-- 1) Restrict asaas_contas SELECT to admin/gerente only
DROP POLICY IF EXISTS "Tenant isolation select" ON public.asaas_contas;
CREATE POLICY "Admin/Gerente can view asaas_contas"
ON public.asaas_contas
FOR SELECT
TO authenticated
USING (
  empresa_id = public.get_user_empresa_id()
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'gerente'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  )
);

-- Also restrict modifications similarly (keep tenant isolation but require privileged role)
DROP POLICY IF EXISTS "Tenant isolation insert" ON public.asaas_contas;
DROP POLICY IF EXISTS "Tenant isolation update" ON public.asaas_contas;
DROP POLICY IF EXISTS "Tenant isolation delete" ON public.asaas_contas;

CREATE POLICY "Admin/Gerente can insert asaas_contas"
ON public.asaas_contas
FOR INSERT
TO authenticated
WITH CHECK (
  empresa_id = public.get_user_empresa_id()
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'gerente'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  )
);

CREATE POLICY "Admin/Gerente can update asaas_contas"
ON public.asaas_contas
FOR UPDATE
TO authenticated
USING (
  empresa_id = public.get_user_empresa_id()
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'gerente'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  )
)
WITH CHECK (
  empresa_id = public.get_user_empresa_id()
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'gerente'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  )
);

CREATE POLICY "Admin/Gerente can delete asaas_contas"
ON public.asaas_contas
FOR DELETE
TO authenticated
USING (
  empresa_id = public.get_user_empresa_id()
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'gerente'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  )
);

-- 2) Realtime: require authenticated session to subscribe/receive messages
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read realtime" ON realtime.messages;
CREATE POLICY "Authenticated can read realtime"
ON realtime.messages
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Authenticated can write realtime" ON realtime.messages;
CREATE POLICY "Authenticated can write realtime"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (true);
