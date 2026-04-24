-- Configuração de aniversários por empresa
CREATE TABLE IF NOT EXISTS public.birthday_config (
  empresa_id uuid PRIMARY KEY REFERENCES public.empresas(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  send_to_cliente boolean NOT NULL DEFAULT true,
  send_to_pet boolean NOT NULL DEFAULT true,
  mensagem_cliente text NOT NULL DEFAULT '🎉 Feliz aniversário, {nome}! Toda nossa equipe deseja um dia maravilhoso, cheio de alegria, saúde e muito carinho. Que este novo ciclo seja repleto de conquistas! 🎂✨',
  mensagem_pet text NOT NULL DEFAULT '🐾🎂 Feliz aniversário, {pet}! Hoje é o dia mais especial do ano para esse pet incrível! Mande muito carinho do {tutor} e nossa equipe deseja um dia cheio de petiscos, brincadeiras e amor! 🎉🦴',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.birthday_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Empresa manage own birthday config"
  ON public.birthday_config FOR ALL
  TO authenticated
  USING (empresa_id = public.get_user_empresa_id())
  WITH CHECK (empresa_id = public.get_user_empresa_id());

CREATE TRIGGER update_birthday_config_updated_at
  BEFORE UPDATE ON public.birthday_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Log para evitar duplicidades por dia/ano
CREATE TABLE IF NOT EXISTS public.birthday_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE CASCADE,
  pet_id uuid REFERENCES public.pets(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('cliente','pet')),
  ano int NOT NULL,
  enviado_em timestamptz NOT NULL DEFAULT now(),
  notificacao_id uuid REFERENCES public.customer_notifications(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS birthday_log_unique_cliente
  ON public.birthday_log (cliente_id, ano) WHERE tipo='cliente';
CREATE UNIQUE INDEX IF NOT EXISTS birthday_log_unique_pet
  ON public.birthday_log (pet_id, ano) WHERE tipo='pet';

ALTER TABLE public.birthday_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Empresa view own birthday log"
  ON public.birthday_log FOR SELECT
  TO authenticated
  USING (empresa_id = public.get_user_empresa_id());

CREATE POLICY "Service role manages log"
  ON public.birthday_log FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);