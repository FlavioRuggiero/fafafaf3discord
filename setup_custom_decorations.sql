CREATE TABLE IF NOT EXISTS public.custom_decorations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price INTEGER NOT NULL DEFAULT 100,
  category TEXT NOT NULL DEFAULT 'Contorni Custom',
  image_url TEXT,
  border_color TEXT DEFAULT '#ffffff',
  shadow_color TEXT DEFAULT '#ffffff',
  text_gradient_start TEXT DEFAULT '#ffffff',
  text_gradient_end TEXT DEFAULT '#ffffff',
  animation_type TEXT DEFAULT 'none',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.custom_decorations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tutti possono leggere le decorazioni custom" ON public.custom_decorations;
CREATE POLICY "Tutti possono leggere le decorazioni custom" ON public.custom_decorations FOR SELECT USING (true);

DROP POLICY IF EXISTS "Solo admin possono inserire decorazioni" ON public.custom_decorations;
CREATE POLICY "Solo admin possono inserire decorazioni" ON public.custom_decorations FOR INSERT WITH CHECK (auth.uid() = get_admin_id());

DROP POLICY IF EXISTS "Solo admin possono aggiornare decorazioni" ON public.custom_decorations;
CREATE POLICY "Solo admin possono aggiornare decorazioni" ON public.custom_decorations FOR UPDATE USING (auth.uid() = get_admin_id());

DROP POLICY IF EXISTS "Solo admin possono eliminare decorazioni" ON public.custom_decorations;
CREATE POLICY "Solo admin possono eliminare decorazioni" ON public.custom_decorations FOR DELETE USING (auth.uid() = get_admin_id());