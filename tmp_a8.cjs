const fs = require('fs');
let code = fs.readFileSync('src/components/McpGenerator.tsx', 'utf8');

// Assistant loading pulse
code = code.replace(
  '<div className="w-6 h-6 rounded-full border border-white/[0.08] flex items-center justify-center bg-white/[0.04]">\n                  <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />\n                </div>',
  '<div className="w-8 h-8 rounded-full bg-gradient-to-tr from-white/10 to-white/[0.02] border border-white/10 flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.05)] backdrop-blur-xl animate-pulse">\n                  <div className="w-2 h-2 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]" />\n                </div>'
);

// Suggestion buttons
code = code.replace(
  /className="block w-full text-left bg-white\/\[0\.04\] border border-white\/\[0\.04\] rounded-2xl py-3\.5 px-5 text-\[12px\] font-medium text-\[rgba\(255,255,255,0\.7\)\] hover:bg-\[rgba\(255,255,255,0\.05\)\] hover:text-white transition-all(| shadow-sm)"/g,
  'className="block w-full text-left bg-gradient-to-r from-white/[0.04] to-transparent border border-white/[0.05] rounded-[20px] py-4 px-6 text-[13px] font-medium text-white/70 hover:bg-white/[0.06] hover:text-white hover:border-white/[0.1] active:scale-[0.99] transition-all duration-300 shadow-sm hover:shadow-[0_0_20px_rgba(255,255,255,0.03)]"'
);

fs.writeFileSync('src/components/McpGenerator.tsx', code);
console.log('Final tweaks made!');
