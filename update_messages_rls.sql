-- Rimuove la vecchia policy limitata
DROP POLICY IF EXISTS "Gli utenti possono eliminare i propri messaggi" ON public.messages;
DROP POLICY IF EXISTS "messages_delete_policy" ON public.messages;

-- Crea la nuova policy più flessibile
CREATE POLICY "messages_delete_policy" ON public.messages
FOR DELETE TO authenticated
USING (
  -- L'utente può eliminare se è l'autore del messaggio
  auth.uid() = user_id 
  OR 
  -- L'utente può eliminare se è il creatore del server a cui appartiene il canale
  EXISTS (
    SELECT 1 FROM channels c
    JOIN servers s ON c.server_id = s.id
    WHERE c.id = messages.channel_id AND s.created_by = auth.uid()
  )
);