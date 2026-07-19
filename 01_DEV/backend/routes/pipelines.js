const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const auth = require('../middleware/auth');

router.use(auth);

// ==========================================
// ROTA: Listar Funis
// ==========================================
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('pipelines')
      .select('*, pipeline_stages(*)')
      .eq('user_id', req.user.userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// ROTA: Criar Funil
// ==========================================
router.post('/', async (req, res) => {
  try {
    const { name, description } = req.body;
    const { data, error } = await supabase
      .from('pipelines')
      .insert({ name, description, user_id: req.user.userId })
      .select();

    if (error) throw error;
    const pipeline = (data && data.length > 0) ? data[0] : { name, description, id: crypto.randomUUID() };

    // Cria as etapas iniciais padrão para o novo funil
    const defaultStages = [
      { name: '🔥 Novos Leads', position: 1, color: '#3b82f6', pipeline_id: pipeline.id },
      { name: '💬 Contatados', position: 2, color: '#a855f7', pipeline_id: pipeline.id },
      { name: '🤝 Em Negociação', position: 3, color: '#eab308', pipeline_id: pipeline.id }
    ];
    await supabase.from('pipeline_stages').insert(defaultStages);

    res.status(201).json(pipeline);
  } catch (err) {
    console.error('Erro ao criar funil:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// ROTA: Criar Etapa
// ==========================================
router.post('/:id/stages', async (req, res) => {
  const { name, color, position } = req.body;
  const pipeline_id = req.params.id;

  if (!name) return res.status(400).json({ error: 'O nome da etapa é obrigatório.' });

  try {
    const { data, error } = await supabase
      .from('pipeline_stages')
      .insert({ 
        name, 
        color: color || '#1d8fe8', 
        position: position || 99, 
        pipeline_id 
      })
      .select();
      
    if (error) throw error;
    const stage = (data && data.length > 0) ? data[0] : { name, color: color || '#1d8fe8', position: position || 99, pipeline_id };
    res.status(201).json(stage);
  } catch (err) {
    console.error('Erro ao criar etapa:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.put('/stages/:id', async (req, res) => {
  const { name, color, position } = req.body;
  try {
    const { data, error } = await supabase
      .from('pipeline_stages')
      .update({ name, color, position })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// ROTA: Deletar Etapa
// ==========================================
router.delete('/stages/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('pipeline_stages')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Etapa removida' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
