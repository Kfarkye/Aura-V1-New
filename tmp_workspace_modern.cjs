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
  /className=\{\`pb-4 -mb-4 text-\[14px\] sm:text-\[15px\] font-medium transition-all flex items-center gap-2 whitespace-nowrap \$\{([^}]+)\}\`\}/g,
  function(match, condition) {
    const isMail = condition.includes('gmail');
    const isCal = condition.includes('calendar');
    const isDocs = condition.includes('docs');
    const isTasks = condition.includes('tasks');
    
    // We will parse the conditional manually for each.
    return match; // Will do this specifically below
  }
);

code = code.replace(
  /activeTab === ('[a-z]+') \? 'text-\[var\(--aura-accent\)\] border-b-2 border-\[var\(--aura-accent\)\]' : 'text-\[var\(--aura-text-muted\)\] hover:text-\[var\(--aura-text\)\]'/g,
  `activeTab === $1 ? 'text-white border-b-2 border-white' : 'text-white/40 hover:text-white/80'`
);

// Replace default glass-panels
code = code.replace(/glass-panel-hover/g, "hover:bg-white/[0.04] hover:border-white/[0.08] active:scale-[0.99] hover:shadow-[0_0_30px_rgba(255,255,255,0.02)]");
code = code.replace(/glass-panel/g, "bg-white/[0.02] border border-white/[0.04] shadow-sm backdrop-blur-2xl");


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

code = code.replace(
  'className="flex items-center gap-2 px-4 py-2 bg-[var(--aura-accent)] text-[var(--aura-bg)] rounded-full text-xs font-semibold hover:bg-[var(--aura-accent-hover)] transition-all shadow-md active:scale-95 disabled:opacity-50 tracking-wide"',
  'className="flex items-center gap-2 px-5 py-2.5 bg-white text-black rounded-full text-[11px] font-bold uppercase tracking-[0.1em] hover:bg-white/90 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-95 disabled:opacity-50"'
);

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
  'className={`text-[13px] text-white/60 leading-relaxed font-light ${expandedEmailId === msg.id ? \'\' : \'line-clamp-2\'}`}'
);

// Triage borders inside expanded email
code = code.replace(
  'className="bg-[var(--aura-bg)] rounded-xl p-5 border border-[var(--aura-border)] shadow-sm"',
  'className="bg-white/[0.02] rounded-2xl p-6 border border-white/[0.04] shadow-inner"'
);
code = code.replace(
  'className="bg-[var(--aura-bg)] rounded-xl p-5 border border-[var(--aura-border)] relative group focus-within:ring-1 focus-within:ring-white/20 transition-all shadow-sm"',
  'className="bg-white/[0.02] rounded-2xl p-6 border border-white/[0.04] relative group focus-within:border-white/20 transition-all shadow-inner"'
);

// Intelligent reply button
code = code.replace(
  'className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[var(--aura-accent)] text-[var(--aura-bg)] font-medium text-[13px] hover:bg-[var(--aura-accent-hover)] transition-all shadow-md active:scale-[0.98] disabled:opacity-50"',
  'className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-white text-black font-bold uppercase tracking-[0.1em] text-[11px] hover:bg-white/90 transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-[0.98] disabled:opacity-50"'
);

// Calendar block tweaks
code = code.replace(
  'className="flex flex-col items-center justify-center w-14 h-14 rounded-xl bg-white/5 border border-white/10 shrink-0 shadow-inner"',
  'className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.08] shrink-0 shadow-inner block"'
);
code = code.replace(
  'className="text-[11px] font-bold text-[var(--aura-text-muted)] uppercase tracking-wider"',
  'className="text-[10px] font-bold text-red-400 uppercase tracking-widest"'
);
code = code.replace(
  'className="text-[18px] font-semibold text-[var(--aura-text)] tracking-tight"',
  'className="text-[18px] font-semibold text-white tracking-tighter"'
);
code = code.replace(
  'className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--aura-accent)]/10 text-[var(--aura-accent)] text-[12px] font-medium hover:bg-[var(--aura-accent)]/20 transition-colors shrink-0"',
  'className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[11px] font-bold uppercase tracking-widest hover:bg-blue-500/20 transition-all shrink-0"'
);
code = code.replace(
  'className="w-full bg-[var(--aura-bg)] border border-[var(--aura-border)] rounded-xl p-4 text-[14px] text-[var(--aura-text)] leading-relaxed resize-y min-h-[120px] outline-none focus:ring-1 focus:ring-white/20 transition-all font-light shadow-sm"',
  'className="w-full bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 text-[14px] text-white leading-relaxed resize-y min-h-[120px] outline-none focus:border-white/20 focus:ring-4 focus:ring-white/[0.02] transition-all font-light shadow-inner placeholder-white/30"'
);

fs.writeFileSync('src/components/WorkspaceDashboard.tsx', code);
console.log('Workspace modernized!');
