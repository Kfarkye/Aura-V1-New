const fs = require('fs');
let code = fs.readFileSync('src/components/McpGenerator.tsx', 'utf8');
code = code.replace(/custom-scrollbar/g, 'style-scrollbar');
fs.writeFileSync('src/components/McpGenerator.tsx', code);
console.log('Scrollbars fixed');
