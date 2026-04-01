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
    const { name, linkedin_url, linkedin_id, headline, company, current_role, current_company, location, profile_picture, email, phone, website, about, birthday, connected_since, followers, mutual_connections, connection_degree, source = 'manual', temperature = 'frio', notes, service_interest, score } = req.body;
    if (!name) return res.status(400).json({ error: 'Nome do lead é obrigatório' });
    const { data: lead, error } = await supabase.from('leads').insert({ name, linkedin_url, linkedin_id, headline, company, current_role, current_company, location, profile_picture, email, phone, website, about, birthday, connected_since, followers, mutual_connections, connection_degree, source, temperature, notes, service_interest, score: score || 0, status: 'novo', assigned_to: req.user.userId }).select().single();
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
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY n\u00e3o configurada. Adicione a chave no Railway → Variables.');
  }
  if (!lead.name) return;


  const prompt = `
Você é um agente de inteligência comercial da Cromosit IT (empresa de alocação de profissionais de TI, treinamentos e consultoria técnica em Curitiba/PR).

Analise o perfil LinkedIn abaixo e responda SOMENTE um JSON válido com 3 campos:

Perfil:
- Nome: ${lead.name}
- Cargo Real: ${lead.current_role || lead.headline || 'não informado'}
- Empresa Real: ${lead.current_company || lead.company || 'não informada'}
- Localização: ${lead.location || 'não informada'}
- Bio: ${lead.about ? lead.about.substring(0, 500) : 'não disponível'}
- Grau de conexão: ${lead.connection_degree === '1' ? '1º (já conectados)' : lead.connection_degree === '2' ? '2º (amigos em comum)' : '3º (sem conexão)'}
- Conexões em comum: ${lead.mutual_connections || 'nenhuma'}

Responda APENAS este JSON (sem markdown, sem explicações):
{
  "service_interest": "Em 1-2 frases: qual serviço da Cromosit IT ele precisa? Se ele for de TI/Software (CTO, Dev Manager), foque em Outsourcing/Alocação de desenvolvedores e squads ágeis. Se for de RH/Recrutamento, foque em fonte de profissionais e treinamentos corporativos. Se for de Negócios/SAP, foque em consultoria SAP.",
  "notes": "Em 3-5 bullet points curtos: dicas reais de abordagem. NUNCA cite siglas (MM/SD) se não estiverem no perfil dele. Personalize com base nas skills exatas que ele tem (ex: se ele fala de Microsserviços, cite isso).",
  "score": número de 0 a 100 indicando probabilidade de conversão (considerar: cargo estratégico=+30, empresa potencial=+20, 1º grau=+20, setor relevante=+15, localização BR=+10, sem informação=-10)
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

    // Detecta contexto estratégico pelo cargo/empresa atual ou headline
    const cargo = (lead.current_role || lead.headline || '').toLowerCase()
    const empresa = (lead.current_company || lead.company || '').toLowerCase()
    const hasTechOrDev = ['software', 'developer', 'engineer', 'cto ', 'arquitet', 'architect', 'tech lead', 'desenvolvedor', 'programador'].some(t => cargo.includes(t))
    const isRecrutador = ['talent acquisition', 'recrutament', 'recruiter', 'hr ', 'recursos humanos', 'talent partner', 'people partner', 'talent management', 'rh manager', 'hr manager', 'human resources', 'acquisition manager', 'people & culture', 'gestao de pessoas', 'gestão de pessoas', 'psicólog', 'head of people'].some(c => cargo.includes(c))
    const isEcossistemaSAP = ['sap', 'deloitte', 'accenture', 'ibm', 'capgemini', 'ey', 'kpmg', 'pwc', 'totvs', 'ntt', 'cognizant', 'wipro', 'infosys'].some(e => empresa.includes(e))
    const isDecisionMaker = ['diretor', 'director', 'gerente', 'manager', 'vp ', 'vice', 'cio', 'cfo', 'ceo', 'head of', 'head de', 'presidente', 'controller', 'superintendente'].some(c => cargo.includes(c))
    const isConsultor = ['consultor', 'consultant', 'especialista', 'analyst', 'analista'].some(c => cargo.includes(c))

    let anguloEstrategico = ''
    if (hasTechOrDev) {
      anguloEstrategico = `Este lead lidera ou trabalha com ENGENHARIA DE SOFTWARE/TI (${cargo}) na empresa ${empresa}.

ABORDAGEM: IT OUTSOURCING E CONSULTORIA DE DESENVOLVIMENTO
1. A Cromosit IT tem base de profissionais de TI (desenvolvedores, arquitetos, engenheiros de dados) prontos para alocação para escalar as operações do time dele.
2. Seja um parceiro na construção de arquiteturas escaláveis.
REGRAS OBRIGATORIAS: NUNCA mencione "consultoria SAP" para este lead. Fale de ALOCACAO de profissionais de TI e squads ágeis. Use exatamente as tecnologias citadas no perfil dele (se não tiver, seja genérico).`
    } else if (isRecrutador) {
      anguloEstrategico = `Este lead é RECRUTADOR/TALENT ACQUISITION (${cargo}) na empresa ${empresa}.

ABORDAGEM DE PARCERIA COMERCIAL com DUPLO VALOR:
1. ALOCACAO DE PROFISSIONAIS: A Cromosit IT tem base de profissionais (TI e SAP) certificados e disponíveis — podemos ser FONTE DE CANDIDATOS para ele.
2. CAPACITACAO CORPORATIVA: Oferecemos plataforma de treinamento para equipes.
REGRAS OBRIGATORIAS: NUNCA ofereça treinamento para ele pessoalmente. Seja um parceiro B2B.`
    } else if (isEcossistemaSAP) {
      anguloEstrategico = `IMPORTANTE: Este lead trabalha na ${empresa} (ecossistema SAP). Abordagem de PARCERIA e INDICACAO MUTUA:
- NAO ofereça servicos diretamente. Posicione-se como parceiro de treinamento para OS CLIENTES dele.`
    } else if (isDecisionMaker) {
      anguloEstrategico = `Este lead e TOMADOR DE DECISAO (${cargo}) na empresa ${empresa}. Abordagem de SOLUCAO DE NEGOCIO:
- Foque em como Cromosit IT resolve eficiencia operacional e alocação de recursos.`
    } else if (isConsultor) {
      anguloEstrategico = `Este lead e CONSULTOR. Abordagem de REDE PROFISSIONAL: network e projetos conjuntos.`
    } else {
      anguloEstrategico = `Abordagem B2B respeitando o cargo exato do lead (${cargo}).`
    }

    const prompt = `Voce e um especialista senior em prospeccao B2B da Cromosit IT (alocação de times de TI e consultoria).

${anguloEstrategico}

Gere uma mensagem de ${tipoDescricao[tipo] || tipo} ESTRATEGICA para:
- Nome: ${lead.name}
- Cargo Real: ${lead.current_role || lead.headline || 'nao informado'}
- Empresa Real: ${lead.current_company || lead.company || 'nao informada'}
- Localizacao: ${lead.location || 'nao informada'}
- Grau de conexao: ${grauLabel}
${lead.mutual_connections ? `- Conexoes em comum: ${lead.mutual_connections}` : ''}
${lead.service_interest ? `- Interesse mapeado pela IA: ${lead.service_interest}` : ''}
${lead.about ? `- Contexto extraído do lead: ${lead.headline} | ${lead.about.substring(0, 300)}` : ''}
${contexto ? `- Contexto adicional (input do usuario): ${contexto}` : ''}

Regras OBRIGATORIAS:
1. SEJA EXTREMAMENTE ESPECÍFICO ao cargo e perfil do lead. NAO inicie a mensagem falando sobre "Cromosit ser especialista em SAP" a menos que ele explicitamente trabalhe com SAP!
2. NUNCA cite siglas (MM, SD, HCM, FI) se ele não citar.
3. Termine com CTA rápido e direto (ex: "tem agenda essa semana?").
4. Evite clichês vazios ("espero que esteja bem", "notei que temos conexões").
5. Tom executivo, natural e respeite o limite de caracteres de ${tipoDescricao[tipo] || tipo}.

Retorne APENAS a mensagem.`.trim();

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
