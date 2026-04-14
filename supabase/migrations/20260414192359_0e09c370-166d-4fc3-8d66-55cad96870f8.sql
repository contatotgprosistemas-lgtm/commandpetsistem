CREATE TABLE public.short_links (
  id text PRIMARY KEY DEFAULT encode(gen_random_bytes(4), 'hex'),
  type text NOT NULL,
  target_id text NOT NULL,
  origin text NOT NULL,
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.short_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read short_links" ON public.short_links FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert short_links" ON public.short_links FOR INSERT TO authenticated WITH CHECK (true);