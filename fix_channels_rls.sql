-- Permetti ai proprietari del server di eliminare i canali
DROP POLICY IF EXISTS "I proprietari possono eliminare canali" ON public.channels;
CREATE POLICY "I proprietari possono eliminare canali" ON public.channels
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.servers
    WHERE servers.id = channels.server_id
    AND servers.created_by = auth.uid()
  )
);

-- Permetti ai proprietari del server di modificare i canali
DROP POLICY IF EXISTS "I proprietari possono aggiornare canali" ON public.channels;
CREATE POLICY "I proprietari possono aggiornare canali" ON public.channels
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.servers
    WHERE servers.id = channels.server_id
    AND servers.created_by = auth.uid()
  )
);