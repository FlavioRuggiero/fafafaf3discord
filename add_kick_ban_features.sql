-- Aggiungi colonne ai ruoli
ALTER TABLE public.server_roles ADD COLUMN IF NOT EXISTS can_kick_members BOOLEAN DEFAULT false;
ALTER TABLE public.server_roles ADD COLUMN IF NOT EXISTS can_ban_members BOOLEAN DEFAULT false;

-- Crea tabella ban
CREATE TABLE IF NOT EXISTS public.server_bans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    server_id UUID REFERENCES public.servers(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(server_id, user_id)
);

ALTER TABLE public.server_bans ENABLE ROW LEVEL SECURITY;

-- Policy per i ban
CREATE POLICY "Tutti possono leggere i ban" ON public.server_bans
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Mod/Admin possono inserire ban" ON public.server_bans
FOR INSERT TO authenticated WITH CHECK (
    has_server_permission(server_id, 'can_ban_members') OR 
    EXISTS (SELECT 1 FROM public.servers WHERE id = server_id AND created_by = auth.uid())
);

CREATE POLICY "Mod/Admin possono rimuovere ban" ON public.server_bans
FOR DELETE TO authenticated USING (
    has_server_permission(server_id, 'can_ban_members') OR 
    EXISTS (SELECT 1 FROM public.servers WHERE id = server_id AND created_by = auth.uid())
);

-- Aggiorna la policy di eliminazione membri per permettere l'espulsione
DROP POLICY IF EXISTS "Gli utenti possono uscire dai server" ON public.server_members;
DROP POLICY IF EXISTS "Gli utenti possono uscire o essere espulsi" ON public.server_members;

CREATE POLICY "Gli utenti possono uscire o essere espulsi" ON public.server_members
FOR DELETE TO authenticated USING (
    auth.uid() = user_id OR 
    has_server_permission(server_id, 'can_kick_members') OR
    has_server_permission(server_id, 'can_ban_members') OR
    EXISTS (SELECT 1 FROM public.servers WHERE id = server_id AND created_by = auth.uid())
);