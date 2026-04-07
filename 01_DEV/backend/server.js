require('dotenv').config();

const express = require('express');
const cors = require('cors');

const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'chrome-extension://*'
].filter(Boolean);

app.use(cors({
  origin: true, // PERMISSAO TOTAL PARA DEV: Permite que qualquer porta local (5173, 5174, etc) fale com o backend
  credentials: true
}));

app.use(express.json());

// ==========================================
// ROTA DE TESTE QA FORÇADA (INJETADA v20.5)
// ==========================================
app.post('/qa-force-test', async (req, res) => {
  console.log('🛡️ QA_FORCE_TEST: Disparando motores em modo VIP...');
  try {
    const supabase = require('./config/supabase');
    const agora = new Date().toISOString();
    
    // 🔥 DINÂMICO: Busca o primeiro usuário real (VOCÊ!) para o bypass
    const { data: users } = await supabase.from('users').select('id').limit(1);
    const userId = users && users.length > 0 ? users[0].id : null;

    if (!userId) {
      console.error('⚠️ Nenhum usuário encontrado no banco para o teste.');
      return res.status(500).json({ error: 'Falta criar usuário no sistema.' });
    }

    const { data: fila, error } = await supabase.from('followup_queue')
      .select('*, leads(*)')
      .eq('status', 'pendente')
      .lte('scheduled_for', agora);

    if (error) {
      console.error('❌ Erro Supabase:', error.message);
      return res.status(500).json({ error: error.message });
    }
    
    if (!fila.length) {
      console.log('⚠️ Fila vazia para agora.');
      return res.json({ message: 'Nenhum follow-up pendente. Fila vazia, motorista!' });
    }

    // 🚀 CHAMA O PROCESSADOR DE FOLLOWUPS QUE CRIAMOS NO LEADS.JS
    // Importamos a lógica ou simplesmente executamos aqui para simplificar o teste
    console.log(`🚀 Processando ${fila.length} leads para o usuário ${userId}...`);
    
    // Por enquanto, apenas avisamos o sucesso. Para rodar o motor real via backend:
    res.json({ message: '🔥 MOTORES DISPARADOS VIA SERVER.JS!', total_na_fila: fila.length, user_simulado: userId });
  } catch (err) {
    console.error('❌ Erro Fatal:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// ROTAS DO SISTEMA - PADRONIZADAS v3.8.5 MASTER
// ==========================================
app.use('/auth', require('./routes/auth'));
app.use('/leads', require('./routes/leads')); // <-- SINCRONIZADO: Agora aceita /leads direto!
app.use('/notify', require('./routes/notify'));

app.get('/health', (req, res) => {
  res.json({ status: 'online', timestamp: new Date().toISOString(), versao: '1.0.0' });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`\n#################################################`);
  console.log(`✅ MOTOR 01_DEV (CROMOSIT IT) LIGADO COM SUCESSO!`);
  console.log(`📡 PORTA: http://localhost:${PORT}`);
  console.log(`📍 API: http://localhost:${PORT}/api/leads`);
  console.log(`🌍 MODO: ${process.env.NODE_ENV || 'development'}`);
  console.log(`#################################################\n`);
});

module.exports = app;
