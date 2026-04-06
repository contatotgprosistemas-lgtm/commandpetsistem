CREATE POLICY "Client can update own pets"
ON public.pets
FOR UPDATE
TO authenticated
USING (cliente_id = public.get_user_cliente_id())
WITH CHECK (cliente_id = public.get_user_cliente_id());