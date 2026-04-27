-- ==========================================
-- LinkedIn Prospector v2.0 — Cromosit IT
-- Execute no Supabase > SQL Editor > New Query
-- ==========================================

-- Desativa RLS (Row Level Security) — controle feito pela API
ALTER TABLE IF EXISTS users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS leads DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lead_activities DISABLE ROW LEVEL SECURITY;

-- ==========================================
-- TABELA: users
-- ==========================================
CREATE TABLE IF NOT EXISTS users (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  linkedin_id     TEXT UNIQUE,
  name            TEXT NOT NULL,
  email           TEXT UNIQUE,
  password_hash   TEXT,
  company         TEXT,
  role            TEXT,
  lgpd_accepted   BOOLEAN DEFAULT false,
  lgpd_consent_at TIMESTAMPTZ,
  profile_picture TEXT,
  access_token    TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- TABELA: leads
-- ==========================================
CREATE TABLE IF NOT EXISTS leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Dados do LinkedIn
  linkedin_id       TEXT,
  linkedin_url      TEXT,
  name              TEXT NOT NULL,
  headline          TEXT,
  company           TEXT,
  location          TEXT,
  profile_picture   TEXT,
  email             TEXT,
  phone             TEXT,
  about             TEXT,

  -- Dados de conexão (novos campos v2.0)
  connection_degree  TEXT DEFAULT '3',   -- '1', '2', '3'
  mutual_connections TEXT,               -- "João e mais 150 conexões"
  followers          TEXT,
  website            TEXT,
  can_connect        BOOLEAN DEFAULT true,

  -- Classificação e pipeline
  status TEXT DEFAULT 'novo' CHECK (
    status IN ('novo', 'contatado', 'respondeu', 'em_negociacao', 'fechado', 'descartado')
  ),
  temperature TEXT DEFAULT 'frio' CHECK (
    temperature IN ('quente', 'morno', 'frio')
  ),
  source TEXT DEFAULT 'manual',          -- 'chrome_extension', 'manual', 'importacao'

  -- Anotações e IA
  notes      TEXT,
  ai_message TEXT,

  -- Controle
  assigned_to  UUID REFERENCES users(id),
  contacted_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- TABELA: lead_activities
-- ==========================================
CREATE TABLE IF NOT EXISTS lead_activities (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id     UUID REFERENCES leads(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id),
  type        TEXT,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- TABELA: campaigns (Gestão de Lotes de Prospecção)
-- ==========================================
CREATE TABLE IF NOT EXISTS campaigns (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES users(id),
  name        TEXT NOT NULL,
  description TEXT,
  status      TEXT DEFAULT 'ativa' CHECK (status IN ('ativa', 'pausada', 'concluida')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Vincular leads a campanhas
ALTER TABLE leads ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL;

-- ==========================================
-- TABELA: tasks (Gestão de Follow-ups e Afazeres)
-- ==========================================
CREATE TABLE IF NOT EXISTS tasks (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES users(id),
  lead_id     UUID REFERENCES leads(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  due_date    TIMESTAMPTZ,
  status      TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'concluida', 'atrasada')),
  priority    TEXT DEFAULT 'media' CHECK (priority IN ('baixa', 'media', 'alta')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- PERMISSÕES EXTRAS
-- ==========================================
GRANT ALL PRIVILEGES ON campaigns TO postgres, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON tasks TO postgres, anon, authenticated, service_role;

-- ==========================================
-- CONSTRAINTS UNIQUE ... (mantenha o restante do arquivo)
-- Remover se já existir para evitar erros ao rodar o script novamente
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_linkedin_id_unique;
ALTER TABLE leads ADD CONSTRAINT leads_linkedin_id_unique UNIQUE (linkedin_id);

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_linkedin_url_unique;
ALTER TABLE leads ADD CONSTRAINT leads_linkedin_url_unique UNIQUE (linkedin_url);

-- ==========================================
-- ÍNDICES para busca rápida
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_leads_status           ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_temperature      ON leads(temperature);
CREATE INDEX IF NOT EXISTS idx_leads_source           ON leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_connection_degree ON leads(connection_degree);
CREATE INDEX IF NOT EXISTS idx_leads_company          ON leads(company);
CREATE INDEX IF NOT EXISTS idx_leads_created_at       ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to      ON leads(assigned_to);

-- ==========================================
-- PERMISSÕES
-- ==========================================
GRANT ALL PRIVILEGES ON ALL TABLES    IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- ==========================================
-- ADICIONAR colunas se já tiver a tabela antiga
-- (rodar se atualizar de v1.0 para v2.0)
-- ==========================================
ALTER TABLE leads ADD COLUMN IF NOT EXISTS connection_degree  TEXT DEFAULT '3';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS mutual_connections TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS followers          TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS website            TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS about              TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS can_connect        BOOLEAN DEFAULT true;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS legal_basis        TEXT DEFAULT 'Legítimo Interesse';

-- ==========================================
-- TABELA: lgpd_logs (Prova de Conformidade)
-- ==========================================
CREATE TABLE IF NOT EXISTS lgpd_logs (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES users(id),
  lead_id     UUID REFERENCES leads(id) ON DELETE CASCADE,
  action      TEXT, -- 'visualizacao', 'exportacao', 'exclusao_lgpd'
  description TEXT,
  timestamp   TIMESTAMPTZ DEFAULT NOW()
);

GRANT ALL PRIVILEGES ON lgpd_logs TO postgres, anon, authenticated, service_role;
