const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const auth = require('../middleware/auth');

// ==========================================
// ROTA: Dash VIP - Métricas Reais e Funil
// ==========================================
router.get('/summary', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const hoje = new Date();
    hoje.setHours(0,0,0,0);

    const { startDate, endDate } = req.query;

    // 1. OBTÉM TODOS OS LEADS
    let leadsQuery = supabase.from('leads')
      .select('status, created_at, contacted_at, temperature, connection_degree, source');
      
    if (userId !== '550e8400-e29b-41d4-a716-446655440000') {
      leadsQuery = leadsQuery.eq('assigned_to', userId);
    }

    if (startDate) {
      leadsQuery = leadsQuery.gte('created_at', startDate);
    }
    if (endDate) {
      leadsQuery = leadsQuery.lte('created_at', endDate);
    }
    
    const { data: leads } = await leadsQuery;

    // 2. TAREFAS PENDENTES
    const { count: tarefasCount } = await supabase.from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pendente')
      .eq('user_id', userId);

    const total = leads?.length || 0;
    const leadsHoje = leads?.filter(l => new Date(l.created_at) >= hoje).length || 0;
    const contatados = leads?.filter(l => l.contacted_at || l.status !== 'novo').length || 0;
    const taxaConversao = total > 0 ? Math.round((contatados / total) * 100) : 0;

    const funil = {};
    const porTemperatura = {};
    const porGrau = {};
    const porOrigem = {};

    if (leads) {
      leads.forEach(l => {
        // Funil
        const st = l.status || 'novo';
        funil[st] = (funil[st] || 0) + 1;
        
        // Temperatura
        const temp = l.temperature || 'frio';
        porTemperatura[temp] = (porTemperatura[temp] || 0) + 1;

        // Grau
        const grau = l.connection_degree || '3';
        porGrau[grau] = (porGrau[grau] || 0) + 1;

        // Origem
        const orig = l.source || 'manual';
        porOrigem[orig] = (porOrigem[orig] || 0) + 1;
      });
    }

    res.json({
      leads_total: total,
      leads_hoje: leadsHoje,
      tarefas_pendentes: tarefasCount || 0,
      taxa_conversao: taxaConversao + '%',
      funil,
      porTemperatura,
      porGrau,
      porOrigem
    });
  } catch (error) {
    console.error('Erro Stats:', error);
    res.status(500).json({ error: 'Erro ao processar estatísticas.' });
  }
});

module.exports = router;
