const fs = require('fs');

let code = fs.readFileSync('src/components/McpGenerator.tsx', 'utf-8');

// Replace the root div and 1. LEFT PANE and 2. CENTER PANE
const replaceStart = `<div className="flex h-screen w-full overflow-hidden bg-[#050505] font-sans text-[#F5F5F7]">`;
const replaceEnd = `{/* ====== MCP GENERATOR : EMPTY STATE ====== */}`;

const match = code.substring(code.indexOf(replaceStart), code.indexOf(replaceEnd) + replaceEnd.length);

const newLayoutStart = `<div className="flex w-full h-full overflow-hidden gap-4 bg-[#050505] font-sans text-[#F5F5F7]">
      {/* LEFT PANE: Main Toolchain Workspace */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10 bg-[#050505] overflow-hidden border-r border-[rgba(255,255,255,0.08)]">
        
        {/* Top Navigation Bar */}
        <div className="flex bg-[#0B0B0D] border-b border-[rgba(255,255,255,0.08)] px-4 py-3 gap-2 overflow-x-auto custom-scrollbar shrink-0">
           <button onClick={() => setMode('generator')} className={\`px-4 py-2 text-[12px] font-bold rounded-lg uppercase tracking-wider transition-colors \${mode === 'generator' ? 'bg-[rgba(255,255,255,0.1)] text-white' : 'text-[rgba(255,255,255,0.5)] hover:text-white hover:bg-[rgba(255,255,255,0.05)]'}\`}>Dev</button>
           <button onClick={() => setMode('governance')} className={\`px-4 py-2 text-[12px] font-bold rounded-lg uppercase tracking-wider transition-colors \${mode === 'governance' ? 'bg-[rgba(255,255,255,0.1)] text-white' : 'text-[rgba(255,255,255,0.5)] hover:text-white hover:bg-[rgba(255,255,255,0.05)]'}\`}>Gov</button>
           <button onClick={() => setMode('sandbox')} className={\`px-4 py-2 text-[12px] font-bold rounded-lg uppercase tracking-wider transition-colors \${mode === 'sandbox' ? 'bg-[rgba(255,255,255,0.1)] text-white' : 'text-[rgba(255,255,255,0.5)] hover:text-white hover:bg-[rgba(255,255,255,0.05)]'}\`}>Sandbox</button>
           <button onClick={() => setMode('vault')} className={\`px-4 py-2 text-[12px] font-bold rounded-lg uppercase tracking-wider transition-colors \${mode === 'vault' ? 'bg-[rgba(255,255,255,0.1)] text-white' : 'text-[rgba(255,255,255,0.5)] hover:text-white hover:bg-[rgba(255,255,255,0.05)]'}\`}>Vault</button>
           <button onClick={() => setMode('traffic')} className={\`px-4 py-2 text-[12px] font-bold rounded-lg uppercase tracking-wider transition-colors \${mode === 'traffic' ? 'bg-[rgba(255,255,255,0.1)] text-white' : 'text-[rgba(255,255,255,0.5)] hover:text-white hover:bg-[rgba(255,255,255,0.05)]'}\`}>Traffic</button>
           <button onClick={() => setMode('registry')} className={\`px-4 py-2 text-[12px] font-bold rounded-lg uppercase tracking-wider transition-colors \${mode === 'registry' ? 'bg-[rgba(255,255,255,0.1)] text-white' : 'text-[rgba(255,255,255,0.5)] hover:text-white hover:bg-[rgba(255,255,255,0.05)]'}\`}>Registry</button>
           <button onClick={() => setMode('docs')} className={\`px-4 py-2 text-[12px] font-bold rounded-lg uppercase tracking-wider transition-colors \${mode === 'docs' ? 'bg-[rgba(255,255,255,0.1)] text-white' : 'text-[rgba(255,255,255,0.5)] hover:text-white hover:bg-[rgba(255,255,255,0.05)]'}\`}>Docs</button>
        </div>

        {/* ====== MCP GENERATOR : EMPTY STATE ====== */}`;

code = code.replace(match, newLayoutStart);

// Now change the right pane width class
const rightPaneMatch = `{/* 3. RIGHT PANE: Compact Assistant Rail */}
      <div className="w-[360px] flex-shrink-0 bg-[#0B0B0D] flex flex-col z-20 border-l border-[rgba(255,255,255,0.08)]">`;
      
const newRightPane = `{/* RIGHT PANE: AURA Assistant Chat Interface */}
      <div className="w-[400px] flex-shrink-0 bg-[#0B0B0D] flex flex-col z-20 border-l border-[rgba(255,255,255,0.08)]">`;

code = code.replace(rightPaneMatch, newRightPane);

const removeNavItemMatch = /const NavItem = \(\{[^\/\*]+;/m; // The string definition is at top
// Just let prettier handle it or not worry, since NavItem is unused it can stay or I can regex it.
// it's fine.

fs.writeFileSync('src/components/McpGenerator.tsx', code);
console.log('Layout updated.');
