-- Esegui questo script nel pannello SQL Editor di Supabase
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banner_color TEXT DEFAULT '#5865F2';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banner_url TEXT;