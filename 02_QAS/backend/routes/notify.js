const express = require('express');
const router = express.Router();
const axios = require('axios');
const auth = require('../middleware/auth');

const CHATWA_URL = 'https://apichatwa.cromosit.com/api/messages/send';
const CHATWA_TOKEN = process.env.CHATWA_TOKEN || 'HiYooAHPQI66uey1HJj0YWkYPq6BWyIB';

// ==========================================
// Notifica o vendedor via WhatsApp
// quando novos leads são capturados
// ==========================================
router.post('/notificar-vendedor', auth, async (req, res) => {
  try {
    const { mensagem } = req.body;
    const telefoneVendedor = process.env.VENDEDOR_WHATSAPP; // ex: 5541999999999

    if (!telefoneVendedor) {
      return res.status(400).json({ error: 'Configure VENDEDOR_WHATSAPP no .env' });
    }

    await axios.post(
      CHATWA_URL,
      { number: telefoneVendedor, body: mensagem },
      { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${CHATWA_TOKEN}` } }
    );

    res.json({ message: 'Vendedor notificado com sucesso!' });
  } catch (err) {
    console.error('Erro ao notificar vendedor:', err.message);
    res.status(500).json({ error: 'Erro ao enviar notificação' });
  }
});

module.exports = router;
