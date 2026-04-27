-- Consolida faturas pendentes duplicadas (mesmo cliente, mesma data de vencimento, mesma categoria)
DO $$
DECLARE
  g RECORD;
  f RECORD;
  v_master_id uuid;
  v_master_valor numeric;
  v_total numeric;
  v_count int;
BEGIN
  FOR g IN
    SELECT empresa_id, cliente_id, vencimento, categoria, COUNT(*) AS qtd
    FROM contas_receber
    WHERE status = 'pendente'
      AND cliente_id IS NOT NULL
    GROUP BY empresa_id, cliente_id, vencimento, categoria
    HAVING COUNT(*) > 1
  LOOP
    -- Pega a fatura mais antiga como "mestre"
    SELECT id, valor INTO v_master_id, v_master_valor
    FROM contas_receber
    WHERE empresa_id = g.empresa_id
      AND cliente_id = g.cliente_id
      AND vencimento = g.vencimento
      AND COALESCE(categoria, '') = COALESCE(g.categoria, '')
      AND status = 'pendente'
    ORDER BY created_at ASC
    LIMIT 1;

    v_total := 0;
    v_count := 0;

    -- Itera por TODAS as faturas do grupo (incluindo a mestre) e cria itens em contas_receber_itens
    FOR f IN
      SELECT id, descricao, valor
      FROM contas_receber
      WHERE empresa_id = g.empresa_id
        AND cliente_id = g.cliente_id
        AND vencimento = g.vencimento
        AND COALESCE(categoria, '') = COALESCE(g.categoria, '')
        AND status = 'pendente'
      ORDER BY created_at ASC
    LOOP
      -- Cria item se ainda não existir item igual na fatura mestre
      IF NOT EXISTS (
        SELECT 1 FROM contas_receber_itens
        WHERE conta_receber_id = v_master_id
          AND descricao = f.descricao
          AND valor = f.valor
      ) THEN
        INSERT INTO contas_receber_itens (conta_receber_id, empresa_id, descricao, valor, tipo)
        VALUES (v_master_id, g.empresa_id, f.descricao, f.valor, 'principal');
      END IF;

      v_total := v_total + f.valor;
      v_count := v_count + 1;

      -- Apaga as outras faturas (não a mestre)
      IF f.id <> v_master_id THEN
        DELETE FROM contas_receber WHERE id = f.id;
      END IF;
    END LOOP;

    -- Atualiza o valor e descrição da fatura mestre
    UPDATE contas_receber
    SET valor = v_total,
        descricao = 'Faturamento mensal (' || v_count || ' itens)',
        updated_at = now()
    WHERE id = v_master_id;
  END LOOP;
END $$;