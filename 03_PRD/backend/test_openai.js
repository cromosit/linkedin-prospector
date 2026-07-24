require('dotenv').config();
const axios = require('axios');

async function test() {
  console.log("Testing API Key starting with:", process.env.OPENAI_API_KEY?.substring(0, 15));
  try {
    const res = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'Say OK' }]
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      }
    });
    console.log("Success:", res.data.choices[0].message.content);
  } catch (err) {
    console.log("Error:", err.response?.status, err.response?.data || err.message);
  }
}
test();
