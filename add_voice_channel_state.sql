-- Aggiunge la colonna per memorizzare il canale vocale a cui un utente è connesso
ALTER TABLE public.server_members
ADD COLUMN voice_channel_id UUID REFERENCES public.channels(id) ON DELETE SET NULL;

-- Abilita il realtime per la tabella server_members in modo che le connessioni ai canali vocali siano visibili a tutti
ALTER PUBLICATION supabase_realtime ADD TABLE public.server_members;