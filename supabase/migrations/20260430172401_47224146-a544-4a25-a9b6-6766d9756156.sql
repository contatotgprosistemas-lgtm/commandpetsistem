
DELETE FROM public.agendamentos
WHERE notas ILIKE '%5º banho extra%'
  AND created_at > '2026-04-30 00:00:00+00';

DELETE FROM public.contas_receber
WHERE descricao ILIKE '%5º banho extra%'
  AND created_at > '2026-04-30 00:00:00+00';

DELETE FROM public.customer_notifications
WHERE title = 'Ajuste mensal - sessão extra'
  AND created_at > '2026-04-30 00:00:00+00';
