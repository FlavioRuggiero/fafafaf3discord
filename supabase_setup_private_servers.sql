-- Esegui questo codice nel SQL Editor di Supabase

ALTER TABLE public.servers ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false;

CREATE TABLE IF NOT EXISTS public.server_join_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  server_id UUID REFERENCES public.servers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.server_join_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own requests" ON public.server_join_requests
FOR SELECT TO authenticated USING (auth.uid() = user_id OR has_server_permission(server_id, 'can_manage_server'));

CREATE POLICY "Users can insert their own requests" ON public.server_join_requests
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update requests" ON public.server_join_requests
FOR UPDATE TO authenticated USING (has_server_permission(server_id, 'can_manage_server'));

CREATE POLICY "Admins can delete requests" ON public.server_join_requests
FOR DELETE TO authenticated USING (has_server_permission(server_id, 'can_manage_server') OR auth.uid() = user_id);