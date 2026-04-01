
-- Revoke default column access and re-grant only non-sensitive columns
-- First, revoke all on the table for authenticated/anon
REVOKE SELECT ON public.operational_users FROM anon, authenticated;

-- Grant SELECT on all columns EXCEPT pin
GRANT SELECT (id, empresa_id, ativo, user_id, created_at, updated_at, jornada_id, nome, email) ON public.operational_users TO authenticated;

-- Grant INSERT/UPDATE/DELETE as before (RLS still controls row access)
GRANT INSERT, UPDATE, DELETE ON public.operational_users TO authenticated;
