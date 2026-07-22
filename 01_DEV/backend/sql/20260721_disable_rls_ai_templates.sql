-- Desabilitando RLS pois a autenticação já é feita pelo backend (middleware/auth.js)
ALTER TABLE public.ai_templates DISABLE ROW LEVEL SECURITY;
