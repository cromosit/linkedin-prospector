-- Habilitar RLS em todas as tabelas
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_templates ENABLE ROW LEVEL SECURITY;

-- Excluir políticas antigas se existirem (para evitar conflitos)
-- DROP POLICY IF EXISTS "..." ON ...

-- Criar políticas baseadas no tenant_id extraído do JWT (auth.jwt() ->> 'tenant_id')

-- Users
CREATE POLICY "Tenant Isolation - Users" ON public.users FOR ALL
USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Leads
CREATE POLICY "Tenant Isolation - Leads" ON public.leads FOR ALL
USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Tasks
CREATE POLICY "Tenant Isolation - Tasks" ON public.tasks FOR ALL
USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Lead Activities
CREATE POLICY "Tenant Isolation - Lead Activities" ON public.lead_activities FOR ALL
USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Pipelines
CREATE POLICY "Tenant Isolation - Pipelines" ON public.pipelines FOR ALL
USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Pipeline Stages
CREATE POLICY "Tenant Isolation - Pipeline Stages" ON public.pipeline_stages FOR ALL
USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- AI Templates
CREATE POLICY "Tenant Isolation - AI Templates" ON public.ai_templates FOR ALL
USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
