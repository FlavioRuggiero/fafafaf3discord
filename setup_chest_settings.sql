CREATE TABLE IF NOT EXISTS public.chest_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  premium_multiplier NUMERIC NOT NULL DEFAULT 2.0,
  rare_threshold INTEGER NOT NULL DEFAULT 100,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserisci i valori di default se non esistono
INSERT INTO public.chest_settings (id, premium_multiplier, rare_threshold)
VALUES (1, 2.0, 100)
ON CONFLICT (id) DO NOTHING;

-- Abilita RLS
ALTER TABLE public.chest_settings ENABLE ROW LEVEL SECURITY;

-- Policy di lettura pubblica
DROP POLICY IF EXISTS "Tutti possono leggere le impostazioni dei bauli" ON public.chest_settings;
CREATE POLICY "Tutti possono leggere le impostazioni dei bauli" ON public.chest_settings
FOR SELECT USING (true);

-- Policy di modifica solo per admin
DROP POLICY IF EXISTS "Solo gli admin possono modificare le impostazioni" ON public.chest_settings;
CREATE POLICY "Solo gli admin possono modificare le impostazioni" ON public.chest_settings
FOR UPDATE USING (auth.uid() = get_admin_id());

DROP POLICY IF EXISTS "Solo gli admin possono inserire le impostazioni" ON public.chest_settings;
CREATE POLICY "Solo gli admin possono inserire le impostazioni" ON public.chest_settings
FOR INSERT WITH CHECK (auth.uid() = get_admin_id());