-- Assicuriamoci che la tabella server_members invii aggiornamenti Realtime completi
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'server_members'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE server_members;
  END IF;
END
$$;

-- Imposta l'identità di replica su FULL per far sì che il Realtime invii i dati completi delle righe modificate
ALTER TABLE server_members REPLICA IDENTITY FULL;