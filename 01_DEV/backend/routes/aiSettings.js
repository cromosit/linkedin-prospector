const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const auth = require('../middleware/auth');

router.use(auth);

// Helper para mascarar chaves de API
function maskKey(key) {
  if (!key) return '';
  if (key.length <= 10) return '********';
  return `${key.substring(0, 6)}...${key.substring(key.length - 4)}`;
}

// GET: Obter configurações de IA do usuário
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('user_ai_settings')
      .select('*')
      .eq('user_id', req.user.userId)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return res.json({
        openai_key: '',
        gemini_key: '',
        claude_key: '',
        preferred_provider: 'openai'
      });
    }

    res.json({
      openai_key: maskKey(data.openai_key),
      gemini_key: maskKey(data.gemini_key),
      claude_key: maskKey(data.claude_key),
      preferred_provider: data.preferred_provider || 'openai'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST: Salvar ou atualizar configurações de IA
router.post('/', async (req, res) => {
  const { openai_key, gemini_key, claude_key, preferred_provider } = req.body;
  
  try {
    // 1. Busca registro atual para verificar se já existe e para ler as chaves originais
    const { data: existing, error: fetchErr } = await supabase
      .from('user_ai_settings')
      .select('*')
      .eq('user_id', req.user.userId)
      .maybeSingle();

    if (fetchErr) throw fetchErr;

    const updates = {
      user_id: req.user.userId,
      preferred_provider: preferred_provider || 'openai',
      updated_at: new Date().toISOString()
    };

    // Só atualiza a chave se ela não for mascarada (não conter reticências ou asteriscos)
    if (openai_key !== undefined && !openai_key.includes('...')) {
      updates.openai_key = openai_key;
    }
    if (gemini_key !== undefined && !gemini_key.includes('...')) {
      updates.gemini_key = gemini_key;
    }
    if (claude_key !== undefined && !claude_key.includes('...')) {
      updates.claude_key = claude_key;
    }

    let result;
    if (existing) {
      const { data, error } = await supabase
        .from('user_ai_settings')
        .update(updates)
        .eq('user_id', req.user.userId)
        .select()
        .single();
      if (error) throw error;
      result = data;
    } else {
      const { data, error } = await supabase
        .from('user_ai_settings')
        .insert(updates)
        .select()
        .single();
      if (error) throw error;
      result = data;
    }

    res.json({
      message: 'Configurações de IA salvas com sucesso',
      openai_key: maskKey(result.openai_key),
      gemini_key: maskKey(result.gemini_key),
      claude_key: maskKey(result.claude_key),
      preferred_provider: result.preferred_provider
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
