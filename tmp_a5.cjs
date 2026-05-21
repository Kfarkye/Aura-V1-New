const fs = require('fs');
let code = fs.readFileSync('src/components/McpGenerator.tsx', 'utf8');

// The Assistant and User visual styling
code = code.replace(
  '<div className="w-6 h-6 rounded-full border border-white/[0.08] flex items-center justify-center bg-white/[0.04]">',
  '<div className="w-8 h-8 rounded-full bg-gradient-to-tr from-white/10 to-white/[0.02] border border-white/10 flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.05)] backdrop-blur-xl">'
);
code = code.replace(
  '<div className="w-1.5 h-1.5 rounded-full bg-white opacity-90" />',
  '<div className="w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" />'
);

code = code.replace(
  '<div className="w-6 h-6 rounded-full bg-[rgba(255,255,255,0.1)] flex items-center justify-center">',
  '<div className="w-8 h-8 rounded-full bg-black flex items-center justify-center border border-white/10 shadow-inner">'
);
code = code.replace(
  '<User className="w-3.5 h-3.5 text-white" />',
  '<User className="w-4 h-4 text-white/80" />'
);

// Bubble text wrapper
code = code.replace(
  'className={`px-4 py-3 text-[13px] font-sans leading-relaxed whitespace-pre-wrap ${msg.role === "user" ? "bg-white/[0.04] text-white rounded-2xl rounded-tr-sm border border-white/[0.04] shadow-sm" : "text-[rgba(255,255,255,0.85)]"}`}',
  'className={`px-5 py-3.5 text-[14px] font-sans leading-relaxed whitespace-pre-wrap ${msg.role === "user" ? "bg-white/10 text-white rounded-[20px] rounded-tr-[4px] border border-white/5 shadow-2xl backdrop-blur-xl" : "text-white/90"}`}'
);

// Input box styling improvements
code = code.replace(
  'className="w-full bg-white/[0.04] border border-white/[0.08] rounded-2xl py-3.5 px-5 pr-14 text-[13px] font-medium text-white placeholder-[rgba(255,255,255,0.3)] focus:outline-none focus:border-[rgba(255,255,255,0.3)] resize-none transition-colors shadow-sm"',
  'className="w-full bg-white/[0.03] border border-white/[0.08] rounded-[24px] py-4 px-6 pr-16 text-[14px] font-medium text-white placeholder-white/30 focus:bg-white/[0.05] focus:outline-none focus:border-white/20 focus:ring-4 focus:ring-white/[0.02] resize-none transition-all duration-300 shadow-inner"'
);

// Send button
code = code.replace(
  'className="w-9 h-9 rounded-2xl bg-[rgba(255,255,255,0.08)] text-white hover:bg-[rgba(255,255,255,0.15)] disabled:opacity-30 transition-all flex items-center justify-center cursor-pointer border border-white/[0.04]"',
  'className="w-10 h-10 rounded-full bg-white text-black hover:scale-105 disabled:opacity-30 disabled:hover:scale-100 transition-all flex items-center justify-center cursor-pointer shadow-[0_0_20px_rgba(255,255,255,0.15)]"'
);

// Change the send icon color because it's on a white button now
code = code.replace(
  '<Send className="w-4 h-4 ml-0.5" />',
  '<Send className="w-4 h-4 ml-0.5 text-black" />'
);

fs.writeFileSync('src/components/McpGenerator.tsx', code);
console.log('Chat bubbles upgraded!');
