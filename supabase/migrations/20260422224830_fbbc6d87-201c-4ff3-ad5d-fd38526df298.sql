WITH suspeitos AS (
  SELECT empresa_id, contato_nome
  FROM public.conversas
  WHERE contato_nome IS NOT NULL AND contato_nome <> ''
  GROUP BY empresa_id, contato_nome
  HAVING COUNT(DISTINCT contato_telefone) >= 2
)
UPDATE public.conversas c
SET contato_nome = COALESCE(
    (SELECT cl.nome FROM public.clientes cl
      WHERE cl.empresa_id = c.empresa_id
        AND (cl.whatsapp = c.contato_telefone OR cl.telefone = c.contato_telefone)
      LIMIT 1),
    c.contato_telefone
  ),
  cliente_id = COALESCE(
    c.cliente_id,
    (SELECT cl.id FROM public.clientes cl
      WHERE cl.empresa_id = c.empresa_id
        AND (cl.whatsapp = c.contato_telefone OR cl.telefone = c.contato_telefone)
      LIMIT 1)
  )
FROM suspeitos s
WHERE c.empresa_id = s.empresa_id
  AND c.contato_nome = s.contato_nome;