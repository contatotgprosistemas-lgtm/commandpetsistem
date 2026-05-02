-- RPC para efetuar baixa em conta a pagar
CREATE OR REPLACE FUNCTION public.efetuar_baixa_conta_pagar(
  p_conta_id uuid,
  p_data_baixa date,
  p_banco_id uuid,
  p_banco_nome text,
  p_valor_pago numeric,
  p_observacao text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_conta contas_pagar%ROWTYPE;
BEGIN
  SELECT * INTO v_conta FROM contas_pagar WHERE id = p_conta_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Conta não encontrada');
  END IF;

  -- Marca como paga
  UPDATE contas_pagar SET
    status = 'pago',
    updated_at = now()
  WHERE id = p_conta_id;

  -- Cria movimentação como saída (valor negativo)
  INSERT INTO movimentacoes (
    empresa_id, data_movimentacao, plano_contas, pessoa, complemento,
    banco, valor, tipo, conta_pagar_id, conta_bancaria_id
  )
  VALUES (
    v_conta.empresa_id, p_data_baixa,
    COALESCE(v_conta.categoria, v_conta.descricao),
    v_conta.fornecedor,
    COALESCE(p_observacao, v_conta.descricao),
    p_banco_nome,
    p_valor_pago * -1,
    'contas_a_pagar',
    p_conta_id,
    p_banco_id
  );

  PERFORM sincronizar_saldo_bancario(p_banco_id);

  RETURN jsonb_build_object('success', true);
END;
$function$;

-- Permite reabrir uma conta paga ao excluir movimentação correspondente
CREATE OR REPLACE FUNCTION public.excluir_movimentacao(p_movimentacao_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_mov movimentacoes%ROWTYPE;
  v_banco_id uuid;
  v_fee RECORD;
BEGIN
  SELECT * INTO v_mov FROM movimentacoes WHERE id = p_movimentacao_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Movimentação não encontrada');
  END IF;

  v_banco_id := v_mov.conta_bancaria_id;

  IF v_banco_id IS NULL AND v_mov.banco IS NOT NULL THEN
    SELECT id INTO v_banco_id FROM contas_bancarias
    WHERE empresa_id = v_mov.empresa_id AND (banco || ' - ' || titular) = v_mov.banco LIMIT 1;
    IF v_banco_id IS NULL THEN
      SELECT id INTO v_banco_id FROM contas_bancarias
      WHERE empresa_id = v_mov.empresa_id AND LOWER(v_mov.banco) LIKE '%' || LOWER(banco) || '%' LIMIT 1;
    END IF;
  END IF;

  -- Reabrir conta a receber vinculada
  IF v_mov.conta_receber_id IS NOT NULL THEN
    UPDATE contas_receber
    SET status = 'pendente', data_baixa = NULL, banco = NULL, valor_pago = NULL,
        valor_juros = NULL, valor_desconto = NULL, observacao_baixa = NULL, updated_at = now()
    WHERE id = v_mov.conta_receber_id AND status = 'pago';
  END IF;

  -- Reabrir conta a pagar vinculada
  IF v_mov.conta_pagar_id IS NOT NULL THEN
    UPDATE contas_pagar
    SET status = 'pendente', updated_at = now()
    WHERE id = v_mov.conta_pagar_id AND status = 'pago';
  END IF;

  -- Apagar taxa financeira relacionada
  IF v_mov.conta_receber_id IS NOT NULL AND v_mov.tipo = 'contas_a_receber' THEN
    FOR v_fee IN
      SELECT id FROM movimentacoes
      WHERE empresa_id = v_mov.empresa_id AND tipo = 'taxa_financeira'
        AND data_movimentacao = v_mov.data_movimentacao
        AND conta_bancaria_id = v_banco_id
        AND complemento LIKE '%' || (SELECT descricao FROM contas_receber WHERE id = v_mov.conta_receber_id) || '%'
    LOOP
      DELETE FROM movimentacoes WHERE id = v_fee.id;
    END LOOP;
  END IF;

  DELETE FROM movimentacoes WHERE id = p_movimentacao_id;

  IF v_banco_id IS NOT NULL THEN
    PERFORM sincronizar_saldo_bancario(v_banco_id);
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$function$;