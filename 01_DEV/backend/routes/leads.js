const express  = require('express');
const router   = express.Router();
const axios    = require('axios');
const supabase = require('../config/supabase');
const auth     = require('../middleware/auth');

router.use(auth);

// ==========================================
// CONSTANTES
// ==========================================
const CHATWA_URL   = 'https://apichatwa.cromosit.com/api/messages/send';
const CHATWA_TOKEN = process.env.CHATWA_TOKEN;

// Status e temperaturas válidos
const STATUS_VALIDOS      = ['novo', 'contatado', 'respondeu', 'em_negociacao', 'fechado', 'descartado'];
const TEMPERATURA_VALIDA  = ['quente', 'morno', 'frio'];
const GRAU_VALIDO         = ['1', '2', '3'];

// ==========================================
// HELPERS
// ==========================================
function sanitizeString(str, maxLen = 500) {
  if (!str) return str;
  return String(str).trim().substring(0, maxLen);
}

// ==========================================
// ROTA 1: Listar leads (filtrado por usuário)
// ==========================================
router.get('/', async (req, res) => {
  try {
    const {
      status,
      temperature,
      source,
      connection_degree,
      search,
      page  = 1,
      limit = 20
    } = req.query;

    const userId   = req.user.userId;
    const parsedPage  = Math.max(1, parseInt(page) || 1);
    const parsedLimit = Math.min(100, Math.max(1, parseInt(limit) || 20));

    let query = supabase
      .from('leads')
      .select('*', { count: 'exact' })
      .eq('assigned_to', userId)
      .order('created_at', { ascending: false });

    if (status && STATUS_VALIDOS.includes(status))
      query = query.eq('status', status);
    if (temperature && TEMPERATURA_VALIDA.includes(temperature))
      query = query.eq('temperature', temperature);
    if (source)
      query = query.eq('source', sanitizeString(source, 50));
    if (connection_degree && GRAU_VALIDO.includes(connection_degree))
      query = query.eq('connection_degree', connection_degree);
    if (search) {
      const s = sanitizeString(search, 100);
      query = query.or(`name.ilike.%${s}%,company.ilike.%${s}%,headline.ilike.%${s}%`);
    }

    const from = (parsedPage - 1) * parsedLimit;
    query = query.range(from, from + parsedLimit - 1);

    const { data: leads, error, count } = await query;
    if (error) throw error;

    res.json({
      leads,
      pagination: {
        total:      count,
        page:       parsedPage,
        limit:      parsedLimit,
        totalPages: Math.ceil(count / parsedLimit)
      }
    });
  } catch (err) {
    console.error('Erro ao listar leads:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// ROTA 2: Dashboard (filtrado por usuário)
// ==========================================
router.get('/stats/dashboard', async (req, res) => {
  try {
    const userId = req.user.userId;

    const [
      { data: porStatus },
      { data: porTemperatura },
      { data: porOrigem },
      { data: porGrau },
      { count: total }
    ] = await Promise.all([
      supabase.from('leads').select('status').eq('assigned_to', userId).not('status', 'is', null),
      supabase.from('leads').select('temperature').eq('assigned_to', userId).not('temperature', 'is', null),
      supabase.from('leads').select('source').eq('assigned_to', userId).not('source', 'is', null),
      supabase.from('leads').select('connection_degree').eq('assigned_to', userId).not('connection_degree', 'is', null),
      supabase.from('leads').select('*', { count: 'exact', head: true }).eq('assigned_to', userId)
    ]);

    const agrupar = (arr, campo) =>
      (arr || []).reduce((acc, item) => {
        acc[item[campo]] = (acc[item[campo]] || 0) + 1;
        return acc;
      }, {});

    res.json({
      total,
      porStatus:      agrupar(porStatus,      'status'),
      porTemperatura: agrupar(porTemperatura,  'temperature'),
      porOrigem:      agrupar(porOrigem,       'source'),
      porGrau:        agrupar(porGrau,         'connection_degree')
    });
  } catch (err) {
    console.error('Erro no dashboard:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// ROTA 3: Importar em massa
// ==========================================
router.post('/bulk', async (req, res) => {
  try {
    const { leads } = req.body;
    if (!Array.isArray(leads) || leads.length === 0)
      return res.status(400).json({ error: 'Envie um array de leads' });

    if (leads.length > 200)
      return res.status(400).json({ error: 'Máximo de 200 leads por importação' });

    const leadsComUsuario = leads.map(lead => ({
      ...lead,
      name:        sanitizeString(lead.name, 150),
      headline:    sanitizeString(lead.headline, 300),
      company:     sanitizeString(lead.company, 200),
      location:    sanitizeString(lead.location, 150),
      status:      STATUS_VALIDOS.includes(lead.status)     ? lead.status     : 'novo',
      temperature: TEMPERATURA_VALIDA.includes(lead.temperature) ? lead.temperature : 'frio',
      source:      sanitizeString(lead.source, 50) || 'importacao',
      assigned_to: req.user.userId
    }));

    const { data, error } = await supabase
      .from('leads')
      .upsert(leadsComUsuario, { onConflict: 'linkedin_id' })
      .select();
    if (error) throw error;

    // Enriquece com IA em background (não bloqueia a resposta)
    enriquecerLeadsComIA(data, req.user.userId).catch(e =>
      console.error('Erro enriquecimento IA em massa:', e.message)
    );

    res.status(201).json({
      message: `${data.length} leads importados com sucesso`,
      leads: data
    });
  } catch (err) {
    console.error('Erro ao importar leads:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// ROTA: Excluir leads em massa
// IMPORTANTE: deve ficar ANTES da rota /:id
// ==========================================
router.delete('/bulk-delete', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0)
      return res.status(400).json({ error: 'Nenhum lead selecionado para exclusão.' });

    if (ids.length > 500)
      return res.status(400).json({ error: 'Máximo de 500 leads por exclusão em massa.' });

    const userId = req.user.userId;

    // 1. Excluir atividades vinculadas a esses leads
    await supabase.from('lead_activities').delete().in('lead_id', ids);

    // 2. Excluir os leads (garantindo que pertencem ao usuário logado)
    const { error } = await supabase
      .from('leads')
      .delete()
      .in('id', ids)
      .eq('assigned_to', userId);

    if (error) throw error;

    res.json({ message: `${ids.length} leads excluídos com sucesso.` });
  } catch (err) {
    console.error('Erro ao excluir em massa:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// ROTA: Export CSV
// ==========================================
router.get('/export/csv', async (req, res) => {
  try {
    const { status, temperature, connection_degree } = req.query;
    const userId = req.user.userId;

    let query = supabase
      .from('leads')
      .select('name,headline,company,current_role,current_company,location,linkedin_url,email,phone,connection_degree,status,temperature,score,service_interest,notes,created_at')
      .eq('assigned_to', userId)
      .order('created_at', { ascending: false });

    if (status && STATUS_VALIDOS.includes(status))
      query = query.eq('status', status);
    if (temperature && TEMPERATURA_VALIDA.includes(temperature))
      query = query.eq('temperature', temperature);
    if (connection_degree && GRAU_VALIDO.includes(connection_degree))
      query = query.eq('connection_degree', connection_degree);

    const { data: leads, error } = await query;
    if (error) throw error;

    const headers = [
      'Nome', 'Headline', 'Empresa', 'Cargo Atual', 'Empresa Atual',
      'Localização', 'LinkedIn URL', 'E-mail', 'Telefone',
      'Grau de Conexão', 'Status', 'Temperatura', 'Score',
      'Interesse de Serviço', 'Notas', 'Data de Captura'
    ];

    const escapeCSV = (val) => {
      if (val == null) return '';
      const s = String(val).replace(/"/g, '""');
      return /[",\n\r]/.test(s) ? `"${s}"` : s;
    };

    const rows = leads.map(l => [
      l.name, l.headline, l.company, l.current_role, l.current_company,
      l.location, l.linkedin_url, l.email, l.phone,
      l.connection_degree, l.status, l.temperature, l.score,
      l.service_interest, l.notes,
      l.created_at ? new Date(l.created_at).toLocaleDateString('pt-BR') : ''
    ].map(escapeCSV).join(','));

    const csv = [headers.join(','), ...rows].join('\n');
    const filename = `leads_${new Date().toISOString().slice(0,10)}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('\uFEFF' + csv); // BOM para Excel reconhecer UTF-8
  } catch (err) {
    console.error('Erro ao exportar CSV:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// ROTA 4: Criar lead
// ==========================================
router.post('/', async (req, res) => {
  try {
    const {
      name, linkedin_url, linkedin_id, headline, company,
      current_role, current_company, location, profile_picture,
      email, phone, website, about, birthday, connected_since,
      followers, mutual_connections, connection_degree,
      source = 'manual', temperature = 'frio',
      notes, service_interest, score
    } = req.body;

    if (!name || !sanitizeString(name))
      return res.status(400).json({ error: 'Nome do lead é obrigatório' });

    const { data: lead, error } = await supabase
      .from('leads')
      .insert({
        name:               sanitizeString(name, 150),
        linkedin_url:       sanitizeString(linkedin_url, 300),
        linkedin_id:        sanitizeString(linkedin_id, 100),
        headline:           sanitizeString(headline, 300),
        company:            sanitizeString(company, 200),
        current_role:       sanitizeString(current_role, 200),
        current_company:    sanitizeString(current_company, 200),
        location:           sanitizeString(location, 150),
        profile_picture:    sanitizeString(profile_picture, 500),
        email:              sanitizeString(email, 200),
        phone:              sanitizeString(phone, 30),
        website:            sanitizeString(website, 300),
        about:              sanitizeString(about, 3000),
        birthday:           sanitizeString(birthday, 50),
        connected_since:    sanitizeString(connected_since, 50),
        followers:          sanitizeString(followers, 50),
        mutual_connections: sanitizeString(mutual_connections, 100),
        connection_degree:  GRAU_VALIDO.includes(connection_degree) ? connection_degree : '3',
        source:             sanitizeString(source, 50),
        temperature:        TEMPERATURA_VALIDA.includes(temperature) ? temperature : 'frio',
        notes:              sanitizeString(notes, 2000),
        service_interest:   sanitizeString(service_interest, 1000),
        score:              Math.min(100, Math.max(0, parseInt(score) || 0)),
        status:             'novo',
        assigned_to:        req.user.userId
      })
      .select()
      .single();

    if (error) throw error;

    // Sincroniza com n8n em background (se configurado)
    if (process.env.N8N_WEBHOOK_URL) {
      axios.post(process.env.N8N_WEBHOOK_URL, {
        event:   'lead_created',
        lead:    lead,
        user_id: req.user.userId
      }).catch(e => console.error('Erro n8n webhook:', e.message));
    }

    // Enriquece com IA em background
    if (lead && (headline || about)) {
      enriquecerLeadComIA(lead).catch(e => console.error('Erro IA no create:', e.message));
    }

    res.status(201).json({ message: 'Lead criado com sucesso', lead });
  } catch (err) {
    console.error('Erro ao criar lead:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// ROTA 5: Buscar lead por ID
// ==========================================
router.get('/:id', async (req, res) => {
  try {
    const { data: lead, error } = await supabase
      .from('leads')
      .select('*, lead_activities(*)')
      .eq('id', req.params.id)
      .eq('assigned_to', req.user.userId) // garante isolamento por usuário
      .single();

    if (error || !lead)
      return res.status(404).json({ error: 'Lead não encontrado' });

    res.json({ lead });
  } catch (err) {
    console.error('Erro ao buscar lead:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// ROTA 6: Atualizar lead
// ==========================================
router.put('/:id', async (req, res) => {
  try {
    // Campos permitidos para atualização (whitelist)
    const allowed = [
      'name','headline','company','current_role','current_company',
      'location','email','phone','website','about','birthday',
      'connected_since','mutual_connections','connection_degree',
      'source','temperature','notes','service_interest','score',
      'status','profile_picture','linkedin_url','instant_messaging'
    ];

    const updates = { updated_at: new Date().toISOString() };
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        if (key === 'status' && !STATUS_VALIDOS.includes(req.body[key])) continue;
        if (key === 'temperature' && !TEMPERATURA_VALIDA.includes(req.body[key])) continue;
        if (key === 'connection_degree' && !GRAU_VALIDO.includes(req.body[key])) continue;
        if (key === 'score') { updates[key] = Math.min(100, Math.max(0, parseInt(req.body[key]) || 0)); continue; }
        updates[key] = req.body[key];
      }
    }

    if (updates.status === 'contatado' && !req.body.contacted_at)
      updates.contacted_at = new Date().toISOString();

    const { data: lead, error } = await supabase
      .from('leads')
      .update(updates)
      .eq('id', req.params.id)
      .eq('assigned_to', req.user.userId) // garante isolamento por usuário
      .select()
      .single();

    if (error) throw error;

    res.json({ message: 'Lead atualizado com sucesso', lead });
  } catch (err) {
    console.error('Erro ao atualizar lead:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// ROTA 7: Excluir lead
// ==========================================
router.delete('/:id', async (req, res) => {
  try {
    // Verifica se o lead pertence ao usuário antes de excluir
    const { data: lead } = await supabase
      .from('leads')
      .select('id')
      .eq('id', req.params.id)
      .eq('assigned_to', req.user.userId)
      .single();

    if (!lead)
      return res.status(404).json({ error: 'Lead não encontrado' });

    await supabase.from('lead_activities').delete().eq('lead_id', req.params.id);
    const { error } = await supabase.from('leads').delete().eq('id', req.params.id);
    if (error) throw error;

    res.json({ message: 'Lead excluído com sucesso' });
  } catch (err) {
    console.error('Erro ao excluir lead:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// ROTA 8: Gerar mensagem com IA
// ==========================================
router.post('/:id/gerar-mensagem', async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY)
      return res.status(503).json({ error: 'OPENAI_API_KEY não configurada.' });

    const { data: lead, error } = await supabase
      .from('leads')
      .select('*')
      .eq('id', req.params.id)
      .eq('assigned_to', req.user.userId)
      .single();

    if (error || !lead)
      return res.status(404).json({ error: 'Lead não encontrado' });

    const { tipo = 'conexao', contexto = '' } = req.body;

    const tipoDescricao = {
      'conexao':             'pedido de conexão curto (máx 300 caracteres)',
      'primeiro_contato':    'primeira mensagem após conectar (máx 500 caracteres)',
      'conexao_com_comum':   'pedido de conexão mencionando conexão em comum (máx 300 caracteres)',
      'follow_up':           'follow-up para lead que não respondeu (máx 400 caracteres)',
      'whatsapp':            'mensagem de WhatsApp direta (máx 500 caracteres)'
    };

    const grauLabel = lead.connection_degree === '1'
      ? '1º grau (já conectados)'
      : lead.connection_degree === '2'
        ? '2º grau (amigos em comum)'
        : '3º grau (sem conexão ainda)';

    const cargo   = (lead.current_role || lead.headline || '').toLowerCase();
    const empresa = (lead.current_company || lead.company || '').toLowerCase();

    const hasTechOrDev    = ['software','developer','engineer','cto ','arquitet','architect','tech lead','desenvolvedor','programador'].some(t => cargo.includes(t));
    const isRecrutador    = ['talent acquisition','recrutament','recruiter','hr ','recursos humanos','talent partner','people partner','talent management','rh manager','hr manager','human resources','acquisition manager','people & culture','gestao de pessoas','gestão de pessoas','psicólog','head of people'].some(c => cargo.includes(c));
    const isEcossistemaSAP= ['sap','deloitte','accenture','ibm','capgemini','ey','kpmg','pwc','totvs','ntt','cognizant','wipro','infosys'].some(e => empresa.includes(e));
    const isDecisionMaker = ['diretor','director','gerente','manager','vp ','vice','cio','cfo','ceo','head of','head de','presidente','controller','superintendente'].some(c => cargo.includes(c));
    const isConsultor     = ['consultor','consultant','especialista','analyst','analista'].some(c => cargo.includes(c));

    let anguloEstrategico = '';
    if (hasTechOrDev) {
      anguloEstrategico = `Este lead lidera ou trabalha com ENGENHARIA DE SOFTWARE/TI (${cargo}) na empresa ${empresa}.\n\nABORDAGEM: IT OUTSOURCING E CONSULTORIA DE DESENVOLVIMENTO\n1. A Cromosit IT tem base de profissionais de TI (desenvolvedores, arquitetos, engenheiros de dados) prontos para alocação.\n2. Seja um parceiro na construção de arquiteturas escaláveis.\nREGRAS OBRIGATORIAS: NUNCA mencione "consultoria SAP" para este lead.`;
    } else if (isRecrutador) {
      anguloEstrategico = `Este lead é RECRUTADOR/TALENT ACQUISITION (${cargo}) na empresa ${empresa}.\n\nABORDAGEM DE PARCERIA COMERCIAL com DUPLO VALOR:\n1. ALOCACAO DE PROFISSIONAIS: A Cromosit IT tem base de profissionais certificados e disponíveis.\n2. CAPACITACAO CORPORATIVA: Oferecemos plataforma de treinamento.\nREGRAS OBRIGATORIAS: NUNCA ofereça treinamento para ele pessoalmente. Seja B2B.`;
    } else if (isEcossistemaSAP) {
      anguloEstrategico = `IMPORTANTE: Este lead trabalha na ${empresa} (ecossistema SAP). Abordagem de PARCERIA: posicione-se como parceiro de treinamento para OS CLIENTES dele.`;
    } else if (isDecisionMaker) {
      anguloEstrategico = `Este lead é TOMADOR DE DECISAO (${cargo}) na empresa ${empresa}. Foque em como Cromosit IT resolve eficiência operacional e alocação de recursos.`;
    } else if (isConsultor) {
      anguloEstrategico = `Este lead é CONSULTOR. Abordagem de REDE PROFISSIONAL: network e projetos conjuntos.`;
    } else {
      anguloEstrategico = `Abordagem B2B respeitando o cargo exato do lead (${cargo}).`;
    }

    const prompt = `Você é um especialista sênior em prospecção B2B da Cromosit IT (alocação de times de TI e consultoria).

${anguloEstrategico}

Gere uma mensagem de ${tipoDescricao[tipo] || tipo} ESTRATÉGICA para:
- Nome: ${lead.name}
- Cargo Real: ${lead.current_role || lead.headline || 'não informado'}
- Empresa Real: ${lead.current_company || lead.company || 'não informada'}
- Localização: ${lead.location || 'não informada'}
- Grau de conexão: ${grauLabel}
${lead.mutual_connections ? `- Conexões em comum: ${lead.mutual_connections}` : ''}
${lead.service_interest ? `- Interesse mapeado pela IA: ${lead.service_interest}` : ''}
${lead.about ? `- Bio: ${lead.about.substring(0, 300)}` : ''}
${contexto ? `- Contexto adicional: ${sanitizeString(contexto, 300)}` : ''}

Regras OBRIGATÓRIAS:
1. Seja EXTREMAMENTE ESPECÍFICO ao cargo e perfil do lead.
2. NUNCA cite siglas (MM, SD, HCM, FI) se não estiverem no perfil.
3. Termine com CTA rápido e direto.
4. Evite clichês ("espero que esteja bem").
5. Tom executivo e natural. Respeite o limite de caracteres.

Retorne APENAS a mensagem.`.trim();

    const aiRes = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model:      'gpt-4o-mini',
        max_tokens: 600,
        messages:   [{ role: 'user', content: prompt }]
      },
      { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` } }
    );

    const mensagem = aiRes.data.choices[0].message.content;

    await supabase
      .from('leads')
      .update({ ai_message: mensagem, updated_at: new Date().toISOString() })
      .eq('id', req.params.id);

    await supabase
      .from('lead_activities')
      .insert({
        lead_id:     req.params.id,
        user_id:     req.user.userId,
        type:        'mensagem_gerada',
        description: `Mensagem "${tipo}" gerada por IA`
      });

    res.json({ message: 'Mensagem gerada com sucesso', mensagem });
  } catch (err) {
    console.error('Erro ao gerar mensagem:', err.message, err.response?.data);
    res.status(500).json({ error: 'Erro ao gerar mensagem com IA' });
  }
});

// ==========================================
// ROTA 9: Enriquecer lead manualmente com IA
// ==========================================
router.post('/:id/enriquecer', async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY)
      return res.status(503).json({ error: 'OPENAI_API_KEY não configurada.' });

    const { data: lead, error } = await supabase
      .from('leads')
      .select('*')
      .eq('id', req.params.id)
      .eq('assigned_to', req.user.userId)
      .single();

    if (error || !lead)
      return res.status(404).json({ error: 'Lead não encontrado' });

    await enriquecerLeadComIA(lead);

    const { data: updated } = await supabase
      .from('leads')
      .select('*')
      .eq('id', req.params.id)
      .single();

    res.json({ message: 'Lead enriquecido com IA', lead: updated });
  } catch (err) {
    console.error('Erro ao enriquecer lead:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// ROTA 10: Enviar via WhatsApp (ChatWA)
// ==========================================
router.post('/:id/enviar-whatsapp', async (req, res) => {
  try {
    if (!CHATWA_TOKEN)
      return res.status(503).json({ error: 'CHATWA_TOKEN não configurado.' });

    const { data: lead, error } = await supabase
      .from('leads')
      .select('*')
      .eq('id', req.params.id)
      .eq('assigned_to', req.user.userId)
      .single();

    if (error || !lead)
      return res.status(404).json({ error: 'Lead não encontrado' });

    const { telefone, mensagem } = req.body;
    const fone = telefone || lead.phone;

    if (!fone)
      return res.status(400).json({ error: 'Telefone não encontrado. Edite o lead e adicione o número de WhatsApp.' });
    if (!mensagem)
      return res.status(400).json({ error: 'Mensagem não informada.' });
    if (mensagem.length > 4096)
      return res.status(400).json({ error: 'Mensagem muito longa (máx 4096 caracteres).' });

    let numero = fone.replace(/\D/g, '');
    if (!numero.startsWith('55')) numero = '55' + numero;

    const response = await axios.post(
      CHATWA_URL,
      { number: numero, body: mensagem },
      { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${CHATWA_TOKEN}` } }
    );

    await supabase.from('leads').update({
      status:       'contatado',
      contacted_at: new Date().toISOString(),
      updated_at:   new Date().toISOString()
    }).eq('id', req.params.id);

    await supabase.from('lead_activities').insert({
      lead_id:     req.params.id,
      user_id:     req.user.userId,
      type:        'whatsapp_enviado',
      description: `WhatsApp enviado para ${numero}: "${mensagem.substring(0, 80)}..."`
    });

    res.json({ message: 'Mensagem enviada via WhatsApp!', numero, messageId: response.data?.messageId });
  } catch (err) {
    console.error('Erro WhatsApp:', err.message, err.response?.data);
    res.status(500).json({ error: 'Erro ao enviar WhatsApp', detalhe: err.response?.data || err.message });
  }
});

// ==========================================
// ROTA 11: Registrar atividade
// ==========================================
router.post('/:id/atividades', async (req, res) => {
  try {
    const { type, description } = req.body;
    if (!type)
      return res.status(400).json({ error: 'Tipo de atividade obrigatório' });

    const { data, error } = await supabase
      .from('lead_activities')
      .insert({
        lead_id:     req.params.id,
        user_id:     req.user.userId,
        type:        sanitizeString(type, 50),
        description: sanitizeString(description, 500)
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ message: 'Atividade registrada', atividade: data });
  } catch (err) {
    console.error('Erro ao registrar atividade:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// FUNÇÃO: Enriquecer lead com IA
// ==========================================
async function enriquecerLeadComIA(lead) {
  if (!process.env.OPENAI_API_KEY)
    throw new Error('OPENAI_API_KEY não configurada.');
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
  "service_interest": "Em 1-2 frases: qual serviço da Cromosit IT ele precisa?",
  "notes": "Em 3-5 bullet points curtos: dicas reais de abordagem.",
  "score": número de 0 a 100 (cargo estratégico=+30, empresa potencial=+20, 1º grau=+20, setor relevante=+15, localização BR=+10, sem informação=-10)
}`.trim();

  const res = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model:       'gpt-4o-mini',
      max_tokens:  600,
      temperature: 0.3,
      messages:    [{ role: 'user', content: prompt }]
    },
    { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` } }
  );

  const content = res.data.choices[0].message.content.trim();
  const clean   = content.replace(/```json|```/g, '').trim();
  const parsed  = JSON.parse(clean);

  const updates = { updated_at: new Date().toISOString() };
  if (parsed.service_interest) updates.service_interest = sanitizeString(parsed.service_interest, 1000);
  if (parsed.notes)            updates.notes = sanitizeString(parsed.notes, 2000);
  if (parsed.score !== undefined) updates.score = Math.min(100, Math.max(0, parseInt(parsed.score) || 0));

  await supabase.from('leads').update(updates).eq('id', lead.id);
  console.log(`✅ IA enriqueceu lead: ${lead.name} (score: ${parsed.score})`);
}

// Enriquece múltiplos leads em sequência com delay
async function enriquecerLeadsComIA(leads) {
  for (const lead of leads.slice(0, 10)) {
    await enriquecerLeadComIA(lead);
    await new Promise(r => setTimeout(r, 600));
  }
}

module.exports = router;
