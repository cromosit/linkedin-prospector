const axios = require('axios');

// CONFIGURAÇÃO DO TESTE
const API_URL = 'http://localhost:3000/api/leads/process-followups';
const TOKEN = 'PONHA_SEU_JWT_AQUI_OU_USER_TOKEN'; // Simulação de ambiente

async function testarMotores() {
  console.log('🚀 INICIANDO TESTE DO MOTOR v20.5 ELITE...');
  try {
    const res = await axios.post(API_URL, {}, {
      headers: { 'Authorization': `Bearer ${TOKEN}` }
    });
    console.log('✅ RESPOSTA DO BACKEND:', JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error('❌ ERRO NO TESTE:', err.response?.data || err.message);
  }
}

testarMotores();
