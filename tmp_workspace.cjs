const fs = require('fs');
let code = fs.readFileSync('src/components/WorkspaceDashboard.tsx', 'utf8');

// The main layout background/paddings
code = code.replace(
  'className="w-full max-w-4xl mx-auto flex flex-col h-full pt-8 px-6 pb-24 relative overflow-y-auto style-scrollbar"',
  'className="w-full mx-auto max-w-5xl flex flex-col h-full pt-10 px-8 pb-32 relative overflow-y-auto custom-scrollbar font-sans"'
);

// Tab Navigation
code = code.replace(
  'className="flex items-end justify-between mb-8 pb-4 border-b border-white/10"',
  'className="flex items-end justify-between mb-10 pb-5 border-b border-white/[0.06]"'
);

// Tab buttons style
code = code.replace(
  /activeTab === ('[a-z]+') \? 'text-\[var\(--aura-accent\)\] border-b-2 border-\[var\(--aura-accent\)\]' : 'text-\[var\(--aura-text-muted\)\] hover:text-\[var\(--aura-text\)\]'/g,
  `activeTab === $1 ? 'text-white border-b-2 border-white' : 'text-white/40 hover:text-white/80'`
);

// Replace default glass-panels
code = code.replace(/glass-panel-hover/g, "hover:bg-white/[0.04] hover:shadow-[0_0_40px_rgba(255,255,255,0.03)] active:scale-[0.99] border hover:border-white/[0.08] transition-all duration-300");
code = code.replace(/glass-panel/g, "bg-[#030303] border border-white/[0.05] shadow-[0_0_20px_rgba(0,0,0,0.5)] backdrop-blur-2xl");

// Variables replace
code = code.replace(/var\(--aura-bg\)/g, "#050505");
code = code.replace(/var\(--aura-border\)/g, "rgba(255,255,255,0.06)");
code = code.replace(/var\(--aura-accent\)/g, "white");
code = code.replace(/var\(--aura-accent-hover\)/g, "rgba(255,255,255,0.9)");
code = code.replace(/var\(--aura-text\)/g, "#F5F5F7");
code = code.replace(/var\(--aura-text-muted\)/g, "rgba(255,255,255,0.5)");
code = code.replace(/var\(--aura-muted\)/g, "rgba(255,255,255,0.03)");

// Specific button upgrades
code = code.replace(
  'className="flex items-center gap-2 px-4 py-2 bg-white text-black font-medium rounded-lg hover:bg-white/90 transition-all text-[13px] shadow-sm hover:scale-[1.02] active:scale-[0.98] tracking-tight"',
  'className="flex items-center gap-2.5 px-6 py-2.5 bg-white text-black font-bold uppercase tracking-[0.1em] rounded-full hover:bg-white/90 transition-all duration-300 text-[11px] shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-[0.98]"'
);

code = code.replace(/style-scrollbar/g, 'custom-scrollbar');

// Refine email list styles
code = code.replace(
  'className="flex gap-4"',
  'className="flex gap-5 items-start"'
);

code = code.replace(
  'className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-white/10 to-transparent border border-white/10 flex items-center justify-center shadow-inner"',
  'className="flex-shrink-0 w-11 h-11 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shadow-inner"'
);

code = code.replace(
  'className="text-lg font-medium text-[var(--aura-text)]"',
  'className="text-[16px] font-bold text-white"'
);

code = code.replace(
  'className="text-[14px] font-semibold text-[var(--aura-text)] truncate tracking-tight"',
  'className="text-[14px] font-bold text-white truncate tracking-wider"'
);

code = code.replace(
  'className="text-[14px] sm:text-[15px] font-medium text-[var(--aura-text)] line-clamp-1 tracking-tight mb-1"',
  'className="text-[14px] font-semibold text-white/90 line-clamp-1 tracking-wide mb-1"'
);

code = code.replace(
  'className={`text-[13px] sm:text-[14px] text-[var(--aura-text-muted)] leading-relaxed ${expandedEmailId === msg.id ? \'\' : \'line-clamp-2\'}`}',
  'className={`text-[13px] text-white/70 leading-relaxed font-light ${expandedEmailId === msg.id ? \'\' : \'line-clamp-2\'}`}'
);

fs.writeFileSync('src/components/WorkspaceDashboard.tsx', code);
console.log('Done!');
