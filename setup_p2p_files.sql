CREATE TABLE IF NOT EXISTS public.p2p_shared_files (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    file_name TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    file_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.p2p_shared_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tutti possono vedere i file" ON public.p2p_shared_files;
CREATE POLICY "Tutti possono vedere i file" ON public.p2p_shared_files FOR SELECT USING (true);

DROP POLICY IF EXISTS "Gli utenti possono inserire i propri file" ON public.p2p_shared_files;
CREATE POLICY "Gli utenti possono inserire i propri file" ON public.p2p_shared_files FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Gli utenti possono eliminare i propri file" ON public.p2p_shared_files;
CREATE POLICY "Gli utenti possono eliminare i propri file" ON public.p2p_shared_files FOR DELETE USING (auth.uid() = user_id);