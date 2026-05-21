const fs = require('fs');
let code = fs.readFileSync('src/components/WorkspaceDashboard.tsx', 'utf8');

// The deep search label
code = code.replace(
  'className="flex justify-between items-center mb-6 h-10"',
  'className="flex justify-between items-center mb-8 h-10 border-b border-white/[0.06] pb-5"'
);
code = code.replace(
  'className="text-[12px] uppercase tracking-widest font-bold text-white/5 flex items-center gap-2"',
  'className="text-[11px] uppercase tracking-[0.2em] font-bold text-white/50 flex items-center gap-2.5"'
);
code = code.replace(
  'className="text-[12px] uppercase tracking-widest font-bold text-white/50 flex items-center gap-2"',
  'className="text-[11px] uppercase tracking-[0.2em] font-bold text-white/50 flex items-center gap-2.5"'
);
code = code.replace(
  'className="text-[12px] uppercase tracking-widest font-bold text-[#F5F5F7] flex items-center gap-2"',
  'className="text-[11px] uppercase tracking-[0.2em] font-bold text-white/50 flex items-center gap-2.5"'
);


// Replace the remaining #F5F5F7 and #050505
code = code.replace(/#F5F5F7/g, 'white');
// Wait, I replaced --aura-text with #F5F5F7 initially. Let me just replace it to white to match the aesthetic.
// Wait, no #F5F5F7 is perfectly nice and Apple-like. 
// But "Deep Search" was replaced to `--aura-text-muted` which I turned to white/50, let's see.

// Synthesis Button
code = code.replace(
  'className="flex items-center gap-2 px-4 py-2 bg-white text-[#050505] rounded-full text-xs font-semibold hover:bg-[rgba(255,255,255,0.9)] transition-all shadow-md active:scale-95 disabled:opacity-50 tracking-wide"',
  'className="flex items-center gap-2.5 px-6 py-2.5 bg-white text-black font-bold uppercase tracking-[0.1em] rounded-full hover:bg-[#F5F5F7] transition-all duration-300 text-[11px] shadow-[0_0_30px_rgba(255,255,255,0.1)] active:scale-[0.98] disabled:opacity-50"'
);

// Doc item styling
code = code.replace(
  'className={`w-12 h-12 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 shrink-0 relative',
  'className={`w-12 h-12 flex items-center justify-center rounded-2xl bg-white/[0.04] border border-white/[0.08] shadow-inner shrink-0 relative'
);

// Ask AI buttons
code = code.replace(
  'className="text-[11px] opacity-0 group-hover:opacity-100 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/10 hover:bg-white/20 text-white transition-all tracking-wide"',
  'className="text-[10px] uppercase font-bold tracking-widest opacity-0 group-hover:opacity-100 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"'
);

// Empty states
code = code.replace(
  'className="text-center py-20 px-6 bg-[#030303] border border-white/[0.05] shadow-[0_0_20px_rgba(0,0,0,0.5)] backdrop-blur-2xl rounded-2xl border border-white/5 border-dashed bg-white/[0.02]"',
  'className="text-center py-24 px-6 bg-gradient-to-b from-white/[0.02] to-transparent rounded-[24px] border border-white/[0.05] shadow-[0_0_40px_rgba(255,255,255,0.02)] backdrop-blur-3xl"'
);

code = code.replace(
  'className="text-[16px] text-white font-medium tracking-tight mb-2"',
  'className="text-[18px] text-white font-semibold tracking-[-0.02em] mb-3"'
);

// Compose Modal
code = code.replace(
  'className="fixed inset-0 z-50 flex flex-col items-center justify-end sm:justify-center p-4 bg-black/40 backdrop-blur-md sm:pl-[16rem]"',
  'className="fixed inset-0 z-50 flex flex-col items-center justify-end sm:justify-center p-4 bg-black/60 backdrop-blur-2xl sm:pl-[14rem]"'
);

code = code.replace(
  'className="w-full max-w-2xl bg-[#030303] border border-white/[0.05] shadow-[0_0_20px_rgba(0,0,0,0.5)] backdrop-blur-2xl rounded-2xl sm:rounded-3xl shadow-[0_16px_64px_rgba(0,0,0,0.8)] overflow-hidden relative"',
  'className="w-full max-w-2xl bg-[#050505]/80 border border-white/10 rounded-[28px] shadow-[0_0_80px_rgba(0,0,0,0.8)] backdrop-blur-3xl overflow-hidden relative"'
);

code = code.replace(
  'className="flex items-center justify-between p-4 border-b border-white/10 bg-black/20"',
  'className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-white/[0.01]"'
);

code = code.replace(
  'className="text-[14px] font-medium text-white tracking-wide uppercase"',
  'className="text-[12px] font-bold text-white/50 tracking-[0.2em] uppercase"'
);

code = code.replace(
  'className="w-full bg-transparent border-b border-white/10 pb-3 text-[15px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-colors tracking-wide"',
  'className="w-full bg-transparent border-b border-white/5 pb-4 mb-2 text-[14px] text-white focus:outline-none focus:border-white/20 transition-all font-medium placeholder-white/30 tracking-wide"'
);

code = code.replace(
  'className="w-full bg-transparent border-b border-white/10 pb-3 text-[15px] text-white font-medium placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-colors tracking-tight"',
  'className="w-full bg-transparent border-b border-white/5 pb-4 mb-2 text-[15px] text-white focus:outline-none focus:border-white/20 transition-all font-semibold placeholder-white/30 tracking-tight"'
);

code = code.replace(
  'className="w-full bg-transparent text-[15px] text-white/80 placeholder:text-white/30 focus:outline-none resize-none min-h-[220px] mt-2 leading-relaxed tracking-wide"',
  'className="w-full bg-transparent text-[14px] text-white/80 placeholder:text-white/30 focus:outline-none resize-none min-h-[240px] mt-4 leading-relaxed font-light custom-scrollbar"'
);

fs.writeFileSync('src/components/WorkspaceDashboard.tsx', code);
console.log('Second pass applied!');
