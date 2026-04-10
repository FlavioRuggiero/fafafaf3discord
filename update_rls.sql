-- Rimuove la policy restrittiva che limitava la lettura al solo proprietario del profilo
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;

-- Crea una nuova policy che permette a tutti gli utenti autenticati di leggere le informazioni di base (come il nickname)
CREATE POLICY "profiles_select_policy" ON public.profiles
FOR SELECT TO authenticated USING (true);