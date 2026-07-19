const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function checkSchema() {
  console.log('--- Verificando colunas de campaigns ---');
  let { data: campaigns, error: err1 } = await supabase.from('campaigns').select('*').limit(1);
  if (err1) {
    console.error('Erro campaigns:', err1.message);
  } else {
    console.log('campaigns columns:', campaigns.length > 0 ? Object.keys(campaigns[0]) : 'Nenhum registro para mapear colunas');
  }

  console.log('--- Verificando colunas de leads ---');
  let { data: leads, error: err2 } = await supabase.from('leads').select('*').limit(1);
  if (err2) {
    console.error('Erro leads:', err2.message);
  } else {
    console.log('leads columns:', leads.length > 0 ? Object.keys(leads[0]) : 'Nenhum registro para mapear colunas');
  }
}

checkSchema();
