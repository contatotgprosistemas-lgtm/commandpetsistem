
-- Table for pet media posts (photos/videos)
CREATE TABLE public.pet_media (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id),
  cliente_id UUID NOT NULL REFERENCES public.clientes(id),
  pet_id UUID NOT NULL REFERENCES public.pets(id),
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'image',
  caption TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pet_media ENABLE ROW LEVEL SECURITY;

-- Admin (tenant) policies
CREATE POLICY "Tenant isolation select" ON public.pet_media FOR SELECT TO authenticated USING (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation insert" ON public.pet_media FOR INSERT TO authenticated WITH CHECK (empresa_id = get_user_empresa_id());
CREATE POLICY "Tenant isolation delete" ON public.pet_media FOR DELETE TO authenticated USING (empresa_id = get_user_empresa_id());

-- Client sees own pet media
CREATE POLICY "Client sees own pet media" ON public.pet_media FOR SELECT TO authenticated USING (cliente_id = get_user_cliente_id());

-- Storage bucket for pet media
INSERT INTO storage.buckets (id, name, public) VALUES ('pet-media', 'pet-media', true);

-- Storage policies
CREATE POLICY "Authenticated users can upload pet media" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'pet-media');
CREATE POLICY "Anyone can view pet media" ON storage.objects FOR SELECT TO public USING (bucket_id = 'pet-media');
CREATE POLICY "Authenticated users can delete pet media" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'pet-media');
