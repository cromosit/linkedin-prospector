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
  email           TEXT,
  headline        TEXT,
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
-- CONSTRAINTS UNIQUE (evita duplicatas)
-- ==========================================
ALTER TABLE leads ADD CONSTRAINT IF NOT EXISTS leads_linkedin_id_unique  UNIQUE (linkedin_id);
ALTER TABLE leads ADD CONSTRAINT IF NOT EXISTS leads_linkedin_url_unique UNIQUE (linkedin_url);

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
