DELETE FROM public.contas_receber_itens
WHERE conta_receber_id IN (
  SELECT id FROM public.contas_receber
  WHERE categoria = 'Planos e Pacotes'
    AND status = 'pendente'
    AND (created_at AT TIME ZONE 'America/Sao_Paulo')::date = (now() AT TIME ZONE 'America/Sao_Paulo')::date
);

DELETE FROM public.customer_notifications
WHERE type = 'financeiro'
  AND title = 'Nova fatura emitida'
  AND (created_at AT TIME ZONE 'America/Sao_Paulo')::date = (now() AT TIME ZONE 'America/Sao_Paulo')::date;

DELETE FROM public.contas_receber
WHERE categoria = 'Planos e Pacotes'
  AND status = 'pendente'
  AND (created_at AT TIME ZONE 'America/Sao_Paulo')::date = (now() AT TIME ZONE 'America/Sao_Paulo')::date;