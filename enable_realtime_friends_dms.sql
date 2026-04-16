-- Abilita il realtime per le tabelle friendships e dm_channels
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'friendships') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE friendships;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'dm_channels') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE dm_channels;
  END IF;
END
$$;