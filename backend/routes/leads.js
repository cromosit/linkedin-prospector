const express  = require('express');
const router   = express.Router();
const axios    = require('axios');
const supabase = require('../config/supabase');
const auth     = require('../middleware/auth');

router.use(auth);

const CHATWA_URL   = 'https://apichatwa.cromosit.com/api/messages/send';
const CHATWA_TOKEN = process.env.CHATWA_TOKEN || 'HiYooAHPQI66uey1HJj0YWkYPq6BWyIB';

// ROTA 1: Listar leads (filtrado por usuário)
router.get('/', async (req, res) => {
  try {
    const { status, temperature, source, connection_degree, search, page = 1, limit = 20 } = req.query;
    const userId = req.user.userId;
    let query = supabase.from('leads').select('*', { count: 'exact' })
      .eq('assigned_to', userId)
      .order('created_at', { ascending: false });
    if (status)            query = query.eq('status', status);
    if (temperature)       query = query.eq('temperature', temperature);
    if (source)            query = query.eq('source', source);
    if (connection_degree) query = query.eq('connection_degree', connection_degree);
    if (search)            query = query.or(`name.ilike.%${search}%,company.ilike.%${search}%,headline.ilike.%${search}%`);
    const from = (page - 1) * limit;
    query = query.range(from, from + parseInt(limit) - 1);
    const { data: leads, error, count } = await query;
    if (error) throw error;
    res.json({ leads, pagination: { total: count, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(count / limit) } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ROTA 2: Dashboard (filtrado por usuário)
router.get('/stats/dashboard', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { data: porStatus }      = await supabase.from('leads').select('status').eq('assigned_to', userId).not('status', 'is', null);
    const { data: porTemperatura } = await supabase.from('leads').select('temperature').eq('assigned_to', userId).not('temperature', 'is', null);
    const { data: porOrigem }      = await supabase.from('leads').select('source').eq('assigned_to', userId).not('source', 'is', null);
    const { data: porGrau }        = await supabase.from('leads').select('connection_degree').eq('assigned_to', userId).not('connection_degree', 'is', null);
    const { count: total }         = await supabase.from('leads').select('*', { count: 'exact', head: true }).eq('assigned_to', userId);
    const agrupar = (arr, campo) => arr.reduce((acc, item) => { acc[item[campo]] = (acc[item[campo]] || 0) + 1; return acc; }, {});
    res.json({ total, porStatus: agrupar(porStatus || [], 'status'), porTemperatura: agrupar(porTemperatura || [], 'temperature'), porOrigem: agrupar(porOrigem || [], 'source'), porGrau: agrupar(porGrau || [], 'connection_degree') });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ROTA 3: Importar em massa
router.post('/bulk', async (req, res) => {
  try {
    const { leads } = req.body;
    if (!Array.isArray(leads) || leads.length === 0) return res.status(400).json({ error: 'Envie um array de leads' });
    const leadsComUsuario = leads.map(lead => ({ ...lead, status: lead.status || 'novo', temperature: lead.temperature || 'frio', source: lead.source || 'importacao', assigned_to: req.user.userId }));
    const { data, error } = await supabase.from('leads').upsert(leadsComUsuario, { onConflict: 'linkedin_id' }).select();
    if (error) throw error;

    // Enriquece com IA em background (não bloqueia a resposta)
    enriquecerLeadsComIA(data, req.user.userId).catch(e => console.error('Erro enriquecimento IA:', e));

    res.status(201).json({ message: `${data.length} leads importados com sucesso`, leads: data });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ROTA 4: Criar lead
router.post('/', async (req, res) => {
  try {
    const { name, linkedin_url, linkedin_id, headline, company, location, profile_picture, email, phone, website, about, birthday, connected_since, followers, mutual_connections, connection_degree, source = 'manual', temperature = 'frio', notes, service_interest, score } = req.body;
    if (!name) return res.status(400).json({ error: 'Nome do lead é obrigatório' });
    const { data: lead, error } = await supabase.from('leads').insert({ name, linkedin_url, linkedin_id, headline, company, location, profile_picture, email, phone, website, about, birthday, connected_since, followers, mutual_connections, connection_degree, source, temperature, notes, service_interest, score: score || 0, status: 'novo', assigned_to: req.user.userId }).select().single();
    if (error) throw error;

    // Enriquece com IA em background
    if (lead && (headline || about)) {
      enriquecerLeadComIA(lead).catch(e => console.error('Erro IA:', e));
    }

    res.status(201).json({ message: 'Lead criado com sucesso', lead });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ROTA 5: Buscar lead por ID
router.get('/:id', async (req, res) => {
  try {
    const { data: lead, error } = await supabase.from('leads').select(`*, lead_activities(*)`).eq('id', req.params.id).single();
    if (error || !lead) return res.status(404).json({ error: 'Lead não encontrado' });
    res.json({ lead });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ROTA 6: Atualizar lead
router.put('/:id', async (req, res) => {
  try {
    const updates = { ...req.body, updated_at: new Date().toISOString() };
    if (updates.status === 'contatado' && !updates.contacted_at) updates.contacted_at = new Date().toISOString();
    const { data: lead, error } = await supabase.from('leads').update(updates).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json({ message: 'Lead atualizado', lead });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ROTA 7: Excluir lead
router.delete('/:id', async (req, res) => {
  try {
    await supabase.from('lead_activities').delete().eq('lead_id', req.params.id);
    const { error } = await supabase.from('leads').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Lead excluído com sucesso' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// ENRIQUECE LEAD COM IA
// Preenche: about (se vazio), service_interest, notes com sugestões
// ==========================================
async function enriquecerLeadComIA(lead) {
  if (!process.env.OPENAI_API_KEY) return;
  if (!lead.headline && !lead.about && !lead.company) return;

  const prompt = `
Você é um agente de inteligência comercial da Cromosit IT (empresa de treinamentos e consultoria SAP em Curitiba/PR).

Analise o perfil LinkedIn abaixo e responda SOMENTE um JSON válido com 3 campos:

Perfil:
- Nome: ${lead.name}
- Cargo: ${lead.headline || 'não informado'}
- Empresa: ${lead.company || 'não informada'}
- Localização: ${lead.location || 'não informada'}
- Bio: ${lead.about ? lead.about.substring(0, 500) : 'não disponível'}
- Grau de conexão: ${lead.connection_degree === '1' ? '1º (já conectados)' : lead.connection_degree === '2' ? '2º (amigos em comum)' : '3º (sem conexão)'}
- Conexões em comum: ${lead.mutual_connections || 'nenhuma'}

Responda APENAS este JSON (sem markdown, sem explicações):
{
  "service_interest": "Em 1-2 frases: qual serviço/produto da Cromosit IT este lead provavelmente precisa (treinamento SAP MM/SD/FI/CO/HCM/BTP, consultoria, go-live, etc.) com base no cargo e empresa",
  "notes": "Em 3-5 bullet points curtos: dicas estratégicas para abordar este lead (mencionando cargo, empresa, possível dor, melhor abordagem, módulo SAP relevante)",
  "score": número de 0 a 100 indicando probabilidade de conversão (considerar: cargo estratégico=+30, empresa SAP=+20, 1º grau=+20, setor relevante=+15, localização BR=+10, sem informação=-10)
}
  `.trim();

  try {
    const res = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      { model: 'gpt-4o-mini', max_tokens: 600, temperature: 0.3, messages: [{ role: 'user', content: prompt }] },
      { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` } }
    );

    const content = res.data.choices[0].message.content.trim();
    const clean = content.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    const updates = { updated_at: new Date().toISOString() };
    if (parsed.service_interest) updates.service_interest = parsed.service_interest;
    if (parsed.notes) updates.notes = parsed.notes;
    if (parsed.score !== undefined) updates.score = parseInt(parsed.score) || 0;

    await supabase.from('leads').update(updates).eq('id', lead.id);
    console.log(`✅ IA enriqueceu lead: ${lead.name} (score: ${parsed.score})`);
  } catch (err) {
    console.error('Erro ao enriquecer lead com IA:', err.message);
  }
}

// Enriquece múltiplos leads em sequência (com delay para não sobrecarregar API)
async function enriquecerLeadsComIA(leads, userId) {
  for (const lead of leads.slice(0, 10)) { // máximo 10 por vez
    await enriquecerLeadComIA(lead);
    await new Promise(r => setTimeout(r, 500)); // 500ms entre cada
  }
}

// ROTA 8: Gerar mensagem com IA + enriquecer lead
router.post('/:id/gerar-mensagem', async (req, res) => {
  try {
    const { data: lead, error } = await supabase.from('leads').select('*').eq('id', req.params.id).single();
    if (error || !lead) return res.status(404).json({ error: 'Lead não encontrado' });
    const { tipo = 'conexao', contexto = '' } = req.body;

    const tipoDescricao = {
      'conexao': 'pedido de conexão curto (máx 300 caracteres)',
      'primeiro_contato': 'primeira mensagem após conectar (máx 500 caracteres)',
      'conexao_com_comum': 'pedido de conexão mencionando conexão em comum (máx 300 caracteres)',
      'follow_up': 'follow-up para lead que não respondeu (máx 400 caracteres)',
      'whatsapp': 'mensagem de WhatsApp direta (máx 500 caracteres)'
    };

    const grauLabel = lead.connection_degree === '1' ? '1º grau (já conectados)' : lead.connection_degree === '2' ? '2º grau (amigos em comum)' : '3º grau (sem conexão ainda)'

    // Detecta contexto estratégico pelo cargo/empresa
    const cargo = (lead.headline || '').toLowerCase()
    const empresa = (lead.company || '').toLowerCase()
    const isEcossistemaSAP = ['sap', 'deloitte', 'accenture', 'ibm', 'capgemini', 'ey', 'kpmg', 'pwc', 'totvs', 'ntt', 'cognizant', 'wipro', 'infosys'].some(e => empresa.includes(e))
    const isDecisionMaker = ['diretor', 'director', 'gerente', 'manager', 'vp ', 'vice', 'cio', 'cto', 'cfo', 'ceo', 'head of', 'head de', 'presidente', 'controller', 'superintendente'].some(c => cargo.includes(c))
    const isConsultor = ['consultor', 'consultant', 'especialista', 'analyst', 'analista'].some(c => cargo.includes(c))

    let anguloEstrategico = ''
    if (isEcossistemaSAP) {
      anguloEstrategico = `IMPORTANTE: Este lead trabalha na ${lead.company} (ecossistema SAP/consultoria). Abordagem de PARCERIA e INDICACAO MUTUA:
- NAO ofereça servicos diretamente
- Se for Sales/Director SAP: ele VENDE SAP para empresas — voce pode ser parceiro de treinamento/hypercare para os CLIENTES DELE
- Posicione Cromosit IT como complemento estrategico ao trabalho dele
- Ex: "seus clientes que implementam SAP precisam de treinamento pos go-live — podemos ser seu parceiro para isso"`
    } else if (isDecisionMaker) {
      anguloEstrategico = `Este lead e TOMADOR DE DECISAO (${lead.headline}) na empresa ${lead.company}. Abordagem de SOLUCAO DE NEGOCIO:
- Foque em como Cromosit IT resolve um problema real do cargo/departamento
- Mencione ROI, eficiencia operacional, reducao de riscos em projetos SAP`
    } else if (isConsultor) {
      anguloEstrategico = `Este lead e CONSULTOR SAP. Abordagem de REDE PROFISSIONAL: network, projetos conjuntos, parceria tecnica.`
    } else {
      anguloEstrategico = `Abordagem contextualizada ao cargo e empresa do lead.`
    }

    const prompt = `Voce e um especialista senior em prospeccao B2B da Cromosit IT (treinamentos SAP e consultoria em Curitiba/PR).

${anguloEstrategico}

Gere uma mensagem de ${tipoDescricao[tipo] || tipo} ESTRATEGICA e PERSONALIZADA para:
- Nome: ${lead.name}
- Cargo: ${lead.headline || 'nao informado'}
- Empresa: ${lead.company || 'nao informada'}
- Localizacao: ${lead.location || 'nao informada'}
- Grau de conexao: ${grauLabel}
${lead.mutual_connections ? `- Conexoes em comum: ${lead.mutual_connections}` : ''}
${lead.service_interest ? `- Interesse identificado pela IA: ${lead.service_interest}` : ''}
${lead.about ? `- Bio do LinkedIn: ${lead.about.substring(0, 400)}` : ''}
${contexto ? `- Contexto adicional: ${contexto}` : ''}

Regras OBRIGATORIAS:
1. Mencione o cargo ou empresa da pessoa de forma especifica (mostre que pesquisou)
2. Seja estrategico, nao generico — evite cliches como "espero que esteja bem"
3. Termine com uma pergunta ou CTA claro e especifico
4. Portugues brasileiro natural, tom executivo mas humano
5. Respeite o limite de caracteres do tipo

Retorne APENAS a mensagem, sem aspas ou markdown.`.trim();

    const aiRes = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      { model: 'gpt-4o-mini', max_tokens: 600, messages: [{ role: 'user', content: prompt }] },
      { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` } }
    );

    const mensagem = aiRes.data.choices[0].message.content;
    await supabase.from('leads').update({ ai_message: mensagem, updated_at: new Date().toISOString() }).eq('id', req.params.id);
    await supabase.from('lead_activities').insert({ lead_id: req.params.id, user_id: req.user.userId, type: 'mensagem_gerada', description: `Mensagem "${tipo}" gerada por IA` });
    res.json({ message: 'Mensagem gerada com sucesso', mensagem });
  } catch (err) {
    console.error('Erro ao gerar mensagem:', err.message, err.response?.data);
    res.status(500).json({ error: 'Erro ao gerar mensagem com IA' });
  }
});

// ROTA 9: Enriquecer lead manualmente com IA
router.post('/:id/enriquecer', async (req, res) => {
  try {
    const { data: lead, error } = await supabase.from('leads').select('*').eq('id', req.params.id).single();
    if (error || !lead) return res.status(404).json({ error: 'Lead não encontrado' });
    await enriquecerLeadComIA(lead);
    const { data: updated } = await supabase.from('leads').select('*').eq('id', req.params.id).single();
    res.json({ message: 'Lead enriquecido com IA', lead: updated });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ROTA 10: Enviar via WhatsApp (ChatWA)
router.post('/:id/enviar-whatsapp', async (req, res) => {
  try {
    const { data: lead, error } = await supabase.from('leads').select('*').eq('id', req.params.id).single();
    if (error || !lead) return res.status(404).json({ error: 'Lead não encontrado' });
    const { telefone, mensagem } = req.body;
    // Usa telefone do body OU do cadastro do lead
    const fone = telefone || lead.phone;
    if (!fone) return res.status(400).json({ error: 'Telefone não encontrado. Edite o lead e adicione o número de WhatsApp.' });
    if (!mensagem) return res.status(400).json({ error: 'Mensagem não informada.' });
    let numero = fone.replace(/\D/g, '');
    if (!numero.startsWith('55')) numero = '55' + numero;
    const response = await axios.post(CHATWA_URL, { number: numero, body: mensagem }, { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${CHATWA_TOKEN}` } });
    await supabase.from('leads').update({ status: 'contatado', contacted_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', req.params.id);
    await supabase.from('lead_activities').insert({ lead_id: req.params.id, user_id: req.user.userId, type: 'whatsapp_enviado', description: `WhatsApp enviado para ${numero}: "${mensagem.substring(0, 80)}..."` });
    res.json({ message: 'Mensagem enviada via WhatsApp!', numero, messageId: response.data.messageId });
  } catch (err) {
    console.error('Erro WhatsApp:', err.message, err.response?.data);
    res.status(500).json({ error: 'Erro ao enviar WhatsApp', detalhe: err.response?.data || err.message });
  }
});

// ROTA 11: Registrar atividade
router.post('/:id/atividades', async (req, res) => {
  try {
    const { type, description } = req.body;
    const { data, error } = await supabase.from('lead_activities').insert({ lead_id: req.params.id, user_id: req.user.userId, type, description }).select().single();
    if (error) throw error;
    res.status(201).json({ message: 'Atividade registrada', atividade: data });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
