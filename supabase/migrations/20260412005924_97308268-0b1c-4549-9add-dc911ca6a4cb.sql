
-- Generic audit trigger function
CREATE OR REPLACE FUNCTION public.audit_trigger_func()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_empresa_id uuid;
  v_acao text;
  v_registro_id uuid;
  v_detalhes jsonb;
BEGIN
  -- Determine action
  IF TG_OP = 'INSERT' THEN
    v_acao := 'criou';
    v_registro_id := NEW.id;
    v_empresa_id := NEW.empresa_id;
    v_detalhes := jsonb_build_object('novo', to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    v_acao := 'editou';
    v_registro_id := NEW.id;
    v_empresa_id := NEW.empresa_id;
    -- Only store changed fields
    v_detalhes := jsonb_build_object(
      'anterior', to_jsonb(OLD),
      'novo', to_jsonb(NEW)
    );
  ELSIF TG_OP = 'DELETE' THEN
    v_acao := 'excluiu';
    v_registro_id := OLD.id;
    v_empresa_id := OLD.empresa_id;
    v_detalhes := jsonb_build_object('excluido', to_jsonb(OLD));
  END IF;

  -- Insert audit log (ignore failures silently)
  BEGIN
    INSERT INTO public.audit_log (empresa_id, user_id, acao, tabela, registro_id, detalhes)
    VALUES (v_empresa_id, auth.uid(), v_acao, TG_TABLE_NAME, v_registro_id, v_detalhes);
  EXCEPTION WHEN OTHERS THEN
    -- Don't block the original operation
    NULL;
  END;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- Add triggers to main tables
CREATE TRIGGER audit_agendamentos
AFTER INSERT OR UPDATE OR DELETE ON public.agendamentos
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_clientes
AFTER INSERT OR UPDATE OR DELETE ON public.clientes
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_pets
AFTER INSERT OR UPDATE OR DELETE ON public.pets
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_produtos
AFTER INSERT OR UPDATE OR DELETE ON public.produtos
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_contas_receber
AFTER INSERT OR UPDATE OR DELETE ON public.contas_receber
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_contas_pagar
AFTER INSERT OR UPDATE OR DELETE ON public.contas_pagar
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_vendas_produtos
AFTER INSERT OR UPDATE OR DELETE ON public.vendas_produtos
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_contracts
AFTER INSERT OR UPDATE OR DELETE ON public.contracts
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_customer_pet_subscriptions
AFTER INSERT OR UPDATE OR DELETE ON public.customer_pet_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_conversas
AFTER INSERT OR UPDATE OR DELETE ON public.conversas
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_profiles
AFTER INSERT OR UPDATE OR DELETE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_contas_bancarias
AFTER INSERT OR UPDATE OR DELETE ON public.contas_bancarias
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_movimentacoes_estoque
AFTER INSERT OR UPDATE OR DELETE ON public.movimentacoes_estoque
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- RLS policy for audit_log (read-only for same empresa)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'audit_log' AND policyname = 'audit_log_select') THEN
    CREATE POLICY "audit_log_select" ON public.audit_log
      FOR SELECT TO authenticated
      USING (empresa_id = public.get_user_empresa_id());
  END IF;
END $$;
