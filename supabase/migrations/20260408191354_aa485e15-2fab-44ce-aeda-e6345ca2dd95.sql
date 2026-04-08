
-- Add conta_bancaria_id to movimentacoes for reliable bank linking
ALTER TABLE public.movimentacoes ADD COLUMN IF NOT EXISTS conta_bancaria_id uuid REFERENCES public.contas_bancarias(id);

-- Backfill existing movimentacoes with conta_bancaria_id
UPDATE movimentacoes m
SET conta_bancaria_id = cb.id
FROM contas_bancarias cb
WHERE m.banco IS NOT NULL
  AND m.conta_bancaria_id IS NULL
  AND m.empresa_id = cb.empresa_id
  AND m.banco = (cb.banco || ' - ' || cb.titular);

-- Also match "PIX - Asaas" style names
UPDATE movimentacoes m
SET conta_bancaria_id = cb.id
FROM contas_bancarias cb
WHERE m.banco IS NOT NULL
  AND m.conta_bancaria_id IS NULL
  AND m.empresa_id = cb.empresa_id
  AND LOWER(m.banco) LIKE '%' || LOWER(cb.banco) || '%';

-- Function to sync a single bank account balance from movements
CREATE OR REPLACE FUNCTION public.sincronizar_saldo_bancario(p_conta_bancaria_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_saldo_inicial numeric;
  v_soma_movs numeric;
  v_novo_saldo numeric;
BEGIN
  SELECT saldo_inicial INTO v_saldo_inicial FROM contas_bancarias WHERE id = p_conta_bancaria_id;
  
  SELECT COALESCE(SUM(valor), 0) INTO v_soma_movs
  FROM movimentacoes
  WHERE conta_bancaria_id = p_conta_bancaria_id;

  v_novo_saldo := v_saldo_inicial + v_soma_movs;

  UPDATE contas_bancarias
  SET saldo_atual = v_novo_saldo, updated_at = now()
  WHERE id = p_conta_bancaria_id;

  RETURN v_novo_saldo;
END;
$$;

-- Function to sync all bank accounts for an empresa
CREATE OR REPLACE FUNCTION public.sincronizar_todos_saldos(p_empresa_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_conta RECORD;
  v_results jsonb := '[]'::jsonb;
BEGIN
  FOR v_conta IN SELECT id, banco, titular, saldo_inicial FROM contas_bancarias WHERE empresa_id = p_empresa_id
  LOOP
    DECLARE
      v_soma numeric;
      v_novo_saldo numeric;
    BEGIN
      SELECT COALESCE(SUM(valor), 0) INTO v_soma
      FROM movimentacoes WHERE conta_bancaria_id = v_conta.id;
      
      v_novo_saldo := v_conta.saldo_inicial + v_soma;
      
      UPDATE contas_bancarias SET saldo_atual = v_novo_saldo, updated_at = now() WHERE id = v_conta.id;
      
      v_results := v_results || jsonb_build_object('banco', v_conta.banco || ' - ' || v_conta.titular, 'saldo', v_novo_saldo);
    END;
  END LOOP;
  
  RETURN v_results;
END;
$$;

-- Updated efetuar_baixa to also store conta_bancaria_id
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
  v_valor_efetivo numeric;
  v_cobertura_total numeric;
  v_valor_restante numeric;
  v_cliente_nome text;
  v_taxa_record RECORD;
  v_taxa_valor numeric := 0;
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
    INSERT INTO contas_receber (empresa_id, cliente_id, descricao, valor, vencimento, categoria, status)
    VALUES (v_conta.empresa_id, v_conta.cliente_id, v_conta.descricao || ' (saldo restante)', v_valor_restante, v_conta.vencimento, v_conta.categoria, 'pendente');
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

  -- SYNC bank balance from movements (single source of truth)
  PERFORM sincronizar_saldo_bancario(p_banco_id);

  RETURN jsonb_build_object('success', true, 'valor_restante', v_valor_restante, 'taxa_descontada', v_taxa_valor);
END;
$$;

-- Updated excluir_movimentacao to use conta_bancaria_id and sync
CREATE OR REPLACE FUNCTION public.excluir_movimentacao(p_movimentacao_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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

  -- Fallback: find bank by name if conta_bancaria_id is null
  IF v_banco_id IS NULL AND v_mov.banco IS NOT NULL THEN
    SELECT id INTO v_banco_id FROM contas_bancarias
    WHERE empresa_id = v_mov.empresa_id AND (banco || ' - ' || titular) = v_mov.banco LIMIT 1;
    IF v_banco_id IS NULL THEN
      SELECT id INTO v_banco_id FROM contas_bancarias
      WHERE empresa_id = v_mov.empresa_id AND LOWER(v_mov.banco) LIKE '%' || LOWER(banco) || '%' LIMIT 1;
    END IF;
  END IF;

  -- Reopen linked contas_receber
  IF v_mov.conta_receber_id IS NOT NULL THEN
    UPDATE contas_receber
    SET status = 'pendente', data_baixa = NULL, banco = NULL, valor_pago = NULL, valor_juros = NULL, valor_desconto = NULL, observacao_baixa = NULL, updated_at = now()
    WHERE id = v_mov.conta_receber_id AND status = 'pago';
  END IF;

  -- Delete related fee movimentações
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

  -- Delete the main movimentação
  DELETE FROM movimentacoes WHERE id = p_movimentacao_id;

  -- SYNC bank balance from movements (single source of truth)
  IF v_banco_id IS NOT NULL THEN
    PERFORM sincronizar_saldo_bancario(v_banco_id);
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;
