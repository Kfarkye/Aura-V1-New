const fs = require('fs');
let code = fs.readFileSync('src/components/McpGenerator.tsx', 'utf8');

// Pipeline options check style
code = code.replace(
  '<CheckCircle2 className="w-[18px] h-[18px] fill-[#F5F5F7] text-[#050505]" />',
  '<CheckCircle2 className="w-5 h-5 fill-white text-black drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]" />'
);
code = code.replace(
  '<div className="w-[18px] h-[18px] border-2 border-white/[0.12] rounded-full" />',
  '<div className="w-5 h-5 border-2 border-white/[0.15] rounded-full hover:border-white/[0.3] transition-colors" />'
);
code = code.replace(
  'className="flex items-center gap-3 p-3 rounded-2xl hover:bg-[rgba(255,255,255,0.03)] cursor-pointer transition-colors"',
  'className="flex items-center gap-4 p-3.5 rounded-2xl hover:bg-white/[0.04] cursor-pointer transition-all active:scale-[0.99] border border-transparent hover:border-white/[0.04]"'
);

// Doc Search
code = code.replace(
  'className="w-full bg-white/[0.02] border border-white/[0.06] text-white placeholder-[rgba(255,255,255,0.3)] focus:border-white/30 focus:outline-none rounded-2xl p-3.5 text-[13px] transition-colors"',
  'className="w-full bg-white/[0.02] border border-white/[0.05] text-white placeholder-white/30 focus:bg-white/[0.05] focus:border-white/20 focus:ring-4 focus:ring-white/[0.02] focus:outline-none rounded-2xl p-4 text-[14px] transition-all shadow-inner"'
);
code = code.replace(
  'className="w-full bg-white/[0.02] border border-white/[0.06] text-white placeholder-[rgba(255,255,255,0.3)] focus:border-white/30 focus:outline-none rounded-2xl p-3.5 pl-11 text-[13px] transition-colors"',
  'className="w-full bg-white/[0.02] border border-white/[0.05] text-white placeholder-white/30 focus:bg-white/[0.05] focus:border-white/20 focus:ring-4 focus:ring-white/[0.02] focus:outline-none rounded-2xl p-4 pl-12 text-[14px] transition-all shadow-inner"'
);

// Retrieve context button 
code = code.replace(
  'className="mt-4 w-full bg-white/90 hover:bg-white text-black active:scale-[0.98] py-3.5 rounded-2xl text-[14px] font-bold transition-all shadow-[0_0_20px_rgba(255,255,255,0.05)] disabled:opacity-50"',
  'className="mt-6 w-full bg-white hover:bg-white/90 text-black active:scale-[0.98] py-4 rounded-2xl text-[13px] font-bold uppercase tracking-[0.1em] transition-all duration-300 shadow-[0_0_30px_rgba(255,255,255,0.1)] disabled:opacity-50"'
);


fs.writeFileSync('src/components/McpGenerator.tsx', code);
console.log('Polished up inputs!');
