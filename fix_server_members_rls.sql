-- Elimina la vecchia policy restrittiva
DROP POLICY IF EXISTS "Gli utenti possono unirsi" ON public.server_members;

-- Crea una nuova policy che permette agli utenti di unirsi da soli (server pubblici) 
-- OPPURE agli admin di aggiungerli (accettazione richieste server privati)
CREATE POLICY "Gli utenti possono unirsi o essere aggiunti dagli admin" ON public.server_members
FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = user_id OR 
  has_server_permission(server_id, 'can_manage_server')
);