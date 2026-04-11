-- Assicurati che i messaggi siano inclusi nel sistema Realtime di Supabase
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;