const express = require('express');
const router = express.Router();
const axios = require('axios');
const supabase = require('../config/supabase');
const auth = require('../middleware/auth');

router.use(auth);

// Configuração do ChatWA — Cromosit IT
const CHATWA_URL = 'https://apichatwa.cromosit.com/api/messages/send';
const CHATWA_TOKEN = process.env.CHATWA_TOKEN || 'HiYooAHPQI66uey1HJj0YWkYPq6BWyIB';

// ==========================================
// ROTA 1: Listar leads com filtros e paginação
// ==========================================
router.get('/', async (req, res) => {
  try {
    const { status, temperature, source, search, page = 1, limit = 20 } = req.query;

    let query = supabase
      .from('leads')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (temperature) query = query.eq('temperature', temperature);
    if (source) query = query.eq('source', source);
    if (search) query = query.or(`name.ilike.%${search}%,company.ilike.%${search}%`);

    const from = (page - 1) * limit;
    const to = from + parseInt(limit) - 1;
    query = query.range(from, to);

    const { data: leads, error, count } = await query;
    if (error) throw error;

    res.json({
      leads,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// ROTA 2: Buscar um lead específico por ID
// ==========================================
router.get('/:id', async (req, res) => {
  try {
    const { data: lead, error } = await supabase
      .from('leads')
      .select(`*, lead_activities(*)`)
      .eq('id', req.params.id)
      .single();

    if (error || !lead) return res.status(404).json({ error: 'Lead não encontrado' });
    res.json({ lead });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// ROTA 3: Criar novo lead
// ==========================================
router.post('/', async (req, res) => {
  try {
    const {
      name, linkedin_url, linkedin_id, headline, company,
      location, profile_picture, email, phone,
      source = 'manual', temperature = 'frio', notes
    } = req.body;

    if (!name) return res.status(400).json({ error: 'Nome do lead é obrigatório' });

    const { data: lead, error } = await supabase
      .from('leads')
      .insert({
        name, linkedin_url, linkedin_id, headline, company,
        location, profile_picture, email, phone,
        source, temperature, notes,
        status: 'novo',
        assigned_to: req.user.userId
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ message: 'Lead criado com sucesso', lead });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// ROTA 4: Importar múltiplos leads
// ==========================================
router.post('/bulk', async (req, res) => {
  try {
    const { leads } = req.body;
    if (!Array.isArray(leads) || leads.length === 0) {
      return res.status(400).json({ error: 'Envie um array de leads' });
    }

    const leadsComUsuario = leads.map(lead => ({
      ...lead,
      status: lead.status || 'novo',
      temperature: lead.temperature || 'frio',
      source: lead.source || 'importacao',
      assigned_to: req.user.userId
    }));

    const { data, error } = await supabase
      .from('leads')
      .upsert(leadsComUsuario, { onConflict: 'linkedin_id' })
      .select();

    if (error) throw error;
    res.status(201).json({ message: `${data.length} leads importados com sucesso`, leads: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// ROTA 5: Atualizar lead
// ==========================================
router.put('/:id', async (req, res) => {
  try {
    const updates = { ...req.body, updated_at: new Date().toISOString() };
    if (updates.status === 'contatado' && !updates.contacted_at) {
      updates.contacted_at = new Date().toISOString();
    }

    const { data: lead, error } = await supabase
      .from('leads')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ message: 'Lead atualizado', lead });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// ROTA 6: Gerar mensagem com IA (OpenAI)
// ==========================================
router.post('/:id/gerar-mensagem', async (req, res) => {
  try {
    const { data: lead, error } = await supabase
      .from('leads')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !lead) return res.status(404).json({ error: 'Lead não encontrado' });

    const { tipo = 'conexao', contexto = '' } = req.body;

    const prompt = `
Você é um especialista em prospecção B2B/B2C no LinkedIn para uma empresa de tecnologia chamada Cromosit IT, baseada em Curitiba/PR.

Gere uma mensagem de ${tipo} para o seguinte lead:
- Nome: ${lead.name}
- Cargo: ${lead.headline || 'não informado'}
- Empresa: ${lead.company || 'não informada'}
- Localização: ${lead.location || 'não informada'}
${contexto ? `- Contexto adicional: ${contexto}` : ''}

Regras:
- A mensagem deve ser curta (máximo 300 caracteres para conexão, 500 para outros tipos)
- Tom profissional mas humano, sem ser robótico
- Mencione algo específico sobre o cargo ou empresa quando possível
- Não use clichês como "Espero que este email te encontre bem"
- Termine com uma pergunta ou call-to-action claro
- Escreva em português brasileiro

Retorne APENAS a mensagem, sem explicações adicionais.
    `.trim();

    const aiResponse = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        }
      }
    );

    const mensagem = aiResponse.data.choices[0].message.content;

    await supabase
      .from('leads')
      .update({ ai_message: mensagem, updated_at: new Date().toISOString() })
      .eq('id', req.params.id);

    await supabase
      .from('lead_activities')
      .insert({
        lead_id: req.params.id,
        user_id: req.user.userId,
        type: 'mensagem_gerada',
        description: `Mensagem do tipo "${tipo}" gerada por IA`
      });

    res.json({ message: 'Mensagem gerada com sucesso', mensagem });
  } catch (err) {
    console.error('Erro ao gerar mensagem:', err.message, err.response?.data);
    res.status(500).json({ error: 'Erro ao gerar mensagem com IA' });
  }
});

// ==========================================
// ROTA 7: Enviar mensagem via ChatWA (Cromosit IT)
// ==========================================
router.post('/:id/enviar-whatsapp', async (req, res) => {
  try {
    const { data: lead, error } = await supabase
      .from('leads')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !lead) return res.status(404).json({ error: 'Lead não encontrado' });

    // Pega telefone e mensagem do body ou do lead
    const { telefone, mensagem } = req.body;
    const fone = telefone || lead.phone;

    if (!fone) {
      return res.status(400).json({
        error: 'Telefone não encontrado. Edite o lead e adicione o número de WhatsApp.'
      });
    }

    if (!mensagem) {
      return res.status(400).json({ error: 'Mensagem não informada.' });
    }

    // Formata o número — remove tudo que não é dígito e adiciona 55 (Brasil)
    let numero = fone.replace(/\D/g, '');
    if (!numero.startsWith('55')) numero = '55' + numero;

    // Envia pelo ChatWA da Cromosit
    const response = await axios.post(
      CHATWA_URL,
      {
        number: numero,
        body: mensagem
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CHATWA_TOKEN}`
        }
      }
    );

    // Atualiza status do lead para "contatado" automaticamente
    await supabase
      .from('leads')
      .update({
        status: 'contatado',
        contacted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', req.params.id);

    // Registra a atividade no histórico do lead
    await supabase
      .from('lead_activities')
      .insert({
        lead_id: req.params.id,
        user_id: req.user.userId,
        type: 'mensagem_enviada',
        description: `WhatsApp enviado para ${numero}: "${mensagem.substring(0, 80)}..."`
      });

    res.json({
      message: 'Mensagem enviada com sucesso via WhatsApp!',
      numero,
      messageId: response.data.messageId
    });

  } catch (err) {
    console.error('Erro ao enviar WhatsApp:', err.message, err.response?.data);
    res.status(500).json({
      error: 'Erro ao enviar mensagem via WhatsApp.',
      detalhe: err.response?.data || err.message
    });
  }
});

// ==========================================
// ROTA 8: Registrar atividade
// ==========================================
router.post('/:id/atividades', async (req, res) => {
  try {
    const { type, description } = req.body;
    const { data, error } = await supabase
      .from('lead_activities')
      .insert({
        lead_id: req.params.id,
        user_id: req.user.userId,
        type,
        description
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ message: 'Atividade registrada', atividade: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// ROTA 9: Dashboard — estatísticas gerais
// ==========================================
router.get('/stats/dashboard', async (req, res) => {
  try {
    const { data: porStatus } = await supabase.from('leads').select('status').not('status', 'is', null);
    const { data: porTemperatura } = await supabase.from('leads').select('temperature').not('temperature', 'is', null);
    const { data: porOrigem } = await supabase.from('leads').select('source').not('source', 'is', null);
    const { count: total } = await supabase.from('leads').select('*', { count: 'exact', head: true });

    const agrupar = (arr, campo) => arr.reduce((acc, item) => {
      acc[item[campo]] = (acc[item[campo]] || 0) + 1;
      return acc;
    }, {});

    res.json({
      total,
      porStatus: agrupar(porStatus || [], 'status'),
      porTemperatura: agrupar(porTemperatura || [], 'temperature'),
      porOrigem: agrupar(porOrigem || [], 'source')
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
