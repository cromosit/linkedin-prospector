require('dotenv').config({path: '.env'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function checkLeads() {
  console.log("Checking leads table...");
  const { data, error, count } = await supabase.from('leads').select('id, name, assigned_to', { count: 'exact' });
  if (error) {
    console.error("Error fetching leads:", error);
    return;
  }
  console.log("Total leads:", count);
  console.log("Sample leads:", data.slice(0, 5));
  
  // also get the users to see what the user_id is
  const { data: users, error: userError } = await supabase.from('users').select('id, email, name').limit(5);
  if (userError) {
    console.error("Error fetching users:", userError);
  } else {
    console.log("Sample users:", users);
  }
}
checkLeads();
