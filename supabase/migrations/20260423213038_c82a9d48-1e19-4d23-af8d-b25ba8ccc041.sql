-- Drop módulos Comercial (antigo + novo)
DROP TRIGGER IF EXISTS trg_seed_comercial_stages ON public.empresas;
DROP TRIGGER IF EXISTS trg_seed_funil_estagios ON public.empresas;
DROP FUNCTION IF EXISTS public.seed_comercial_stages_for_empresa() CASCADE;
DROP FUNCTION IF EXISTS public.seed_funil_estagios_for_empresa() CASCADE;
DROP FUNCTION IF EXISTS public.reset_chatbot_flow_on_finalize() CASCADE;

DROP TABLE IF EXISTS public.comercial_messages CASCADE;
DROP TABLE IF EXISTS public.comercial_conversations CASCADE;
DROP TABLE IF EXISTS public.comercial_deals CASCADE;
DROP TABLE IF EXISTS public.comercial_pipeline_stages CASCADE;
DROP TABLE IF EXISTS public.comercial_contatos CASCADE;

DROP TABLE IF EXISTS public.chatbot_flow_steps CASCADE;
DROP TABLE IF EXISTS public.chatbot_flows CASCADE;
DROP TABLE IF EXISTS public.chatbot_sessions CASCADE;
DROP TABLE IF EXISTS public.chatbot_regras CASCADE;
DROP TABLE IF EXISTS public.conversation_tags CASCADE;
DROP TABLE IF EXISTS public.quick_replies CASCADE;
DROP TABLE IF EXISTS public.funil_estagios CASCADE;