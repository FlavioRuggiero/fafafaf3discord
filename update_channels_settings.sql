ALTER TABLE public.channels
ADD COLUMN cooldown INTEGER DEFAULT 0,
ADD COLUMN is_locked BOOLEAN DEFAULT false,
ADD COLUMN is_welcome_channel BOOLEAN DEFAULT false;