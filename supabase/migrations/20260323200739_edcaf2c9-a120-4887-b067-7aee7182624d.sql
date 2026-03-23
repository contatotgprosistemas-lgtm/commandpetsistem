-- Allow clients to see manejo records for their own pets
CREATE POLICY "Client sees own manejo"
ON public.manejo_registros
FOR SELECT
TO authenticated
USING (
  pet_id IN (SELECT id FROM public.pets WHERE cliente_id = get_user_cliente_id())
);