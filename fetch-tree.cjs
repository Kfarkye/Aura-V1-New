const https = require('https');
const options = {
  hostname: 'api.github.com',
  path: '/repos/Kfarkye/aura-ai/git/trees/main?recursive=1',
  headers: { 'User-Agent': 'Node.js' }
};
https.get(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => console.log(JSON.parse(data).tree.filter(t => t.path.startsWith('src/') || t.path === 'package.json').map(t => t.path)));
});
