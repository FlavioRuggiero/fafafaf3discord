-- Aggiungi colonna creator_id
ALTER TABLE public.custom_decorations ADD COLUMN IF NOT EXISTS creator_id UUID REFERENCES auth.users(id);

-- Aggiorna le policy RLS per permettere ai creatori di modificare/eliminare i propri contorni
DROP POLICY IF EXISTS "Solo admin possono aggiornare decorazioni" ON public.custom_decorations;
CREATE POLICY "Admin e creatori possono aggiornare decorazioni" ON public.custom_decorations
FOR UPDATE TO authenticated USING (auth.uid() = get_admin_id() OR auth.uid() = creator_id);

DROP POLICY IF EXISTS "Solo admin possono eliminare decorazioni" ON public.custom_decorations;
CREATE POLICY "Admin e creatori possono eliminare decorazioni" ON public.custom_decorations
FOR DELETE TO authenticated USING (auth.uid() = get_admin_id() OR auth.uid() = creator_id);