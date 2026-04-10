-- Crea il bucket pubblico per le icone
INSERT INTO storage.buckets (id, name, public) 
VALUES ('icons', 'icons', true)
ON CONFLICT (id) DO NOTHING;

-- Permetti a tutti di leggere (visualizzare) le immagini
CREATE POLICY "Tutti possono vedere le icone" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'icons');

-- Permetti solo agli utenti autenticati di caricare nuove immagini
CREATE POLICY "Gli utenti autenticati possono caricare icone" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'icons');