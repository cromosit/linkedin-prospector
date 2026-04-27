const https = require('https');

https.get('https://lurxoeggkakikyeoitfv.supabase.co', (res) => {
  console.log('Status Code:', res.statusCode);
  res.on('data', (d) => {
    process.stdout.write(d);
  });
}).on('error', (e) => {
  console.error('Error:', e.message);
});
