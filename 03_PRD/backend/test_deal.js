const axios = require('axios');

(async () => {
  try {
    const loginRes = await axios.post('https://apichatwa.cromosit.com/api/auth/login', {
      email: 'suporte@cromosit.com.br', password: 'chatwa123'
    });
    const token = loginRes.data.token;
    const headers = { Authorization: `Bearer ${token}` };
    
    // Create deal
    const dealPayload = {
      title: "TESTE AUTOMAÇÃO",
      contactId: 1619, // Samuel Betim
      stageId: 24,     // Sem contato
      status: "OPEN",
      value: 0
    };
    
    console.log("Creating deal...");
    const dealRes = await axios.post('https://apichatwa.cromosit.com/api/crm/deals', dealPayload, { headers });
    console.log("Deal created:", dealRes.data);
    
    // Clean up test deal
    if(dealRes.data && dealRes.data.id) {
       await axios.delete(`https://apichatwa.cromosit.com/api/crm/deals/${dealRes.data.id}`, { headers });
       console.log("Test deal deleted.");
    }
  } catch(e) {
    console.error(e.response ? e.response.data : e.message);
  }
})();
