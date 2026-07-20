const express  = require('express');
const router   = express.Router();
const axios    = require('axios');
const supabase = require('../config/supabase');
const auth     = require('../middleware/auth');
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
        const { data: firstPip, error: errPip } = await supabase.from('pipelines').select('id').limit(1).maybeSingle();
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
    
    // Automação inteligente do Funil baseado no Status do Lead
    if (req.body.status && !req.body.pipeline_stage_id) {
      try {
        const { data: leadAtual } = await supabase.from('leads').select('pipeline_id').eq('id', req.params.id).maybeSingle();
        let pipelineId = leadAtual?.pipeline_id;
        
        if (!pipelineId) {
          const { data: firstPip } = await supabase.from('pipelines').select('id').limit(1).maybeSingle();
          if (firstPip) pipelineId = firstPip.id;
        }
        
        if (pipelineId) {
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
      } catch (errAuto) {
        console.error('⚠️ Falha na automação de transição de etapa do pipeline:', errAuto.message);
      }
    }

    // Se mudar o status ou a etapa, reinicia o cronômetro de tempo na fase
    if (req.body.status || req.body.pipeline_stage_id) {
      updates.stage_entered_at = new Date().toISOString();
    }

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

    let updateQuery = supabase
      .from('leads')
      .update(updates)
      .eq('id', req.params.id);

    if (req.user.userId !== '550e8400-e29b-41d4-a716-446655440000') {
      updateQuery = updateQuery.eq('assigned_to', req.user.userId);
    }

    const { data: lead, error } = await updateQuery.select().single();

    if (error) throw error;

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
router.post('/:id/gerar-mensagem', async (req, res) => {
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

    if (hasTechOrDev || isDecisionMaker) {
      anguloEstrategico = `Foco em SERVIÇO 2 (Alocação/Body Shop) ou SERVIÇO 5 (RPA/IA) para eficiência operacional. Cargo: ${cargo}.`;
    } else if (isRecrutador) {
      anguloEstrategico = `Foco em SERVIÇO 1 (Plataforma de Treinamento) ou SERVIÇO 2 (Hunting de Nicho SAP). Cargo: ${cargo}.`;
    } else if (isEcossistemaSAP || isConsultor) {
      anguloEstrategico = `Foco em SERVIÇO 3 (Treinamento SAP) ou SERVIÇO 4 (Consultoria SAP). Cargo: ${cargo}.`;
    } else {
      anguloEstrategico = `Identificar qual destes serviços atende melhor a empresa ${empresa}: ${servicosCromosit}`;
    }

    const prompt = `Você é um especialista sênior em prospecção comercial B2B da Cromosit IT.
Sua missão é gerar uma mensagem altamente empática, organizada e com forte apelo visual, focando exclusivamente na necessidade/dor do lead e criando um rapport inicial com base no cargo e contexto dele.

${anguloEstrategico}

Dados do Lead:
- Nome: ${lead.name}
- Cargo: ${lead.current_role || lead.headline || 'não informado'}
- Empresa: ${lead.current_company || lead.company || 'não informada'}
- Localização: ${lead.location || 'não informada'}
- Grau de conexão: ${grauLabel}
${lead.mutual_connections ? `- Conexões em comum: ${lead.mutual_connections}` : ''}
${lead.service_interest ? `- Mapeamento de dor/interesse da IA: ${lead.service_interest}` : ''}
${lead.about ? `- Informações do perfil (Bio): ${lead.about.substring(0, 300)}` : ''}
${contexto ? `- Contexto extra para a abordagem: ${sanitizeString(contexto, 300)}` : ''}

Diretrizes OBRIGATÓRIAS para a Mensagem:
1. RAPPORT & CONEXÃO: Comece fazendo referência ao cargo, empresa ou contexto do lead de maneira natural.
2. FOCO NA DOR/NECESSIDADE: Não tente vender logo de cara. Foque na eficiência, produtividade ou capacitação da equipe dele, abordando uma dor provável (ex: escassez de recursos SAP, treinamento técnico, gargalos operacionais).
3. ESTRUTURA VISUAL E PARÁGRAFOS: Organize a mensagem em parágrafos muito curtos (no máximo 2 ou 3 parágrafos curtos, com espaçamento limpo entre eles).
4. BREVIDADE E OBJETIVIDADE: Linguagem polida, direta, sem jargões forçados de "vendedor" e sem clichês ("Espero que esteja bem", "Gostaria de tomar 5 minutos").
5. CTA MATADOR: Termine com uma única pergunta simples e curta, estimulando uma resposta sobre a dor discutida.

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

  // 2. Tentar buscar chaves específicas do usuário que está rodando a ação
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
      }
    }
  } catch (dbErr) {
    console.error('Erro ao ler chaves de IA do banco, usando chaves globais do .env:', dbErr.message);
  }

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
