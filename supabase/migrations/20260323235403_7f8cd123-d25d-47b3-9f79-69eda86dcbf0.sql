
-- Create movimentacoes table
CREATE TABLE public.movimentacoes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  data_movimentacao date NOT NULL DEFAULT CURRENT_DATE,
  plano_contas text,
  pessoa text,
  complemento text,
  banco text,
  valor numeric NOT NULL DEFAULT 0,
  tipo text NOT NULL DEFAULT 'contas_a_receber',
  conta_receber_id uuid REFERENCES public.contas_receber(id),
  conta_pagar_id uuid REFERENCES public.contas_pagar(id),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.movimentacoes ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Tenant isolation select" ON public.movimentacoes FOR SELECT TO authenticated USING (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation insert" ON public.movimentacoes FOR INSERT TO authenticated WITH CHECK (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation update" ON public.movimentacoes FOR UPDATE TO authenticated USING (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation delete" ON public.movimentacoes FOR DELETE TO authenticated USING (empresa_id = get_user_empresa_id());

-- Update efetuar_baixa to insert into movimentacoes
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
  v_cliente_nome text;
BEGIN
  SELECT * INTO v_conta FROM contas_receber WHERE id = p_conta_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Conta não encontrada');
  END IF;

  v_valor_liquido := p_valor_pago + p_valor_juros - p_valor_desconto;

  IF v_valor_liquido > v_conta.valor THEN
    RETURN jsonb_build_object('success', false, 'error', 'Valor da baixa maior que o valor da fatura. Corrija o valor na fatura primeiro.');
  END IF;

  -- Get client name
  SELECT nome INTO v_cliente_nome FROM clientes WHERE id = v_conta.cliente_id;

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

  -- Insert into movimentacoes
  INSERT INTO movimentacoes (empresa_id, data_movimentacao, plano_contas, pessoa, complemento, banco, valor, tipo, conta_receber_id)
  VALUES (
    v_conta.empresa_id,
    p_data_baixa,
    COALESCE(v_conta.categoria, v_conta.descricao),
    v_cliente_nome,
    v_conta.descricao,
    p_banco_nome,
    v_valor_liquido,
    'contas_a_receber',
    p_conta_id
  );

  RETURN jsonb_build_object('success', true, 'valor_restante', v_valor_restante);
END;
$$;
