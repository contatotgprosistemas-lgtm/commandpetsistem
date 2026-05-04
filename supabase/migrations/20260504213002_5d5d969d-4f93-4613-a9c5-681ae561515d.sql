CREATE POLICY "Cliente vê itens das próprias faturas"
ON public.contas_receber_itens
FOR SELECT
USING (
  conta_receber_id IN (
    SELECT id FROM public.contas_receber WHERE cliente_id = public.get_user_cliente_id()
  )
);