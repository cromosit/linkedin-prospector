-- Remove a restrição de chave estrangeira que obriga o user_id a existir na tabela auth.users
-- Isso permite o uso do usuário de teste/desenvolvimento (bypass-local-dev-token)
ALTER TABLE public.ai_templates DROP CONSTRAINT ai_templates_user_id_fkey;
