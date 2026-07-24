ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS company text,
  ADD COLUMN IF NOT EXISTS role text;
