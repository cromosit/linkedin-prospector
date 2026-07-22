const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const auth = require('../middleware/auth');

router.use(auth);

// ==========================================
// POST: Sugerir Instrução e Template com IA
// ==========================================
router.post('/suggest', async (req, res) => {
  const { classificacao, funil_etapa } = req.body;
  if (!classificacao || !funil_etapa) return res.status(400).json({ error: 'Classificação e Etapa são obrigatórios.' });

  try {
    const axios = require('axios');
    const supabase = require('../config/supabase');
    let openaiKey = process.env.OPENAI_API_KEY;
    
    // Tenta buscar a chave pessoal configurada no painel
    try {
      const { data: aiSettings } = await supabase
        .from('user_ai_settings')
        .select('openai_key')
        .eq('user_id', req.user.userId)
        .maybeSingle();

      if (aiSettings && aiSettings.openai_key) {
        openaiKey = aiSettings.openai_key;
      }
    } catch (e) {
      console.error('Erro ao buscar chave da OpenAI do banco:', e.message);
    }
    
    if (!openaiKey) throw new Error('Chave da OpenAI não configurada no servidor nem no seu perfil.');

    const prompt = `Você é um especialista em vendas B2B e copywriting.
O usuário quer criar uma regra de prospecção para o seguinte público e etapa do funil:
- Público-alvo (Classificação): ${classificacao}
- Etapa do Funil: ${funil_etapa}

Gere uma instrução de prompt (o que a IA deve focar ao escrever a mensagem) e um template de texto opcional (com variáveis como \${primeiroNome}, \${empresa}).
Retorne EXATAMENTE UM JSON VÁLIDO com o seguinte formato, sem formatação markdown ou blocos de código:
{
  "instrucao_prompt": "Sua instrução focada e estratégica aqui",
  "template_texto": "Seu template aqui..."
}`;

    const completion = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Você é um assistente que retorna APENAS JSON válido, sem nenhum texto extra.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 400,
        response_format: { type: 'json_object' }
      },
      { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openaiKey}` } }
    );

    let rawResponse = completion.data.choices[0].message.content.trim();
    
    // Pega com segurança apenas a parte que é o objeto JSON
    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Não foi possível encontrar o JSON na resposta.');
    
    const parsed = JSON.parse(jsonMatch[0]);
    res.json(parsed);
  } catch (err) {
    const errorDetail = err.response?.data?.error?.message || err.message;
    console.error('Erro ao sugerir com IA:', errorDetail);
    res.status(500).json({ error: 'Falha ao gerar sugestão da IA.', detalhe: errorDetail });
  }
});

// ==========================================
// POST: Testar Template (Gera preview com IA)
// ==========================================
router.post('/test', async (req, res) => {
  const { classificacao, funil_etapa, instrucao_prompt, template_texto } = req.body;
  if (!instrucao_prompt) return res.status(400).json({ error: 'Instrução é obrigatória.' });

  try {
    const axios = require('axios');
    const supabase = require('../config/supabase');
    let openaiKey = process.env.OPENAI_API_KEY;

    // Tenta buscar a chave pessoal configurada no painel
    try {
      const { data: aiSettings } = await supabase
        .from('user_ai_settings')
        .select('openai_key')
        .eq('user_id', req.user.userId)
        .maybeSingle();

      if (aiSettings && aiSettings.openai_key) {
        openaiKey = aiSettings.openai_key;
      }
    } catch (e) {
      console.error('Erro ao buscar chave da OpenAI do banco:', e.message);
    }

    if (!openaiKey) throw new Error('Chave da OpenAI não configurada no servidor nem no seu perfil.');

    let prompt = `Você é um assistente de IA testando uma regra de prospecção.
Aqui está a regra configurada:
- Público-alvo: ${classificacao}
- Etapa do Funil: ${funil_etapa}
- Instrução (Estratégia): ${instrucao_prompt}
`;

    if (template_texto) {
      prompt += `\n- TEMPLATE BASE EXATO (Siga esta estrutura substituindo as variáveis):\n${template_texto}\n`;
    }

    prompt += `\nGere uma mensagem curta, realista, como se estivesse enviando para um lead chamado "Samuel da Empresa Fictícia", atuando como "Gerente". Não coloque placeholders, crie a mensagem pronta.`;

    const completion = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 400
      },
      { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openaiKey}` } }
    );

    res.json({ mensagem: completion.data.choices[0].message.content.trim() });
  } catch (err) {
    const errorDetail = err.response?.data?.error?.message || err.message;
    console.error('Erro ao testar IA:', errorDetail);
    res.status(500).json({ error: 'Falha ao testar IA.', detalhe: errorDetail });
  }
});

// ==========================================
// GET: Listar todos os templates do usuário
// ==========================================
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('ai_templates')
      .select('*')
      .eq('user_id', req.user.userId)
      .order('classificacao', { ascending: true })
      .order('funil_etapa', { ascending: true });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// POST: Criar ou Atualizar um Template
// ==========================================
router.post('/', async (req, res) => {
  const { classificacao, funil_etapa, instrucao_prompt, template_texto } = req.body;
  
  if (!classificacao || !funil_etapa || !instrucao_prompt) {
    return res.status(400).json({ error: 'Classificação, Etapa do Funil e Instrução são obrigatórios.' });
  }

  try {
    // Verifica se já existe
    const { data: existente } = await supabase
      .from('ai_templates')
      .select('id')
      .eq('user_id', req.user.userId)
      .eq('classificacao', classificacao)
      .eq('funil_etapa', funil_etapa)
      .maybeSingle();

    let result;
    if (existente) {
      // Atualiza
      result = await supabase
        .from('ai_templates')
        .update({
          instrucao_prompt,
          template_texto,
          updated_at: new Date().toISOString()
        })
        .eq('id', existente.id)
        .select()
        .single();
    } else {
      // Insere
      result = await supabase
        .from('ai_templates')
        .insert({
          user_id: req.user.userId,
          classificacao,
          funil_etapa,
          instrucao_prompt,
          template_texto,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
    }

    if (result.error) throw result.error;
    res.status(201).json(result.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// DELETE: Excluir um Template
// ==========================================
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('ai_templates')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.userId);

    if (error) throw error;
    res.json({ message: 'Template excluído com sucesso.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
