CREATE TABLE IF NOT EXISTS public.friendships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(sender_id, receiver_id)
);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "friendships_select" ON public.friendships;
CREATE POLICY "friendships_select" ON public.friendships
FOR SELECT TO authenticated USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "friendships_insert" ON public.friendships;
CREATE POLICY "friendships_insert" ON public.friendships
FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "friendships_update" ON public.friendships;
CREATE POLICY "friendships_update" ON public.friendships
FOR UPDATE TO authenticated USING (auth.uid() = receiver_id OR auth.uid() = sender_id);

DROP POLICY IF EXISTS "friendships_delete" ON public.friendships;
CREATE POLICY "friendships_delete" ON public.friendships
FOR DELETE TO authenticated USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE TABLE IF NOT EXISTS public.dm_channels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user1_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  user2_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user1_id, user2_id)
);

ALTER TABLE public.dm_channels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dm_select" ON public.dm_channels;
CREATE POLICY "dm_select" ON public.dm_channels
FOR SELECT TO authenticated USING (auth.uid() = user1_id OR auth.uid() = user2_id);

DROP POLICY IF EXISTS "dm_insert" ON public.dm_channels;
CREATE POLICY "dm_insert" ON public.dm_channels
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='dm_channel_id') THEN
    ALTER TABLE public.messages ADD COLUMN dm_channel_id UUID REFERENCES public.dm_channels(id) ON DELETE CASCADE;
  END IF;
END $$;