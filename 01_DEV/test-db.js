require('dotenv').config({ path: './backend/.env' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function testDB() {
  try {
    const { data, error } = await supabase
      .from('ai_templates')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('DB ERROR:', error.message);
    } else {
      console.log('DB SUCCESS, DATA:', data);
    }
  } catch (e) {
    console.log('FATAL ERROR:', e.message);
  }
}

testDB();
