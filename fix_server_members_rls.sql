-- Permette agli utenti di aggiornare la propria iscrizione in server_members (necessario per salvare la posizione)
DROP POLICY IF EXISTS "Gli utenti possono aggiornare la propria iscrizione" ON public.server_members;

CREATE POLICY "Gli utenti possono aggiornare la propria iscrizione" ON public.server_members
FOR UPDATE TO authenticated USING (auth.uid() = user_id);