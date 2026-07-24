const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const auth = require('../middleware/auth');

router.use(auth);

// GET: Obter informações do perfil do usuário logado
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, company, role, profile_picture, created_at')
      .eq('id', req.user.userId)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT: Atualizar informações do perfil
router.put('/', async (req, res) => {
  const { name, company, role } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'O nome é obrigatório.' });
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .update({
        name: name.trim(),
        company: company ? company.trim() : null,
        role: role ? role.trim() : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.user.userId)
      .select('id, name, email, company, role, profile_picture')
      .single();

    if (error) throw error;
    res.json({ message: 'Perfil atualizado com sucesso', user: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
