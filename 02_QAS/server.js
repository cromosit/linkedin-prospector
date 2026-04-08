require('dotenv').config();

const express = require('express');
const cors    = require('cors');

const app = express();

app.use(cors({
  origin: [
    process.env.FRONTEND_URL,
    'http://localhost:5173',
    'http://localhost:3001',
    'chrome-extension://*'
  ],
  credentials: true
}));

app.use(express.json());

// ==========================================
// ROTAS
// ==========================================
app.use('/auth',      require('./routes/auth'));
app.use('/api/leads', require('./routes/leads'));
app.use('/api',       require('./routes/notify'));

// ==========================================
// HEALTH CHECK
// ==========================================
app.get('/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    versao: '2.0.0',
    sistema: 'LinkedIn Prospector — Cromosit IT'
  });
});

// ==========================================
// ROTA RAIZ — lista todos endpoints
// ==========================================
app.get('/', (req, res) => {
  res.json({
    mensagem: 'LinkedIn Prospector API v2.0 — Cromosit IT',
    versao: '2.0.0',
    endpoints: {
      saude: 'GET /health',
      auth: {
        login: 'POST /auth/login',
        me: 'GET /auth/me'
      },
      leads: {
        listar:            'GET  /api/leads',
        dashboard:         'GET  /api/leads/stats/dashboard',
        importarMassa:     'POST /api/leads/bulk',
        criar:             'POST /api/leads',
        buscar:            'GET  /api/leads/:id',
        atualizar:         'PUT  /api/leads/:id',
        excluir:           'DELETE /api/leads/:id',
        gerarMensagem:     'POST /api/leads/:id/gerar-mensagem',
        enviarWhatsapp:    'POST /api/leads/:id/enviar-whatsapp',
        registrarAtividade:'POST /api/leads/:id/atividades'
      },
      notificar: 'POST /api/notificar-vendedor'
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n✅ LinkedIn Prospector v2.0 rodando!`);
  console.log(`📡 http://localhost:${PORT}`);
  console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}\n`);
});

module.exports = app;
