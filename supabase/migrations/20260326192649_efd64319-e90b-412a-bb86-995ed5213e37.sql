
ALTER TABLE public.conversas 
  ADD COLUMN IF NOT EXISTS unread_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_message_preview text,
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_favorited boolean NOT NULL DEFAULT false;

ALTER TABLE public.conversas REPLICA IDENTITY FULL;
