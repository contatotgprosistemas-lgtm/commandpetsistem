
ALTER TABLE public.service_plans ADD COLUMN IF NOT EXISTS contract_duration_months integer DEFAULT NULL;

ALTER TABLE public.customer_pet_subscriptions ADD COLUMN IF NOT EXISTS contract_date date DEFAULT NULL;
ALTER TABLE public.customer_pet_subscriptions ADD COLUMN IF NOT EXISTS contract_end_date date DEFAULT NULL;
