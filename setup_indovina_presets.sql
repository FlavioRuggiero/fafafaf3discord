CREATE TABLE IF NOT EXISTS public.indovina_presets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    characters JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Abilita RLS
ALTER TABLE public.indovina_presets ENABLE ROW LEVEL SECURITY;

-- Permessi (Tutti leggono, chiunque può inserire e il creatore/admin può eliminare)
CREATE POLICY "Tutti possono leggere i preset" ON public.indovina_presets FOR SELECT USING (true);
CREATE POLICY "Inserimento preset" ON public.indovina_presets FOR INSERT TO authenticated WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Eliminazione preset" ON public.indovina_presets FOR DELETE TO authenticated USING (auth.uid() = creator_id OR auth.uid() = get_admin_id());

-- Grant API
GRANT SELECT, INSERT, DELETE ON TABLE public.indovina_presets TO authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.indovina_presets TO service_role;