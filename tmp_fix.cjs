const fs = require('fs');
let code = fs.readFileSync('src/components/McpGenerator.tsx', 'utf-8');
code = code.replace(/f\.path\.replace\(\/\^packages\/\[a-zA-Z0-9_-\]\+\/\[a-zA-Z0-9_-\]\+\/\/, ''\)/g, "f.path.replace(/^packages\\/[a-zA-Z0-9_\\-]+\\/[a-zA-Z0-9_\\-]+\\//, '')");
fs.writeFileSync('src/components/McpGenerator.tsx', code);
console.log('Fixed regex')
