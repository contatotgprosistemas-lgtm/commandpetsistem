CREATE OR REPLACE FUNCTION public.efetuar_baixa(
  p_conta_id uuid,
  p_data_baixa date,
  p_banco_id uuid,
  p_banco_nome text,
  p_valor_pago numeric,
  p_valor_juros numeric DEFAULT 0,
  p_valor_desconto numeric DEFAULT 0,
  p_observacao text DEFAULT NULL::text,
  p_forma_pagamento text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_conta contas_receber%ROWTYPE;
  v_valor_efetivo numeric;
  v_cobertura_total numeric;
  v_valor_restante numeric;
  v_cliente_nome text;
  v_taxa_record RECORD;
  v_taxa_valor numeric := 0;
  v_nova_conta_id uuid;
BEGIN
  SELECT * INTO v_conta FROM contas_receber WHERE id = p_conta_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Conta não encontrada');
  END IF;

  v_valor_efetivo := p_valor_pago + p_valor_juros;
  v_cobertura_total := v_valor_efetivo + p_valor_desconto;

  IF v_cobertura_total > v_conta.valor + 0.01 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Valor da baixa maior que o valor da fatura.');
  END IF;

  SELECT nome INTO v_cliente_nome FROM clientes WHERE id = v_conta.cliente_id;

  IF p_valor_desconto > 0 THEN
    v_valor_restante := 0;
  ELSE
    v_valor_restante := v_conta.valor - v_cobertura_total;
  END IF;

  UPDATE contas_receber SET
    status = 'pago', data_baixa = p_data_baixa, banco = p_banco_nome,
    valor_pago = p_valor_pago, valor_juros = p_valor_juros, valor_desconto = p_valor_desconto,
    observacao_baixa = p_observacao,
    valor = CASE WHEN p_valor_desconto > 0 THEN v_conta.valor ELSE v_cobertura_total END,
    updated_at = now()
  WHERE id = p_conta_id;

  IF v_valor_restante > 0.01 THEN
    -- Create the remaining-balance invoice and capture the new id
    INSERT INTO contas_receber (
      empresa_id, cliente_id, descricao, valor, vencimento, categoria, status,
      valor_pago
    )
    VALUES (
      v_conta.empresa_id, v_conta.cliente_id,
      v_conta.descricao || ' (saldo restante)',
      v_valor_restante, v_conta.vencimento, v_conta.categoria, 'pendente',
      v_valor_efetivo
    )
    RETURNING id INTO v_nova_conta_id;

    -- Copy original invoice items so the breakdown is visible when expanding
    INSERT INTO contas_receber_itens (conta_receber_id, empresa_id, descricao, valor, tipo)
    SELECT v_nova_conta_id, empresa_id, descricao, valor, tipo
    FROM contas_receber_itens
    WHERE conta_receber_id = p_conta_id;

    -- Add a "valor já pago" line so the user sees how much was already received
    INSERT INTO contas_receber_itens (conta_receber_id, empresa_id, descricao, valor, tipo)
    VALUES (
      v_nova_conta_id,
      v_conta.empresa_id,
      'Valor já pago em ' || to_char(p_data_baixa, 'DD/MM/YYYY') || ' (' || p_banco_nome || ')',
      -v_valor_efetivo,
      'pagamento'
    );
  END IF;

  -- Insert movimentacao WITH conta_bancaria_id
  INSERT INTO movimentacoes (empresa_id, data_movimentacao, plano_contas, pessoa, complemento, banco, valor, tipo, conta_receber_id, conta_bancaria_id)
  VALUES (v_conta.empresa_id, p_data_baixa, COALESCE(v_conta.categoria, v_conta.descricao), v_cliente_nome, v_conta.descricao, p_banco_nome, v_valor_efetivo, 'contas_a_receber', p_conta_id, p_banco_id);

  -- Auto-deduct financial fees
  IF p_forma_pagamento IS NOT NULL THEN
    FOR v_taxa_record IN
      SELECT percentual, valor_fixo FROM taxas_financeiras
      WHERE empresa_id = v_conta.empresa_id AND ativo = true AND tipo = p_forma_pagamento LIMIT 1
    LOOP
      v_taxa_valor := ROUND((v_valor_efetivo * v_taxa_record.percentual / 100) + v_taxa_record.valor_fixo, 2);
      IF v_taxa_valor > 0 THEN
        INSERT INTO movimentacoes (empresa_id, data_movimentacao, plano_contas, pessoa, complemento, banco, valor, tipo, conta_bancaria_id)
        VALUES (v_conta.empresa_id, p_data_baixa, 'Despesas Financeiras', v_cliente_nome,
          'Taxa ' || CASE p_forma_pagamento WHEN 'cartao_credito' THEN 'Cartão Crédito' WHEN 'cartao_debito' THEN 'Cartão Débito' WHEN 'pix' THEN 'PIX' ELSE p_forma_pagamento END || ' - ' || v_conta.descricao,
          p_banco_nome, v_taxa_valor * -1, 'taxa_financeira', p_banco_id);
      END IF;
    END LOOP;
  END IF;

  PERFORM sincronizar_saldo_bancario(p_banco_id);

  RETURN jsonb_build_object(
    'success', true,
    'valor_restante', v_valor_restante,
    'taxa_descontada', v_taxa_valor,
    'nova_conta_id', v_nova_conta_id
  );
END;
$function$;