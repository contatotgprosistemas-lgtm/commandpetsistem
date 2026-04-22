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
FROM public.empresas e
WHERE e.id = c.empresa_id
  AND (
    LOWER(TRIM(c.contato_nome)) = LOWER(TRIM(e.nome_empresa))
    OR (e.nome_fantasia IS NOT NULL AND LOWER(TRIM(c.contato_nome)) = LOWER(TRIM(e.nome_fantasia)))
  );