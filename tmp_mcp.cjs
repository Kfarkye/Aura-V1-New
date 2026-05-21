const fs = require('fs');
const content = fs.readFileSync('src/components/McpGenerator.tsx', 'utf-8');
const returnStatementStart = content.indexOf('return (');

const NavItemBlock = `
  const NavItem = ({ label, active, onClick, icon: Icon, badge }: any) => (
    <button 
      onClick={onClick} 
      className={\`flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-300 \${active ? 'bg-white text-black' : 'text-[#86868B] hover:bg-white/5 hover:text-white'}\`}
    >
      <div className="flex items-center gap-3">
        <Icon className={\`w-[16px] h-[16px] \${active ? 'text-black stroke-[2.5]' : 'opacity-70 stroke-2'}\`} /> 
        {label}
      </div>
      {badge > 0 && <span className="bg-[#FF3B30] text-white text-[10px] px-1.5 py-0.5 font-bold rounded-full">{badge}</span>}
    </button>
  );
`;

const newReturn = `return (
    <div className="flex h-screen w-full overflow-hidden bg-[#0A0A0A] font-sans text-white">
      
      {/* 1. Sidebar Command Center (Dark Gray) */}
      <div className="w-[340px] flex-shrink-0 bg-[#1C1C1E] flex flex-col z-10 border-r border-white/5 relative shadow-xl">
        {/* Header Logo */}
        <div className="px-6 py-8 pb-6 tracking-tight flex-shrink-0">
          <h1 className="text-[28px] font-sans font-semibold tracking-tight text-white mb-1 flex items-center gap-2">Aura</h1>
          <p className="text-[10px] font-mono mt-1 text-[#86868B] tracking-[0.15em] font-medium uppercase">Toolchain Core</p>
        </div>
        
        {/* Main Navigation */}
        <div className="px-4 pb-4 space-y-1 flex-shrink-0 border-b border-white/5 mb-2">
          <NavItem label="Dev Generator" active={mode === 'generator'} onClick={() => setMode('generator')} icon={Terminal} />
          <NavItem label="Governance Engine" active={mode === 'governance'} onClick={() => setMode('governance')} icon={ShieldAlert} badge={governanceRules.length} />
          <NavItem label="Execution Engine" active={mode === 'sandbox'} onClick={() => setMode('sandbox')} icon={Cpu} />
          <NavItem label="Secrets Vault" active={mode === 'vault'} onClick={() => setMode('vault')} icon={Key} />
          <NavItem label="Live Traffic" active={mode === 'traffic'} onClick={() => setMode('traffic')} icon={Activity} />
          <NavItem label="Tool Registry" active={mode === 'registry'} onClick={() => setMode('registry')} icon={Database} badge={registry.length > 0 ? registry.length : undefined} />
          <NavItem label="Docs Indexer" active={mode === 'docs'} onClick={() => setMode('docs')} icon={Search} />
          <NavItem label="AI Assistant" active={mode === 'chat'} onClick={() => document.getElementById('chat-input')?.focus()} icon={Bot} />
        </div>

        {/* Dynamic Context Panel */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 flex flex-col gap-6 custom-scrollbar mt-2">
          
          {mode === 'generator' && (
            <AnimatePresence mode="wait">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div>
                  <label className="text-[10px] font-bold text-[#86868B] uppercase tracking-wider block mb-2">Target Server Name</label>
                  <input 
                    type="text" value={name} onChange={e => setName(e.target.value)}
                    className="w-full bg-[#3A3A3C] shadow-[inset_0_2px_8px_rgba(0,0,0,0.2)] border border-white/10 text-white placeholder-[#86868B] focus:border-white/30 focus:outline-none rounded-xl p-3 text-[13px] font-medium"
                    placeholder="e.g. kalshi"
                  />
                </div>
                
                <div>
                  <label className="text-[10px] font-bold text-[#86868B] uppercase tracking-wider block mb-2">Target Output Artifact</label>
                  <div className="relative">
                     <select 
                       value={targetArtifact} onChange={e => setTargetArtifact(e.target.value)}
                       className="w-full bg-[#3A3A3C] shadow-[inset_0_2px_8px_rgba(0,0,0,0.2)] border border-white/10 text-white focus:outline-none rounded-xl p-3 text-[13px] font-medium appearance-none cursor-pointer"
                     >
                       <option value="mcp">Node.js MCP Server</option>
                       <option value="nextjs" disabled>Next.js API Routes</option>
                       <option value="python" disabled>Python SDK Client</option>
                       <option value="go" disabled>Go SDK Client</option>
                     </select>
                     <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                        <ChevronRight className="w-4 h-4 text-[#86868B] rotate-90" />
                     </div>
                  </div>
                </div>
                
                <div>
                  <label className="text-[10px] font-bold text-[#86868B] uppercase tracking-wider block mb-2">OpenAPI Spec URL</label>
                  <input 
                    type="url" value={specUrl} onChange={e => setSpecUrl(e.target.value)}
                    className="w-full bg-[#3A3A3C] shadow-[inset_0_2px_8px_rgba(0,0,0,0.2)] border border-white/10 text-white placeholder-[#86868B] focus:border-white/30 focus:outline-none rounded-xl p-3 text-[13px] font-medium"
                    placeholder="https://api.example.com/openapi.json"
                  />
                </div>
                
                <div>
                  <label className="text-[10px] font-bold text-[#86868B] uppercase tracking-wider block mb-2">Or Paste Raw Spec</label>
                  <textarea 
                    value={specContent} onChange={e => setSpecContent(e.target.value)}
                    className="w-full h-32 bg-[#3A3A3C] shadow-[inset_0_2px_8px_rgba(0,0,0,0.2)] border border-white/10 text-white placeholder-[#86868B] focus:border-white/30 focus:outline-none rounded-xl p-3 text-[11px] font-mono resize-none custom-scrollbar"
                  />
                </div>

                <div className="space-y-1">
                  <div className="text-[10px] font-bold text-[#86868B] uppercase tracking-wider border-b border-white/10 pb-2 mb-3">Pipeline Options</div>
                  {Object.entries(options).map(([key, value]) => (
                    <div 
                      key={key} onClick={() => setOptions(o => ({ ...o, [key]: !(o as any)[key] }))}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center text-white">
                        {value ? <CheckCircle2 className="w-[18px] h-[18px] fill-white text-[#1C1C1E] drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]" /> : <div className="w-[18px] h-[18px] border-2 border-white/20 rounded-full" />}
                      </div>
                      <div className="text-[13px] font-sans tracking-tight text-white/80">
                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </div>
                    </div>
                  ))}
                </div>

                <button 
                  onClick={handleGenerate}
                  disabled={isLoading || (!specUrl && !specContent)}
                  className="w-full bg-white hover:bg-gray-200 text-black font-semibold tracking-wide py-3.5 px-4 rounded-xl text-[13px] flex items-center justify-center transition-all disabled:opacity-50 mt-4 shadow-sm"
                >
                  <span className="font-bold">{isLoading ? 'Processing...' : 'Execute Pipeline'}</span>
                  {!isLoading && <Send className="w-4 h-4 ml-2" />}
                </button>
              </motion.div>
            </AnimatePresence>
          )}

          {mode === 'docs' && (
            <AnimatePresence mode="wait">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div>
                  <label className="text-[10px] font-bold text-[#86868B] uppercase tracking-wider block mb-2">Local Directory Path</label>
                  <input 
                    type="text" value={docsDir} onChange={e => setDocsDir(e.target.value)}
                    className="w-full bg-[#1C1C1E] border border-white/10 text-white shadow-[inset_0_2px_8px_rgba(0,0,0,0.2)] placeholder-[#86868B] focus:outline-none rounded-xl p-3 text-[13px]"
                    placeholder="./docs"
                  />
                  <button 
                    onClick={handleIndexDocs} disabled={isLoading}
                    className="mt-3 w-full bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] border border-white/10 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                  >
                    {isLoading ? 'Indexing...' : 'Build Index'}
                  </button>
                </div>

                {indexStats && (
                  <div className="p-4 bg-[rgba(0,0,0,0.2)] border border-emerald-500/20 rounded-xl flex justify-between items-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-emerald-500/5" />
                    <span className="text-[11px] font-bold uppercase text-emerald-500 tracking-wider relative z-10">Live Index Active</span>
                    <span className="font-mono text-[13px] text-emerald-400 relative z-10">{indexStats.count} files</span>
                  </div>
                )}

                <div className="border-t border-white/10 pt-6 mt-2">
                  <label className="text-[10px] font-bold text-[#86868B] uppercase tracking-wider block mb-2">Search Pattern</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                       <Search className="h-4 w-4 text-[#86868B]" />
                    </div>
                    <input 
                      type="text" value={docsQuery} onChange={e => setDocsQuery(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSearchDocs()}
                      className="w-full bg-[#1C1C1E] border border-white/10 text-white shadow-[inset_0_2px_8px_rgba(0,0,0,0.2)] placeholder-[#86868B] focus:outline-none rounded-xl p-3 pl-10 text-[13px]"
                      placeholder="e.g. rate limits"
                    />
                  </div>
                  <button 
                    onClick={handleSearchDocs} disabled={isSearching || !indexStats}
                    className="mt-3 w-full bg-white text-black py-2.5 rounded-xl text-[13px] font-bold transition-colors disabled:opacity-50 shadow-sm"
                  >
                    Retrieve Context
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20 mt-auto text-[13px] flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-orange-500" />
              <div className="leading-relaxed font-medium">{error}</div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Middle Main View */}
      <div 
         className="flex flex-col bg-white border-r border-[#E5E5EA] transition-all duration-300 relative text-black z-20 shadow-[8px_0_30px_rgba(0,0,0,0.15)]" 
         style={{ width: (mode === 'generator' && files.length === 0) ? '340px' : '650px', flexShrink: 0 }}
      >
        {mode === 'generator' && (
          <div className="flex-1 w-full h-full m-0 flex flex-col z-10 bg-white">
            <div className="h-[60px] flex items-center border-b border-[#E5E5EA] px-6 shrink-0 justify-between bg-white z-20 w-full relative">
               <span className="text-[13px] font-bold tracking-wide text-black flex items-center gap-2.5">
                 <FileJson className="w-[18px] h-[18px] text-[#A1A1AA]" /> Artifact Viewer
               </span>
               {files.length > 0 && (
                 <div className="flex items-center gap-2">
                    <button onClick={handleDownload} className="flex items-center gap-2 text-[11px] font-semibold text-[#71717A] hover:text-black hover:bg-black/5 transition-colors px-3 py-1.5 rounded-full">
                       <Download className="w-3.5 h-3.5"/> Download
                    </button>
                 </div>
               )}
            </div>

            {files.length === 0 ? (
               <div className="flex-1 flex flex-col items-center justify-center bg-[#FAFAFA]">
                  <div className="w-[72px] h-[72px] rounded-2xl bg-white border border-[#E5E5EA] flex items-center justify-center mb-6 shadow-sm">
                     <span className="font-mono text-[#D4D4D8] text-[28px] font-bold">{"{ }"}</span>
                  </div>
                  <div className="font-sans text-[13px] max-w-[140px] text-center text-[#71717A] font-medium leading-relaxed">
                    Awaiting specification input...
                  </div>
               </div>
            ) : (
               <div className="flex flex-1 overflow-hidden">
                  <div className="w-[220px] border-r border-[#E5E5EA] flex-shrink-0 flex flex-col overflow-y-auto bg-[#FAFAFA]">
                    <div className="flex-1 py-4 px-3 space-y-1">
                      {files.map((file) => (
                        <div 
                          key={file.path} onClick={() => setSelectedFile(file.path)}
                          className={\`px-3 py-2 rounded-xl text-[13px] font-mono cursor-pointer flex items-center gap-3 transition-all \${selectedFile === file.path ? 'bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#E5E5EA] text-[#09090B] font-semibold' : 'text-[#71717A] hover:bg-black/5 hover:text-[#09090B] border border-transparent font-medium'}\`}
                        >
                          <FileText className={\`w-4 h-4 shrink-0 \${selectedFile === file.path ? 'opacity-100 text-[#0066CC]' : 'opacity-40'}\`} />
                          <span className="truncate">{file.path.split('/').pop()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex-1 flex flex-col overflow-hidden relative bg-white">
                     <div className="h-12 border-b border-[#E5E5EA] flex items-center px-6 shrink-0 text-[11px] font-mono text-[#71717A] bg-[#FAFAFA]">
                        {activeFile?.path}
                     </div>
                     <div className="flex-1 p-6 bg-white overflow-auto custom-scrollbar">
                        <pre className="font-mono text-[13px] leading-[1.6] text-[#09090B]">
                          <code>{activeFile?.content}</code>
                        </pre>
                     </div>
                  </div>
               </div>
            )}
          </div>
        )}

        {/* Other modes logic... (Execution Engine, Governance etc.) */}
        {mode !== 'generator' && (
           <div className="flex-1 flex items-center justify-center bg-[#FAFAFA] text-[#A1A1AA] overflow-y-auto border-x border-[#E5E5EA]/50">
              <span className="text-[13px] font-medium tracking-wide">Select Dev Generator to view context</span>
           </div>
        )}
      </div>

      {/* 3. Right Chat Panel (Always visible, Dark Theme) */}
      <div className="flex-1 flex flex-col min-w-[300px] bg-[#0A0A0A] relative z-0">
         <div className="flex-1 overflow-y-auto px-6 lg:px-10 py-10 space-y-8 custom-scrollbar relative z-10">
           {chatMessages.length === 0 && (
             <div className="text-[#A1A1AA] text-[13px] text-center mt-[20vh] font-medium tracking-wide">Initialize a session to begin...</div>
           )}
           {chatMessages.map((msg, idx) => (
              <div key={idx} className={\`flex gap-4 max-w-[90%] \${msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto flex-row'}\`}>
                 <div className="mt-2 shrink-0">
                   {msg.role === 'assistant' 
                      ? <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center bg-[#1C1C1E]"><div className="w-2.5 h-2.5 rounded-full bg-white opacity-90" /></div>
                      : <div className="w-8 h-8 rounded-full bg-[#2C2C2E] flex items-center justify-center"><User className="w-4 h-4 text-[#A1A1AA]" /></div>
                   }
                 </div>
                 <div className={\`px-5 py-4 text-[14px] font-sans leading-relaxed whitespace-pre-wrap \${msg.role === 'user' ? 'bg-[#1C1C1E] text-white rounded-[24px] rounded-tr-md border border-white/5' : 'text-[#E5E5EA]'}\`}>
                    {msg.content}
                 </div>
              </div>
           ))}
           {isChatLoading && (
              <div className="flex gap-4 max-w-[85%] mr-auto items-center mt-6">
                <div className="mt-2 shrink-0">
                  <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center bg-[#1C1C1E]">
                    <div className="w-2.5 h-2.5 rounded-full border border-white/60 animate-[ping_1.5s_cubic-bezier(0,0,0.2,1)_infinite]" />
                  </div>
                </div>
                <div className="p-4 text-[14px] font-sans italic text-[#A1A1AA]">
                  Synthesizing action...
                </div>
              </div>
           )}
           <div ref={chatEndRef} />
         </div>

         {/* Chat Input */}
         <div className="p-6 shrink-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A] to-transparent mb-2 z-20">
           <div className="relative mx-auto w-full max-w-4xl flex items-end bg-[#1C1C1E] border border-white/10 rounded-[28px] overflow-hidden group focus-within:border-white/30 transition-colors shadow-2xl">
             <div className="pl-6 pb-[22px] shrink-0">
                 <Terminal className="w-5 h-5 text-[#86868B]" />
             </div>
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
               placeholder="Query the engine..."
               rows={1}
               className="flex-1 bg-transparent py-5 px-4 text-[15px] font-medium tracking-wide text-white placeholder-[#86868B] focus:outline-none resize-none"
             />
             <div className="pr-3 pb-3 shrink-0">
               <button 
                 onClick={handleChat} disabled={isChatLoading || !chatInput.trim()}
                 className="w-10 h-10 rounded-full bg-white text-black hover:bg-gray-200 disabled:opacity-0 opacity-100 transition-all flex items-center justify-center shadow-lg"
               >
                 <Send className="w-4 h-4 ml-0.5" />
               </button>
             </div>
           </div>
           <div className="text-[10px] text-center font-mono text-[#86868B] mt-4 uppercase tracking-[0.2em] hidden md:block">
             Aura Assistant — Connected to Core
           </div>
         </div>
         
         {/* Background glow effects */}
         <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.03)_0%,rgba(0,0,0,0)_50%)] pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#2B49FF] rounded-full blur-[160px] opacity-[0.03] pointer-events-none" />
      </div>
      
    </div>
  );
};
`;

const updatedContent = content.substring(0, returnStatementStart) + NavItemBlock + '\n\n' + newReturn;
fs.writeFileSync('src/components/McpGenerator.tsx', updatedContent);
console.log('Replaced return successfully');
