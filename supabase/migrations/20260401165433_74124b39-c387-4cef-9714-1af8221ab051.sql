-- Make chat-media and ponto-selfies buckets private
UPDATE storage.buckets SET public = false WHERE id IN ('chat-media', 'ponto-selfies');