require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function test() {
  const { data, error } = await supabase.from('pipelines').select('*').limit(1);
  console.log("Pipelines Test:", error ? error.message : "Success");
  
  const { data: d2, error: e2 } = await supabase.from('pipeline_stages').select('*').limit(1);
  console.log("Pipeline Stages Test:", e2 ? e2.message : "Success");
}
test();
