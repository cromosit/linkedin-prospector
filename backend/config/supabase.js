const { createClient } = require('@supabase/supabase-js');

// Cria a conexão com o banco de dados Supabase
// Supabase é como um banco de dados online que você acessa pela internet
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

module.exports = supabase;
