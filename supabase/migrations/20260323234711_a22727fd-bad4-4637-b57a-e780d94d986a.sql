
CREATE OR REPLACE FUNCTION public.efetuar_baixa(
  p_conta_id uuid,
  p_data_baixa date,
  p_banco_id uuid,
  p_banco_nome text,
  p_valor_pago numeric,
  p_valor_juros numeric DEFAULT 0,
  p_valor_desconto numeric DEFAULT 0,
  p_observacao text DEFAULT null
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conta contas_receber%ROWTYPE;
  v_valor_liquido numeric;
  v_valor_restante numeric;
BEGIN
  SELECT * INTO v_conta FROM contas_receber WHERE id = p_conta_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Conta não encontrada');
  END IF;

  v_valor_liquido := p_valor_pago + p_valor_juros - p_valor_desconto;

  IF v_valor_liquido > v_conta.valor THEN
    RETURN jsonb_build_object('success', false, 'error', 'Valor da baixa maior que o valor da fatura. Corrija o valor na fatura primeiro.');
  END IF;

  -- Update the original invoice as paid
  UPDATE contas_receber SET
    status = 'pago',
    data_baixa = p_data_baixa,
    banco = p_banco_nome,
    valor_pago = p_valor_pago,
    valor_juros = p_valor_juros,
    valor_desconto = p_valor_desconto,
    observacao_baixa = p_observacao,
    valor = v_valor_liquido,
    updated_at = now()
  WHERE id = p_conta_id;

  -- If partial payment, create new invoice for the remaining amount
  v_valor_restante := v_conta.valor - v_valor_liquido;
  IF v_valor_restante > 0.01 THEN
    INSERT INTO contas_receber (empresa_id, cliente_id, descricao, valor, vencimento, categoria, status)
    VALUES (
      v_conta.empresa_id,
      v_conta.cliente_id,
      v_conta.descricao || ' (saldo restante)',
      v_valor_restante,
      v_conta.vencimento,
      v_conta.categoria,
      'pendente'
    );
  END IF;

  -- Update bank account balance
  UPDATE contas_bancarias SET
    saldo_atual = saldo_atual + p_valor_pago,
    updated_at = now()
  WHERE id = p_banco_id;

  RETURN jsonb_build_object('success', true, 'valor_restante', v_valor_restante);
END;
$$;
