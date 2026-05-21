import React, { useState, useEffect } from 'react';
import { 
  Github, 
  Mail, 
  Calendar, 
  Music, 
  TrendingUp, 
  Database, 
  Search, 
  Key, 
  RefreshCw, 
  Play, 
  CheckCircle, 
  XCircle, 
  Info, 
  Lock, 
  Code, 
  Terminal, 
  Settings, 
  Activity, 
  ChevronRight,
  Trash2,
  ListFilter
} from 'lucide-react';
import { ConnectorRegistry } from '../lib/connectors/registry';
import { Connector, ConnectorConfig } from '../lib/connectors/types';

export function ConnectorManager() {
  const registryInstance = ConnectorRegistry.getInstance();
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [selectedConnectorId, setSelectedConnectorId] = useState<string>('github');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Form/Config State
  const [configValues, setConfigValues] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState<boolean>(false);
  
  // Playback/Sandbox State
  const [selectedToolName, setSelectedToolName] = useState<string>('');
  const [sandboxArgs, setSandboxArgs] = useState<Record<string, any>>({});
  const [sandboxResult, setSandboxResult] = useState<any>(null);
  const [isRunningSandbox, setIsRunningSandbox] = useState<boolean>(false);
  
  // Execution history log
  const [executionLogs, setExecutionLogs] = useState<Array<{
    timestamp: string;
    connectorId: string;
    tool: string;
    success: boolean;
    duration: number;
  }>>([]);

  useEffect(() => {
    refreshConnectors();
    // Default logs
    setExecutionLogs([
      { timestamp: new Date(Date.now() - 3600000).toISOString(), connectorId: 'gmail', tool: 'list_messages', success: true, duration: 450 },
      { timestamp: new Date(Date.now() - 1800000).toISOString(), connectorId: 'github', tool: 'get_repo_tree', success: true, duration: 520 },
    ]);
  }, []);

  const refreshConnectors = () => {
    registryInstance.hydrateStatusesFromLocalStorage();
    const list = registryInstance.getConnectors();
    setConnectors(list);

    // If selected connector has config, load fields
    const selected = list.find(c => c.id === selectedConnectorId);
    if (selected) {
      const config = registryInstance.getConfig(selected.id);
      const initialFields: Record<string, string> = {};
      if (selected.configFields) {
        selected.configFields.forEach(field => {
          initialFields[field.key] = config?.apiKey || config?.accessToken || '';
        });
      }
      setConfigValues(initialFields);

      // Pre-select first tool
      if (selected.tools.length > 0) {
        setSelectedToolName(selected.tools[0].name);
        setupDefaultSandboxArgs(selected.tools[0]);
      } else {
        setSelectedToolName('');
        setSandboxArgs({});
      }
    }
  };

  const handleConnectorChange = (id: string) => {
    setSelectedConnectorId(id);
    const target = connectors.find(c => c.id === id);
    if (target) {
      const config = registryInstance.getConfig(target.id);
      const initialFields: Record<string, string> = {};
      if (target.configFields) {
        target.configFields.forEach(field => {
          initialFields[field.key] = config?.apiKey || config?.accessToken || '';
        });
      }
      setConfigValues(initialFields);
      setSandboxResult(null);

      if (target.tools.length > 0) {
        setSelectedToolName(target.tools[0].name);
        setupDefaultSandboxArgs(target.tools[0]);
      } else {
        setSelectedToolName('');
        setSandboxArgs({});
      }
    }
  };

  const setupDefaultSandboxArgs = (tool: any) => {
    const defaults: Record<string, any> = {};
    if (tool.inputSchema?.properties) {
      Object.entries(tool.inputSchema.properties).forEach(([key, prop]: [string, any]) => {
        if (key === 'owner') defaults[key] = 'Kfarkye';
        else if (key === 'repo') defaults[key] = 'aura-ai';
        else if (key === 'path') defaults[key] = 'src/App.tsx';
        else if (key === 'q') defaults[key] = 'is:unread';
        else if (key === 'maxResults') defaults[key] = 5;
        else if (key === 'to') defaults[key] = 'user@example.com';
        else if (key === 'subject') defaults[key] = 'Status Report';
        else if (key === 'body') defaults[key] = 'Hello from AURA Sandbox Runtime!';
        else if (key === 'query') defaults[key] = 'Discovery II';
        else if (prop.type === 'number') defaults[key] = 0;
        else if (prop.type === 'boolean') defaults[key] = false;
        else defaults[key] = '';
      });
    }
    setSandboxArgs(defaults);
  };

  const handleSaveConfig = () => {
    setIsSaving(true);
    setTimeout(() => {
      const config: ConnectorConfig = {
        connectorId: selectedConnectorId,
        apiKey: configValues[`${selectedConnectorId}_api_key`] || Object.values(configValues)[0],
        accessToken: configValues[`github_token`] || Object.values(configValues)[0],
        meta: { configuredAt: new Date().toISOString() }
      };
      registryInstance.saveConfig(config);
      setIsSaving(false);
      refreshConnectors();
    }, 500);
  };

  const handleDeleteConfig = () => {
    registryInstance.deleteConfig(selectedConnectorId);
    refreshConnectors();
  };

  const handleExecuteSandbox = async () => {
    setIsRunningSandbox(true);
    setSandboxResult(null);
    const startTime = Date.now();

    try {
      const result = await registryInstance.executeTool(selectedConnectorId, selectedToolName, sandboxArgs);
      const duration = Date.now() - startTime;
      
      setSandboxResult(result);
      setExecutionLogs(prev => [
        {
          timestamp: new Date().toISOString(),
          connectorId: selectedConnectorId,
          tool: selectedToolName,
          success: result.success,
          duration
        },
        ...prev
      ]);
    } catch (e: any) {
      setSandboxResult({ success: false, error: e.message || 'Execution failed' });
    } finally {
      setIsRunningSandbox(false);
    }
  };

  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case 'Github': return <Github className="w-5 h-5" />;
      case 'Mail': return <Mail className="w-5 h-5" />;
      case 'Calendar': return <Calendar className="w-5 h-5" />;
      case 'Music': return <Music className="w-5 h-5" />;
      case 'TrendingUp': return <TrendingUp className="w-5 h-5" />;
      default: return <Database className="w-5 h-5" />;
    }
  };

  const selectedConnector = connectors.find(c => c.id === selectedConnectorId);
  const selectedTool = selectedConnector?.tools.find(t => t.name === selectedToolName);

  const filteredConnectors = connectors.filter(c => {
    const matchesCategory = categoryFilter === 'all' || c.category === categoryFilter;
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-[#030303] text-[#F5F5F7] overflow-hidden">
      {/* Connector Header */}
      <div className="border-b border-white/5 p-6 space-y-2 flex justify-between items-center bg-[#070707]">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-400" />
            Connector Runtime & registry
          </h1>
          <p className="text-xs text-white/50">Manage Jony Ive-grade external data integrations, credentials, and capabilities.</p>
        </div>
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-green-400 animate-pulse" />
          <span className="font-mono text-[9px] tracking-widest text-green-400 uppercase">AURA Engine Online</span>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left column - List */}
        <div className="w-80 border-r border-white/5 flex flex-col bg-[#050505]">
          {/* Filters */}
          <div className="p-4 border-b border-white/5 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-white/40" />
              <input 
                type="text" 
                placeholder="Search connectors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs placeholder:text-white/30 focus:outline-none focus:border-indigo-500/50 transition-colors"
              />
            </div>
            
            <div className="flex gap-1 overflow-x-auto pb-1 custom-scrollbar">
              {['all', 'productivity', 'development', 'media', 'finance'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-full border transition-all ${
                    categoryFilter === cat 
                      ? 'bg-white text-black border-white' 
                      : 'bg-transparent text-white/60 border-white/10 hover:text-white hover:border-white/30'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
            {filteredConnectors.map((conn) => {
              const isSelected = conn.id === selectedConnectorId;
              const isConnected = conn.status === 'connected';
              return (
                <button
                  key={conn.id}
                  onClick={() => handleConnectorChange(conn.id)}
                  className={`w-full text-left p-3.5 rounded-2xl flex items-start gap-3.5 transition-all group ${
                    isSelected 
                      ? 'bg-white/10 border border-white/10 shadow-lg' 
                      : 'hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <div className={`p-2.5 rounded-xl border transition-colors ${
                    isSelected 
                      ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' 
                      : 'bg-white/5 text-white/60 border-white/10 group-hover:text-white group-hover:border-white/25'
                  }`}>
                    {getIconComponent(conn.icon)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-white truncate">{conn.name}</h3>
                      <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-400 shadow-[0_0_8px_#4ade80]' : 'bg-white/20'}`} />
                    </div>
                    <p className="text-[10px] text-white/40 line-clamp-2 mt-1 leading-relaxed">{conn.description}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[8px] font-mono uppercase tracking-widest text-white/30">{conn.category}</span>
                      <span className={`text-[8px] font-bold uppercase tracking-wider ${isConnected ? 'text-green-400' : 'text-white/30'}`}>
                        {isConnected ? 'Configured' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right column - Configurations & play */}
        {selectedConnector ? (
          <div className="flex-1 flex flex-col overflow-y-auto p-6 space-y-6 custom-scrollbar bg-[#020202]">
            {/* Connector Meta block */}
            <div className="p-6 rounded-3xl bg-[#080808] border border-white/5 flex items-start gap-5">
              <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0">
                {getIconComponent(selectedConnector.icon)}
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-bold text-white leading-none">{selectedConnector.name}</h2>
                  <span className={`text-[9px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full border ${
                    selectedConnector.status === 'connected' 
                      ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                      : 'bg-white/5 text-white/40 border-white/10'
                  }`}>
                    {selectedConnector.status === 'connected' ? 'CONNECTED' : 'DISCONNECTED'}
                  </span>
                </div>
                <p className="text-xs text-[#F5F5F7]/70 leading-relaxed font-light">{selectedConnector.description}</p>
                <div className="flex items-center gap-4 text-[10px] font-mono text-white/40 pt-1">
                  <div className="flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Auth Type: <strong className="text-white/75">{selectedConnector.authType.toUpperCase()}</strong></span>
                  </div>
                  {selectedConnector.scopes && (
                    <div className="flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Scopes: <strong className="text-white/75" title={selectedConnector.scopes.join(', ')}>{selectedConnector.scopes.length} loaded</strong></span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* Credentials & Setup */}
              <div className="p-6 rounded-3xl bg-[#080808] border border-white/5 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#F5F5F7] flex items-center gap-2 border-b border-white/5 pb-3">
                  <Settings className="w-4 h-4 text-indigo-400" /> Key Setup & Authentication
                </h3>

                {selectedConnector.authType === 'none' ? (
                  <div className="text-xs text-white/50 p-4 rounded-2xl bg-white/5 border border-white/5">
                    No explicit credential configuration is required for this public connector.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedConnector.configFields?.map((field) => (
                      <div key={field.key} className="space-y-1.5">
                        <label className="text-[11px] font-medium tracking-wide text-white/70 block">{field.label}</label>
                        <p className="text-[10px] text-white/40 leading-normal">{field.description}</p>
                        <input
                          type={field.type}
                          value={configValues[field.key] || ''}
                          onChange={(e) => setConfigValues({...configValues, [field.key]: e.target.value})}
                          placeholder={field.placeholder || `Enter secret ${field.label}...`}
                          className="w-full text-xs px-3.5 py-3 bg-[#030303] border border-white/10 rounded-2xl focus:outline-none focus:border-indigo-500/50 transition-colors"
                        />
                      </div>
                    ))}

                    <div className="flex gap-2.5 pt-2">
                      <button
                        onClick={handleSaveConfig}
                        disabled={isSaving}
                        className="flex-1 bg-white hover:bg-[#F5F5F7] text-black text-xs font-bold py-3 px-4 rounded-2xl uppercase tracking-wider transition-all disabled:opacity-50 active:scale-[0.98]"
                      >
                        {isSaving ? 'Verifying...' : 'Save Configuration'}
                      </button>
                      
                      {selectedConnector.status === 'connected' && (
                        <button
                          onClick={handleDeleteConfig}
                          className="bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 text-red-400 p-3 rounded-2xl transition-all"
                          title="Purge connector variables"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Tools list */}
              <div className="p-6 rounded-3xl bg-[#080808] border border-white/5 space-y-4 h-full">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#F5F5F7] flex items-center gap-2 border-b border-white/5 pb-3">
                  <Code className="w-4 h-4 text-indigo-400" /> Exported Agent Tools & Capabilities
                </h3>

                <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                  {selectedConnector.tools.map((tool) => (
                    <div 
                      key={tool.name}
                      onClick={() => {
                        setSelectedToolName(tool.name);
                        setupDefaultSandboxArgs(tool);
                      }}
                      className={`p-3.5 rounded-2xl border transition-all text-left cursor-pointer flex justify-between items-center group ${
                        selectedToolName === tool.name 
                          ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' 
                          : 'bg-white/5 border-transparent text-white/70 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <div className="space-y-1">
                        <h4 className="text-xs font-mono font-bold">{tool.name}</h4>
                        <p className="text-[10px] text-white/40 line-clamp-1">{tool.description}</p>
                      </div>
                      <ChevronRight className={`w-4 h-4 text-white/50 transition-transform ${
                        selectedToolName === tool.name ? 'translate-x-1 text-indigo-400' : 'group-hover:translate-x-0.5'
                      }`} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sandbox section */}
            <div className="p-6 rounded-3xl bg-[#080808] border border-white/5 space-y-5">
              <div className="flex justify-between items-center border-b border-white/5 pb-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#F5F5F7] flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-indigo-400" />
                  Connector Sandbox Testing Runtime
                </h3>
                {selectedTool && (
                  <span className="text-[10px] font-mono text-indigo-400 uppercase bg-indigo-500/10 px-2.5 py-1 rounded-full">
                    Target: {selectedTool.name}
                  </span>
                )}
              </div>

              {selectedTool ? (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {/* Arguments Entry Form */}
                  <div className="space-y-4">
                    <h4 className="text-[11px] font-bold uppercase tracking-widest text-white/45">Input Variables & Arguments</h4>
                    
                    <div className="space-y-3.5 max-h-96 overflow-y-auto custom-scrollbar pr-1">
                      {Object.entries(selectedTool.inputSchema.properties).map(([key, prop]: [string, any]) => {
                        const isRequired = selectedTool.inputSchema.required?.includes(key);
                        return (
                          <div key={key} className="space-y-1">
                            <div className="flex items-center justify-between">
                              <label className="text-[11px] font-mono font-bold text-white/70">{key}</label>
                              <span className="text-[9px] font-mono text-white/30 uppercase">{prop.type}{isRequired ? ' • required' : ''}</span>
                            </div>
                            <p className="text-[10px] text-white/40 leading-normal mb-1">{prop.description}</p>
                            
                            {prop.type === 'number' ? (
                              <input 
                                type="number"
                                value={sandboxArgs[key] ?? ''}
                                onChange={(e) => setSandboxArgs({...sandboxArgs, [key]: Number(e.target.value)})}
                                className="w-full text-xs font-mono px-3.5 py-2.5 bg-[#030303] border border-white/10 rounded-2xl focus:outline-none focus:border-indigo-500/50 transition-colors"
                              />
                            ) : prop.type === 'boolean' ? (
                              <select
                                value={sandboxArgs[key]?.toString() ?? 'false'}
                                onChange={(e) => setSandboxArgs({...sandboxArgs, [key]: e.target.value === 'true'})}
                                className="w-full text-xs font-mono px-3.5 py-2.5 bg-[#030303] border border-white/10 rounded-2xl focus:outline-none focus:border-indigo-500/50 transition-colors"
                              >
                                <option value="true">true</option>
                                <option value="false">false</option>
                              </select>
                            ) : (
                              <input 
                                type="text"
                                value={sandboxArgs[key] ?? ''}
                                onChange={(e) => setSandboxArgs({...sandboxArgs, [key]: e.target.value})}
                                className="w-full text-xs font-mono px-3.5 py-2.5 bg-[#030303] border border-white/10 rounded-2xl focus:outline-none focus:border-indigo-500/50 transition-colors"
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <button
                      onClick={handleExecuteSandbox}
                      disabled={isRunningSandbox || selectedConnector.status !== 'connected'}
                      className="w-full bg-indigo-500 hover:bg-indigo-600 font-bold uppercase tracking-wider text-white text-xs py-3.5 px-4 rounded-2xl transition-all disabled:opacity-40 disabled:hover:bg-indigo-500 flex items-center justify-center gap-2 active:scale-[0.98]"
                    >
                      {isRunningSandbox ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Dispatching sandbox session...</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 fill-white" />
                          <span>Execute Sandbox Tool</span>
                        </>
                      )}
                    </button>
                    {selectedConnector.status !== 'connected' && (
                      <p className="text-[10px] text-red-400 text-center font-mono">⚠️ Please configure credentials first to execute sandbox.</p>
                    )}
                  </div>

                  {/* Sandbox Execution Output Console */}
                  <div className="flex flex-col h-full space-y-3">
                    <h4 className="text-[11px] font-bold uppercase tracking-widest text-white/45">Runtime Response Console</h4>
                    <div className="flex-1 bg-[#030303] border border-white/10 rounded-2xl p-4 font-mono text-xs overflow-auto max-h-[420px] min-h-[220px] custom-scrollbar relative flex flex-col justify-between">
                      {sandboxResult ? (
                        <div className="space-y-4 select-text">
                          <div className="flex items-center justify-between border-b border-white/5 pb-2">
                            <span className={`text-[10px] font-bold ${sandboxResult.success ? 'text-green-400' : 'text-red-400'}`}>
                              {sandboxResult.success ? 'STATUS: OK 200' : 'STATUS: RUNTIME ERROR'}
                            </span>
                            <span className="text-[9px] text-white/30">{sandboxResult.timestamp}</span>
                          </div>
                          <pre className="text-[11px] leading-relaxed text-[#F5F5F7] whitespace-pre-wrap">
                            {JSON.stringify(sandboxResult.data || sandboxResult, null, 2)}
                          </pre>
                        </div>
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-white/20 p-6 text-center space-y-2">
                          <Terminal className="w-8 h-8 opacity-40 animate-pulse text-indigo-400" />
                          <p className="text-xs">Console idle. Configure credentials, set arguments, and execute.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center p-8 bg-white/5 rounded-2xl border border-white/5 text-white/40">
                  Select a connector capability/tool to execute it in sandbox.
                </div>
              )}
            </div>

            {/* Execution logs */}
            <div className="p-6 rounded-3xl bg-[#080808] border border-white/5 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#F5F5F7] flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-400" /> Nexus Runtime execution audit logs
              </h3>
              
              <div className="border border-white/5 rounded-2xl overflow-hidden text-xs">
                <div className="bg-white/5 grid grid-cols-4 p-3 font-mono font-bold text-white/50 border-b border-white/5">
                  <div>Timestamp</div>
                  <div>Connector</div>
                  <div>Capability</div>
                  <div>Latency / Status</div>
                </div>
                <div className="divide-y divide-white/5 max-h-48 overflow-y-auto custom-scrollbar">
                  {executionLogs.map((log, i) => (
                    <div key={i} className="grid grid-cols-4 p-3 font-mono text-[11px] select-text">
                      <div className="text-white/40">{new Date(log.timestamp).toLocaleTimeString()}</div>
                      <div className="font-bold text-white">{log.connectorId.toUpperCase()}</div>
                      <div className="text-[#F5F5F7]/80">{log.tool}</div>
                      <div className="flex items-center justify-between pr-2">
                        <span className="text-white/40">{log.duration}ms</span>
                        <span className={`font-bold ${log.success ? 'text-green-400' : 'text-red-400'}`}>
                          {log.success ? '●' : '❌'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-white/20 p-6 space-y-3">
            <Database className="w-12 h-12 stroke-1 opacity-50 text-indigo-400" />
            <p className="text-sm">Select an external connector to inspect or execute.</p>
          </div>
        )}
      </div>
    </div>
  );
}
