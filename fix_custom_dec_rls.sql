-- Rimuove la vecchia policy restrittiva
DROP POLICY IF EXISTS "Solo admin possono inserire decorazioni" ON custom_decorations;

-- Crea la nuova policy che permette l'inserimento agli admin OPPURE a chi possiede il ticket
CREATE POLICY "Inserimento decorazioni" ON custom_decorations 
FOR INSERT TO authenticated 
WITH CHECK (
  auth.uid() = get_admin_id() OR 
  'custom-dec-ticket' = ANY((SELECT purchased_decorations FROM profiles WHERE id = auth.uid())::text[])
);