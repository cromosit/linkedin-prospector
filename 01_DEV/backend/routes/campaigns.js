const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const auth = require('../middleware/auth');

// ==========================================
// ROTA: Listar Campanhas
// ==========================================
router.get('/', auth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('user_id', req.user.userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// ROTA: Criar Campanha
// ==========================================
router.post('/', auth, async (req, res) => {
  const { name, description, search_url, message_template, target_degree } = req.body;
  try {
    const { data, error } = await supabase
      .from('campaigns')
      .insert({
        name,
        description,
        search_url,
        message_template,
        target_degree: target_degree || 'todos',
        user_id: req.user.userId
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// ROTA: Atualizar Campanha
// ==========================================
router.put('/:id', auth, async (req, res) => {
  const { name, description, search_url, message_template, status, target_degree } = req.body;
  try {
    const { data, error } = await supabase
      .from('campaigns')
      .update({
        name,
        description,
        search_url,
        message_template,
        status,
        target_degree: target_degree || 'todos',
        updated_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .eq('user_id', req.user.userId)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// ROTA: Excluir Campanha
// ==========================================
router.delete('/:id', auth, async (req, res) => {
  try {
    const { error } = await supabase
      .from('campaigns')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.userId);

    if (error) throw error;
    res.json({ message: 'Campanha excluída com sucesso' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// ROTA: Estatísticas da Campanha
// ==========================================
router.get('/:id/stats', auth, async (req, res) => {
  try {
    const { data: leads, error } = await supabase
      .from('leads')
      .select('status, temperature')
      .eq('campaign_id', req.params.id);

    if (error) throw error;

    const stats = {
      total: leads.length,
      por_status: {},
      por_temperatura: {}
    };

    leads.forEach(l => {
      stats.por_status[l.status] = (stats.por_status[l.status] || 0) + 1;
      stats.por_temperatura[l.temperature] = (stats.por_temperatura[l.temperature] || 0) + 1;
    });

    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// ROTA: Sugerir Prompt com IA
// ==========================================
router.post('/suggest-prompt', auth, async (req, res) => {
  const { name, description } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Nome da campanha é obrigatório para gerar a sugestão.' });
  }

  try {
    const axios = require('axios');
    
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY não configurada no servidor.');
    }

    const prompt = `
Você é um especialista em prospecção outbound B2B e copywriting da Cromosit IT (empresa de alocação de profissionais de TI, treinamentos e consultoria técnica em Curitiba/PR).
Crie um comando/prompt de instrução focado no ICP para a IA gerar mensagens de prospecção.
O público-alvo (ICP) é definido por:
- Nome da Campanha (ICP): "${name}"
- Objetivo: "${description || 'prospecção de novos negócios'}"

Diga à IA como criar a mensagem perfeita para este ICP específico (exemplo: elogiando um aspecto profissional comum a esse cargo, fazendo um gancho direto de conexão sem parecer pitch de vendas forçado, e focando nos diferenciais da Cromosit IT).
Escreva APENAS o comando de sugestão em formato de instrução direta para a IA (ex: "Crie uma mensagem de no máximo 2 parágrafos..."). Não use aspas adicionais, introduções ou explicações.
`.trim();

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini',
        max_tokens: 300,
        temperature: 0.7,
        messages: [{ role: 'user', content: prompt }]
      },
      { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` } }
    );

    const suggestion = response.data.choices[0].message.content.trim();
    res.json({ suggestion });
  } catch (err) {
    console.error('Erro ao sugerir prompt:', err.message);
    res.status(500).json({ error: 'Erro ao gerar sugestão com IA', detalhe: err.message });
  }
});

module.exports = router;
