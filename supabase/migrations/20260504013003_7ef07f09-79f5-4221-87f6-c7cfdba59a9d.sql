
-- 1. invoice_notification_log: add service_role policies (documents intent)
CREATE POLICY "Service role can insert invoice notif log"
  ON public.invoice_notification_log FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role can delete invoice notif log"
  ON public.invoice_notification_log FOR DELETE TO service_role USING (true);

-- 2. contas_receber_itens: add UPDATE policy scoped to empresa
CREATE POLICY "Usuários podem atualizar itens da sua empresa"
  ON public.contas_receber_itens FOR UPDATE
  USING (empresa_id = public.get_user_empresa_id())
  WITH CHECK (empresa_id = public.get_user_empresa_id());

-- 3. movimentacoes_estoque: add UPDATE and DELETE policies scoped to empresa
CREATE POLICY "mov_estoque_update"
  ON public.movimentacoes_estoque FOR UPDATE
  USING (empresa_id = public.get_user_empresa_id())
  WITH CHECK (empresa_id = public.get_user_empresa_id());
CREATE POLICY "mov_estoque_delete"
  ON public.movimentacoes_estoque FOR DELETE
  USING (empresa_id = public.get_user_empresa_id());

-- 4. Public buckets: remove broad listing policies
-- Files remain accessible via public URLs (direct object access bypasses RLS),
-- but anonymous clients can no longer enumerate/list bucket contents.
DROP POLICY IF EXISTS "Anyone can view pet media" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for profile photos" ON storage.objects;

-- 5. Revoke EXECUTE on internal SECURITY DEFINER functions from anon/authenticated.
-- These are trigger functions or internal helpers that should not be callable via PostgREST.
REVOKE EXECUTE ON FUNCTION public.crm_calc_sla() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.deactivate_estou_chegando_on_status_change() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.deduct_stock_on_sale() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enforce_multa_atraso_pagamento_conjunto() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.hash_operational_pin() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.prevent_anon_contract_modification() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_taxipet_payment_status() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_estou_chegando_stale(integer) FROM anon, authenticated, PUBLIC;
-- Email queue helpers are called only by edge functions using the service role
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM anon, authenticated, PUBLIC;
-- Bank balance sync helpers — called from server-side RPC efetuar_baixa, not directly from client
REVOKE EXECUTE ON FUNCTION public.sincronizar_saldo_bancario(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sincronizar_todos_saldos(uuid) FROM anon, PUBLIC;
-- Restrict baixa RPCs to authenticated (no anon)
REVOKE EXECUTE ON FUNCTION public.efetuar_baixa(uuid, date, uuid, text, numeric, numeric, numeric, text, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.efetuar_baixa_conta_pagar(uuid, date, uuid, text, numeric, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.excluir_movimentacao(uuid) FROM anon, PUBLIC;
-- Cliente-only helpers should not be exposed to anon
REVOKE EXECUTE ON FUNCTION public.get_perguntas_checklist_for_cliente() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_perguntas_manejo_for_cliente() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_cliente_id() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_setor_ids() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_operational_empresa_id() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_operational_user_id() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_own_cargo() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_access_crm_conversa(uuid) FROM anon, PUBLIC;

-- 6. Fix is_not_deleted: set search_path (function lacks it)
CREATE OR REPLACE FUNCTION public.is_not_deleted(p_deleted_at timestamp with time zone)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $function$
  SELECT p_deleted_at IS NULL
$function$;
