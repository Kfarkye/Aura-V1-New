const fs = require('fs');
let code = fs.readFileSync('src/components/McpGenerator.tsx', 'utf8');


// Improve empty state title
code = code.replace(
  '                <h2 className="text-2xl font-semibold tracking-tight text-white mb-2">\n                  Generate an MCP Server\n                </h2>\n                <p className="text-[14px] text-white/60 font-medium">\n                  Paste an OpenAPI URL or describe the API. AURA will generate a\n                  governed MCP package.\n                </p>',
  '                <div className="inline-block px-3 py-1 bg-white/[0.05] border border-white/10 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] text-white/60 mb-6">\n                  AURA MCP Engine\n                </div>\n                <h1 className="text-[32px] sm:text-[40px] font-semibold tracking-[-0.04em] text-white mb-4 leading-tight">\n                  Generate an intelligent <br />MCP server in seconds.\n                </h1>\n                <p className="text-[15px] sm:text-[17px] text-white/50 font-medium max-w-lg leading-relaxed">\n                  Supply an OpenAPI URL or describe the API integration intent. AURA will scaffold, configure, and govern a production-ready MCP package.\n                </p>'
);

// Improve the empty state input card
code = code.replace(
  'className="space-y-6 bg-white/[0.04] border border-white/[0.06] rounded-2xl p-8 shadow-sm"',
  'className="space-y-6 bg-gradient-to-b from-white/[0.05] to-white/[0.01] border border-white/[0.08] rounded-[24px] p-8 sm:p-10 shadow-[0_0_80px_rgba(255,255,255,0.02)] backdrop-blur-3xl relative overflow-hidden"'
);

// Enhance input focus states and style
code = code.replace(
  /className="w-full bg-white\/\[0\.02\] border border-white\/\[0\.06\] text-white placeholder-\[rgba\(255,255,255,0\.3\)\] focus:border-white\/\[0\.12\] focus:outline-none rounded-2xl p-3\.5 text-\[13px\] font-medium transition-colors"/g,
  'className="w-full bg-white/[0.02] border border-white/[0.05] text-white placeholder-white/30 focus:bg-white/[0.04] focus:border-white/20 focus:ring-4 focus:ring-white/[0.02] focus:outline-none rounded-2xl p-4 text-[14px] font-medium transition-all duration-300 shadow-inner"'
);

// Enhance the textarea identically
code = code.replace(
  'className="w-full h-32 bg-white/[0.02] border border-white/[0.06] text-white placeholder-[rgba(255,255,255,0.3)] focus:border-white/[0.12] focus:outline-none rounded-2xl p-3.5 text-[12px] font-mono resize-none custom-scrollbar transition-colors"',
  'className="w-full h-36 bg-white/[0.02] border border-white/[0.05] text-white placeholder-white/30 focus:bg-white/[0.04] focus:border-white/20 focus:ring-4 focus:ring-white/[0.02] focus:outline-none rounded-2xl p-4 text-[13px] font-mono resize-none custom-scrollbar transition-all duration-300 shadow-inner"'
);

// The primary generate button in empty state
code = code.replace(
  'className="w-full bg-white/90 hover:bg-white text-black active:scale-[0.98] font-semibold tracking-[0.15em] py-4 px-4 rounded-2xl text-[14px] flex items-center justify-center transition-all disabled:opacity-50 mt-4 shadow-[0_0_20px_rgba(255,255,255,0.05)] border border-transparent"',
  'className="w-full group relative flex items-center justify-center gap-3 bg-white hover:bg-[#F5F5F7] text-black font-bold tracking-[0.15em] py-4 px-6 rounded-2xl text-[13px] uppercase transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed mt-8 shadow-[0_0_40px_rgba(255,255,255,0.15)] focus:outline-none focus:ring-4 focus:ring-white/20 active:scale-[0.98]"'
);


fs.writeFileSync('src/components/McpGenerator.tsx', code);
console.log('Empty state improved!');
