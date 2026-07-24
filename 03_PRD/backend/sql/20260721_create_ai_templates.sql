-- Criação da Tabela de Templates de IA
CREATE TABLE public.ai_templates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  classificacao text NOT NULL, -- Ex: 'Gerente de TI', 'SAP SD'
  funil_etapa text NOT NULL, -- 'topo', 'meio', 'fundo'
  instrucao_prompt text NOT NULL,
  template_texto text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  
  -- Garante que só exista 1 regra para cada combinação de (Usuário + Grupo + Etapa)
  UNIQUE(user_id, classificacao, funil_etapa)
);

-- Configuração de Segurança (Row Level Security)
ALTER TABLE public.ai_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver seus próprios templates" 
ON public.ai_templates FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir seus próprios templates" 
ON public.ai_templates FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seus próprios templates" 
ON public.ai_templates FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar seus próprios templates" 
ON public.ai_templates FOR DELETE 
USING (auth.uid() = user_id);
