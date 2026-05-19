const fs = require('fs');
const path = require('path');
const https = require('https');

const filesToFetch = [
  'src/types.ts',
  'src/lib/constants.ts',
  'src/lib/utils.ts',
  'src/services/ai.ts',
  'src/hooks/useIsMounted.ts',
  'src/hooks/useTasks.ts',
  'src/components/sidebar/Sidebar.tsx',
  'src/components/chat/MessageItem.tsx',
  'src/components/chat/ChatInput.tsx',
  'src/components/collaboration/CollaborativeCursor.tsx',
  'src/components/chat/EmptyState.tsx',
  'src/main.tsx'
];

filesToFetch.forEach(file => {
  https.get(`https://raw.githubusercontent.com/Kfarkye/aura-ai/main/${file}`, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      if (res.statusCode === 200) {
        const fullPath = path.join('/app/applet', file);
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        fs.writeFileSync(fullPath, data);
        console.log(`Fetched ${file}`);
      } else {
        console.error(`Failed to fetch ${file}: ${res.statusCode}`);
      }
    });
  });
});
