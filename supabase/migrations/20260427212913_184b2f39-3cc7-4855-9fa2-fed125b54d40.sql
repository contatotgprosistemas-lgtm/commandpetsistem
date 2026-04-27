DROP TABLE IF EXISTS public.audit_log CASCADE;
DROP FUNCTION IF EXISTS public.audit_trigger_func() CASCADE;
ALTER TABLE public.data_retention_config DROP COLUMN IF EXISTS audit_log_retention_days;