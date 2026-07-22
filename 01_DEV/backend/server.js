require('dotenv').config();

const express      = require('express');
const cors         = require('cors');
const rateLimit    = require('express-rate-limit');
const jwt          = require('jsonwebtoken');

const JWT_SECRET   = process.env.JWT_SECRET || 'cromosit_master_key_2026';

const app = express();

// ==========================================
// CORS
// ==========================================
app.use(cors({
  origin: (origin, callback) => {
    if (
      !origin ||
      origin.startsWith('chrome-extension://') ||
      origin.includes('cromosit.com') ||
      origin.includes('railway.app') ||
      origin.includes('localhost')
    ) {
      return callback(null, true);
    }
    callback(null, true);
  },
  credentials: true
}));

// ==========================================
// RATE LIMITING
// ==========================================

// Limite global: 300 req/min por IP
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições. Tente novamente em instantes.' }
});

// Limite para rotas de autenticação: 20 req/min por IP (previne brute-force)
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas de login. Aguarde 1 minuto.' }
});

// Limite para rotas de IA: 30 req/min por IP (previne abuso de créditos OpenAI)
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições de IA. Aguarde um momento.' }
});

app.use(globalLimiter);
app.use(express.json({ limit: '1mb' }));

// ==========================================
// MIDDLEWARE DE LOGGING
// ==========================================
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms    = Date.now() - start;
    const color = res.statusCode >= 500 ? '\x1b[31m' : res.statusCode >= 400 ? '\x1b[33m' : '\x1b[32m';
    const reset = '\x1b[0m';
    console.log(`${color}[${new Date().toISOString()}] ${req.method} ${req.path} → ${res.statusCode} (${ms}ms)${reset}`);
  });
  next();
});

// ==========================================
// ROTAS DO SISTEMA
// ==========================================
const authRoutes = require('./routes/auth');
const leadRoutes = require('./routes/leads');
const statRoutes = require('./routes/stats');
const notifyRoutes = require('./routes/notify');
const unipileRoutes = require('./routes/unipile');
const campaignRoutes = require('./routes/campaigns');
const taskRoutes = require('./routes/tasks');
const pipelinesRouter = require('./routes/pipelines');
const profileRouter = require('./routes/profile');
const aiSettingsRouter = require('./routes/aiSettings');
const aiTemplatesRouter = require('./routes/aiTemplates');
const notifyRouter = require('./routes/notify');

// Uso das rotas
app.use('/auth', authLimiter, authRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/stats', statRoutes);
app.use('/api/notify', notifyRoutes);
app.use('/api/unipile', unipileRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/pipelines', pipelinesRouter);
app.use('/api/profile', profileRouter);
app.use('/api/ai-settings', aiSettingsRouter);
app.use('/api/ai-templates', aiTemplatesRouter);
app.use('/api/notify', notifyRouter);

// ==========================================
// ROTA DE SAÚDE
// ==========================================
app.get('/health', (req, res) => {
  res.json({
    status:    'online',
    timestamp: new Date().toISOString(),
    versao:    '2.0.0',
    sistema:   'LinkedIn Prospector — Cromosit IT'
  });
});

// ==========================================
// ROTA DE PING — mantém Railway + Supabase ativos
// ==========================================
app.get('/ping', async (req, res) => {
  try {
    const supabase = require('./config/supabase');
    const { count } = await supabase.from('users').select('*', { count: 'exact', head: true });
    res.json({ status: 'ok', db: 'online', users: count, ts: new Date().toISOString() });
  } catch (err) {
    res.json({ status: 'ok', db: 'error', message: err.message });
  }
});

// ==========================================
// WORKER DE FOLLOW-UP (Sprint 2)
// Verifica leads que precisam de contato hoje
// ==========================================
async function executarWorkerFollowup() {
  console.log('🔍 [WORKER] Iniciando verificação de follow-ups pendentes...');
  try {
    const supabase = require('./config/supabase');
    const hoje = new Date().toISOString();
    
    // Busca leads com data de follow-up vencida ou para hoje
    const { data: pendentes, error, count } = await supabase
      .from('leads')
      .select('id, name, cadence_step')
      .eq('status', 'contatado')
      .lte('next_followup_at', hoje);

    if (error) throw error;

    if (count > 0) {
      console.log(`⚠️ [WORKER] Encontrados ${count} leads aguardando follow-up!`);
      pendentes.forEach(l => {
        console.log(`   - Lead: ${l.name} (Step: ${l.cadence_step})`);
      });
      // DICA: Aqui poderíamos disparar um e-mail ou WhatsApp para o vendedor
    } else {
      console.log('✅ [WORKER] Nenhum follow-up pendente para agora.');
    }
  } catch (err) {
    console.error('❌ [WORKER] Erro ao processar follow-ups:', err.message);
  }
}

// ==========================================
// ENDPOINT DE STATUS E VERSÃO
// ==========================================
app.get('/api/status/version', (req, res) => {
  res.json({ requiredVersion: '5.8.5', status: 'online' });
});

// ==========================================
// ROTA PADRÃO — lista endpoints disponíveis
// ==========================================
app.get('/', (req, res) => {
  res.json({
    mensagem:  'LinkedIn Prospector API — Cromosit IT',
    versao:    '2.0.0',
    endpoints: {
      saude:          'GET /health',
      ping:           'GET /ping',
      loginLinkedIn:  'GET /auth/linkedin',
      callbackLinkedIn: 'GET /auth/linkedin/callback',
      meuPerfil:      'GET /auth/me',
      leads: {
        listar:             'GET  /api/leads',
        buscar:             'GET  /api/leads/:id',
        criar:              'POST /api/leads',
        importarMassa:      'POST /api/leads/bulk',
        atualizar:          'PUT  /api/leads/:id',
        excluir:            'DELETE /api/leads/:id',
        excluirEmMassa:     'DELETE /api/leads/bulk-delete',
        exportCSV:          'GET  /api/leads/export/csv',
        gerarMensagem:      'POST /api/leads/:id/gerar-mensagem',
        enriquecer:         'POST /api/leads/:id/enriquecer',
        enviarWhatsapp:     'POST /api/leads/:id/enviar-whatsapp',
        registrarAtividade: 'POST /api/leads/:id/atividades',
        dashboard:          'GET  /api/leads/stats/dashboard'
      },
      notificar: 'POST /api/notificar-vendedor'
    }
  });
});

// ==========================================
// LOGIN MANUAL (CROMOSIT MASTER)
// ==========================================
const MASTER_ID = '550e8400-e29b-41d4-a716-446655440000';

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (email === 'samuel.betim@hotmail.com' || email === 'contato@cromosit.com' || email === 'samuell.betim@gmail.com') {
    if (password === 'cromosit2026' || password === 'Alpha@2026@@') {
      const token = jwt.sign({ userId: MASTER_ID, email }, JWT_SECRET, { expiresIn: '7d' });
      return res.json({ 
        token, 
        user: { userId: MASTER_ID, email, name: 'Samuel (Master)' } 
      });
    }
  }
  res.status(401).json({ error: 'Credenciais inválidas' });
});

// ==========================================
// TRATAMENTO DE ERROS GLOBAL
// ==========================================
app.use((err, req, res, next) => {
  console.error(`\x1b[31m[ERRO GLOBAL] ${err.message}\x1b[0m`, err.stack);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Erro interno do servidor.'
      : err.message
  });
});

// 404 para rotas não encontradas
app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada.' });
});

// ==========================================
// INICIA O SERVIDOR
// ==========================================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`\n✅ LinkedIn Prospector v2.0 rodando!`);
  console.log(`📡 http://localhost:${PORT}`);
  console.log(`🔗 Login LinkedIn: http://localhost:${PORT}/auth/linkedin`);
  console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}\n`);

  // Sprint 2: Inicia o vigilante de follow-up
  executarWorkerFollowup();
  setInterval(executarWorkerFollowup, 1000 * 60 * 60 * 12);
});

module.exports = app;
