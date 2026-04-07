
ALTER TABLE public.agendamentos DROP CONSTRAINT agendamentos_atendente_id_fkey,
  ADD CONSTRAINT agendamentos_atendente_id_fkey FOREIGN KEY (atendente_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE public.conversas DROP CONSTRAINT conversas_atendente_id_fkey,
  ADD CONSTRAINT conversas_atendente_id_fkey FOREIGN KEY (atendente_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE public.notas_contato DROP CONSTRAINT notas_contato_autor_id_fkey,
  ADD CONSTRAINT notas_contato_autor_id_fkey FOREIGN KEY (autor_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE public.historico_interacoes DROP CONSTRAINT historico_interacoes_user_id_fkey,
  ADD CONSTRAINT historico_interacoes_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE public.contact_tasks DROP CONSTRAINT contact_tasks_assigned_user_id_fkey,
  ADD CONSTRAINT contact_tasks_assigned_user_id_fkey FOREIGN KEY (assigned_user_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE public.customer_requests DROP CONSTRAINT customer_requests_assigned_user_id_fkey,
  ADD CONSTRAINT customer_requests_assigned_user_id_fkey FOREIGN KEY (assigned_user_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE public.customer_pet_subscriptions DROP CONSTRAINT customer_pet_subscriptions_sold_by_fkey,
  ADD CONSTRAINT customer_pet_subscriptions_sold_by_fkey FOREIGN KEY (sold_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE public.contracts DROP CONSTRAINT contracts_created_by_fkey,
  ADD CONSTRAINT contracts_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE public.nfe_documents DROP CONSTRAINT nfe_documents_created_by_fkey,
  ADD CONSTRAINT nfe_documents_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE public.nfe_events DROP CONSTRAINT nfe_events_created_by_fkey,
  ADD CONSTRAINT nfe_events_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;
