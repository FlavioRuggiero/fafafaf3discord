-- Tabella per le reazioni ai messaggi
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(message_id, user_id, emoji)
);

-- Abilitazione della sicurezza RLS (MANDATORY)
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- Policy per permettere a tutti di leggere le reazioni
CREATE POLICY "Tutti possono vedere le reazioni" 
ON public.message_reactions FOR SELECT USING (true);

-- Policy per permettere agli utenti loggati di aggiungere le PROPRIE reazioni
CREATE POLICY "Gli utenti possono aggiungere reazioni" 
ON public.message_reactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Policy per permettere agli utenti loggati di rimuovere le PROPRIE reazioni
CREATE POLICY "Gli utenti possono rimuovere le proprie reazioni" 
ON public.message_reactions FOR DELETE TO authenticated USING (auth.uid() = user_id);