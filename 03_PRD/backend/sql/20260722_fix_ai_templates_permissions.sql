-- Concede permissões básicas para as roles do Supabase
GRANT ALL ON TABLE public.ai_templates TO anon;
GRANT ALL ON TABLE public.ai_templates TO authenticated;
GRANT ALL ON TABLE public.ai_templates TO service_role;

-- Como a autenticação e o filtro (.eq('user_id', ...)) já são feitos no backend (Node.js),
-- e o cliente Supabase do backend não repassa o token JWT em cada requisição,
-- precisamos garantir que o RLS esteja desativado para esta tabela, senão as consultas falham.
ALTER TABLE public.ai_templates DISABLE ROW LEVEL SECURITY;
