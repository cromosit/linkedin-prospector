const express = require('express');
const router = express.Router();
const unipileService = require('../services/unipile');
const auth = require('../middleware/auth');
const supabase = require('../config/supabase');
const fs = require('fs');
const path = require('path');

// ==========================================
// ROTA: Gerar link de conexão (LinkedIn/WhatsApp)
// ==========================================

router.get('/connect-link', auth, async (req, res) => {
  const type = req.query.type || 'LINKEDIN';
  const userId = req.user.userId;

  console.log(`\n🚀 [UNIPILE] Iniciando geração de link...`);
  console.log(`   - Tipo: ${type}`);
  console.log(`   - Usuário: ${userId}`);

  try {
    const data = await unipileService.createConnectLink(type, userId);
    console.log(`✅ [UNIPILE] Link gerado com sucesso!`);
    res.json(data);
  } catch (err) {
    console.error(`❌ [UNIPILE] Erro fatal na rota:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// ROTA: Listar conversas recentes
// ==========================================
router.get('/chats', auth, async (req, res) => {
  try {
    const { accountId } = req.query;
    if (!accountId) return res.status(400).json({ error: 'Account ID obrigatório.' });
    
    const chats = await unipileService.listChats(accountId);
    res.json(chats);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar conversas.' });
  }
});

// ==========================================
// ROTA: Enviar mensagem (Cloud)
// ==========================================
router.post('/send', auth, async (req, res) => {
  const { accountId, recipientId, text, leadId } = req.body;
  
  if (!accountId || !recipientId || !text) {
    return res.status(400).json({ error: 'Dados insuficientes para envio.' });
  }

  try {
    const result = await unipileService.sendMessage(accountId, recipientId, text);
    
    // Registra atividade no lead se houver um leadId
    if (leadId) {
      await supabase.from('lead_activities').insert({
        lead_id: leadId,
        user_id: req.user.userId,
        type: 'unipile_msg_enviada',
        description: `Mensagem enviada via Cloud API: "${text.substring(0, 50)}..."`
      });
    }

    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao enviar mensagem via Unipile.' });
  }
});

// ==========================================
// ROTA: Listar todas as contas conectadas
// ==========================================
router.get('/accounts', auth, async (req, res) => {
  try {
    const data = await unipileService.listAccounts();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar contas no servidor.' });
  }
});

// ==========================================
// ROTA: Callback da Unipile (Recebe o ID da conta conectada)
// ==========================================
router.post('/callback/:userId', async (req, res) => {
  const { userId } = req.params;
  const { account_id, account_type, event } = req.body;

  console.log(`\n🔔 [UNIPILE CALLBACK] Recebido para usuário: ${userId}`);
  console.log(`   - Evento: ${event}`);
  console.log(`   - Conta: ${account_id} (${account_type})`);

  try {
    if (event === 'account.created' || event === 'account.updated') {
      const column = account_type === 'LINKEDIN' ? 'unipile_linkedin_id' : 'unipile_whatsapp_id';
      
      const { error } = await supabase
        .from('users')
        .update({ [column]: account_id })
        .eq('id', userId);

      if (error) throw error;
      console.log(`✅ [UNIPILE CALLBACK] Conta vinculada ao usuário ${userId} com sucesso!`);
    }
    res.json({ success: true });
  } catch (err) {
    console.error(`❌ [UNIPILE CALLBACK] Erro:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
