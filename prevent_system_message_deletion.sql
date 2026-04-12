DROP POLICY IF EXISTS "messages_delete_policy" ON public.messages;

CREATE POLICY "messages_delete_policy" ON public.messages
FOR DELETE TO authenticated
USING (
  ((auth.uid() = user_id) AND content != '<system:welcome>') 
  OR 
  (EXISTS (
    SELECT 1 FROM channels c
    JOIN servers s ON c.server_id = s.id
    WHERE c.id = messages.channel_id AND s.created_by = auth.uid()
  ))
);