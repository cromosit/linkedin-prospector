ALTER TABLE public.leads 
  ADD COLUMN IF NOT EXISTS "gpctba_goal" text,
  ADD COLUMN IF NOT EXISTS "gpctba_plan" text,
  ADD COLUMN IF NOT EXISTS "gpctba_challenge" text,
  ADD COLUMN IF NOT EXISTS "gpctba_timing" text,
  ADD COLUMN IF NOT EXISTS "gpctba_budget" text,
  ADD COLUMN IF NOT EXISTS "gpctba_authority" text;
