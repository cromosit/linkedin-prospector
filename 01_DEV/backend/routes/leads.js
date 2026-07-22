const express   = require('express');
const router    = express.Router();
const axios     = require('axios');
const supabase  = require('../config/supabase');
const auth      = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições de IA. Aguarde um momento.' }
});
const chatwaCrmService = require('../services/chatwaCrmService');

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
      .select('*', { count: 'exact' });

    if (userId !== '550e8400-e29b-41d4-a716-446655440000') {
      query = query.eq('assigned_to', userId);
    }

    query = query.order('created_at', { ascending: false });

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
      query = query.or(`name.ilike.%${s}%,company.ilike.%${s}%,headline.ilike.%${s}%,current_role.ilike.%${s}%,group_name.ilike.%${s}%`);
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
    const { startDate, endDate } = req.query;

    let statusQuery = supabase.from('leads').select('status').eq('assigned_to', userId).not('status', 'is', null);
    let tempQuery = supabase.from('leads').select('temperature').eq('assigned_to', userId).not('temperature', 'is', null);
    let sourceQuery = supabase.from('leads').select('source').eq('assigned_to', userId).not('source', 'is', null);
    let degreeQuery = supabase.from('leads').select('connection_degree').eq('assigned_to', userId).not('connection_degree', 'is', null);
    let totalQuery = supabase.from('leads').select('*', { count: 'exact', head: true }).eq('assigned_to', userId);

    if (startDate) {
      statusQuery = statusQuery.gte('created_at', startDate);
      tempQuery = tempQuery.gte('created_at', startDate);
      sourceQuery = sourceQuery.gte('created_at', startDate);
      degreeQuery = degreeQuery.gte('created_at', startDate);
      totalQuery = totalQuery.gte('created_at', startDate);
    }
    if (endDate) {
      statusQuery = statusQuery.lte('created_at', endDate);
      tempQuery = tempQuery.lte('created_at', endDate);
      sourceQuery = sourceQuery.lte('created_at', endDate);
      degreeQuery = degreeQuery.lte('created_at', endDate);
      totalQuery = totalQuery.lte('created_at', endDate);
    }

    const [
      { data: porStatus },
      { data: porTemperatura },
      { data: porOrigem },
      { data: porGrau },
      { count: total }
    ] = await Promise.all([
      statusQuery,
      tempQuery,
      sourceQuery,
      degreeQuery,
      totalQuery
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
// ROTA: Relatório de Performance (Sprint 2)
// Retorna KPIs de funil e captura por data
// ==========================================
router.get('/stats/performance', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { days = 30 } = req.query;
    
    // Calcula a data de início (ex: 30 dias atrás)
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // 1. Busca todos os leads do período
    const { data: leads, error } = await supabase
      .from('leads')
      .select('status, temperature, created_at, source')
      .eq('assigned_to', userId)
      .gte('created_at', startDate.toISOString());

    if (error) throw error;

    // 2. Processa métricas temporais (captura diária)
    const porDia = leads.reduce((acc, lead) => {
      const dia = new Date(lead.created_at).toISOString().split('T')[0];
      acc[dia] = (acc[dia] || 0) + 1;
      return acc;
    }, {});

    // 3. Processa funil de conversão
    const total = leads.length;
    const ganhos = leads.filter(l => l.status === 'fechado').length;
    const perdidos = leads.filter(l => l.status === 'descartado').length;
    const ativos = total - ganhos - perdidos;

    res.json({
      periodo: { dias: days, inicio: startDate },
      metricas: {
        total_capturado: total,
        total_fechado:   ganhos,
        total_descartado: perdidos,
        taxa_conversao: total > 0 ? ((ganhos / total) * 100).toFixed(1) + '%' : '0%',
        taxa_perda:     total > 0 ? ((perdidos / total) * 100).toFixed(1) + '%' : '0%'
      },
      grafico_captura: porDia
    });
  } catch (err) {
    console.error('Erro no relatório de performance:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// ROTA: Sincronização Inteligente do Inbox (LinkedIn)
// ==========================================
router.post('/sync-inbox', async (req, res) => {
  try {
    const { contacts } = req.body; // array de contatos ex: [{ name: 'Vitor Granza', url: '...' }]
    const userId = req.user.userId;

    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
      return res.status(400).json({ error: 'Nenhum contato enviado para sincronização.' });
    }

    console.log(`📥 [INBOX SYNC] Analisando ${contacts.length} contatos da caixa de mensagens...`);

    let updatedCount = 0;

    for (const contact of contacts) {
      if (!contact.name) continue;

      // Busca o lead no banco pelo nome (ou ID se tivermos)
      // Como o LinkedIn Inbox às vezes só dá o nome limpo, vamos buscar pelo nome
      const { data: leadsEncontrados } = await supabase
        .from('leads')
        .select('id, status, name')
        .eq('assigned_to', userId)
        .ilike('name', `%${contact.name}%`);

      if (leadsEncontrados && leadsEncontrados.length > 0) {
        const lead = leadsEncontrados[0];

        // Se ele não estiver em um status terminal e não for "respondeu"
        if (!['respondeu', 'fechado', 'descartado'].includes(lead.status)) {
          // Atualiza para respondeu
          const { error: updateError } = await supabase
            .from('leads')
            .update({ status: 'respondeu', updated_at: new Date().toISOString() })
            .eq('id', lead.id);

          if (!updateError) {
            updatedCount++;
            console.log(`✅ [INBOX SYNC] Lead atualizado para 'respondeu': ${lead.name}`);

            // Adiciona na timeline
            await supabase.from('lead_activities').insert([{
              lead_id: lead.id,
              user_id: userId,
              type: 'status_changed',
              description: `O status mudou para 'respondeu' automaticamente (Sincronização de Caixa de Entrada do LinkedIn).`
            }]);
          }
        }
      }
    }

    res.json({ message: 'Sincronização concluída', updated: updatedCount });
  } catch (err) {
    console.error('❌ Erro no sync do inbox:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// ROTA 3: Importar em massa
// ==========================================
router.post('/bulk', async (req, res) => {
  try {
    const { leads } = req.body;
    console.log('📦 [BULK] Tentando importar', leads?.length, 'leads para o usuário:', req.user.userId);
    
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
      group_name:  sanitizeString(lead.group_name || req.body.group_name, 100),
      campaign_id: lead.campaign_id || req.body.campaign_id || null, // Novo campo!
      assigned_to: req.user.userId
    }));

    const { data, error } = await supabase
      .from('leads')
      .upsert(leadsComUsuario, { onConflict: 'linkedin_id' })
      .select();
    if (error) throw error;

    // Registra atividade para cada lead novo/atualizado (com proteção contra erros)
    try {
      const atividadesBulk = data.map(l => ({
        lead_id:     l.id,
        user_id:     req.user.userId,
        type:        'lead_capturado',
        description: `Lead capturado/sincronizado via extensão ou importação`
      }));
      await supabase.from('lead_activities').insert(atividadesBulk);
    } catch (e) {
      console.warn('⚠️ [BULK] Falha ao registrar atividades, mas leads foram salvos.');
    }

    // Enriquece com IA em background (não bloqueia a resposta)
    enriquecerLeadsComIA(data, req.user.userId).catch(e =>
      console.error('Erro enriquecimento IA em massa:', e.message)
    );

    // [AUTOMAÇÃO CHATWA] Sincroniza leads em massa com o ChatWA
    data.forEach(lead => {
      chatwaCrmService.syncLeadToFunnel(lead).catch(e => 
        console.error(`⚠️ [ChatWA CRM Bulk] Falha no lead ${lead.name}:`, e.message)
      );
    });

    res.status(201).json({
      message: `${data.length} leads importados e sincronizados com o CRM`,
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

    // Busca o primeiro funil do banco para associar o lead ao ser criado/capturado
    let pId = req.body.pipeline_id || null;
    let sId = req.body.pipeline_stage_id || null;
    
    if (!pId || !sId) {
      try {
        const { data: firstPip, error: errPip } = await supabase.from('pipelines').select('id').eq('user_id', req.user.userId).limit(1).maybeSingle();
        console.log('[Automação Pipeline] firstPip consultado:', firstPip, 'Erro se houver:', errPip);
        
        if (firstPip) {
          pId = firstPip.id;
          const { data: stages, error: errStages } = await supabase
            .from('pipeline_stages')
            .select('id, position')
            .eq('pipeline_id', pId)
            .order('position', { ascending: true });
            
          console.log('[Automação Pipeline] stages consultados:', stages, 'Erro se houver:', errStages);
            
          if (stages && stages.length > 0) {
            sId = stages[0].id;
          }
        }
      } catch (e) {
        console.warn('⚠️ Falha ao buscar pipeline padrão para o novo lead:', e.message);
      }
    }

    const { data: lead, error } = await supabase
      .from('leads')
      .upsert({
        pipeline_id:        pId,
        pipeline_stage_id:  sId,
        stage_entered_at:   new Date().toISOString(),
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
        group_name:         sanitizeString(req.body.group_name, 100),
        campaign_id:        req.body.campaign_id || null,
        temperature:        TEMPERATURA_VALIDA.includes(temperature) ? temperature : 'frio',
        notes:              sanitizeString(notes, 2000),
        service_interest:   sanitizeString(service_interest, 1000),
        score:              Math.min(100, Math.max(0, parseInt(score) || 0)),
        status:             'novo',
        assigned_to:        req.user.userId,
        updated_at:         new Date().toISOString()
      }, { onConflict: 'linkedin_id' })
      .select()
      .single();

    if (error) throw error;

    try {
      await supabase.from('lead_activities').insert({
        lead_id:     lead.id,
        user_id:     req.user.userId,
        type:        'lead_capturado',
        description: `Lead capturado via ${source || 'manual'}`
      });
    } catch (e) {
      console.warn('⚠️ Falha ao registrar atividade de captura, mas lead foi salvo.');
    }

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

    // [AUTOMAÇÃO CHATWA] Sincroniza lead com o Funil de Vendas do ChatWA
    chatwaCrmService.syncLeadToFunnel(lead).catch(e => 
      console.error('⚠️ [ChatWA CRM] Falha na sincronização automática:', e.message)
    );

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
// ROTA: Verificar se lead existe (pelo linkedin_id)
// ==========================================
router.get('/check/:linkedin_id', async (req, res) => {
  try {
    const { data: lead, error } = await supabase
      .from('leads')
      .select('id')
      .eq('linkedin_id', req.params.linkedin_id)
      .eq('assigned_to', req.user.userId)
      .maybeSingle();

    if (error) throw error;
    res.json({ exists: !!lead, lead: lead || null });
  } catch (err) {
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
      'status','profile_picture','linkedin_url','group_name','campaign_id',
      'contacted_at', 'next_followup_at', 'pipeline_id', 'pipeline_stage_id',
      'stage_entered_at'
    ];

    const updates = { updated_at: new Date().toISOString() };
    
    // Se mudar o status ou a etapa, reinicia o cronômetro de tempo na fase
    if (req.body.status || req.body.pipeline_stage_id) {
      updates.stage_entered_at = new Date().toISOString();
    }
    
    // Automação inteligente do Funil e Score baseado no Status do Lead
    let leadAtual = null;
    try {
      const { data: fetchLead } = await supabase.from('leads').select('pipeline_id, score, status, temperature').eq('id', req.params.id).maybeSingle();
      leadAtual = fetchLead;
      let pipelineId = leadAtual?.pipeline_id;
      
      if (!pipelineId && req.body.status && !req.body.pipeline_stage_id) {
        const { data: firstPip } = await supabase.from('pipelines').select('id').eq('user_id', req.user.userId).limit(1).maybeSingle();
        if (firstPip) pipelineId = firstPip.id;
      }
      
      if (pipelineId && req.body.status && !req.body.pipeline_stage_id) {
        updates.pipeline_id = pipelineId;
        const { data: stages } = await supabase.from('pipeline_stages').select('id, name, position').eq('pipeline_id', pipelineId).order('position', { ascending: true });
        
        if (stages && stages.length > 0) {
          const status = req.body.status;
          let stageDestino = null;
          
          if (status === 'novo') {
            stageDestino = stages[0]; 
          } else if (status === 'contatado') {
            stageDestino = stages.find(s => s.name.toLowerCase().includes('contat') || s.position === 2) || stages[1] || stages[0];
          } else if (status === 'respondeu' || status === 'em_negociacao') {
            stageDestino = stages.find(s => s.name.toLowerCase().includes('negoc') || s.name.toLowerCase().includes('apresent') || s.position === 3) || stages[2] || stages[1] || stages[0];
          }
          
          if (stageDestino) {
            updates.pipeline_stage_id = stageDestino.id;
            updates.stage_entered_at = new Date().toISOString();
          }
        }
      }
      
      // BUMP DE SCORE AUTOMÁTICO (Interesse / Resposta)
      if (leadAtual) {
         let currentScore = leadAtual.score || 0;
         let newScore = currentScore;
         
         if (req.body.status === 'respondeu' && currentScore < 60) newScore += 30;
         else if (req.body.status === 'em_negociacao' && currentScore < 80) newScore += 40;
         
         if (req.body.temperature === 'quente' && currentScore < 60) newScore += 30;
         else if (req.body.temperature === 'morno' && currentScore < 40) newScore += 15;
         
         if (newScore > currentScore) {
             updates.score = Math.min(100, newScore);
         }
      }
    } catch (errAuto) {
      console.error('⚠️ Falha na automação de transição/score:', errAuto.message);
    }

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        if (key === 'status' && !STATUS_VALIDOS.includes(req.body[key])) continue;
        if (key === 'temperature' && !TEMPERATURA_VALIDA.includes(req.body[key])) continue;
        if (key === 'connection_degree' && !GRAU_VALIDO.includes(req.body[key])) continue;
        if (key === 'score') { 
          const manualScore = Math.min(100, Math.max(0, parseInt(req.body[key]) || 0));
          // Só sobrescreve se o bump não calculou um score maior automaticamente
          if (!updates.score || manualScore > updates.score) {
            updates.score = manualScore;
          }
          continue; 
        }
        updates[key] = req.body[key];
      }
    }

    if (updates.status === 'contatado' && !req.body.contacted_at)
      updates.contacted_at = new Date().toISOString();

    let updateQuery = supabase
      .from('leads')
      .update(updates)
      .eq('id', req.params.id);

    if (req.user.userId !== '550e8400-e29b-41d4-a716-446655440000') {
      updateQuery = updateQuery.eq('assigned_to', req.user.userId);
    }

    const { data: lead, error } = await updateQuery.select().maybeSingle();

    if (error) {
      console.error('❌ Supabase update error:', error);
      throw error;
    }
    
    if (!lead) {
      console.warn('⚠️ Supabase update retornou 0 rows para ID:', req.params.id);
      return res.status(404).json({ error: 'Lead não encontrado ou acesso negado' });
    }

    const statusDeParada = ['respondeu', 'em_negociacao', 'fechado', 'descartado'];
    if (updates.status && statusDeParada.includes(updates.status)) {
      const CadenceService = require('../services/cadenceService');
      await CadenceService.pausarCadencia(req.params.id);
    }

    // [AUTOMAÇÃO] Cria tarefa de follow-up se houver agendamento
    if (req.body.next_followup_at && !statusDeParada.includes(updates.status)) {
      try {
        await supabase.from('tasks').insert({
          user_id: req.user.userId,
          lead_id: req.params.id,
          title: `📞 Follow-up: ${lead.name}`,
          due_date: req.body.next_followup_at,
          status: 'pendente',
          priority: 'alta'
        });
      } catch (e) { console.error('Erro ao criar tarefa auto:', e.message); }
    }

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
// ROTA: Expurgar Lead (Ação LGPD Art. 18)
// ==========================================
router.post('/:id/lgpd-purge', async (req, res) => {
  try {
    // 1. Limpa dados sensíveis (Anonimização)
    const { error: updateError } = await supabase
      .from('leads')
      .update({
        name: 'USUÁRIO ANONIMIZADO (LGPD)',
        email: null,
        phone: null,
        linkedin_url: null,
        profile_picture: null,
        notes: 'DADOS EXPURGADOS CONFORME ART. 18 DA LGPD.',
        status: 'descartado',
        updated_at: new Date().toISOString()
      })
      .eq('id', req.params.id);

    if (updateError) throw updateError;

    // 2. Registra o Log de Auditoria
    await supabase
      .from('lgpd_logs')
      .insert({
        user_id: req.user.userId,
        lead_id: req.params.id,
        action: 'exclusao_lgpd',
        description: `Executada exclusão permanente de dados sensíveis conforme Art. 18 da LGPD pelo usuário ${req.user.userId}.`
      });

    res.json({ message: 'Dados expurgados com sucesso em conformidade com a LGPD.' });
  } catch (err) {
    res.status(500).json({ error: 'Falha na ação LGPD: ' + err.message });
  }
});

// ==========================================
// ROTA 8: Gerar mensagem com IA
// ==========================================
router.post('/:id/gerar-mensagem', aiLimiter, async (req, res) => {
  try {
    const { data: lead, error } = await supabase
      .from('leads')
      .select('*')
      .eq('id', req.params.id)
      .eq('assigned_to', req.user.userId)
      .single();

    if (error || !lead)
      return res.status(404).json({ error: 'Lead não encontrado' });

    // 1. Chaves de IA e provedor padrão (fallback do .env)
    let openaiKey = process.env.OPENAI_API_KEY;
    let geminiKey = process.env.GEMINI_API_KEY;
    let claudeKey = process.env.CLAUDE_API_KEY;
    let provider = 'openai';

    // 2. Buscar chaves específicas do usuário logado
    try {
      const { data: aiSettings } = await supabase
        .from('user_ai_settings')
        .select('*')
        .eq('user_id', req.user.userId)
        .maybeSingle();

      if (aiSettings) {
        if (aiSettings.openai_key) openaiKey = aiSettings.openai_key;
        if (aiSettings.gemini_key) geminiKey = aiSettings.gemini_key;
        if (aiSettings.claude_key) claudeKey = aiSettings.claude_key;
        if (aiSettings.preferred_provider) provider = aiSettings.preferred_provider;
      }
    } catch (dbErr) {
      console.error('Erro ao ler chaves de IA para gerar mensagem:', dbErr.message);
    }

    const { tipo = 'conexao', contexto = '' } = req.body;

    const tipoDescricao = {
      'conexao':             'pedido de conexão CIRÚRGICO (máx 140 caracteres)',
      'primeiro_contato':    'primeira mensagem DIRETA (máx 250 caracteres)',
      'conexao_com_comum':   'pedido de conexão menc. comum CURTO (máx 160 caracteres)',
      'follow_up':           'follow-up RÁPIDO (máx 200 caracteres)',
      'whatsapp':            'mensagem de WhatsApp EXTREMAMENTE CURTA (máx 150 caracteres, foco em 2 frases)'
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
    const servicosCromosit = `
    - SERVIÇO 1: Plataforma Corporativa de Treinamento (LMS/Capacitação).
    - SERVIÇO 2: Alocação de Profissionais SAP e TI (Body Shop / Hunting).
    - SERVIÇO 3: Treinamento Especializado SAP e Soft Skills.
    - SERVIÇO 4: Consultoria SAP (Implementação/Suporte).
    - SERVIÇO 5: Automação RPA e Inteligência Artificial (Eficiência).`;

    const primeiroNome = lead.name ? lead.name.split(' ')[0].trim() : 'Prezado(a)';

    // Calcula a saudação com base no horário atual do servidor
    const hora = new Date().getHours();
    let saudacaoTempo = 'Bom dia';
    if (hora >= 12 && hora < 18) {
      saudacaoTempo = 'Boa tarde';
    } else if (hora >= 18 || hora < 5) {
      saudacaoTempo = 'Boa noite';
    }

    // Detecta o módulo SAP do profissional (MM, SD, FI, CO, EWM, TM, HCM, PP, QM, PM, WM etc.)
    let moduloSAP = '';
    const textoDetectar = ` ${lead.group_name || ''} ${lead.current_role || ''} ${lead.headline || ''} `.toUpperCase();
    
    if (/\bMM\b/.test(textoDetectar)) moduloSAP = 'MM';
    else if (/\bSD\b/.test(textoDetectar)) moduloSAP = 'SD';
    else if (/\bFI\b/.test(textoDetectar) || textoDetectar.includes('FINAN')) moduloSAP = 'FI';
    else if (/\bCO\b/.test(textoDetectar) || textoDetectar.includes('CONTROLLING')) moduloSAP = 'CO';
    else if (/\bEWM\b/.test(textoDetectar)) moduloSAP = 'EWM';
    else if (/\bTM\b/.test(textoDetectar) || textoDetectar.includes('TRANSPORTATION')) moduloSAP = 'TM';
    else if (/\bHCM\b|\bHR\b|RECURSOS HUMANOS/.test(textoDetectar)) moduloSAP = 'HCM';
    else if (/\bPP\b/.test(textoDetectar)) moduloSAP = 'PP';
    else if (/\bQM\b/.test(textoDetectar)) moduloSAP = 'QM';
    else if (/\bPM\b/.test(textoDetectar) || textoDetectar.includes('MANUTEN')) moduloSAP = 'PM';
    else if (/\bWM\b/.test(textoDetectar)) moduloSAP = 'WM';
    else {
      // Tenta extrair a partir do grupo
      const grupoUpper = (lead.group_name || '').toUpperCase();
      const modulos = ['MM','SD','FI','CO','EWM','TM','HCM','PP','QM','PM','WM'];
      const encontrado = modulos.find(m => grupoUpper.includes(m));
      moduloSAP = encontrado || 'funcional SAP';
    }

    if (isRecrutador) {
      anguloEstrategico = `O lead é da área de Recrutamento e Seleção / Talent Acquisition / RH. O foco comercial OBRIGATÓRIO é oferecer o serviço de Hunting e Alocação de Profissionais SAP e TI da Cromosit IT (SERVIÇO 2). A mensagem deve:
1. Mencionar diretamente que a empresa provavelmente tem vagas abertas de SAP/TI difíceis de fechar.
2. Apresentar brevemente o serviço de hunting como solução para acelerar o fechamento de posições técnicas.
3. Fazer uma pergunta direta de qualificação: se faz sentido e se há vagas abertas de SAP/TI no momento.
Tom: direto, consultivo, curto. Exemplo de estrutura ideal: saudação + problema (dificuldade de encontrar profissionais SAP) + proposta (hunting especializado) + pergunta de qualificação.
NUNCA mencione debug, ABAP, autonomia funcional, treinamento individual ou módulos SAP técnicos. Esse lead não é consultor SAP.`;
    } else if (isDecisionMaker) {
      if (moduloSAP !== 'funcional SAP' || isEcossistemaSAP) {
        anguloEstrategico = `O lead é um tomador de decisão (CEO, Diretor, Gerente, Sócio) na área de SAP/TI. O foco comercial OBRIGATÓRIO deve ser corporativo B2B: oferecer a contratação de profissionais/alocação de consultores SAP (SERVIÇO 2) ou treinamento corporativo para a equipe de consultores dele (SERVIÇO 1 ou 3), para reduzir gargalos e a dependência técnica de ABAP externo. NUNCA venda treinamento individual de debug para a carreira dele mesmo, foque no ganho da equipe/empresa dele.`;
      } else {
        anguloEstrategico = `O lead é um tomador de decisão corporativo (CEO, Diretor, Gerente). O foco comercial OBRIGATÓRIO deve ser corporativo B2B: oferecer alocação/hunting de profissionais de TI (SERVIÇO 2) ou automação RPA/IA (SERVIÇO 5) para otimizar os processos da empresa ${empresa}.`;
      }
    } else if (moduloSAP !== 'funcional SAP') {
      anguloEstrategico = `O lead é um consultor funcional SAP do módulo ${moduloSAP}. O foco comercial OBRIGATÓRIO deve ser a venda do treinamento individual de ABAP para Funcionais / Debug SAP para dar autonomia para ele mesmo depurar transações e programas standard e customizados Z no dia a dia. Ele quer autonomia em depuração de códigos e transações Z em chamados e projetos SAP, sem depender de programadores ABAP ou da fábrica de software. NUNCA fale em vender alocação, consultoria ou treinamento para a equipe/empresa dele; a abordagem deve ser estritamente de venda individual para a carreira e autonomia dele.`;
    } else if (hasTechOrDev) {
      anguloEstrategico = `Foco em SERVIÇO 2 (Alocação/Body Shop) ou SERVIÇO 5 (RPA/IA) para eficiência operacional. Cargo: ${cargo}.`;
    } else if (isEcossistemaSAP || isConsultor) {
      anguloEstrategico = `Foco em SERVIÇO 3 (Treinamento SAP, destacando o benefício de o profissional funcional passar a debugar/depurar programas standard e customizados Z, tendo total autonomia para resolver chamados e atuar em projetos SAP sem travar o fluxo dependendo de desenvolvedores ABAP ou da fábrica de software) ou SERVIÇO 4 (Consultoria SAP). Cargo: ${cargo}.`;
    } else {
      anguloEstrategico = `Identificar qual destes serviços atende melhor a empresa ${empresa}: ${servicosCromosit}`;
    }

    // =========================================================================
    // BUSCA DO TEMPLATE DINÂMICO (NOVA ARQUITETURA POR GRUPO E FUNIL)
    // =========================================================================
    let templateDinamico = '';
    const grupoLead = lead.group_name || lead.classificacao; // Usa o group_name que já existia

    if (grupoLead) {
      // Mapear o 'tipo' da mensagem para a 'etapa do funil' (topo, meio, fundo)
      let etapaFunil = 'topo';
      if (tipo.includes('follow_up')) etapaFunil = 'meio';
      else if (tipo.includes('whatsapp') || tipo.includes('fundo')) etapaFunil = 'fundo';

      try {
        const { data: tmpl } = await supabase
          .from('ai_templates')
          .select('*')
          .eq('user_id', req.user.userId)
          .ilike('classificacao', grupoLead) // Case insensitive match
          .eq('funil_etapa', etapaFunil)
          .maybeSingle();
        
        if (tmpl) {
          templateDinamico = `
[ATENÇÃO! REGRA DE CLASSIFICAÇÃO ATIVADA]
Este lead pertence ao grupo "${grupoLead}" e a mensagem está na etapa de funil "${etapaFunil}".
INSTRUÇÃO OBRIGATÓRIA DA ESTRATÉGIA:
${tmpl.instrucao_prompt}

${tmpl.template_texto ? `USE ESTA ESTRUTURA BASE (SUBSTITUA AS VARIÁVEIS):\n${tmpl.template_texto}` : ''}
`;
        }
      } catch (err) {
        console.error('Erro ao buscar template dinâmico:', err.message);
      }
    }


    const prompt = `Você é um especialista sênior em prospecção comercial B2B da Cromosit IT.
Sua missão é gerar uma mensagem altamente empática, organizada e com forte apelo visual, focando exclusivamente na necessidade/dor do lead e criando um rapport inicial com base no cargo e contexto dele.

${anguloEstrategico}

${templateDinamico}

Tipo de Mensagem a ser Gerada:
- Formato/Objetivo: ${tipoDescricao[tipo] || tipo}

Dados do Lead:
- Nome do destinatário (use APENAS este primeiro nome na saudação): ${primeiroNome}
- Nome completo do Lead: ${lead.name}
- Cargo: ${lead.current_role || lead.headline || 'não informado'}
- Empresa: ${lead.current_company || lead.company || 'não informada'}
- Localização: ${lead.location || 'não informada'}
- Grau de conexão: ${grauLabel}
- Módulo SAP Estimado: ${moduloSAP}
${lead.mutual_connections ? `- Conexões em comum: ${lead.mutual_connections}` : ''}
${lead.service_interest ? `- Mapeamento de dor/interesse da IA: ${lead.service_interest}` : ''}
${lead.about ? `- Informações do perfil (Bio): ${lead.about.substring(0, 300)}` : ''}
${contexto ? `- Contexto extra para a abordagem: ${sanitizeString(contexto, 300)}` : ''}

Exemplos de Referência de Tom e Estilo para Consultores SAP:

1. Se o tipo for 'primeiro_contato' (ou mensagem de primeiro contato) e o lead for da área SAP, siga estritamente esta estrutura padrão, adaptando o módulo para ser "${moduloSAP}":
"${saudacaoTempo} ${primeiroNome}, como vai?

Vi que você atua como consultor no módulo ${moduloSAP}. Muitos funcionais têm buscado mais autonomia para debugar transações Zs e códigos sem depender de programadores abaps.

Isso é algo que você está enfrentando no seu dia a dia?"

2. Se o tipo for 'follow_up' e o lead for da área SAP, siga este estilo conciso e direto, adaptando o módulo do profissional para ser "${moduloSAP}":
"${saudacaoTempo} ${primeiroNome}, como vai?

Segue o link da Aula DEMO prática de debug no S/4HANA com o instrutor Rafael: https://www.youtube.com/watch?v=d4ftrf2kNP0&t=1399s

Dá uma olhada com calma na técnica de debug que ele ensina e que dá essa autonomia no dia a dia do ${moduloSAP}. Vale destacar que nossos alunos praticam em ambiente SAP S/4HANA e FIORI ativo versão 2023, já com as Best Practices configuradas.

Você consegue assistir hoje à noite para darmos um alinhamento rápido amanhã sobre os acessos ao sistema e o presente que preparei para você?"

3. [REGRA ABSOLUTA] Se o cargo do lead contiver "Gerente", "Coordenador", "Diretor", "Líder", "Head" OU se o "Contexto extra" citar "vagas abertas", VOCÊ DEVE IGNORAR qualquer outra estrutura e USAR EXATAMENTE o texto abaixo (substituindo apenas as variáveis):

"${saudacaoTempo} ${primeiroNome}, tudo bem?

Acompanhando a ${lead.current_company || lead.company || 'sua empresa'}, vi que vocês estão com volume de vagas abertas, inclusive buscando profissionais SAP.

Sei que fechar essas posições costuma ser um processo longo. Na Cromosit IT, nós ajudamos empresas a resolver esse gargalo de duas formas rápidas:
1. Alocação ágil de profissionais SAP (Staffing) prontos para atuar nos seus projetos.
2. Treinamentos técnicos corporativos para dar mais autonomia para a equipe que você já tem em casa.

Faz sentido batermos um papo rápido na próxima semana para vermos se conseguimos apoiar vocês nesse momento de expansão?"

Diretrizes OBRIGATÓRIAS para a Mensagem:
1. SAUDAÇÃO & NOME: Inicie a mensagem obrigatoriamente saudando o lead pelo primeiro nome e utilizando a saudação temporal exata de acordo com o horário: "${saudacaoTempo} ${primeiroNome}, como vai?". Nunca use termos informais como "Show de bola" ou "Tudo certo?".
2. RAPPORT & CONEXÃO: Comece fazendo referência ao cargo, empresa ou contexto do lead de maneira natural. Se o cargo ou empresa não forem informados, faça uma abordagem genérica sobre tecnologia/SAP sem inventar cargos fictícios.
3. FOCO NA DOR/NECESSIDADE: Não tente vender logo de cara. Foque na eficiência, produtividade ou capacitação da equipe dele, abordando uma dor provável (ex: escassez de recursos SAP, treinamento técnico, gargalos operacionais).
4. ESTRUTURA VISUAL E PARÁGRAFOS: Organize a mensagem em parágrafos muito curtos (no máximo 2 ou 3 parágrafos curtos, com espaçamento limpo entre eles).
5. BREVIDADE E OBJETIVIDADE: Linguagem formal, polida, direta, sem jargões forçados de "vendedor" e sem clichês ("Espero que esteja bem", "Gostaria de tomar 5 minutos").
6. LIMITE RÍGIDO DE CARACTERES: A mensagem DEVE respeitar estritamente o limite do tipo: ${tipoDescricao[tipo] || tipo}. Seja conciso para evitar truncamento no LinkedIn/WhatsApp.
7. MÓDULO DO PROFISSIONAL: Adapte a abordagem ao módulo de atuação do profissional. Se o módulo foi identificado como "${moduloSAP}", utilize este termo (ex: "...autonomia no dia a dia do ${moduloSAP}") em vez de termos genéricos.
8. CTA MATADOR: Termine com uma única pergunta simples e curta, estimulando uma resposta sobre a dor discutida.

Retorne APENAS a mensagem limpa, pronta para envio, sem aspas ou tags de formatação adicionais.`.trim();

    let mensagem = '';

    if (provider === 'gemini') {
      if (!geminiKey) throw new Error('Chave do Gemini não configurada.');
      const resAI = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
        { contents: [{ parts: [{ text: prompt }] }] }
      );
      mensagem = resAI.data.candidates[0].content.parts[0].text;
    } else if (provider === 'claude') {
      if (!claudeKey) throw new Error('Chave do Claude não configurada.');
      const resAI = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }]
        },
        {
          headers: {
            'x-api-key': claudeKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
          }
        }
      );
      mensagem = resAI.data.content[0].text;
    } else {
      if (!openaiKey) throw new Error('Chave da OpenAI não configurada.');
      const resAI = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model:      'gpt-4o-mini',
          max_tokens: 600,
          messages:   [{ role: 'user', content: prompt }]
        },
        { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openaiKey}` } }
      );
      mensagem = resAI.data.choices[0].message.content;
    }

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
        description: `Mensagem "${tipo}" gerada por IA (${provider.toUpperCase()})`
      });

    res.json({ message: 'Mensagem gerada com sucesso', mensagem });
  } catch (err) {
    console.error('Erro ao gerar mensagem:', err.message, err.response?.data || '');
    res.status(500).json({ error: 'Erro ao gerar mensagem com IA', detalhe: err.message });
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

    // Lógica de Cadência Centralizada (Sprint 2):
    const CadenceService = require('../services/cadenceService');
    await CadenceService.agendarProximoPasso(req.params.id, req.user.userId, lead.cadence_step || 0);

    await supabase.from('lead_activities').insert({
      lead_id:     req.params.id,
      user_id:     req.user.userId,
      type:        'whatsapp_enviado',
      description: `WhatsApp enviado. Cadência atualizada e próxima tarefa agendada.`
    });

    res.json({ 
      message: 'Mensagem enviada e follow-up agendado na sua lista de tarefas!', 
      numero
    });
  } catch (err) {
    console.error('Erro WhatsApp:', err.message, err.response?.data);
    res.status(500).json({ error: 'Erro ao enviar WhatsApp', detalhe: err.response?.data || err.message });
  }
});

// ==========================================
// ROTA 10.5: Registrar contato via LinkedIn
// ==========================================
router.post('/:id/registrar-contato-linkedin', async (req, res) => {
  try {
    const { data: lead, error } = await supabase
      .from('leads')
      .select('*')
      .eq('id', req.params.id)
      .eq('assigned_to', req.user.userId)
      .single();

    if (error || !lead)
      return res.status(404).json({ error: 'Lead não encontrado' });

    const { mensagem } = req.body;

    // Lógica de Cadência Centralizada (Sprint 2)
    const CadenceService = require('../services/cadenceService');
    await CadenceService.agendarProximoPasso(req.params.id, req.user.userId, lead.cadence_step || 0);

    await supabase.from('lead_activities').insert({
      lead_id:     req.params.id,
      user_id:     req.user.userId,
      type:        'linkedin_msg_enviada',
      description: `Mensagem enviada via Inbox LinkedIn. Próximo follow-up agendado.`
    });

    res.json({ message: 'Contato via LinkedIn registrado e follow-up agendado!' });
  } catch (err) {
    console.error('Erro ao registrar contato LinkedIn:', err.message);
    res.status(500).json({ error: 'Erro ao registrar contato' });
  }
});

router.post('/:id/atividades', async (req, res) => {
  try {
    const { type, description } = req.body;
    if (!type)
      return res.status(400).json({ error: 'Tipo de atividade obrigatório' });

    try {
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
    } catch (e) {
      console.warn('⚠️ Erro ao registrar atividade manual:', e.message);
      res.status(201).json({ message: 'Lead ok, mas atividade não registrada.' });
    }
  } catch (err) {
    console.error('Erro ao registrar atividade:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// FUNÇÃO: Enriquecer lead com IA
// ==========================================
async function enriquecerLeadComIA(lead) {
  if (!lead.name) return;

  // 1. Configurações e chaves padrão (fallback do .env)
  let openaiKey = process.env.OPENAI_API_KEY;
  let geminiKey = process.env.GEMINI_API_KEY;
  let claudeKey = process.env.CLAUDE_API_KEY;
  let provider = 'openai';

  // 2. Tentar buscar chaves e regras de score específicas do usuário
  let score_cargo_decisao = 35;
  let score_cargo_sap = 30;
  let score_cargo_ti = 20;
  let score_localizacao_br = 15;
  let score_conexao_1 = 20;
  let score_conexao_2 = 10;
  let penalidade_fora_br = -40;
  let penalidade_sem_dados = -45;

  try {
    const userId = lead.assigned_to;
    if (userId) {
      const { data: aiSettings } = await supabase
        .from('user_ai_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (aiSettings) {
        if (aiSettings.openai_key) openaiKey = aiSettings.openai_key;
        if (aiSettings.gemini_key) geminiKey = aiSettings.gemini_key;
        if (aiSettings.claude_key) claudeKey = aiSettings.claude_key;
        if (aiSettings.preferred_provider) provider = aiSettings.preferred_provider;

        if (aiSettings.score_cargo_decisao !== undefined && aiSettings.score_cargo_decisao !== null) score_cargo_decisao = aiSettings.score_cargo_decisao;
        if (aiSettings.score_cargo_sap !== undefined && aiSettings.score_cargo_sap !== null) score_cargo_sap = aiSettings.score_cargo_sap;
        if (aiSettings.score_cargo_ti !== undefined && aiSettings.score_cargo_ti !== null) score_cargo_ti = aiSettings.score_cargo_ti;
        if (aiSettings.score_localizacao_br !== undefined && aiSettings.score_localizacao_br !== null) score_localizacao_br = aiSettings.score_localizacao_br;
        if (aiSettings.score_conexao_1 !== undefined && aiSettings.score_conexao_1 !== null) score_conexao_1 = aiSettings.score_conexao_1;
        if (aiSettings.score_conexao_2 !== undefined && aiSettings.score_conexao_2 !== null) score_conexao_2 = aiSettings.score_conexao_2;
        if (aiSettings.penalidade_fora_br !== undefined && aiSettings.penalidade_fora_br !== null) penalidade_fora_br = aiSettings.penalidade_fora_br;
        if (aiSettings.penalidade_sem_dados !== undefined && aiSettings.penalidade_sem_dados !== null) penalidade_sem_dados = aiSettings.penalidade_sem_dados;
      }
    }
  } catch (dbErr) {
    console.error('Erro ao ler chaves de IA do banco, usando chaves globais do .env:', dbErr.message);
  }

  const prompt = `
Você é um agente especialista em inteligência comercial B2B e Lead Scoring (Classificação de Leads) da Cromosit IT, aplicando as melhores práticas globais de mercado para definição de ICP (Perfil de Cliente Ideal).

Sua missão é analisar o perfil do LinkedIn abaixo e calcular um Score de 0 a 100 com base em critérios científicos de ICP B2B/SaaS, retornando um JSON estruturado.

Dados do Perfil a Analisar:
- Nome: ${lead.name}
- Cargo Real/Headline: ${lead.current_role || lead.headline || 'não informado'}
- Empresa Real: ${lead.current_company || lead.company || 'não informada'}
- Localização: ${lead.location || 'não informada'}
- Bio: ${lead.about ? lead.about.substring(0, 500) : 'não disponível'}
- Grau de conexão: ${lead.connection_degree === '1' ? '1º (já conectados)' : lead.connection_degree === '2' ? '2º (amigos em comum)' : '3º (sem conexão)'}
- Conexões em comum: ${lead.mutual_connections || 'nenhuma'}

REGRAS RÍGIDAS DE CÁLCULO DO LEAD SCORE (Comece em 0):

1. FIT GEOGRÁFICO (ICP Mercadológico) - Peso: 20 pontos
   - Localização no Brasil (BR) ou cidades brasileiras: +${score_localizacao_br} pontos.
   - Localização fora do Brasil (Estrangeiro, ex: USA, Índia, Europa): Limite o score geográfico a 0 pontos (penalização de ${penalidade_fora_br}).

2. FIT DE CARGO E TOMADA DE DECISÃO (ICP Comprador) - Peso: 35 pontos
   - Tomador de decisão em SAP/TI (Diretor, Gerente, Head, Coordenador, PMO): +${score_cargo_decisao} pontos.
   - Consultor Funcional SAP (MM, SD, FI, CO, PP, PM, QM, EWM, TM, HCM): +${score_cargo_sap} pontos.
   - Desenvolvedor, Programador ou Profissional de TI geral: +${score_cargo_ti} pontos.
   - Cargo genérico, irrelevante, em branco ou sem relação com TI (ex: "Estudante", "Vendas", "Hello", "Autônomo"): 0 pontos.

3. FIT DE ÁREA E TECNOLOGIA (ICP Solução) - Peso: 25 pontos
   - Menção direta a SAP, S/4HANA ou módulos funcionais SAP (na headline ou bio): +25 pontos.
   - Menção a TI, Software ou tecnologia em geral (sem SAP): +15 pontos.
   - Sem qualquer menção a tecnologia ou SAP: 0 pontos.

4. NÍVEL DE ENGAJAMENTO (Relação Comercial) - Peso: 20 pontos
   - Conexão de 1º Grau (já conectados): +${score_conexao_1} pontos.
   - Conexão de 2º Grau (amigos em comum): +${score_conexao_2} pontos.
   - Conexão de 3º Grau (sem conexão): +0 pontos.

PENALIZAÇÕES OBRIGATÓRIAS (Desqualificação):
- Perfil desqualificado/sem informação (cargo em branco, headline irrelevante como 'Hello' ou 'Disponível', sem qualquer ligação com SAP ou TI): Penalize em ${penalidade_sem_dados} pontos na nota final.
- Lead estrangeiro/localização fora do Brasil: Penalize em ${penalidade_fora_br} pontos na nota final.

O score final deve ser a soma das pontuações respeitando o limite mínimo de 0 e máximo de 100. leads estrangeiros ou irrelevantes devem obrigatoriamente ter score menor que 15.

Responda APENAS este JSON (sem markdown, sem explicações):
{
  "service_interest": "Em 1-2 frases: qual serviço da Cromosit IT ele precisa?",
  "notes": "Em 3-5 bullet points curtos: dicas reais de abordagem.",
  "score": 10
}`.trim();

  let responseText = '';

  if (provider === 'gemini') {
    if (!geminiKey) throw new Error('Chave do Gemini não configurada.');
    const res = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      }
    );
    responseText = res.data.candidates[0].content.parts[0].text;
  } else if (provider === 'claude') {
    if (!claudeKey) throw new Error('Chave do Claude não configurada.');
    const res = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      },
      {
        headers: {
          'x-api-key': claudeKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        }
      }
    );
    responseText = res.data.content[0].text;
  } else {
    // Fallback: OpenAI (ChatGPT)
    if (!openaiKey) throw new Error('Chave da OpenAI não configurada.');
    const res = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini',
        max_tokens: 600,
        temperature: 0.3,
        messages: [{ role: 'user', content: prompt }]
      },
      { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openaiKey}` } }
    );
    responseText = res.data.choices[0].message.content;
  }

  const clean = responseText.replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(clean);

  const updates = { updated_at: new Date().toISOString() };
  if (parsed.service_interest) updates.service_interest = sanitizeString(parsed.service_interest, 1000);
  if (parsed.notes)            updates.notes = sanitizeString(parsed.notes, 2000);
  if (parsed.score !== undefined) updates.score = Math.min(100, Math.max(0, parseInt(parsed.score) || 0));

  await supabase.from('leads').update(updates).eq('id', lead.id);

  await supabase.from('lead_activities').insert({
    lead_id:     lead.id,
    user_id:     lead.assigned_to,
    type:        'ia_analise_concluida',
    description: `IA (${provider.toUpperCase()}) analisou perfil: Score ${parsed.score}/100 | Interesse: ${parsed.service_interest?.substring(0, 100)}...`
  });

  console.log(`✅ IA (${provider.toUpperCase()}) enriqueceu lead: ${lead.name} (score: ${parsed.score})`);
}

// Enriquece múltiplos leads em sequência com delay
async function enriquecerLeadsComIA(leads) {
  for (const lead of leads.slice(0, 10)) {
    await enriquecerLeadComIA(lead);
    await new Promise(r => setTimeout(r, 600));
  }
}

module.exports = router;
