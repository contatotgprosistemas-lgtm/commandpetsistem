-- 1) Campos de vínculo e tipo na tabela de faturas
ALTER TABLE public.contas_receber
  ADD COLUMN IF NOT EXISTS parent_conta_id uuid REFERENCES public.contas_receber(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS tipo_fatura text NOT NULL DEFAULT 'normal';

CREATE INDEX IF NOT EXISTS idx_contas_receber_parent ON public.contas_receber(parent_conta_id);
CREATE INDEX IF NOT EXISTS idx_contas_receber_tipo_fatura ON public.contas_receber(tipo_fatura);

-- 2) Configuração da multa por atraso
ALTER TABLE public.invoice_notification_config
  ADD COLUMN IF NOT EXISTS multa_atraso_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS multa_atraso_valor numeric NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS multa_atraso_descricao text NOT NULL DEFAULT 'Multa por atraso no pagamento',
  ADD COLUMN IF NOT EXISTS multa_atraso_mensagem text;

-- 3) Trigger: bloquear baixa de uma fatura sem quitar a parent ou as filhas
CREATE OR REPLACE FUNCTION public.enforce_multa_atraso_pagamento_conjunto()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_pendente_count int;
  v_parent_status text;
BEGIN
  -- Só interfere quando está virando 'pago'
  IF NEW.status = 'pago' AND COALESCE(OLD.status,'') <> 'pago' THEN
    -- Caso 1: a fatura é uma multa filha — exige que a parent já esteja paga
    IF NEW.parent_conta_id IS NOT NULL THEN
      SELECT status INTO v_parent_status FROM contas_receber WHERE id = NEW.parent_conta_id;
      IF v_parent_status IS DISTINCT FROM 'pago' THEN
        RAISE EXCEPTION 'Esta multa só pode ser quitada junto com a fatura original (id %).', NEW.parent_conta_id;
      END IF;
    ELSE
      -- Caso 2: a fatura é uma parent — exige que todas as filhas (multas) sejam baixadas em conjunto
      SELECT count(*) INTO v_pendente_count
        FROM contas_receber
       WHERE parent_conta_id = NEW.id AND status <> 'pago';
      IF v_pendente_count > 0 THEN
        RAISE EXCEPTION 'Existe(m) multa(s) por atraso vinculada(s) a esta fatura. Pague tudo junto.';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_multa_pagamento_conjunto ON public.contas_receber;
CREATE TRIGGER trg_enforce_multa_pagamento_conjunto
BEFORE UPDATE ON public.contas_receber
FOR EACH ROW EXECUTE FUNCTION public.enforce_multa_atraso_pagamento_conjunto();
