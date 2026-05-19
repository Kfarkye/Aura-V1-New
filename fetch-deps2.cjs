const fs = require('fs');
const path = require('path');
const https = require('https');

const filesToFetch = [
  'src/components/ui/GoogleDriveExplorer.tsx',
  'src/components/ui/RepoFileExplorer.tsx',
  'src/components/ui/CodeBlock.tsx',
  'src/components/ui/SafeArtifactBoundary.tsx',
  'src/components/AuraArtifact.tsx',
  'src/components/AuraImage.tsx',
  'src/components/AppModification.tsx',
  'src/components/workspace/InboxSummaryCard.tsx',
  'src/components/pages/LandingPage.tsx',
  'src/components/AuthGate.tsx'
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
