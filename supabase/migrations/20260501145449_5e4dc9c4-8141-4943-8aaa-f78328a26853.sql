-- Limpa faturas e agendamentos de "5º banho extra" gerados indevidamente em 2026-05-01
-- para assinaturas que iniciaram em 2026-04-30 (não tinham consumo prévio em maio)
DELETE FROM contas_receber
WHERE descricao ILIKE '%5º banho extra%'
  AND created_at >= '2026-05-01'
  AND created_at < '2026-05-02'
  AND status = 'pendente';

DELETE FROM agendamentos
WHERE notas ILIKE '%5º banho extra%'
  AND data_hora >= '2026-05-01'
  AND status = 'agendado';