-- =============================================
-- MIGRATION V1.4: Estrutura de Pipelines e Etapas (Kanban)
-- Execute este SQL no Supabase SQL Editor
-- =============================================

-- 1. Tabela de Funis (Pipelines)
CREATE TABLE IF NOT EXISTS public.pipelines (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    description text,
    user_id uuid REFERENCES auth.users(id),
    created_at timestamp with time zone DEFAULT now()
);

-- 2. Tabela de Etapas (Stages)
CREATE TABLE IF NOT EXISTS public.pipeline_stages (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    pipeline_id uuid REFERENCES public.pipelines(id) ON DELETE CASCADE,
    name text NOT NULL,
    position integer DEFAULT 0,
    color text DEFAULT '#1d8fe8',
    created_at timestamp with time zone DEFAULT now()
);

-- 3. Vincular Leads às Etapas e Funis (Garante as colunas)
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS pipeline_id uuid REFERENCES public.pipelines(id);
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS pipeline_stage_id uuid REFERENCES public.pipeline_stages(id);
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS stage_entered_at timestamp with time zone DEFAULT now();

-- 4. RLS (Segurança por Usuário)
ALTER TABLE public.pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;

-- Remove políticas antigas se existirem para evitar erro
DROP POLICY IF EXISTS "Pipelines: owner only" ON public.pipelines;
DROP POLICY IF EXISTS "Stages: all for dev" ON public.pipeline_stages;

CREATE POLICY "Pipelines: owner only" ON public.pipelines FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Stages: all for dev" ON public.pipeline_stages FOR ALL USING (true) WITH CHECK (true);

-- 5. Índices
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_pipeline_id ON public.pipeline_stages(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_leads_pipeline_stage_id ON public.leads(pipeline_stage_id);
