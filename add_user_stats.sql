-- Aggiungi la colonna livello (default 1)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;

-- Aggiorna il valore di default di digitalcardus a 25
ALTER TABLE public.profiles ALTER COLUMN digitalcardus SET DEFAULT 25;

-- Imposta a 25 i digitalcardus degli utenti esistenti (se erano a 0 o null)
UPDATE public.profiles SET digitalcardus = 25 WHERE digitalcardus = 0 OR digitalcardus IS NULL;

-- Imposta il livello 1 per gli utenti esistenti se è null
UPDATE public.profiles SET level = 1 WHERE level IS NULL;