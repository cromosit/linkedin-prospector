const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const auth = require('../middleware/auth');

// ==========================================
// ROTA: Listar minhas tarefas (Pendentes por padrão)
// ==========================================
router.get('/', auth, async (req, res) => {
  try {
    const { status = 'pendente' } = req.query;
    const { data, error } = await supabase
      .from('tasks')
      .select('*, leads(name, company)')
      .eq('user_id', req.user.userId)
      .eq('status', status)
      .order('due_date', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// ROTA: Criar Tarefa de Follow-up
// ==========================================
router.post('/', auth, async (req, res) => {
  const { lead_id, title, description, due_date, priority } = req.body;
  try {
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        user_id: req.user.userId,
        lead_id,
        title,
        description,
        due_date,
        priority
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
// ROTA: Concluir Tarefa
// ==========================================
router.patch('/:id/complete', auth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .update({ status: 'concluida' })
      .eq('id', req.params.id)
      .eq('user_id', req.user.userId)
      .select()
      .single();

    if (error) throw error;

    // Registra como atividade no lead
    if (data.lead_id) {
      await supabase.from('lead_activities').insert({
        lead_id: data.lead_id,
        user_id: req.user.userId,
        type: 'tarefa_concluida',
        description: `Tarefa finalizada: ${data.title}`
      });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
