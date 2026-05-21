const fs = require('fs');
let code = fs.readFileSync('src/components/McpGenerator.tsx', 'utf8');

// Container
code = code.replace(
  '<div className="flex w-full h-full overflow-hidden gap-4 bg-[#050505] font-sans text-[#F5F5F7]">',
  '<div className="flex w-full h-full overflow-hidden gap-5 p-5 bg-[#030303] font-sans text-[#F5F5F7] selection:bg-white/20">'
);
code = code.replace(
  '<div className="flex-1 flex flex-col min-w-0 relative z-10 bg-[#050505] overflow-hidden border-r border-[rgba(255,255,255,0.08)]">',
  '<div className="flex-1 flex flex-col min-w-0 relative z-10 bg-white/[0.02] backdrop-blur-3xl rounded-3xl overflow-hidden border border-white/[0.06] shadow-2xl">'
);

// Top Nav
code = code.replace(
  '<div className="flex bg-[#0B0B0D] border-b border-[rgba(255,255,255,0.08)] px-4 py-3 gap-2 overflow-x-auto custom-scrollbar shrink-0">',
  '<div className="flex bg-white/[0.01] border-b border-white/[0.04] px-6 py-4 gap-3 overflow-x-auto custom-scrollbar shrink-0 backdrop-blur-md ">'
);

// Buttons styling in context
code = code.replace(
  /button\s+onClick=\{\(\) => setMode\("([a-z]+)"\)\}\s+className=\{\`px-4 py-2 text-\[12px\] font-bold rounded-lg uppercase tracking-wider transition-colors \$\{mode === "[a-z]+" \? "bg-\[rgba\(255,255,255,0\.1\)\] text-white" : "text-\[rgba\(255,255,255,0\.5\)\] hover:text-white hover:bg-\[rgba\(255,255,255,0\.05\)\]"\}\`\}/g,
  function(match, modeName) {
    return `button onClick={() => setMode("${modeName}")} className={\`px-5 py-2.5 text-[11px] font-bold rounded-full uppercase tracking-[0.15em] transition-all duration-300 \${mode === "${modeName}" ? "bg-white text-black shadow-lg shadow-white/10" : "text-white/50 hover:text-white hover:bg-white/10"}\`}`;
  }
);


// Right Pane
code = code.replace(
  '<div className="w-[400px] flex-shrink-0 bg-[#0B0B0D] flex flex-col z-20 border-l border-[rgba(255,255,255,0.08)]">',
  '<div className="w-[440px] flex-shrink-0 bg-white/[0.03] backdrop-blur-3xl rounded-3xl flex flex-col z-20 border border-white/[0.06] shadow-2xl">'
);


// Global Colors Mapping
code = code.replace(/bg-\[#111114\]/g, "bg-white/[0.04]");
code = code.replace(/bg-\[#0B0B0D\]/g, "bg-white/[0.01]");
code = code.replace(/bg-\[#050505\]/g, "bg-white/[0.02]"); // For inputs and smaller containers
code = code.replace(/border-\[rgba\(255,255,255,0\.08\)\]/g, "border-white/[0.06]");
code = code.replace(/border-\[rgba\(255,255,255,0\.05\)\]/g, "border-white/[0.04]");
code = code.replace(/border-\[rgba\(255,255,255,0\.1\)\]/g, "border-white/[0.08]");
code = code.replace(/border-\[rgba\(255,255,255,0\.2\)\]/g, "border-white/[0.12]");

// Typography 
code = code.replace(/uppercase tracking-wider/g, "uppercase tracking-[0.15em]");
code = code.replace(/text-\[\#F5F5F7\]/g, "text-white");
code = code.replace(/text-\[rgba\(255,255,255,0\.58\)\]/g, "text-white/60");
code = code.replace(/text-\[rgba\(255,255,255,0\.78\)\]/g, "text-white/80");

// Buttons (general)
code = code.replace(/bg-\[\#F5F5F7\] hover:bg-white text-\[\#050505\]/g, "bg-white/90 hover:bg-white text-black active:scale-[0.98]");
code = code.replace(/rounded-xl/g, "rounded-2xl");

fs.writeFileSync('src/components/McpGenerator.tsx', code);
console.log('Styles injected!');
