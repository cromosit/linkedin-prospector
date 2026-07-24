-- Cria a tabela de tenants (Inquilinos/Empresas Clientes)
CREATE TABLE IF NOT EXISTS public.tenants (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  domain text,
  status text DEFAULT 'active',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilita RLS na tabela tenants
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Política para que usuários só vejam o próprio tenant (A função auth.jwt será usada)
CREATE POLICY "Users can view their own tenant"
ON public.tenants
FOR SELECT
USING (id = (auth.jwt() ->> 'tenant_id')::uuid);
