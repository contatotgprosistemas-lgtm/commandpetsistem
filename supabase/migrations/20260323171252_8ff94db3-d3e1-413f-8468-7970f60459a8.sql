
-- Allow clients to insert messages in their own conversations
CREATE POLICY "Client inserts own messages" ON public.mensagens
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversas c 
      WHERE c.id = conversa_id 
      AND c.cliente_id = get_user_cliente_id()
    )
  );

-- Allow clients to read messages from their own conversations  
CREATE POLICY "Client reads own messages" ON public.mensagens
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversas c 
      WHERE c.id = conversa_id 
      AND c.cliente_id = get_user_cliente_id()
    )
  );
