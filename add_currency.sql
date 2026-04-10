-- Esegui questo script nel pannello SQL Editor di Supabase
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS digitalcardus INTEGER DEFAULT 0;