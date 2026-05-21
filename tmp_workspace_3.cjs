const fs = require('fs');
let code = fs.readFileSync('src/components/WorkspaceDashboard.tsx', 'utf8');

// The Synthesis Modal
code = code.replace(
  'className="w-full max-w-4xl max-h-[85vh] flex flex-col bg-[#030303] border border-white/[0.05] shadow-[0_0_20px_rgba(0,0,0,0.5)] backdrop-blur-2xl border border-white/10 rounded-2xl sm:rounded-3xl shadow-[0_32px_128px_rgba(0,0,0,0.8)] overflow-hidden relative bg-[#050505]"',
  'className="w-full max-w-4xl max-h-[85vh] flex flex-col bg-[#050505]/95 border border-white/10 rounded-[32px] shadow-[0_40px_140px_rgba(0,0,0,0.9)] backdrop-blur-3xl overflow-hidden relative"'
);

code = code.replace(
  'className="flex items-center justify-between p-5 sm:px-8 sm:py-6 border-b border-white/10 bg-black/40"',
  'className="flex items-center justify-between p-6 sm:px-10 sm:py-8 border-b border-white/5 bg-white/[0.01]"'
);

code = code.replace(
  'className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shadow-inner"',
  'className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.2)]"'
);

code = code.replace(
  '<Sparkles className="w-4 h-4 text-white" />',
  '<Sparkles className="w-5 h-5 text-black" />'
);

code = code.replace(
  'className="text-[16px] sm:text-[18px] font-semibold text-white tracking-tight"',
  'className="text-[18px] sm:text-[22px] font-bold text-white tracking-tight"'
);

// Close Synthesis Button 
code = code.replace(
  'className="px-6 py-2.5 rounded-full text-[14px] font-medium bg-[rgba(255,255,255,0.03)] hover:bg-white/10 text-white transition-colors tracking-wide border border-white/5 shadow-sm"',
  'className="px-8 py-3 rounded-full text-[12px] font-bold uppercase tracking-[0.1em] bg-white text-black hover:bg-[#F5F5F7] transition-all duration-300 shadow-[0_0_30px_rgba(255,255,255,0.1)] active:scale-95"'
);

// One last pass to ensure the specific ask AI button is fixed (we used `text-[10px] uppercase font-bold...` in the previous pass, let's see if we can do it more broadly).
code = code.replace(
  /className="text-\[11px\] opacity-0 group-hover:opacity-100 flex items-center gap-1\.5 px-2 py-0\.5 rounded-md bg-white\/10 hover:bg-white\/20 text-white transition-all tracking-wide shrink-0[ \w-]*"/g,
  'className="text-[10px] font-bold uppercase tracking-[0.1em] opacity-0 group-hover:opacity-100 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all shadow-sm shrink-0 active:scale-95"'
);

fs.writeFileSync('src/components/WorkspaceDashboard.tsx', code);
console.log('Third pass applied!');
