CREATE TABLE IF NOT EXISTS public.indovina_presets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  characters JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.indovina_presets TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.indovina_presets TO authenticated;

ALTER TABLE public.indovina_presets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "indovina_presets_select" ON public.indovina_presets;
CREATE POLICY "indovina_presets_select" ON public.indovina_presets FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "indovina_presets_insert" ON public.indovina_presets;
CREATE POLICY "indovina_presets_insert" ON public.indovina_presets FOR INSERT TO authenticated WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "indovina_presets_update" ON public.indovina_presets;
CREATE POLICY "indovina_presets_update" ON public.indovina_presets FOR UPDATE TO authenticated USING (auth.uid() = creator_id);

DROP POLICY IF EXISTS "indovina_presets_delete" ON public.indovina_presets;
CREATE POLICY "indovina_presets_delete" ON public.indovina_presets FOR DELETE TO authenticated USING (auth.uid() = creator_id);