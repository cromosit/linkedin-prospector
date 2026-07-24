ALTER TABLE public.leads 
  ADD COLUMN IF NOT EXISTS "current_role" text,
  ADD COLUMN IF NOT EXISTS "current_company" text,
  ADD COLUMN IF NOT EXISTS about text;
