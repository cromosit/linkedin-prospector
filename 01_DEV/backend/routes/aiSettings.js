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
        preferred_provider: 'openai',
        score_cargo_decisao: 35,
        score_cargo_sap: 30,
        score_cargo_ti: 20,
        score_localizacao_br: 15,
        score_conexao_1: 20,
        score_conexao_2: 10,
        penalidade_fora_br: -40,
        penalidade_sem_dados: -45
      });
    }

    res.json({
      openai_key: maskKey(data.openai_key),
      gemini_key: maskKey(data.gemini_key),
      claude_key: maskKey(data.claude_key),
      preferred_provider: data.preferred_provider || 'openai',
      score_cargo_decisao: data.score_cargo_decisao !== undefined && data.score_cargo_decisao !== null ? data.score_cargo_decisao : 35,
      score_cargo_sap: data.score_cargo_sap !== undefined && data.score_cargo_sap !== null ? data.score_cargo_sap : 30,
      score_cargo_ti: data.score_cargo_ti !== undefined && data.score_cargo_ti !== null ? data.score_cargo_ti : 20,
      score_localizacao_br: data.score_localizacao_br !== undefined && data.score_localizacao_br !== null ? data.score_localizacao_br : 15,
      score_conexao_1: data.score_conexao_1 !== undefined && data.score_conexao_1 !== null ? data.score_conexao_1 : 20,
      score_conexao_2: data.score_conexao_2 !== undefined && data.score_conexao_2 !== null ? data.score_conexao_2 : 10,
      penalidade_fora_br: data.penalidade_fora_br !== undefined && data.penalidade_fora_br !== null ? data.penalidade_fora_br : -40,
      penalidade_sem_dados: data.penalidade_sem_dados !== undefined && data.penalidade_sem_dados !== null ? data.penalidade_sem_dados : -45
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST: Salvar ou atualizar configurações de IA
router.post('/', async (req, res) => {
  const { 
    openai_key, 
    gemini_key, 
    claude_key, 
    preferred_provider,
    score_cargo_decisao,
    score_cargo_sap,
    score_cargo_ti,
    score_localizacao_br,
    score_conexao_1,
    score_conexao_2,
    penalidade_fora_br,
    penalidade_sem_dados
  } = req.body;
  
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

    if (score_cargo_decisao !== undefined) updates.score_cargo_decisao = parseInt(score_cargo_decisao) || 0;
    if (score_cargo_sap !== undefined) updates.score_cargo_sap = parseInt(score_cargo_sap) || 0;
    if (score_cargo_ti !== undefined) updates.score_cargo_ti = parseInt(score_cargo_ti) || 0;
    if (score_localizacao_br !== undefined) updates.score_localizacao_br = parseInt(score_localizacao_br) || 0;
    if (score_conexao_1 !== undefined) updates.score_conexao_1 = parseInt(score_conexao_1) || 0;
    if (score_conexao_2 !== undefined) updates.score_conexao_2 = parseInt(score_conexao_2) || 0;
    if (penalidade_fora_br !== undefined) updates.penalidade_fora_br = parseInt(penalidade_fora_br) || 0;
    if (penalidade_sem_dados !== undefined) updates.penalidade_sem_dados = parseInt(penalidade_sem_dados) || 0;

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
      preferred_provider: result.preferred_provider,
      score_cargo_decisao: result.score_cargo_decisao,
      score_cargo_sap: result.score_cargo_sap,
      score_cargo_ti: result.score_cargo_ti,
      score_localizacao_br: result.score_localizacao_br,
      score_conexao_1: result.score_conexao_1,
      score_conexao_2: result.score_conexao_2,
      penalidade_fora_br: result.penalidade_fora_br,
      penalidade_sem_dados: result.penalidade_sem_dados
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
