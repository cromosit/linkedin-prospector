-- supabase_migration_v1.5_settings.sql — Central de Configurações, Perfil e Permissões

-- 1. Criação das colunas de Perfil na tabela users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS company TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role TEXT;

-- 2. Criação da tabela de configurações de IA do usuário
CREATE TABLE IF NOT EXISTS public.user_ai_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    openai_key TEXT,
    gemini_key TEXT,
    claude_key TEXT,
    preferred_provider TEXT DEFAULT 'openai',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id)
);

-- Ativa RLS para segurança
ALTER TABLE public.user_ai_settings ENABLE ROW LEVEL SECURITY;

-- Cria políticas de RLS (Caso utilize autenticação nativa do Supabase)
DROP POLICY IF EXISTS "AI settings: owner only" ON public.user_ai_settings;
CREATE POLICY "AI settings: owner only" ON public.user_ai_settings FOR ALL USING (auth.uid() = user_id);

-- 3. Concessão de privilégios para tabelas novas e existentes
GRANT ALL PRIVILEGES ON public.user_ai_settings TO postgres, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON public.pipelines TO postgres, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON public.pipeline_stages TO postgres, anon, authenticated, service_role;

-- 4. Ajuste da constraint de chave estrangeira e desativação de RLS (permite login local por bypass de UUID)
ALTER TABLE public.pipelines DROP CONSTRAINT IF EXISTS pipelines_user_id_fkey;
ALTER TABLE public.pipelines DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_stages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_ai_settings DISABLE ROW LEVEL SECURITY;

-- 5. Atualização do cache do PostgREST
NOTIFY pgrst, 'reload schema';
