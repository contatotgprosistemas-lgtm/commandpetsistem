
ALTER TABLE public.vendas_produtos_itens
  ALTER COLUMN produto_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS servico_id uuid REFERENCES public.servicos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS descricao text;

ALTER TABLE public.vendas_produtos_itens
  DROP CONSTRAINT IF EXISTS chk_item_produto_or_servico;
ALTER TABLE public.vendas_produtos_itens
  ADD CONSTRAINT chk_item_produto_or_servico
  CHECK (produto_id IS NOT NULL OR servico_id IS NOT NULL);

CREATE OR REPLACE FUNCTION public.deduct_stock_on_sale()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_empresa_id uuid;
BEGIN
  -- Only deduct stock for product items
  IF NEW.produto_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT empresa_id INTO v_empresa_id FROM vendas_produtos WHERE id = NEW.venda_id;

  UPDATE produtos SET estoque_atual = estoque_atual - NEW.quantidade, updated_at = now()
  WHERE id = NEW.produto_id;

  INSERT INTO movimentacoes_estoque (empresa_id, produto_id, tipo, quantidade, motivo, venda_id)
  VALUES (v_empresa_id, NEW.produto_id, 'saida', NEW.quantidade, 'Venda', NEW.venda_id);

  RETURN NEW;
END;
$function$;
