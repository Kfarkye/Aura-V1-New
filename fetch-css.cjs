const https = require('https');
https.get('https://raw.githubusercontent.com/Kfarkye/aura-ai/main/src/index.css', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => console.log(data));
});
