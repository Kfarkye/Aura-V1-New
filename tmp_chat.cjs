const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Upgrade Empty state
code = code.replace(
  'rotate-[-1deg] scale-95 transition-all duration-1000',
  'transition-all duration-1000 scale-[0.98]'
);

code = code.replace(
  '<div className="w-16 h-16 rounded-full border-[8px] border-[white]/10 box-border mb-6 shadow-[0_0_40px_rgba(255,255,255,0.05)]" />',
  '<div className="w-16 h-16 rounded-full border-[1.5px] border-white/20 box-border mb-8 shadow-[0_0_80px_rgba(255,255,255,0.1)] flex items-center justify-center"><div className="w-6 h-6 bg-white rounded-full shadow-[0_0_20px_rgba(255,255,255,1)]" /></div>'
);

code = code.replace(
  'className="text-3xl font-light tracking-tight text-[rgba(255,255,255,0.5)] text-center"',
  'className="text-3xl sm:text-[40px] font-semibold tracking-[-0.04em] text-white text-center leading-tight"'
);

// The model avatar icon
code = code.replace(
  '<div className="w-7 h-7 shrink-0 rounded-full border-[2px] border-white/80 box-border shadow-[0_0_15px_rgba(255,255,255,0.15)] opacity-90 backdrop-blur-md flex items-center justify-center mt-1">\n                            <div className="w-3 h-3 rounded-full bg-white/20" />',
  '<div className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-tr from-white/10 to-white/[0.02] border border-white/10 flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.05)] backdrop-blur-xl mt-1">\n                            <div className="w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" />'
);

// The bubble check 
code = code.replace(
  /bg-white\/\[0\.03\] border border-white\/\[0\.04\] shadow-\[0_0_20px_rgba\(0,0,0,0\.5\)\] backdrop-blur-2xl py-2\.5 px-4 rounded-\[20px\] rounded-tr-\[4px\]/g,
  'bg-white/10 border border-white/5 shadow-2xl backdrop-blur-xl px-5 py-3.5 rounded-[20px] rounded-tr-[4px]'
);

fs.writeFileSync('src/App.tsx', code);
