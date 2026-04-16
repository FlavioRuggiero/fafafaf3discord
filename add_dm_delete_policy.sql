-- Aggiunge la policy per permettere agli utenti di eliminare le proprie chat private
CREATE POLICY "dm_delete" ON public.dm_channels
FOR DELETE TO authenticated
USING (auth.uid() = user1_id OR auth.uid() = user2_id);