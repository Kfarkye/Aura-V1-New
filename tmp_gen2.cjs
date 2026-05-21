const fs = require('fs');

const NavItemBlock = `
  const NavItem = ({ label, active, onClick, icon: Icon, badge }: any) => (
    <button 
      onClick={onClick} 
      className={\`flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-300 \${active ? 'bg-[rgba(255,255,255,0.1)] text-[#F5F5F7]' : 'text-[rgba(255,255,255,0.58)] hover:bg-[rgba(255,255,255,0.05)] hover:text-[#F5F5F7]'}\`}
    >
      <div className="flex items-center gap-3">
        <Icon className={\`w-[16px] h-[16px] \${active ? 'text-[#F5F5F7] stroke-[2.5]' : 'opacity-70 stroke-2'}\`} /> 
        {label}
      </div>
      {badge > 0 && <span className="bg-[#FF3B30]/20 border border-[#FF3B30]/30 text-[#FF3B30] text-[10px] px-1.5 py-0.5 font-bold rounded-full">{badge}</span>}
    </button>
  );
`;

const jsx = `
  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#050505] font-sans text-[#F5F5F7]">
      
      {/* 1. LEFT PANE: Sidebar Command Center */}
      <div className="w-[240px] flex-shrink-0 bg-[#0B0B0D] flex flex-col z-20 border-r border-[rgba(255,255,255,0.08)]">
        {/* Header Logo */}
        <div className="px-5 py-6 pb-6 tracking-tight flex-shrink-0">
          <h1 className="text-[20px] font-sans font-semibold tracking-tight text-[#F5F5F7] mb-1 flex items-center gap-2">AURA</h1>
          <p className="text-[9px] font-mono mt-1 text-[rgba(255,255,255,0.58)] tracking-[0.15em] font-bold uppercase">Toolchain Core</p>
        </div>
        
        {/* Main Navigation */}
        <div className="px-3 pb-4 space-y-1 flex-shrink-0">
          <NavItem label="Dev Generator" active={mode === 'generator'} onClick={() => setMode('generator')} icon={Terminal} />
          <NavItem label="Gov. Engine" active={mode === 'governance'} onClick={() => setMode('governance')} icon={ShieldAlert} badge={governanceRules.length} />
          <NavItem label="Execution" active={mode === 'sandbox'} onClick={() => setMode('sandbox')} icon={Cpu} />
          <NavItem label="Secrets Vault" active={mode === 'vault'} onClick={() => setMode('vault')} icon={Key} />
          <NavItem label="Live Traffic" active={mode === 'traffic'} onClick={() => setMode('traffic')} icon={Activity} />
          <NavItem label="Tool Registry" active={mode === 'registry'} onClick={() => setMode('registry')} icon={Database} badge={registry.length > 0 ? registry.length : undefined} />
          <NavItem label="Docs Indexer" active={mode === 'docs'} onClick={() => setMode('docs')} icon={FolderSearch} />
        </div>
      </div>

      {/* 2. CENTER PANE: Main Toolchain Workspace */}
      <div className="flex-1 flex flex-col min-w-[520px] relative z-10 bg-[#050505] overflow-hidden">
        
        {/* ====== MCP GENERATOR : EMPTY STATE ====== */}
        {mode === 'generator' && files.length === 0 && (
          <div className="flex-1 overflow-y-auto px-12 py-16 custom-scrollbar">
            <div className="max-w-2xl mx-auto space-y-8">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-[#F5F5F7] mb-2">Generate an MCP Server</h2>
                <p className="text-[14px] text-[rgba(255,255,255,0.58)] font-medium">Paste an OpenAPI URL or describe the API. AURA will generate a governed MCP package.</p>
              </div>

              <div className="space-y-6 bg-[#111114] border border-[rgba(255,255,255,0.08)] rounded-2xl p-8 shadow-sm">
                <div>
                  <label className="text-[11px] font-bold text-[rgba(255,255,255,0.58)] uppercase tracking-wider block mb-2">Target Server Name</label>
                  <input 
                    type="text" value={name} onChange={e => setName(e.target.value)}
                    className="w-full bg-[#050505] border border-[rgba(255,255,255,0.08)] text-[#F5F5F7] placeholder-[rgba(255,255,255,0.3)] focus:border-[rgba(255,255,255,0.2)] focus:outline-none rounded-xl p-3.5 text-[13px] font-medium transition-colors"
                    placeholder="e.g. kalshi"
                  />
                </div>
                
                <div>
                  <label className="text-[11px] font-bold text-[rgba(255,255,255,0.58)] uppercase tracking-wider block mb-2">OpenAPI Spec URL</label>
                  <input 
                    type="url" value={specUrl} onChange={e => setSpecUrl(e.target.value)}
                    className="w-full bg-[#050505] border border-[rgba(255,255,255,0.08)] text-[#F5F5F7] placeholder-[rgba(255,255,255,0.3)] focus:border-[rgba(255,255,255,0.2)] focus:outline-none rounded-xl p-3.5 text-[13px] font-medium transition-colors"
                    placeholder="https://api.example.com/openapi.json"
                  />
                </div>
                
                <div>
                  <label className="text-[11px] font-bold text-[rgba(255,255,255,0.58)] uppercase tracking-wider block mb-2">Or Paste Raw Spec</label>
                  <textarea 
                    value={specContent} onChange={e => setSpecContent(e.target.value)}
                    className="w-full h-32 bg-[#050505] border border-[rgba(255,255,255,0.08)] text-[#F5F5F7] placeholder-[rgba(255,255,255,0.3)] focus:border-[rgba(255,255,255,0.2)] focus:outline-none rounded-xl p-3.5 text-[12px] font-mono resize-none custom-scrollbar transition-colors"
                    placeholder="openapi: 3.0.0..."
                  />
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] font-bold text-[rgba(255,255,255,0.58)] uppercase tracking-wider border-b border-[rgba(255,255,255,0.08)] pb-2 mb-3">Pipeline Options</div>
                  {Object.entries(options).map(([key, value]) => (
                    <div 
                      key={key} onClick={() => setOptions(o => ({ ...o, [key]: !(o as any)[key] }))}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-[rgba(255,255,255,0.03)] cursor-pointer transition-colors"
                    >
                      <div className="flex items-center">
                        {value ? <CheckCircle2 className="w-[18px] h-[18px] fill-[#F5F5F7] text-[#050505]" /> : <div className="w-[18px] h-[18px] border-2 border-[rgba(255,255,255,0.2)] rounded-full" />}
                      </div>
                      <div className="text-[13px] font-sans tracking-tight text-[rgba(255,255,255,0.85)]">
                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </div>
                    </div>
                  ))}
                </div>

                <button 
                  onClick={handleGenerate}
                  disabled={isLoading || (!specUrl && !specContent)}
                  className="w-full bg-[#F5F5F7] hover:bg-white text-[#050505] font-semibold tracking-wide py-4 px-4 rounded-xl text-[14px] flex items-center justify-center transition-all disabled:opacity-50 mt-4 shadow-[0_0_20px_rgba(255,255,255,0.05)] border border-transparent"
                >
                  <span className="font-bold">{isLoading ? 'Processing...' : 'Generate MCP Package'}</span>
                  {!isLoading && <Send className="w-4 h-4 ml-2" />}
                </button>
              </div>

              <div className="pt-2">
                <label className="text-[11px] font-bold text-[rgba(255,255,255,0.58)] uppercase tracking-wider block mb-4 border-b border-[rgba(255,255,255,0.08)] pb-2">Quick Examples</label>
                <div className="flex gap-3 flex-wrap">
                  {['Stripe API', 'Kalshi API', 'ESPN Scoreboard', 'GitHub API'].map(ex => (
                    <button key={ex} className="px-5 py-2.5 bg-[#111114] rounded-full border border-[rgba(255,255,255,0.08)] text-[12px] font-semibold text-[rgba(255,255,255,0.78)] hover:bg-[rgba(255,255,255,0.1)] hover:text-white transition-colors cursor-pointer shadow-sm">
                      {ex}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="p-4 rounded-xl bg-[rgba(244,63,94,0.1)] text-rose-400 border border-rose-500/20 mt-6 text-[13px] flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-rose-500" />
                  <div className="leading-relaxed font-medium">{error}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ====== MCP GENERATOR : ARTIFACT VIEWER ====== */}
        {mode === 'generator' && files.length > 0 && (
          <div className="flex-1 flex flex-col h-full bg-[#050505]">
            {/* Context Bar */}
            <div className="h-[76px] shrink-0 border-b border-[rgba(255,255,255,0.08)] bg-[#0B0B0D] px-6 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] flex items-center justify-center">
                  <Terminal className="w-5 h-5 text-[#F5F5F7]" />
                </div>
                <div>
                  <h3 className="text-[14px] font-bold text-[#F5F5F7] tracking-wider font-mono">aura-{name.toLowerCase() || 'package'}-mcp</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] uppercase font-bold text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded tracking-widest border border-emerald-400/20">Guarded Read-Only</span>
                    <span className="text-[10px] text-[rgba(255,255,255,0.4)] font-medium">Lint check passed</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2.5">
                 <button onClick={() => {
                     setMode('sandbox');
                     handlePublishToRegistry();
                     setTimeout(() => handleBootSandbox(), 100);
                  }} className="flex items-center gap-2 text-[11px] font-bold text-emerald-400 bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.2)] hover:bg-[rgba(16,185,129,0.15)] transition-colors px-3 py-2 rounded-full uppercase tracking-wider">
                   <Play className="w-3.5 h-3.5"/> Run Local
                 </button>
                 <button onClick={handlePublishToRegistry} className="flex items-center gap-2 text-[11px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/15 transition-colors px-3 py-2 rounded-full uppercase tracking-wider">
                   <Database className="w-3.5 h-3.5"/> Publish Tools
                 </button>
                 <button onClick={handleShipToGithub} disabled={isShipping} className="flex items-center gap-2 text-[11px] font-bold text-[#F5F5F7] bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.1)] transition-colors px-3 py-2 rounded-full disabled:opacity-50 uppercase tracking-wider">
                   <Rocket className="w-3.5 h-3.5"/> {isShipping ? 'Pushing...' : 'Ship to GitHub'}
                 </button>
                 <button onClick={handleDownload} className="flex items-center gap-2 text-[11px] font-bold text-[rgba(255,255,255,0.6)] hover:text-white transition-colors px-3 py-2 hover:bg-[rgba(255,255,255,0.05)] rounded-full uppercase tracking-wider cursor-pointer border border-transparent">
                   <Download className="w-3.5 h-3.5"/> Download
                 </button>
              </div>
            </div>
            
            <div className="flex-1 flex min-h-0">
              {/* File Tree */}
              <div className="w-[260px] shrink-0 border-r border-[rgba(255,255,255,0.08)] bg-[#0B0B0D] flex flex-col">
                <div className="px-4 py-4 border-b border-[rgba(255,255,255,0.08)]">
                  <span className="text-[10px] font-mono font-bold text-[rgba(255,255,255,0.7)] px-2 py-1.5 bg-[#111114] rounded-lg border border-[rgba(255,255,255,0.08)] block truncate uppercase tracking-widest text-center shadow-sm">
                    Project Workspace
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-0.5 custom-scrollbar">
                  {files.map(file => (
                    <div 
                      key={file.path} onClick={() => setSelectedFile(file.path)}
                      className={\`px-3 py-2 rounded-lg text-[12px] font-mono cursor-pointer flex items-center gap-3 transition-all \${selectedFile === file.path ? 'bg-[rgba(255,255,255,0.1)] text-[#F5F5F7] font-semibold' : 'text-[rgba(255,255,255,0.5)] hover:bg-[rgba(255,255,255,0.03)] hover:text-[#F5F5F7] font-medium'}\`}
                    >
                      <FileText className={\`w-3.5 h-3.5 shrink-0 \${selectedFile === file.path ? 'opacity-100' : 'opacity-40'}\`} />
                      <span className="truncate">{file.path.split('/').pop()}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Editor */}
              <div className="flex-1 flex flex-col bg-[#050505] min-w-0">
                <div className="h-11 border-b border-[rgba(255,255,255,0.08)] px-5 flex items-center bg-[#0B0B0D] shrink-0 justify-between">
                  <span className="font-mono text-[11px] text-[rgba(255,255,255,0.4)] tracking-wider">
                    {files.find(f => f.path === selectedFile)?.path || "No file selected"}
                  </span>
                </div>
                <div className="flex-1 overflow-auto p-6 custom-scrollbar bg-[#0B0B0D] shadow-[inset_0_2px_20px_rgba(0,0,0,0.5)]">
                  <pre className="font-mono text-[13px] text-[#F5F5F7] leading-relaxed">
                    <code>{files.find(f => f.path === selectedFile)?.content || ""}</code>
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ====== DOCS VIEW ====== */}
        {mode === 'docs' && (
           <div className="flex-1 overflow-y-auto px-12 py-16 custom-scrollbar">
            <div className="max-w-2xl mx-auto space-y-8">
              <div className="mb-8 border-b border-[rgba(255,255,255,0.08)] pb-6">
                 <h2 className="text-2xl font-semibold tracking-tight text-[#F5F5F7] mb-2 flex items-center gap-3">
                   <FolderSearch className="w-7 h-7 text-[#F5F5F7]" /> Doc Retrieval
                 </h2>
                 <p className="font-sans text-[14px] font-medium text-[rgba(255,255,255,0.58)]">Query the real-time indexed knowledge base for documentation and code context.</p>
               </div>

               <div className="space-y-6 bg-[#111114] border border-[rgba(255,255,255,0.08)] rounded-2xl p-8 shadow-sm">
                  <div>
                    <label className="text-[11px] font-bold text-[rgba(255,255,255,0.58)] uppercase tracking-wider block mb-2">Local Directory Path</label>
                    <input 
                      type="text" value={docsDir} onChange={e => setDocsDir(e.target.value)}
                      className="w-full bg-[#050505] border border-[rgba(255,255,255,0.08)] text-[#F5F5F7] placeholder-[rgba(255,255,255,0.3)] focus:border-white/30 focus:outline-none rounded-xl p-3.5 text-[13px] transition-colors"
                      placeholder="./docs"
                    />
                    <button 
                      onClick={handleIndexDocs} disabled={isLoading}
                      className="mt-3 w-full bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.08)] text-[#F5F5F7] py-3.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                    >
                      {isLoading ? 'Indexing...' : 'Build Index'}
                    </button>
                  </div>

                  {indexStats && (
                    <div className="p-4 bg-[rgba(16,185,129,0.05)] border border-emerald-500/20 rounded-xl flex justify-between items-center relative overflow-hidden">
                      <span className="text-[11px] font-bold uppercase text-emerald-400 tracking-wider">Live Index Active</span>
                      <span className="font-mono text-[13px] text-emerald-400">{indexStats.count} files</span>
                    </div>
                  )}

                  <div className="border-t border-[rgba(255,255,255,0.08)] pt-6 mt-2">
                    <label className="text-[11px] font-bold text-[rgba(255,255,255,0.58)] uppercase tracking-wider block mb-3">Search Pattern</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                         <Search className="h-4 w-4 text-[rgba(255,255,255,0.58)]" />
                      </div>
                      <input 
                        type="text" value={docsQuery} onChange={e => setDocsQuery(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSearchDocs()}
                        className="w-full bg-[#050505] border border-[rgba(255,255,255,0.08)] text-[#F5F5F7] placeholder-[rgba(255,255,255,0.3)] focus:border-white/30 focus:outline-none rounded-xl p-3.5 pl-11 text-[13px] transition-colors"
                        placeholder="e.g. rate limits"
                      />
                    </div>
                    <button 
                      onClick={handleSearchDocs} disabled={isSearching || !indexStats}
                      className="mt-4 w-full bg-[#F5F5F7] hover:bg-white text-[#050505] py-3.5 rounded-xl text-[14px] font-bold transition-all shadow-[0_0_20px_rgba(255,255,255,0.05)] disabled:opacity-50"
                    >
                      Retrieve Context
                    </button>
                  </div>
               </div>

               {searchResults.length > 0 && (
                 <div className="space-y-4 pt-6">
                   <div className="text-[11px] font-bold text-[rgba(255,255,255,0.4)] uppercase tracking-widest mb-3 border-b border-[rgba(255,255,255,0.08)] pb-2 block">Found {searchResults.length} Results</div>
                   {searchResults.map((result, i) => (
                     <div key={i} className="border border-[rgba(255,255,255,0.08)] rounded-xl p-6 bg-[#111114] shadow-sm">
                       <div className="font-mono text-[11px] font-semibold text-[#F5F5F7] mb-3 bg-[rgba(255,255,255,0.05)] inline-block px-3 py-1.5 rounded-lg border border-[rgba(255,255,255,0.1)]">
                         {result.path}
                       </div>
                       <p className="font-sans text-[14px] leading-[1.7] text-[rgba(255,255,255,0.8)]">
                         ...{result.snippet}...
                       </p>
                     </div>
                   ))}
                 </div>
               )}
            </div>
           </div>
        )}

        {/* ====== GOVERNANCE VIEW ====== */}
        {mode === 'governance' && (
           <div className="flex-1 overflow-y-auto p-12 max-w-4xl mx-auto w-full custom-scrollbar">
             <div className="mb-10 text-left border-b border-[rgba(255,255,255,0.08)] pb-8">
               <h2 className="text-2xl font-semibold tracking-tight text-[#F5F5F7] mb-2 flex items-center gap-3">
                 <ShieldAlert className="w-7 h-7 text-rose-400" /> API Governance
               </h2>
               <p className="text-[14px] text-[rgba(255,255,255,0.58)] font-medium">Define dynamic validation policies injected directly into the artifact compilation pipeline.</p>
             </div>

             <div className="space-y-4 mb-10">
               {governanceRules.map((rule) => (
                 <div key={rule.id} className={\`border \${rule.active ? 'border-rose-500/30' : 'border-[rgba(255,255,255,0.08)]'} rounded-2xl bg-[#111114] flex flex-col overflow-hidden transition-all\`}>
                   <div className={\`flex items-center justify-between border-b \${rule.active ? 'border-rose-500/20 bg-rose-500/5' : 'border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)]'} px-6 py-5\`}>
                     <div className="font-mono text-[13px] font-semibold flex items-center gap-3 text-[#F5F5F7]">
                       <div className={\`w-2.5 h-2.5 rounded-full \${rule.active ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]' : 'bg-[rgba(255,255,255,0.2)]'}\`} />
                       {rule.name}
                     </div>
                     <div className="flex items-center gap-4">
                       <span className={\`px-3 py-1 text-[10px] uppercase font-bold rounded-lg tracking-wider border \${rule.action === 'DENY' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}\`}>
                         {rule.action}
                       </span>
                       <button onClick={() => setGovernanceRules(governanceRules.map(r => r.id === rule.id ? { ...r, active: !r.active } : r))} className={\`text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg border \${rule.active ? 'text-rose-400 border-rose-500/20 hover:bg-rose-500/10' : 'text-[rgba(255,255,255,0.5)] border-[rgba(255,255,255,0.1)] hover:text-white hover:bg-[rgba(255,255,255,0.05)]'} transition-colors\`}>
                          {rule.active ? 'Disable' : 'Enable'}
                       </button>
                     </div>
                   </div>
                   <div className="p-6 flex items-center gap-4">
                     <div className="font-mono text-[12px] text-[#F5F5F7] bg-[#050505] px-5 py-4 rounded-xl border border-[rgba(255,255,255,0.08)] w-full text-[rgba(255,255,255,0.8)]">
                        <span className="text-[#a78bfa] font-semibold">if</span> ( {rule.condition} ) {'{'} <span className="text-rose-400 font-semibold">return Reject()</span>; {'}'}
                     </div>
                   </div>
                 </div>
               ))}
             </div>

             <div className="bg-[#111114] border border-[rgba(255,255,255,0.08)] rounded-2xl p-6 shadow-sm">
                <h3 className="text-[12px] font-bold text-[rgba(255,255,255,0.8)] mb-4 flex items-center gap-2 uppercase tracking-wider">
                   <Terminal className="w-4 h-4 ml-1" /> Inject New Policy
                </h3>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-[#050505] border border-[rgba(255,255,255,0.08)] rounded-xl flex items-center px-4 py-3.5 focus-within:border-[rgba(255,255,255,0.3)] transition-colors">
                     <span className="text-[14px] font-mono text-[#a78bfa] font-semibold mr-2 shrink-0">if (</span>
                     <input
                       type="text"
                       value={newRuleStr}
                       onChange={(e) => setNewRuleStr(e.target.value)}
                       placeholder="tool.name.includes('create')"
                       className="flex-1 min-w-0 font-mono text-[14px] bg-transparent text-[#F5F5F7] focus:outline-none placeholder:text-[rgba(255,255,255,0.2)]"
                     />
                     <span className="text-[14px] font-mono text-[#a78bfa] font-semibold ml-2 shrink-0">)</span>
                  </div>
                  <button onClick={handleAddRule} disabled={!newRuleStr.trim()} className="bg-[#F5F5F7] hover:bg-white text-[#050505] font-semibold text-[13px] px-6 py-3.5 rounded-xl transition-all border-0 disabled:opacity-50 shadow-[0_0_20px_rgba(255,255,255,0.05)]">
                    Add Rule
                  </button>
                </div>
             </div>
           </div>
        )}

        {/* ====== REGISTRY VIEW ====== */}
        {mode === 'registry' && (
           <div className="flex-1 overflow-y-auto p-12 max-w-5xl mx-auto w-full custom-scrollbar">
            <div className="mb-10 text-left border-b border-[rgba(255,255,255,0.08)] pb-8">
               <h2 className="text-2xl font-semibold tracking-tight text-[#F5F5F7] mb-2 flex items-center gap-3">
                 <Database className="w-7 h-7 text-[#F5F5F7]" /> Tool Registry
               </h2>
               <p className="text-[14px] text-[rgba(255,255,255,0.58)] font-medium">Dynamic tool attachment for the AURA Assistant. Published MCP servers are available globally.</p>
             </div>

             {registry.length === 0 ? (
               <div className="flex flex-col items-center justify-center py-24 opacity-50 bg-[#111114] rounded-3xl mx-12 border border-[rgba(255,255,255,0.08)]">
                 <Database className="w-12 h-12 mb-6 stroke-1 text-[rgba(255,255,255,0.5)]" />
                 <p className="font-sans text-[14px] text-[rgba(255,255,255,0.6)] font-medium">No tools registered yet. Generate and publish one.</p>
               </div>
             ) : (
               <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                 {registry.map((tool, i) => (
                   <div key={i} className="border border-[rgba(255,255,255,0.08)] rounded-2xl p-6 bg-[#111114] relative overflow-hidden group shadow-sm hover:border-[rgba(255,255,255,0.15)] transition-colors">
                     <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                        <Globe className="w-32 h-32 stroke-[1]" />
                     </div>
                     <div className="flex items-start justify-between mb-5">
                       <div className="flex items-center gap-4">
                         <div className="w-11 h-11 rounded-xl bg-[rgba(255,255,255,0.05)] flex items-center justify-center border border-[rgba(255,255,255,0.08)]">
                            <Network className="w-5 h-5 text-[#F5F5F7]" />
                         </div>
                         <div>
                           <h3 className="font-bold text-[14px] text-[#F5F5F7] tracking-wider font-mono">{tool.name} Server</h3>
                           <span className={\`inline-block mt-1.5 px-2 py-0.5 text-[9px] font-bold rounded tracking-widest uppercase border \${tool.status.includes('Cloud') ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}\`}>
                             {tool.status}
                           </span>
                         </div>
                       </div>
                     </div>
                     <p className="font-sans text-[13px] leading-relaxed text-[rgba(255,255,255,0.6)] mb-6 font-medium">
                       {tool.description}
                     </p>
                     
                     {tool.endpoint ? (
                        <div className="bg-[#050505] rounded-xl p-4 border border-[rgba(255,255,255,0.08)]">
                           <div className="text-[10px] font-bold text-[rgba(255,255,255,0.4)] uppercase tracking-widest mb-2 flex items-center gap-1.5">
                             <Cloud className="w-3.5 h-3.5" /> Cloud Endpoint
                           </div>
                           <div className="font-mono text-[11px] text-[rgba(255,255,255,0.9)] bg-[#111114] px-3 py-2 rounded-lg border border-[rgba(255,255,255,0.05)] truncate select-all">
                             {tool.endpoint}
                           </div>
                        </div>
                     ) : (
                        <div className="bg-amber-500/10 rounded-xl p-4 border border-amber-500/20">
                           <div className="text-[12px] font-medium text-amber-400">
                             Running in Sandbox Engine only. Deploy to cloud for global endpoint.
                           </div>
                        </div>
                     )}
                   </div>
                 ))}
               </div>
             )}
           </div>
        )}

        {/* ====== VAULT VIEW ====== */}
        {mode === 'vault' && (
           <div className="flex-1 overflow-y-auto p-12 max-w-4xl mx-auto w-full custom-scrollbar">
            <div className="mb-10 text-left border-b border-[rgba(255,255,255,0.08)] pb-8">
               <h2 className="text-2xl font-semibold tracking-tight text-[#F5F5F7] mb-2 flex items-center gap-3">
                 <Key className="w-7 h-7 text-amber-400" /> Secrets Vault
               </h2>
               <p className="text-[14px] text-[rgba(255,255,255,0.58)] font-medium">Securely prompt and inject OAuth/API keys directly into the live WebContainer or Deployment environment.</p>
             </div>
             
             <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 mb-8 flex gap-4 text-amber-400 item-center shadow-[0_4px_20px_rgba(251,191,36,0.05)]">
                <ShieldAlert className="w-5 h-5 shrink-0" />
                <p className="text-[13px] font-medium leading-[1.6]">Vault keys are stored securely in-memory and are never written to the disk of the generated bundle. They are passed directly injected via environment variables at runtime.</p>
             </div>

             <div className="space-y-4">
               {secrets.map((secret) => (
                 <div key={secret.id} className="border border-[rgba(255,255,255,0.08)] rounded-2xl bg-[#111114] flex items-center justify-between p-4 px-6 relative overflow-hidden shadow-sm">
                    {secret.isSet && <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />}
                    <div className="flex items-center gap-4">
                      <div className={\`p-2.5 rounded-xl \${secret.isSet ? 'bg-emerald-500/10 text-emerald-400' : 'bg-[rgba(255,255,255,0.05)] text-[rgba(255,255,255,0.4)]'}\`}>
                         <Key className="w-4 h-4" />
                      </div>
                      <div className="font-mono text-[13px] font-bold text-[#F5F5F7] tracking-wider uppercase">
                        {secret.key}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 max-w-[360px] w-full">
                      <input
                        type={secret.isSet ? "password" : "text"}
                        placeholder={secret.isSet ? "••••••••••••••••" : "Paste secret key..."}
                        value={secret.value}
                        onChange={(e) => setSecrets(secrets.map(s => s.id === secret.id ? { ...s, value: e.target.value } : s))}
                        disabled={secret.isSet}
                        className="flex-1 min-w-0 bg-[#050505] border border-[rgba(255,255,255,0.08)] rounded-xl px-4 py-3 text-[13px] font-mono text-[#F5F5F7] focus:outline-none focus:border-[rgba(255,255,255,0.3)] disabled:opacity-50 transition-colors"
                      />
                      {!secret.isSet ? (
                        <button onClick={() => handleSaveSecret(secret.id)} className="bg-[rgba(255,255,255,0.9)] hover:bg-white text-[#050505] text-[12px] font-bold px-6 py-3 rounded-xl transition-all border-0 shadow-[0_0_20px_rgba(255,255,255,0.05)]">
                           Save
                        </button>
                      ) : (
                        <button onClick={() => setSecrets(secrets.map(s => s.id === secret.id ? { ...s, isSet: false, value: '' } : s))} className="text-[rgba(255,255,255,0.4)] hover:text-rose-400 transition-colors px-4 py-3 text-[11px] font-bold uppercase tracking-widest">
                           Revoke
                        </button>
                      )}
                    </div>
                 </div>
               ))}

               {/* Add Custom Secret */}
               <div className="border border-dashed border-[rgba(255,255,255,0.2)] rounded-2xl bg-[rgba(255,255,255,0.02)] flex items-center justify-between p-4 px-6 mt-8">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="font-mono text-[11px] font-bold text-[rgba(255,255,255,0.5)] tracking-widest shrink-0 uppercase">
                      New Env Var
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. STRIPE_SECRET_KEY"
                      value={newSecretKey}
                      onChange={(e) => setNewSecretKey(e.target.value)}
                      className="max-w-[360px] w-full bg-[#050505] border border-[rgba(255,255,255,0.08)] text-[#F5F5F7] rounded-xl px-4 py-3 text-[13px] font-mono uppercase focus:outline-none focus:border-[rgba(255,255,255,0.3)] transition-colors"
                    />
                  </div>
                  <button onClick={handleAddSecret} disabled={!newSecretKey.trim()} className="bg-[rgba(255,255,255,0.1)] text-[#F5F5F7] hover:bg-[rgba(255,255,255,0.15)] text-[11px] font-bold px-6 py-3.5 rounded-xl transition-colors disabled:opacity-50 uppercase tracking-widest border border-[rgba(255,255,255,0.05)]">
                    Register Variable
                  </button>
               </div>
             </div>
           </div>
        )}

        {/* ====== TRAFFIC VIEW ====== */}
        {mode === 'traffic' && (
           <div className="flex-1 overflow-y-auto p-12 max-w-5xl mx-auto w-full custom-scrollbar">
            <div className="mb-10 flex items-end justify-between border-b border-[rgba(255,255,255,0.08)] pb-8">
               <div>
                 <h2 className="text-2xl font-semibold tracking-tight text-[#F5F5F7] mb-2 flex items-center gap-3">
                   <Activity className="w-7 h-7 text-emerald-400" /> Live Proxy Logs
                 </h2>
                 <p className="font-sans text-[14px] font-medium text-[rgba(255,255,255,0.58)] tracking-tight">Monitor requests from external clients integrating with the published MCP.</p>
               </div>
               <div className="flex items-center gap-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-2 rounded-full mb-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-bold tracking-widest uppercase">Listening</span>
               </div>
             </div>

             <div className="bg-[#111114] border border-[rgba(255,255,255,0.08)] rounded-2xl overflow-hidden shadow-sm">
                <div className="grid grid-cols-12 gap-4 border-b border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] px-6 py-4 text-[10px] font-bold text-[rgba(255,255,255,0.4)] uppercase tracking-widest">
                   <div className="col-span-2">Time</div>
                   <div className="col-span-6">Tool Execution</div>
                   <div className="col-span-2">Latency</div>
                   <div className="col-span-2 text-right">Status</div>
                </div>
                {trafficData.length === 0 ? (
                  <div className="py-20 text-center text-[rgba(255,255,255,0.4)] text-[14px] font-medium">No external traffic recorded yet.</div>
                ) : (
                  <div className="divide-y divide-[rgba(255,255,255,0.05)]">
                    {trafficData.map((data) => (
                       <div key={data.id} className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                          <div className="col-span-2 text-[12px] font-mono text-[rgba(255,255,255,0.5)]">{data.timestamp}</div>
                          <div className="col-span-6">
                            <span className="text-[12px] font-mono font-bold text-[#F5F5F7] bg-[rgba(255,255,255,0.05)] px-3 py-1.5 rounded-lg border border-[rgba(255,255,255,0.05)]">{data.tool}</span>
                          </div>
                          <div className="col-span-2 text-[12px] font-mono text-[rgba(255,255,255,0.5)]">{data.latency}</div>
                          <div className="col-span-2 text-right">
                             <span className={\`inline-block px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest rounded-md border \${data.status === 'success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : data.status === 'error' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}\`}>
                                {data.status}
                             </span>
                          </div>
                       </div>
                    ))}
                  </div>
                )}
             </div>
           </div>
        )}

        {/* ====== EXECUTION ENGINE VIEW ====== */}
        {mode === 'sandbox' && (
          <div className="flex-1 w-full h-full m-0 p-8 flex flex-col">
            <div className="flex-1 flex flex-col relative w-full h-full bg-[#0B0B0D] rounded-2xl border border-[rgba(255,255,255,0.08)] overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
               <div className="h-[64px] flex items-center justify-between border-b border-[rgba(255,255,255,0.08)] px-6 bg-[#111114] shrink-0">
                 <div className="flex items-center gap-4">
                    <Cpu className="w-5 h-5 text-[#F5F5F7]" />
                    <span className="font-bold text-[13px] tracking-wider text-[#F5F5F7] font-mono uppercase">Sandboxed Execution</span>
                    <span className={\`px-3 py-1.5 text-[9px] font-bold uppercase rounded-md tracking-widest ml-2 transition-colors border \${execStatus === 'running' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : execStatus === 'booting' || execStatus === 'testing' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-[rgba(255,255,255,0.05)] text-[rgba(255,255,255,0.4)] border-[rgba(255,255,255,0.08)]'}\`}>
                      {execStatus}
                    </span>
                 </div>
                 <div className="flex items-center gap-3">
                   {execStatus === 'idle' && files.length > 0 && (
                     <button onClick={handleBootSandbox} className="bg-[#F5F5F7] text-[#050505] hover:bg-white text-[11px] py-2 px-5 font-bold tracking-widest uppercase rounded-full flex items-center gap-2.5 transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)] border-0">
                        <Play className="w-3 h-3 fill-current" /> Boot Environment
                     </button>
                   )}
                   {execStatus === 'running' && (
                     <>
                       <button onClick={handleTestTools} className="bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] text-[#F5F5F7] text-[11px] py-2 px-4 rounded-full hover:bg-[rgba(255,255,255,0.15)] transition-colors flex items-center gap-2 font-bold tracking-widest uppercase">
                          <Activity className="w-3 h-3" /> Diagnostics
                       </button>
                       <button onClick={handleStopSandbox} className="bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 text-[11px] py-2 px-4 rounded-full transition-colors flex items-center gap-2 font-bold tracking-widest uppercase">
                          <Square className="w-3 h-3 fill-current" /> Stop
                       </button>
                     </>
                   )}
                 </div>
               </div>

               {files.length === 0 ? (
                 <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#050505]">
                   <ServerIcon className="w-14 h-14 mb-6 text-[rgba(255,255,255,0.2)] stroke-[1]" />
                   <p className="text-[14px] font-sans tracking-wide text-[rgba(255,255,255,0.5)] mb-6 font-medium">No artifact package generated yet.</p>
                   <button onClick={() => setMode('generator')} className="text-[11px] tracking-widest uppercase font-bold text-[#F5F5F7] bg-[rgba(255,255,255,0.05)] px-6 py-3 rounded-full border border-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.1)] transition-colors">
                     Open Generator
                   </button>
                 </div>
               ) : execStatus === 'running' ? (
                 <div className="flex-1 w-full h-full relative" style={{ minHeight: 0 }}>
                    <Sandpack
                      template="node"
                      theme="dark"
                      files={files.reduce((acc, f) => {
                        const rootPath = f.path.replace(/^packages\/[a-zA-Z0-9_\-]+\/[a-zA-Z0-9_\-]+\//, '');
                        acc[\`/\${rootPath}\`] = f.content;
                        return acc;
                      }, {} as any)}
                      options={{
                        showConsole: true,
                        showLineNumbers: true,
                        editorHeight: '100%',
                        classes: {
                          "sp-layout": "h-full rounded-b-2xl border-none !bg-transparent",
                          "sp-wrapper": "h-full",
                        }
                      }}
                    />
                 </div>
               ) : (
                 <div className="flex-1 flex font-mono text-[13px] leading-relaxed p-6 overflow-y-auto relative bg-[#050505] custom-scrollbar" ref={terminalRef}>
                   <div className="flex flex-col w-full space-y-1 text-[rgba(255,255,255,0.7)]">
                      {execLogs.map((log, i) => (
                        <div key={i} className="whitespace-pre-wrap break-words">{log}</div>
                      ))}
                      {execStatus === 'idle' && execLogs.length === 0 && (
                        <div className="text-[rgba(255,255,255,0.4)]">AURA VM ready. Select [Boot Environment] to mount process.</div>
                      )}
                   </div>
                 </div>
               )}
            </div>
          </div>
        )}

      </div>

      {/* 3. RIGHT PANE: Compact Assistant Rail */}
      <div className="w-[360px] flex-shrink-0 bg-[#0B0B0D] flex flex-col z-20 border-l border-[rgba(255,255,255,0.08)]">
        <div className="bg-[rgba(255,255,255,0.02)] px-6 py-5 border-b border-[rgba(255,255,255,0.08)] flex items-center gap-4 shrink-0">
           <div className="w-10 h-10 rounded-full border border-[rgba(255,255,255,0.1)] flex items-center justify-center bg-[#111114]">
             <Bot className="w-5 h-5 text-[#F5F5F7]" />
           </div>
           <div>
              <div className="text-[14px] font-semibold text-[#F5F5F7] tracking-tight">AURA Assistant</div>
              <div className="text-[11px] font-medium text-[rgba(255,255,255,0.58)] mt-0.5">Automate toolchain ops</div>
           </div>
        </div>
        
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 custom-scrollbar relative">
           {chatMessages.length === 0 && (
             <div className="space-y-8">
                <div className="text-[13px] leading-relaxed text-[rgba(255,255,255,0.6)] font-medium">
                  {mode === 'generator' ? "I can help build and refine your generated MCP packages." : "I can help configure the sandbox, audit generated rules, or index docs locally."}
                </div>
                
                {mode === 'generator' && files.length === 0 && (
                  <div className="space-y-3">
                    <div className="text-[10px] font-bold text-[rgba(255,255,255,0.4)] uppercase tracking-widest mb-3 border-b border-[rgba(255,255,255,0.08)] pb-2">Suggested Actions</div>
                    {[
                      "Generate a Kalshi MCP using the docs pattern",
                      "Index Stripe API knowledge base to start",
                      "What is an MCP package and how is governance handled?"
                    ].map((sgg, i) => (
                       <button onClick={() => { setChatInput(sgg); setTimeout(() => document.getElementById('chat-input')?.focus(), 10); }} key={i} className="block w-full text-left bg-[#111114] border border-[rgba(255,255,255,0.05)] rounded-2xl py-3.5 px-5 text-[12px] font-medium text-[rgba(255,255,255,0.7)] hover:bg-[rgba(255,255,255,0.05)] hover:text-[#F5F5F7] transition-all">
                          {sgg}
                       </button>
                    ))}
                  </div>
                )}
                
                {mode === 'generator' && files.length > 0 && (
                  <div className="space-y-3">
                     <div className="text-[10px] font-bold text-[rgba(255,255,255,0.4)] uppercase tracking-widest mb-3 border-b border-[rgba(255,255,255,0.08)] pb-2">Context Analysis</div>
                     {[
                        "Explain this generated manifest and its tools",
                        "Run local test sequence in sandbox",
                        "Publish selected tools to assistant registry"
                     ].map((sgg, i) => (
                       <button onClick={() => { setChatInput(sgg); setTimeout(() => document.getElementById('chat-input')?.focus(), 10); }} key={i} className="block w-full text-left bg-[#111114] border border-[rgba(255,255,255,0.05)] rounded-2xl py-3.5 px-5 text-[12px] font-medium text-[rgba(255,255,255,0.7)] hover:bg-[rgba(255,255,255,0.05)] hover:text-[#F5F5F7] transition-all shadow-sm">
                          {sgg}
                       </button>
                    ))}
                  </div>
                )}
             </div>
           )}

           {chatMessages.map((msg, idx) => (
              <div key={idx} className={\`flex gap-3 \${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}\`}>
                 <div className="mt-1 shrink-0">
                   {msg.role === 'assistant' 
                      ? <div className="w-6 h-6 rounded-full border border-[rgba(255,255,255,0.1)] flex items-center justify-center bg-[#111114]"><div className="w-1.5 h-1.5 rounded-full bg-white opacity-90" /></div>
                      : <div className="w-6 h-6 rounded-full bg-[rgba(255,255,255,0.1)] flex items-center justify-center"><User className="w-3.5 h-3.5 text-[#F5F5F7]" /></div>
                   }
                 </div>
                 <div className={\`px-4 py-3 text-[13px] font-sans leading-relaxed whitespace-pre-wrap \${msg.role === 'user' ? 'bg-[#111114] text-[#F5F5F7] rounded-2xl rounded-tr-sm border border-[rgba(255,255,255,0.05)] shadow-sm' : 'text-[rgba(255,255,255,0.85)]'}\`}>
                    {msg.content}
                 </div>
              </div>
           ))}

           {isChatLoading && (
              <div className="flex gap-3 items-center mt-6">
                <div className="mt-1 shrink-0">
                  <div className="w-6 h-6 rounded-full border border-[rgba(255,255,255,0.1)] flex items-center justify-center bg-[#111114]">
                    <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  </div>
                </div>
                <div className="text-[13px] font-sans italic text-[rgba(255,255,255,0.4)]">
                  Synthesizing action...
                </div>
              </div>
           )}
           <div ref={chatEndRef} />
        </div>

        <div className="p-5 shrink-0 bg-[#0B0B0D] border-t border-[rgba(255,255,255,0.05)]">
           <div className="relative flex items-center">
             <textarea
               id="chat-input"
               value={chatInput}
               onChange={e => setChatInput(e.target.value)}
               onKeyDown={e => {
                 if (e.key === 'Enter' && !e.shiftKey) {
                   e.preventDefault();
                   handleChat();
                 }
               }}
               placeholder="Query or automate task..."
               rows={1}
               className="w-full bg-[#111114] border border-[rgba(255,255,255,0.1)] rounded-2xl py-3.5 px-5 pr-14 text-[13px] font-medium text-[#F5F5F7] placeholder-[rgba(255,255,255,0.3)] focus:outline-none focus:border-[rgba(255,255,255,0.3)] resize-none transition-colors shadow-sm"
             />
             <div className="absolute right-2.5">
               <button 
                 onClick={handleChat} disabled={isChatLoading || !chatInput.trim()}
                 className="w-9 h-9 rounded-xl bg-[rgba(255,255,255,0.08)] text-[#F5F5F7] hover:bg-[rgba(255,255,255,0.15)] disabled:opacity-30 transition-all flex items-center justify-center cursor-pointer border border-[rgba(255,255,255,0.05)]"
               >
                 <Send className="w-4 h-4 ml-0.5" />
               </button>
             </div>
           </div>
           <div className="text-[10px] text-center font-mono text-[rgba(255,255,255,0.3)] mt-3 tracking-[0.05em]">
             Shift+Enter for newline
           </div>
        </div>
      </div>
      
    </div>
  );
`;

const og = fs.readFileSync('src/components/McpGenerator.tsx', 'utf-8');
const searchRegExp = /return\s*\(\s*<div className="flex h-screen[\s\S]*$/m;
const updated = og.replace(searchRegExp, jsx + '\n}\n');
fs.writeFileSync('src/components/McpGenerator.tsx', updated);
console.log('Layout patched permanently!');
