-- Tabela de Passos da Campanha
CREATE TABLE IF NOT EXISTS public.campaign_steps (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE CASCADE,
  tenant_id uuid, -- Referência para Multi-tenant
  step_order integer NOT NULL,
  delay_days integer NOT NULL DEFAULT 1,
  message_template text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Tabela de Sequência de Leads (Vincula Lead à Campanha)
CREATE TABLE IF NOT EXISTS public.lead_sequences (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE CASCADE,
  tenant_id uuid, -- Referência para Multi-tenant
  current_step integer DEFAULT 1,
  status text DEFAULT 'active', -- active, paused, completed, replied
  next_execution_date timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Adicionar índice para acelerar a busca do cron
CREATE INDEX IF NOT EXISTS idx_lead_sequences_active ON public.lead_sequences(status, next_execution_date);
