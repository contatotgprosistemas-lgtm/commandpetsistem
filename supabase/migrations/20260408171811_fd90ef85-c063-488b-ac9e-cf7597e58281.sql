
-- 1. Create function to delete movimentação with reversal
CREATE OR REPLACE FUNCTION public.excluir_movimentacao(p_movimentacao_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_mov movimentacoes%ROWTYPE;
  v_banco_id uuid;
BEGIN
  SELECT * INTO v_mov FROM movimentacoes WHERE id = p_movimentacao_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Movimentação não encontrada');
  END IF;

  -- Reverse bank balance if there's a linked bank
  IF v_mov.banco IS NOT NULL THEN
    SELECT id INTO v_banco_id FROM contas_bancarias
    WHERE empresa_id = v_mov.empresa_id
      AND (banco || ' - ' || titular) = v_mov.banco
    LIMIT 1;

    IF v_banco_id IS NOT NULL THEN
      -- Subtract the value (positive mov = subtract, negative mov like fees = add back)
      UPDATE contas_bancarias
      SET saldo_atual = saldo_atual - v_mov.valor, updated_at = now()
      WHERE id = v_banco_id;
    END IF;
  END IF;

  -- Reopen linked contas_receber
  IF v_mov.conta_receber_id IS NOT NULL THEN
    UPDATE contas_receber
    SET status = 'pendente',
        data_baixa = NULL,
        banco = NULL,
        valor_pago = NULL,
        valor_juros = NULL,
        valor_desconto = NULL,
        observacao_baixa = NULL,
        updated_at = now()
    WHERE id = v_mov.conta_receber_id AND status = 'pago';
  END IF;

  -- Also delete any related fee movimentações (taxa_financeira linked to the same conta_receber)
  IF v_mov.conta_receber_id IS NOT NULL AND v_mov.tipo = 'contas_a_receber' THEN
    -- Find and reverse fee entries
    FOR v_mov IN
      SELECT * FROM movimentacoes
      WHERE empresa_id = v_mov.empresa_id
        AND tipo = 'taxa_financeira'
        AND complemento LIKE '%' || (SELECT descricao FROM contas_receber WHERE id = v_mov.conta_receber_id) || '%'
        AND data_movimentacao = v_mov.data_movimentacao
    LOOP
      -- Reverse fee from bank
      IF v_mov.banco IS NOT NULL AND v_banco_id IS NOT NULL THEN
        UPDATE contas_bancarias
        SET saldo_atual = saldo_atual - v_mov.valor, updated_at = now()
        WHERE id = v_banco_id;
      END IF;
      DELETE FROM movimentacoes WHERE id = v_mov.id;
    END LOOP;
  END IF;

  -- Delete the main movimentação
  DELETE FROM movimentacoes WHERE id = p_movimentacao_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 2. Fix efetuar_baixa: discount should NOT create saldo restante
CREATE OR REPLACE FUNCTION public.efetuar_baixa(
  p_conta_id uuid,
  p_data_baixa date,
  p_banco_id uuid,
  p_banco_nome text,
  p_valor_pago numeric,
  p_valor_juros numeric DEFAULT 0,
  p_valor_desconto numeric DEFAULT 0,
  p_observacao text DEFAULT NULL,
  p_forma_pagamento text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_conta contas_receber%ROWTYPE;
  v_valor_liquido numeric;
  v_valor_restante numeric;
  v_cliente_nome text;
  v_taxa_record RECORD;
  v_taxa_valor numeric := 0;
BEGIN
  SELECT * INTO v_conta FROM contas_receber WHERE id = p_conta_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Conta não encontrada');
  END IF;

  v_valor_liquido := p_valor_pago + p_valor_juros - p_valor_desconto;

  IF v_valor_liquido > v_conta.valor THEN
    RETURN jsonb_build_object('success', false, 'error', 'Valor da baixa maior que o valor da fatura. Corrija o valor na fatura primeiro.');
  END IF;

  SELECT nome INTO v_cliente_nome FROM clientes WHERE id = v_conta.cliente_id;

  -- Calculate remainder: only when there's NO discount
  -- If there's a discount, the invoice is considered fully paid
  IF p_valor_desconto > 0 THEN
    v_valor_restante := 0;
  ELSE
    v_valor_restante := v_conta.valor - v_valor_liquido;
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
    valor = CASE WHEN p_valor_desconto > 0 THEN v_conta.valor ELSE v_valor_liquido END,
    updated_at = now()
  WHERE id = p_conta_id;

  -- If partial payment (no discount), create new invoice for remaining
  IF v_valor_restante > 0.01 THEN
    INSERT INTO contas_receber (empresa_id, cliente_id, descricao, valor, vencimento, categoria, status)
    VALUES (
      v_conta.empresa_id, v_conta.cliente_id,
      v_conta.descricao || ' (saldo restante)', v_valor_restante,
      v_conta.vencimento, v_conta.categoria, 'pendente'
    );
  END IF;

  -- Update bank balance
  UPDATE contas_bancarias SET
    saldo_atual = saldo_atual + p_valor_pago,
    updated_at = now()
  WHERE id = p_banco_id;

  -- Insert main movimentacao
  INSERT INTO movimentacoes (empresa_id, data_movimentacao, plano_contas, pessoa, complemento, banco, valor, tipo, conta_receber_id)
  VALUES (
    v_conta.empresa_id, p_data_baixa,
    COALESCE(v_conta.categoria, v_conta.descricao),
    v_cliente_nome, v_conta.descricao, p_banco_nome,
    v_valor_liquido, 'contas_a_receber', p_conta_id
  );

  -- Auto-deduct financial fees if forma_pagamento is provided
  IF p_forma_pagamento IS NOT NULL THEN
    FOR v_taxa_record IN
      SELECT percentual, valor_fixo
      FROM taxas_financeiras
      WHERE empresa_id = v_conta.empresa_id
        AND ativo = true
        AND tipo = p_forma_pagamento
      LIMIT 1
    LOOP
      v_taxa_valor := ROUND((v_valor_liquido * v_taxa_record.percentual / 100) + v_taxa_record.valor_fixo, 2);

      IF v_taxa_valor > 0 THEN
        INSERT INTO movimentacoes (empresa_id, data_movimentacao, plano_contas, pessoa, complemento, banco, valor, tipo)
        VALUES (
          v_conta.empresa_id, p_data_baixa,
          'Despesas Financeiras',
          v_cliente_nome,
          'Taxa ' || 
            CASE p_forma_pagamento
              WHEN 'cartao_credito' THEN 'Cartão Crédito'
              WHEN 'cartao_debito' THEN 'Cartão Débito'
              WHEN 'pix' THEN 'PIX'
              ELSE p_forma_pagamento
            END
            || ' - ' || v_conta.descricao,
          p_banco_nome,
          v_taxa_valor * -1,
          'taxa_financeira'
        );

        UPDATE contas_bancarias SET
          saldo_atual = saldo_atual - v_taxa_valor,
          updated_at = now()
        WHERE id = p_banco_id;
      END IF;
    END LOOP;
  END IF;

  RETURN jsonb_build_object('success', true, 'valor_restante', v_valor_restante, 'taxa_descontada', v_taxa_valor);
END;
$$;

-- Drop the old overload without p_forma_pagamento to avoid ambiguity
DROP FUNCTION IF EXISTS public.efetuar_baixa(uuid, date, uuid, text, numeric, numeric, numeric, text);
