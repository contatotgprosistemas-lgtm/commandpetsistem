
-- Storage policies for chat-media bucket (multi-tenant via path: {empresa_id}/...)
CREATE POLICY "crm_chat_media_select"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'chat-media' AND (storage.foldername(name))[1] = public.get_user_empresa_id()::text);

CREATE POLICY "crm_chat_media_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'chat-media' AND (storage.foldername(name))[1] = public.get_user_empresa_id()::text);

CREATE POLICY "crm_chat_media_delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'chat-media' AND (storage.foldername(name))[1] = public.get_user_empresa_id()::text);

-- Allow service role (edge functions/webhook) to write chat-media (already implicit, but explicit policy for clarity)
CREATE POLICY "crm_chat_media_service_all"
ON storage.objects FOR ALL TO service_role
USING (bucket_id = 'chat-media') WITH CHECK (bucket_id = 'chat-media');
