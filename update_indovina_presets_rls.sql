DROP POLICY IF EXISTS "indovina_presets_update" ON public.indovina_presets;
CREATE POLICY "indovina_presets_update" ON public.indovina_presets
FOR UPDATE TO authenticated
USING (
  auth.uid() = creator_id OR 
  auth.uid() = get_admin_id() OR 
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'moderator')
);

DROP POLICY IF EXISTS "indovina_presets_delete" ON public.indovina_presets;
CREATE POLICY "indovina_presets_delete" ON public.indovina_presets
FOR DELETE TO authenticated
USING (
  auth.uid() = creator_id OR 
  auth.uid() = get_admin_id() OR 
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'moderator')
);