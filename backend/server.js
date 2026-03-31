require('dotenv').config();

const express = require('express');
const cors = require('cors');

const app = express();

// CORS = permite que o frontend acesse este backend
// Em produção: FRONTEND_URL = https://linkedin-prospector.vercel.app (ou domínio próprio)
// Em desenvolvimento: http://localhost:5173
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:3001',
  'chrome-extension://*'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Permite requisições sem origin (Postman, extensão Chrome, etc.)
    if (!origin) return callback(null, true);
    // Permite qualquer chrome-extension://
    if (origin.startsWith('chrome-extension://')) return callback(null, true);
    // Verifica a lista de permitidos
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS bloqueado para origem: ${origin}`));
  },
  credentials: true
}));

app.use(express.json());

// ==========================================
// ROTAS DO SISTEMA
// ==========================================
app.use('/auth', require('./routes/auth'));
app.use('/api/leads', require('./routes/leads'));
app.use('/api', require('./routes/notify'));

// ==========================================
// ROTA DE SAÚDE
// ==========================================
app.get('/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    versao: '1.0.0',
    sistema: 'LinkedIn Prospector — Cromosit IT'
  });
});

// ==========================================
// ROTA PADRÃO
// ==========================================
app.get('/', (req, res) => {
  res.json({
    mensagem: 'LinkedIn Prospector API — Cromosit IT',
    versao: '1.0.0',
    endpoints: {
      saude: 'GET /health',
      loginLinkedIn: 'GET /auth/linkedin',
      callbackLinkedIn: 'GET /auth/linkedin/callback',
      meuPerfil: 'GET /auth/me',
      leads: {
        listar: 'GET /api/leads',
        buscar: 'GET /api/leads/:id',
        criar: 'POST /api/leads',
        importarMassa: 'POST /api/leads/bulk',
        atualizar: 'PUT /api/leads/:id',
        gerarMensagem: 'POST /api/leads/:id/gerar-mensagem',
        enviarWhatsapp: 'POST /api/leads/:id/enviar-whatsapp',
        registrarAtividade: 'POST /api/leads/:id/atividades',
        dashboard: 'GET /api/leads/stats/dashboard'
      },
      notificar: 'POST /api/notificar-vendedor'
    }
  });
});

// ==========================================
// INICIA O SERVIDOR
// ==========================================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`\n✅ Servidor LinkedIn Prospector rodando!`);
  console.log(`📡 Endereço: http://localhost:${PORT}`);
  console.log(`🔗 Login LinkedIn: http://localhost:${PORT}/auth/linkedin`);
  console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}\n`);
});

module.exports = app;
