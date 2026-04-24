CREATE OR REPLACE FUNCTION public.crm_calc_sla()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_first_in timestamptz;
  v_conv RECORD;
BEGIN
  IF NEW.direcao <> 'saida'::crm_mensagem_direcao THEN
    RETURN NEW;
  END IF;

  SELECT primeira_resposta_em INTO v_conv FROM crm_conversas WHERE id = NEW.conversa_id;
  IF v_conv.primeira_resposta_em IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT MIN(created_at) INTO v_first_in
  FROM crm_mensagens
  WHERE conversa_id = NEW.conversa_id AND direcao = 'entrada'::crm_mensagem_direcao;

  IF v_first_in IS NOT NULL THEN
    UPDATE crm_conversas
    SET primeira_resposta_em = NEW.created_at,
        tempo_primeira_resposta_seg = EXTRACT(EPOCH FROM (NEW.created_at - v_first_in))::int
    WHERE id = NEW.conversa_id;
  END IF;

  RETURN NEW;
END;
$function$;