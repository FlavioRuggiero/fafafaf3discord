-- Abilita il realtime per le tabelle dei ruoli in modo che i client ricevano gli aggiornamenti
ALTER PUBLICATION supabase_realtime ADD TABLE public.server_roles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.server_member_roles;