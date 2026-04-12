
-- Add inventory columns to produtos
ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS estoque_atual integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estoque_minimo integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS codigo_barras text,
  ADD COLUMN IF NOT EXISTS unidade text NOT NULL DEFAULT 'un',
  ADD COLUMN IF NOT EXISTS ncm text,
  ADD COLUMN IF NOT EXISTS custo numeric NOT NULL DEFAULT 0;

-- Sales table
CREATE TABLE public.vendas_produtos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  cliente_id uuid REFERENCES public.clientes(id),
  vendedor_id uuid REFERENCES public.profiles(id),
  data_venda timestamptz NOT NULL DEFAULT now(),
  valor_total numeric NOT NULL DEFAULT 0,
  desconto numeric NOT NULL DEFAULT 0,
  valor_final numeric NOT NULL DEFAULT 0,
  forma_pagamento text,
  status text NOT NULL DEFAULT 'finalizada',
  cupom_fiscal text,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vendas_produtos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vendas_produtos_select" ON public.vendas_produtos
  FOR SELECT TO authenticated
  USING (empresa_id = public.get_user_empresa_id());

CREATE POLICY "vendas_produtos_insert" ON public.vendas_produtos
  FOR INSERT TO authenticated
  WITH CHECK (empresa_id = public.get_user_empresa_id());

CREATE POLICY "vendas_produtos_update" ON public.vendas_produtos
  FOR UPDATE TO authenticated
  USING (empresa_id = public.get_user_empresa_id());

-- Sale items table
CREATE TABLE public.vendas_produtos_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venda_id uuid NOT NULL REFERENCES public.vendas_produtos(id) ON DELETE CASCADE,
  produto_id uuid NOT NULL REFERENCES public.produtos(id),
  quantidade integer NOT NULL DEFAULT 1,
  valor_unitario numeric NOT NULL,
  subtotal numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vendas_produtos_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vendas_itens_select" ON public.vendas_produtos_itens
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.vendas_produtos v WHERE v.id = venda_id AND v.empresa_id = public.get_user_empresa_id()));

CREATE POLICY "vendas_itens_insert" ON public.vendas_produtos_itens
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.vendas_produtos v WHERE v.id = venda_id AND v.empresa_id = public.get_user_empresa_id()));

-- Stock movements table
CREATE TABLE public.movimentacoes_estoque (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  produto_id uuid NOT NULL REFERENCES public.produtos(id),
  tipo text NOT NULL DEFAULT 'entrada',
  quantidade integer NOT NULL,
  motivo text,
  venda_id uuid REFERENCES public.vendas_produtos(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.movimentacoes_estoque ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mov_estoque_select" ON public.movimentacoes_estoque
  FOR SELECT TO authenticated
  USING (empresa_id = public.get_user_empresa_id());

CREATE POLICY "mov_estoque_insert" ON public.movimentacoes_estoque
  FOR INSERT TO authenticated
  WITH CHECK (empresa_id = public.get_user_empresa_id());

-- Auto-deduct stock on sale item insert
CREATE OR REPLACE FUNCTION public.deduct_stock_on_sale()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_empresa_id uuid;
BEGIN
  SELECT empresa_id INTO v_empresa_id FROM vendas_produtos WHERE id = NEW.venda_id;

  UPDATE produtos SET estoque_atual = estoque_atual - NEW.quantidade, updated_at = now()
  WHERE id = NEW.produto_id;

  INSERT INTO movimentacoes_estoque (empresa_id, produto_id, tipo, quantidade, motivo, venda_id)
  VALUES (v_empresa_id, NEW.produto_id, 'saida', NEW.quantidade, 'Venda', NEW.venda_id);

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_deduct_stock_on_sale
AFTER INSERT ON public.vendas_produtos_itens
FOR EACH ROW EXECUTE FUNCTION public.deduct_stock_on_sale();

-- Timestamps trigger
CREATE TRIGGER update_vendas_produtos_updated_at
BEFORE UPDATE ON public.vendas_produtos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
