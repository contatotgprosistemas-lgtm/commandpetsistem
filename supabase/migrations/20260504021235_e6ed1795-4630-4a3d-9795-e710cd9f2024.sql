
-- Cancel CRM cron job
DO $$
DECLARE jid bigint;
BEGIN
  SELECT jobid INTO jid FROM cron.job WHERE jobname = 'crm-process-scheduled-every-minute';
  IF jid IS NOT NULL THEN PERFORM cron.unschedule(jid); END IF;
END $$;

-- Drop CRM tables (CASCADE handles FKs, policies, triggers)
DROP TABLE IF EXISTS public.crm_anotacoes_internas CASCADE;
DROP TABLE IF EXISTS public.crm_atendentes_canal CASCADE;
DROP TABLE IF EXISTS public.crm_atividades CASCADE;
DROP TABLE IF EXISTS public.crm_campanha_destinatarios CASCADE;
DROP TABLE IF EXISTS public.crm_campanhas CASCADE;
DROP TABLE IF EXISTS public.crm_canal_secrets CASCADE;
DROP TABLE IF EXISTS public.crm_contato_tag_links CASCADE;
DROP TABLE IF EXISTS public.crm_contato_tags CASCADE;
DROP TABLE IF EXISTS public.crm_flow_executions CASCADE;
DROP TABLE IF EXISTS public.crm_flows CASCADE;
DROP TABLE IF EXISTS public.crm_horario_comercial CASCADE;
DROP TABLE IF EXISTS public.crm_leads CASCADE;
DROP TABLE IF EXISTS public.crm_mensagens CASCADE;
DROP TABLE IF EXISTS public.crm_mensagens_agendadas CASCADE;
DROP TABLE IF EXISTS public.crm_notas_conversa CASCADE;
DROP TABLE IF EXISTS public.crm_pipeline_etapas CASCADE;
DROP TABLE IF EXISTS public.crm_pipelines CASCADE;
DROP TABLE IF EXISTS public.crm_respostas_rapidas CASCADE;
DROP TABLE IF EXISTS public.crm_setor_atendentes CASCADE;
DROP TABLE IF EXISTS public.crm_setores CASCADE;
DROP TABLE IF EXISTS public.crm_tarefas CASCADE;
DROP TABLE IF EXISTS public.crm_templates CASCADE;
DROP TABLE IF EXISTS public.crm_conversas CASCADE;
DROP TABLE IF EXISTS public.crm_contatos CASCADE;
DROP TABLE IF EXISTS public.crm_canais CASCADE;

-- Drop CRM functions
DROP FUNCTION IF EXISTS public.can_access_crm_conversa(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.crm_calc_sla() CASCADE;
DROP FUNCTION IF EXISTS public.get_user_setor_ids() CASCADE;

-- Drop CRM enum types if they exist and are no longer referenced
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'crm_mensagem_direcao') THEN
    DROP TYPE public.crm_mensagem_direcao CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
