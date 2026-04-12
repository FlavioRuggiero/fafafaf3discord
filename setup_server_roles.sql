CREATE TABLE IF NOT EXISTS public.server_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  server_id UUID REFERENCES public.servers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#99aab5',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.server_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tutti possono vedere i ruoli dei server" ON public.server_roles;
CREATE POLICY "Tutti possono vedere i ruoli dei server" ON public.server_roles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Solo i proprietari possono gestire i ruoli" ON public.server_roles;
CREATE POLICY "Solo i proprietari possono gestire i ruoli" ON public.server_roles FOR ALL USING (
  EXISTS (SELECT 1 FROM public.servers WHERE servers.id = server_roles.server_id AND servers.created_by = auth.uid())
);

CREATE TABLE IF NOT EXISTS public.server_member_roles (
  server_id UUID REFERENCES public.servers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES public.server_roles(id) ON DELETE CASCADE,
  PRIMARY KEY (server_id, user_id, role_id)
);

ALTER TABLE public.server_member_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tutti possono vedere i ruoli assegnati" ON public.server_member_roles;
CREATE POLICY "Tutti possono vedere i ruoli assegnati" ON public.server_member_roles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Solo i proprietari possono assegnare ruoli" ON public.server_member_roles;
CREATE POLICY "Solo i proprietari possono assegnare ruoli" ON public.server_member_roles FOR ALL USING (
  EXISTS (SELECT 1 FROM public.servers WHERE servers.id = server_member_roles.server_id AND servers.created_by = auth.uid())
);