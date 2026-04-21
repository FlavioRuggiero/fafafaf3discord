ALTER TABLE public.custom_decorations 
ADD COLUMN IF NOT EXISTS text_color_type TEXT DEFAULT 'gradient',
ADD COLUMN IF NOT EXISTS text_color TEXT DEFAULT '#ffffff',
ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}'::jsonb;