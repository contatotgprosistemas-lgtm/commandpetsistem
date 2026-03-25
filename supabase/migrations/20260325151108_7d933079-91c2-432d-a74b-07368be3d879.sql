
-- Add aprovado column to profiles, default false
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS aprovado boolean NOT NULL DEFAULT false;

-- Approve the super_admin user (gestores.nlr@nossolarresort.com.br)
UPDATE public.profiles SET aprovado = true WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'gestores.nlr@nossolarresort.com.br'
);

-- Allow super_admin to SELECT all profiles (cross-empresa)
CREATE POLICY "Super admin sees all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin')
);

-- Allow super_admin to UPDATE all profiles (cross-empresa)
CREATE POLICY "Super admin updates all profiles"
ON public.profiles FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin')
);
