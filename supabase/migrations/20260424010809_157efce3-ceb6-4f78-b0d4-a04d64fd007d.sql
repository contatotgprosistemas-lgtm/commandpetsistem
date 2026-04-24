
-- 1. Campos de SLA em crm_conversas
ALTER TABLE public.crm_conversas
  ADD COLUMN IF NOT EXISTS primeira_resposta_em timestamptz,
  ADD COLUMN IF NOT EXISTS tempo_primeira_resposta_seg integer,
  ADD COLUMN IF NOT EXISTS assumida_em timestamptz;

-- 2. Trigger para calcular SLA quando atendente envia primeira resposta
CREATE OR REPLACE FUNCTION public.crm_calc_sla()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_first_in timestamptz;
  v_conv RECORD;
BEGIN
  IF NEW.direcao <> 'enviada' THEN
    RETURN NEW;
  END IF;

  SELECT primeira_resposta_em INTO v_conv FROM crm_conversas WHERE id = NEW.conversa_id;
  IF v_conv.primeira_resposta_em IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT MIN(created_at) INTO v_first_in
  FROM crm_mensagens
  WHERE conversa_id = NEW.conversa_id AND direcao = 'recebida';

  IF v_first_in IS NOT NULL THEN
    UPDATE crm_conversas
    SET primeira_resposta_em = NEW.created_at,
        tempo_primeira_resposta_seg = EXTRACT(EPOCH FROM (NEW.created_at - v_first_in))::int
    WHERE id = NEW.conversa_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_crm_calc_sla ON public.crm_mensagens;
CREATE TRIGGER trg_crm_calc_sla
AFTER INSERT ON public.crm_mensagens
FOR EACH ROW EXECUTE FUNCTION public.crm_calc_sla();

-- 3. RLS refinada para atendentes (admin/gerente veem tudo; atendente vê só atribuídas ou sem dono)
DROP POLICY IF EXISTS "crm_conversas_select_scoped" ON public.crm_conversas;
CREATE POLICY "crm_conversas_select_scoped"
ON public.crm_conversas FOR SELECT
TO authenticated
USING (
  empresa_id = get_user_empresa_id()
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'gerente'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR atendente_id IS NULL
    OR atendente_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "crm_conversas_update_scoped" ON public.crm_conversas;
CREATE POLICY "crm_conversas_update_scoped"
ON public.crm_conversas FOR UPDATE
TO authenticated
USING (
  empresa_id = get_user_empresa_id()
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'gerente'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR atendente_id IS NULL
    OR atendente_id = auth.uid()
  )
)
WITH CHECK (empresa_id = get_user_empresa_id());

CREATE INDEX IF NOT EXISTS idx_crm_conversas_atendente ON public.crm_conversas(atendente_id);
