const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function listUsers() {
  const { data, error } = await supabase.from('users').select('id, email, name');
  if (error) {
    console.error('Erro ao buscar usuários:', error.message);
  } else {
    console.log('Usuários cadastrados:', data);
  }
}

listUsers();
