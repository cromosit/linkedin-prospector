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
  const { name, description, search_url, message_template } = req.body;
  try {
    const { data, error } = await supabase
      .from('campaigns')
      .insert({
        name,
        description,
        search_url,
        message_template,
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
  const { name, description, search_url, message_template, status } = req.body;
  try {
    const { data, error } = await supabase
      .from('campaigns')
      .update({
        name,
        description,
        search_url,
        message_template,
        status,
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

module.exports = router;
