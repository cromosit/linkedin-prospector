-- =============================================
-- MIGRATION V1.3: Histórico de Mensagens + Follow-up Tracking
-- Execute este SQL no Supabase SQL Editor
-- =============================================

-- 1. Tabela de histórico de mensagens (WhatsApp + LinkedIn)
CREATE TABLE IF NOT EXISTS message_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'linkedin', 'email')),
  message TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'enviado' CHECK (status IN ('enviado', 'lido', 'respondido', 'erro')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Índices para performance
CREATE INDEX IF NOT EXISTS idx_message_history_lead_id ON message_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_message_history_channel ON message_history(channel);
CREATE INDEX IF NOT EXISTS idx_message_history_sent_at ON message_history(sent_at DESC);

-- 3. Colunas de tracking no leads (ignora se já existirem)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_contact_channel TEXT;

-- 4. RLS (Row Level Security) - desativado para DEV
ALTER TABLE message_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for dev" ON message_history FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- PRONTO! Após executar, volte ao Antigravity.
-- =============================================
