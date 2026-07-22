require('dotenv').config({ path: './01_DEV/backend/.env' });
const axios = require('axios');

async function test() {
  try {
    const res = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Say hello in valid JSON format: {"message": "hello"}' }],
        response_format: { type: 'json_object' }
      },
      { headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` } }
    );
    console.log('SUCCESS:', res.data.choices[0].message.content);
  } catch (e) {
    console.error('ERROR:', e.response ? e.response.data : e.message);
  }
}
test();
