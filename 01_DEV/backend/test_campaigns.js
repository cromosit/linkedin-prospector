require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function testCampaigns() {
  const { data, error } = await supabase.from('campaigns').select('*');
  if (error) {
    console.error("Error campaigns:", error.message);
  } else {
    console.log("Campaigns Found:", data.length);
    console.log("Campaigns Data:", JSON.stringify(data, null, 2));
  }
}
testCampaigns();
