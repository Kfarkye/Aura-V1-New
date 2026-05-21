const fs = require('fs');

// Extract from out.txt
const ogOut = fs.readFileSync('/tmp/out.txt', 'utf-8');
const startMatch = '{/* GOVERNANCE ENGINE VIEW */}';
const endMatch = '{/* CHAT MAIN VIEW (Empty state or context view) */}';
const startIdx = ogOut.indexOf(startMatch);
const endIdx = ogOut.indexOf(endMatch);
const viewsContent = ogOut.substring(startIdx, endIdx);

// Replace in target
let target = fs.readFileSync('src/components/McpGenerator.tsx', 'utf-8');
const replaceTarget = `{/* Other modes logic... (Execution Engine, Governance etc.) */}\\n        {mode !== \\"generator\\" && (\\n           <div className=\\"flex-1 flex items-center justify-center bg-[#FAFAFA] text-[#A1A1AA] overflow-y-auto border-x border-[#E5E5EA]/50\\">\\n              <span className=\\"text-[13px] font-medium tracking-wide\\">Select Dev Generator to view context</span>\\n           </div>\\n        )}\\n\\n`;

target = target.replace(replaceTarget, viewsContent);
fs.writeFileSync('src/components/McpGenerator.tsx', target);
console.log('Fixed replacement completed!');
