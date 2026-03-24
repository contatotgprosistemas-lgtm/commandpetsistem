CREATE POLICY "Client sees own checklist"
ON public.checklist_registros
FOR SELECT
TO authenticated
USING (pet_id IN (SELECT pets.id FROM pets WHERE pets.cliente_id = get_user_cliente_id()));