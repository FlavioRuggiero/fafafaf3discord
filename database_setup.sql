-- Crea la tabella dei Server
CREATE TABLE public.servers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.servers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tutti possono vedere i server" ON public.servers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Gli utenti possono creare server" ON public.servers FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

-- Crea la tabella dei Membri dei Server (chi fa parte di quale server)
CREATE TABLE public.server_members (
  server_id UUID REFERENCES public.servers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (server_id, user_id)
);
ALTER TABLE public.server_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tutti possono vedere i membri" ON public.server_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Gli utenti possono unirsi" ON public.server_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Crea la tabella dei Canali
CREATE TABLE public.channels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  server_id UUID REFERENCES public.servers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'text',
  category TEXT NOT NULL DEFAULT 'Generale',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tutti possono vedere i canali" ON public.channels FOR SELECT TO authenticated USING (true);
CREATE POLICY "Tutti possono creare canali" ON public.channels FOR INSERT TO authenticated WITH CHECK (true);