ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_decoration TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS purchased_decorations TEXT[] DEFAULT '{}';