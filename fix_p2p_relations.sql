-- Rimuove il vecchio collegamento errato
ALTER TABLE public.p2p_shared_files DROP CONSTRAINT IF EXISTS p2p_shared_files_user_id_fkey;

-- Aggiunge il collegamento corretto alla tabella profiles
ALTER TABLE public.p2p_shared_files 
ADD CONSTRAINT p2p_shared_files_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;