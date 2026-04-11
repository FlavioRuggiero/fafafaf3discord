-- Permette agli utenti di eliminare se stessi da un server (uscire dal server)
DROP POLICY IF EXISTS "Gli utenti possono uscire dai server" ON public.server_members;

CREATE POLICY "Gli utenti possono uscire dai server" ON public.server_members
FOR DELETE TO authenticated USING (auth.uid() = user_id);