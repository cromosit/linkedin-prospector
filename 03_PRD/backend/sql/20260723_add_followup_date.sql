-- Adiciona a coluna next_followup_date na tabela leads (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'leads' 
      AND column_name = 'next_followup_date'
  ) THEN
    ALTER TABLE public.leads ADD COLUMN next_followup_date timestamp with time zone;
  END IF;
END $$;
