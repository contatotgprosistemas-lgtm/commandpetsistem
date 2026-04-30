
CREATE OR REPLACE FUNCTION public.get_perguntas_manejo_for_cliente()
RETURNS TABLE(id uuid, pergunta text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.pergunta
  FROM public.tipo_servico_perguntas_manejo p
  WHERE p.empresa_id = (
    SELECT c.empresa_id FROM public.clientes c WHERE c.user_id = auth.uid() LIMIT 1
  );
$$;

CREATE OR REPLACE FUNCTION public.get_perguntas_checklist_for_cliente()
RETURNS TABLE(id uuid, pergunta text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.pergunta
  FROM public.tipo_servico_perguntas_checklist p
  WHERE p.empresa_id = (
    SELECT c.empresa_id FROM public.clientes c WHERE c.user_id = auth.uid() LIMIT 1
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_perguntas_manejo_for_cliente() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_perguntas_checklist_for_cliente() TO authenticated;
