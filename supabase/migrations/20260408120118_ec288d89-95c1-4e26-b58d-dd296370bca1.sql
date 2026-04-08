ALTER TABLE public.customer_pet_subscriptions
ADD COLUMN frequency text NOT NULL DEFAULT 'semanal',
ADD COLUMN extra_session_policy text DEFAULT NULL;