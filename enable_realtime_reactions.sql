-- Aggiunge la tabella message_reactions al canale di realtime di Supabase
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;