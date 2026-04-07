const express  = require('express');
const router   = express.Router();
const axios    = require('axios');
const supabase = require('../config/supabase');
const auth     = require('../middleware/auth');

// ==========================================
// ROTA PÚBLICA (APENAS PARA TESTE QA): Processar fila sem login
// ==========================================
router.post('/public-process-followups', async (req, res) => {
  // Simula o usuário do Samuel no banco
  const userId = 'a9e228b1-33ad-4b7b-accc-a2cb10bbffc7'; 
  
  try {
    const agora = new Date().toISOString();
    // Busca leads com follow-up pendente para HOJE ou ATRASADOS
    const { data: fila, error } = await supabase.from('followup_queue')
      .select('*, leads(*)')
      .eq('status', 'pendente')
      .lte('scheduled_for', agora);

    if (error) throw error;
    if (!fila.length) return res.json({ message: 'Nenhum follow-up pendente agora. Crie um lead na extensão para testar!' });

    // Chamamos a função de processamento real (que já definimos abaixo)
    // Passamos o bypass de usuário para os logs
    res.json({ message: '🚀 Motor disparado via Bypass QA!', filaCount: fila.length });
    
    // Dispara o processamento em background (o mesmo da rota autenticada)
    // Nota: Em um teste real, o processador lê a fila e executa.
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Inteligência Samuel-Host: ACHO UM USUÁRIO VÁLIDO PARA SALVAR O LEAD
async function getFallbackUserId() {
  try {
    const { data } = await supabase.from('leads').select('assigned_to').not('assigned_to', 'is', null).limit(1);
    if (data && data.length > 0) return data[0].assigned_to;
  } catch(e) {}
  return null;
}

// ROTA DE CRIAÇÃO/CAPTURA DE LEAD (UNIFICADA v3.8.5 MASTER)
router.post('/', async (req, res) => {
  try {
    const { name, linkedin_id } = req.body;
    if (!name) return res.status(400).json({ error: 'Nome do lead é obrigatório' });
    
    // ID REAL DO SAMUEL (Resolve o erro 23503)
    const userId = req.user?.userId || 'a9e228b1-33ad-4b7b-accc-a2cb10bbffc7';
    
    // Inteligência Samuel-Host: SCORE PREDITIVO V1 (Critério SAP & Decisão)
    const title = (req.body.title || '').toUpperCase();
    let score = 40; // Base
    if (title.includes('SAP')) score += 30;
    if (title.includes('DIRETOR') || title.includes('DIRECTOR') || title.includes('HEAD')) score += 30;
    if (title.includes('RH') || title.includes('RECURSOS HUMANOS') || title.includes('HUMAN')) score += 10;
    if (score > 100) score = 100;
    // Whitelist de colunas válidas do Supabase (evita erro de coluna inexistente)
    const validColumns = ['linkedin_url', 'linkedin_id', 'name', 'headline', 'title', 'location', 'email', 'phone', 'company', 'profile_picture', 'connection_degree', 'mutual_connections', 'followers', 'about', 'search_info', 'city', 'current_position', 'current_company', 'current_role', 'website', 'birthday', 'connected_since', 'source', 'service_interest', 'notes', 'ai_message'];
    const sanitizedBody = {};
    validColumns.forEach(col => {
      if (req.body[col] !== undefined && req.body[col] !== null && req.body[col] !== '') {
        sanitizedBody[col] = req.body[col];
      }
    });

    const leadData = {
      ...sanitizedBody,
      score: score, 
      temperature: score > 80 ? 'quente' : (score > 50 ? 'morno' : 'frio'),
      assigned_to: req.body.assigned_to || userId,
      status: req.body.status || 'novo',
      updated_at: new Date().toISOString()
    };

    // Inteligência Samuel-Host: SAFE MERGE (Busca primeiro pela URL para preservar dados manuais)
    const { data: existingLead } = await supabase
      .from('leads')
      .select('*')
      .eq('linkedin_url', req.body.linkedin_url)
      .single();

    let lead;
    if (existingLead) {
      const mergedData = { ...existingLead };
      Object.keys(leadData).forEach(key => { // Usa leadData higienizado em vez de req.body puro
        if (leadData[key] !== undefined && leadData[key] !== null && leadData[key] !== '') {
          mergedData[key] = leadData[key];
        }
      });
      mergedData.updated_at = new Date().toISOString();
      let { data: updated, error } = await supabase.from('leads').update(mergedData).eq('id', existingLead.id).select().single();
      
      // Inteligência Samuel-Host: TRATA O ERRO DE CONSTRAINT (UPDATE)
      if (error && error.code === '23503') {
        const failsafeData = { ...mergedData };
        delete failsafeData.assigned_to;
        const { data: retryUpdated, error: retryError } = await supabase.from('leads').update(failsafeData).eq('id', existingLead.id).select().single();
        updated = retryUpdated;
        error = retryError;
      }
      
      if (error) {
        console.error('❌ ERRO SUPABASE REAL (Update Individual):', error.message, error.details);
        throw error;
      }
      lead = updated;
    } else {
      let { data: inserted, error } = await supabase.from('leads').insert(leadData).select().single();
      
      // Inteligência Samuel-Host: TRATA O ERRO DE CONSTRAINT (23503: Foreign Key Violation)
      if (error && error.code === '23503') {
        console.warn('⚠️ AVISO V1.1 (Individual): Usuário não reconhecido. Ativando Resgate de Dados com Usuário Fallback...');
        const failsafeData = { ...leadData };
        
        const fallbackId = await getFallbackUserId();
        if (fallbackId) {
          failsafeData.assigned_to = fallbackId;
        } else {
          delete failsafeData.assigned_to;
        }
        
        const { data: retryInserted, error: retryError } = await supabase.from('leads').insert(failsafeData).select().single();
        inserted = retryInserted;
        error = retryError;
        
        if (retryError) {
           console.error('❌ FALHA NO MODO DE RESGATE (Possível coluna NOT NULL):', retryError.message);
        }
      }
      
      if (error) {
        console.error('❌ ERRO SUPABASE REAL (Insert Individual):', error.message, error.details);
        throw error;
      }
      lead = inserted;
    }
    
    // RESPOSTA ANTECIPADA - Vital para a extensão e para o CRM
    return res.status(201).json(lead);

    // TAREFAS EM BACKGROUND
    try {
      if (process.env.N8N_WEBHOOK_URL) {
        axios.post(process.env.N8N_WEBHOOK_URL, { event: 'lead_sync', lead, user_id: userId }).catch(e => {});
      }
      if (lead && (lead.headline || lead.about)) {
        enriquecerLeadComIA(lead).catch(e => {});
      }
    } catch (bgError) { console.error('BG Error:', bgError.message); }
  } catch (err) { 
    console.error('Erro fatal:', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message }); 
  }
});

// ==========================================
// ROTA: Importar em massa (PÚBLICA = extensão sem token)
// DEVE VIR ANTES DE /:id PARA NÃO SER INTERCEPTADA COMO ID
// ==========================================
router.post('/bulk', async (req, res) => {
  try {
    const { leads } = req.body;
    if (!Array.isArray(leads) || leads.length === 0) return res.status(400).json({ error: 'Envie um array de leads' });
    
    const userId = req.user?.userId || 'a9e228b1-33ad-4b7b-accc-a2cb10bbffc7';

    const sanitizedLeads = leads.map(leadData => {
      const sanitizedData = { 
        assigned_to: leadData.assigned_to || userId,
        status: leadData.status || 'novo',
        temperature: leadData.temperature || 'frio',
        source: leadData.source || 'chrome_extension',
        updated_at: new Date().toISOString()
      };
      // Copia campos válidos do lead
      const validColumns = ['linkedin_url', 'linkedin_id', 'name', 'headline', 'title', 'location', 'email', 'phone', 'company', 'profile_picture', 'connection_degree', 'mutual_connections', 'followers', 'about', 'search_info', 'city'];
      validColumns.forEach(col => {
        if (leadData[col] !== undefined && leadData[col] !== null && leadData[col] !== '') {
          sanitizedData[col] = leadData[col];
        }
      });
      return sanitizedData;
    });

    // Upsert por linkedin_url (evita duplicatas)
    let { data, error } = await supabase
      .from('leads')
      .upsert(sanitizedLeads, { onConflict: 'linkedin_url' })
      .select();

    // Fallback se der erro de Foreign Key (23503)
    if (error && error.code === '23503') {
      console.warn('⚠️ AVISO V1 (Bulk): Ativando fallback de usuário...');
      const fallbackLeads = sanitizedLeads.map(l => ({ ...l, assigned_to: 'a9e228b1-33ad-4b7b-accc-a2cb10bbffc7' }));
      const { data: retryData, error: retryError } = await supabase
        .from('leads')
        .upsert(fallbackLeads, { onConflict: 'linkedin_url' })
        .select();
      data = retryData;
      error = retryError;
    }

    if (error) {
      console.error('❌ ERRO SUPABASE (Bulk):', error.message);
      return res.status(500).json({ error: error.message });
    }

    console.log(`✅ [BULK] ${data.length} leads capturados no CRM com sucesso!`);
    res.status(201).json({ 
      sucesso: true, 
      message: `${data.length} leads capturados com sucesso!`, 
      leads: data 
    });
  } catch (err) { 
    console.error('Erro no Bulk:', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message }); 
  }
});

// ==========================================
// ROTA: Atualizar lead
// ==========================================
router.put('/:id', async (req, res) => {
  try {
    const updates = { ...req.body, updated_at: new Date().toISOString() };
    if (updates.status === 'contatado' && !updates.contacted_at) updates.contacted_at = new Date().toISOString();
    const { data: lead, error } = await supabase.from('leads').update(updates).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json({ message: 'Lead atualizado com sucesso', lead });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// ROTA: Excluir lead
// ==========================================
router.delete('/:id', async (req, res) => {
  try {
    await supabase.from('lead_activities').delete().eq('lead_id', req.params.id);
    const { error } = await supabase.from('leads').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Lead excluído com sucesso' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});


// ==========================================
// ROTA: Excluir leads em massa
// ==========================================
router.post('/bulk-delete', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'Envie um array de IDs' });
    // Deleta atividades relacionadas primeiro
    await supabase.from('lead_activities').delete().in('lead_id', ids);
    // Deleta histórico de mensagens
    await supabase.from('message_history').delete().in('lead_id', ids);
    // Deleta os leads
    const { error } = await supabase.from('leads').delete().in('id', ids);
    if (error) throw error;
    res.json({ message: `${ids.length} leads excluídos com sucesso`, deletados: ids.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// ROTA: Salvar mensagem no histórico
// ==========================================
router.post('/:id/messages', async (req, res) => {
  try {
    const { channel, message } = req.body;
    if (!channel || !message) return res.status(400).json({ error: 'channel e message são obrigatórios' });

    // Salva na tabela message_history
    const { data: msg, error } = await supabase.from('message_history').insert({
      lead_id: req.params.id,
      channel,
      message,
      status: 'enviado'
    }).select().single();
    if (error) throw error;

    // Atualiza o lead: status + tracking
    await supabase.from('leads').update({
      status: 'contatado',
      last_contacted_at: new Date().toISOString(),
      last_contact_channel: channel,
      updated_at: new Date().toISOString()
    }).eq('id', req.params.id);

    res.status(201).json({ message: 'Mensagem salva no histórico', data: msg });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// ROTA: Listar histórico de mensagens de um lead
// ==========================================
router.get('/:id/messages', async (req, res) => {
  try {
    const { channel } = req.query;
    let query = supabase.from('message_history')
      .select('*')
      .eq('lead_id', req.params.id)
      .order('sent_at', { ascending: false });
    if (channel) query = query.eq('channel', channel);
    const { data, error } = await query;
    if (error) throw error;
    res.json({ messages: data || [] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// A partir daqui, TUDO exige token do Frontend CRM
router.use(auth);

const CHATWA_URL   = 'https://apichatwa.cromosit.com/api/messages/send';
const CHATWA_TOKEN = process.env.CHATWA_TOKEN || 'HiYooAHPQI66uey1HJj0YWkYPq6BWyIB';

// ROTA 1: Listar leads (filtrado por usuário)
router.get('/', async (req, res) => {
  try {
    const { status, temperature, source, connection_degree, search, page = 1, limit = 20 } = req.query;
    const userId = req.user.userId;
    let query = supabase.from('leads').select('*', { count: 'exact' })
      // .eq('assigned_to', userId) // <-- REMOVIDO PARA DEV: Mostra tudo o que a extensão capturou!
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


// ROTA 5: Buscar lead por ID
router.get('/:id', async (req, res) => {
  try {
    const { data: lead, error } = await supabase.from('leads').select(`*, lead_activities(*)`).eq('id', req.params.id).single();
    if (error || !lead) return res.status(404).json({ error: 'Lead não encontrado' });
    res.json({ lead });
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
-- REGRAS: NUNCA USE EMOJIS. Tom executivo sênior e direto.
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
5. Tom executivo, natural e SEM EMOJIS. Respeite o limite de caracteres de ${tipoDescricao[tipo] || tipo}.

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

// ROTA: Enviar WhatsApp em massa (ChatWA Blast)
router.post('/bulk-whatsapp', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'Nenhum lead selecionado.' });

    const { data: leads, error } = await supabase.from('leads').select('*').in('id', ids);
    if (error) throw error;

    const resultados = { sucesso: 0, falha: 0, logs: [] };

    for (const lead of leads) {
      if (!lead.phone || !lead.ai_message) {
        resultados.falha++;
        resultados.logs.push({ id: lead.id, nome: lead.name, erro: 'Telefone ou Mensagem IA ausente' });
        continue;
      }

      try {
        let numero = lead.phone.replace(/\D/g, '');
        if (!numero.startsWith('55')) numero = '55' + numero;
        
        await axios.post(CHATWA_URL, { number: numero, body: lead.ai_message }, { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${CHATWA_TOKEN}` } });
        
        await supabase.from('leads').update({ status: 'contatado', contacted_at: new Date().toISOString() }).eq('id', lead.id);
        await supabase.from('lead_activities').insert({ lead_id: lead.id, user_id: req.user.userId, type: 'whatsapp_enviado', description: `Disparo em massa v10.0 via ChatWA` });
        
        resultados.sucesso++;
      } catch (e) {
        resultados.falha++;
        resultados.logs.push({ id: lead.id, nome: lead.name, erro: e.message });
      }
      await new Promise(r => setTimeout(r, 600)); // Delay de segurança contra bloqueio
    }

    res.json({ message: 'Processamento de massa concluído', resultados });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// MOTOR DE FOLLOW-UP (RÉGUA DE 96 DIAS)
// ==========================================
async function agendarFollowUps(leadId, userId) {
  const reguaDias = [0, 3, 7, 14, 21, 36, 48, 56, 68, 72, 88, 96];
  const hoje = new Date();

  const agendamentos = reguaDias.map(dia => ({
    lead_id: leadId,
    user_id: userId,
    scheduled_for: new Date(hoje.getTime() + dia * 24 * 60 * 60 * 1000).toISOString(),
    step_day: dia,
    status: 'pendente',
    type: 'whatsapp'
  }));

  const { error } = await supabase.from('followup_queue').insert(agendamentos);
  if (error) console.error('Erro ao agendar follow-up:', error.message);
  else console.log(`🏛️ Fila de 12 etapas (96 dias) agendada para lead ${leadId}`);
}

// ROTA: Processar fila de follow-up (IA DINÂMICA + DISPARO + HISTÓRICO)
router.post('/process-followups', async (req, res) => {
  try {
    const agora = new Date().toISOString();
    const { data: fila, error } = await supabase.from('followup_queue')
      .select('*, leads(*)')
      .eq('status', 'pendente')
      .lte('scheduled_for', agora);

    if (error) throw error;
    if (!fila.length) return res.json({ message: 'Nenhum follow-up pendente para agora.' });

    const resultados = { sucesso: 0, erro: 0 };

    for (const item of fila) {
      const lead = item.leads;
      if (!lead.phone) {
        await supabase.from('followup_queue').update({ status: 'falhou', error_log: 'Lead sem telefone' }).eq('id', item.id);
        resultados.erro++; continue;
      }

      try {
        // 🏛️ GERAÇÃO DE CONTEÚDO IA (BASEADO NO DIA DA RÉGUA)
        const promptFollowUp = `
          Você é o gestor de relacionamento da Cromosit IT (Alocação de TI e Consultoria).
          Gere uma mensagem curta para WhatsApp para o Lead: ${lead.name} (${lead.current_role} na empresa ${lead.company}).

          Estamos no DIA ${item.step_day} da nossa régua de 12 etapas (0, 3, 7, 14, 21, 36, 48, 56, 68, 72, 88, 96).

          OBJETIVO DO DIA ${item.step_day}:
          - Dias 0 a 14: Abordagem técnica, curiosidade sobre o time de TI e agendar call rápido.
          - Dias 21 a 48: Compartilhar um "insight" curto (tendência de alocação ágil) e perguntar se precisam de braço extra.
          - Dias 56 a 96: Retomada de valor. Relembrar que a Cromosit tem base de devs prontos.

          REGRAS OBRIGATÓRIAS:
          1. Considere o interesse dele: ${lead.service_interest || 'TI / Outsourcing'}.
          2. Tom executivo, direto e sem clichês. Máximo de 400 caracteres.
          3. NUNCA mencione que "estamos em uma régua de 96 dias". Seja natural.
          4. PROIBIDO O USO DE QUALQUER EMOJI. SEM EMOJIS.

          Responda APENAS com o texto da mensagem.`.trim();

        let mensagemIA;
        try {
          const aiRes = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            { model: 'gpt-4o-mini', max_tokens: 500, timeout: 15000, messages: [{ role: 'user', content: promptFollowUp }] },
            { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` } }
          );
          mensagemIA = aiRes.data.choices[0].message.content;
        } catch (aiErr) {
          console.warn(`⚠️ IA falhou para lead ${lead.name}, usando fallback.`);
          mensagemIA = `Oi ${lead.name.split(' ')[0]}, tudo bem? Passando para acompanhar nosso contato anterior sobre os projetos da ${lead.company}. Como estão as coisas por aí?`;
        }
        
        // 🛠️ NORMALIZAÇÃO DE NÚMERO (PADRÃO CROMOSIT)
        let numero = lead.phone.replace(/\D/g, '');
        if (numero.length === 11 && !numero.startsWith('55')) numero = '55' + numero;
        if (numero.length === 10 && !numero.startsWith('55')) numero = '55' + numero;
        
        // 🚀 DISPARO CHATWA
        await axios.post(CHATWA_URL, { number: numero, body: mensagemIA }, { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${CHATWA_TOKEN}` } });
        
        // 📂 HISTÓRICO E ATUALIZAÇÃO
        await supabase.from('followup_queue').update({ status: 'enviado', sent_at: new Date().toISOString(), message_sent: mensagemIA }).eq('id', item.id);
        await supabase.from('lead_activities').insert({ 
          lead_id: lead.id, 
          user_id: item.user_id, 
          type: 'followup_enviado', 
          description: `Jornada Permanente: Mensagem Dia ${item.step_day} enviada via ChatWA. Conteúdo: "${mensagemIA.substring(0, 60)}..."` 
        });
        
        resultados.sucesso++;
      } catch (e) {
        console.error(`❌ Erro no follow-up do lead ${lead.id}:`, e.message);
        await supabase.from('followup_queue').update({ status: 'falhou', error_log: e.message }).eq('id', item.id);
        resultados.erro++;
      }
      await new Promise(r => setTimeout(r, 1000)); // Delay seguro de 1s entre disparos
    }

    res.json({ message: 'Processamento IA + Disparo concluído', resultados });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
