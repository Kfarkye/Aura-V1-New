import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AuraApp } from './AuraArtifact';

interface FileChange {
  path: string;
  description: string;
  content?: string;
}

interface AppModificationProps {
  files: FileChange[];
  previewCode?: string;
}

export type DeployState = 'idle' | 'committing' | 'building' | 'routing' | 'done' | 'error';

export function AppModification({ files, previewCode }: AppModificationProps) {
  const [deployState, setDeployState] = useState<DeployState>('idle');
  const [revision, setRevision] = useState('');
  const [branch, setBranch] = useState('');
  const [serviceUrl, setServiceUrl] = useState('');
  const [errorDetail, setErrorDetail] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  // Abort in-flight deploy on unmount
  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  const handleDeploy = useCallback(async () => {
    // Guard: need actual file content to deploy
    const deployableFiles = files.filter(f => f.content && f.path);
    if (deployableFiles.length === 0) {
      setErrorDetail('No file content available to deploy. The AI response must include full file contents.');
      setDeployState('error');
      return;
    }

    // Abort any previous in-flight deploy
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setDeployState('committing');
    setErrorDetail('');
    setRevision('');
    setBranch('');
    setServiceUrl('');

    try {
      const response = await fetch('/api/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          files: deployableFiles.map(f => ({
            path: f.path,
            content: f.content,
            description: f.description,
          })),
          summary: deployableFiles.map(f => f.description).filter(Boolean).join('; ') || 'Aura self-modification',
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Deploy request failed' }));
        throw new Error(err.error || `Server error: ${response.status}`);
      }

      // Read SSE stream
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response stream from deploy endpoint');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;
          const data = trimmed.slice(6);
          if (data === '[DONE]') {
            setDeployState('done');
            return;
          }

          try {
            const parsed = JSON.parse(data);
            if (parsed.state === 'committing') setDeployState('committing');
            else if (parsed.state === 'building') setDeployState('building');
            else if (parsed.state === 'routing') setDeployState('routing');
            else if (parsed.state === 'done') {
              if (parsed.revision) setRevision(parsed.revision);
              if (parsed.branch) setBranch(parsed.branch);
              if (parsed.url) setServiceUrl(parsed.url);
              setDeployState('done');
            } else if (parsed.state === 'error') {
              setErrorDetail(parsed.error || 'Deployment failed');
              setDeployState('error');
            }
          } catch {
            // Non-JSON SSE line, skip
          }
        }
      }

      // If stream ended without explicit done/error, assume success
      setDeployState(prev => prev === 'routing' || prev === 'building' ? 'done' : prev);

    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      console.error('Deploy failed:', err);
      setErrorDetail(err instanceof Error ? err.message : 'Deployment failed');
      setDeployState('error');
    }
  }, [files]);

  const hasDeployableContent = files.some(f => f.content && f.path);

  return (
    <div className="w-full max-w-2xl bg-white border border-black/5 rounded-[24px] shadow-[0_16px_40px_-8px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.05)] overflow-hidden font-sans my-4">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-black/5 bg-[#fbfbfd]">
        <div
          className="w-5 h-5 rounded-md flex items-center justify-center"
          style={{
            background: 'linear-gradient(145deg, #6e6e73 0%, #3a3a3c 100%)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15)',
          }}
          aria-hidden="true"
        >
          <span className="text-white text-[0.5rem] font-black">M</span>
        </div>
        <h3 className="text-[0.75rem] font-bold tracking-[0.2em] text-[#1d1d1f] uppercase">App Modification</h3>
      </div>
      
      <div className="p-6">
        <div className="mb-6">
          <p className="text-[0.7rem] font-bold text-[#86868b] uppercase tracking-[0.2em] mb-3">Files to change</p>
          <ul className="space-y-2">
            {files.map((file, idx) => (
              <li key={idx} className="flex items-start gap-2 text-[0.9rem] leading-relaxed text-[#1d1d1f]">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#1d1d1f] shrink-0" />
                <span>
                  <code className="font-mono text-[0.85em] bg-black/5 px-1.5 py-0.5 rounded mr-1">{file.path}</code>
                  <span className="text-[#86868b]">&mdash; {file.description}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        {previewCode && (
          <div className="mb-8">
            <p className="text-[0.7rem] font-bold text-[#86868b] uppercase tracking-[0.2em] mb-3">Preview</p>
            <div className="border border-black/10 rounded-[16px] overflow-hidden bg-[#f5f5f7] p-4 h-[300px] relative">
               <AuraApp code={previewCode} />
            </div>
          </div>
        )}

        {deployState === 'idle' ? (
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-black/5">
            {!hasDeployableContent && (
              <span className="text-[0.75rem] text-[#86868b] mr-auto">Preview only — no file content to deploy</span>
            )}
            <button 
              onClick={handleDeploy}
              disabled={!hasDeployableContent}
              className="px-5 py-2.5 rounded-full text-white text-[0.75rem] font-bold uppercase tracking-[0.15em] hover:scale-[1.02] active:scale-[0.98] transition-all focus:outline-none flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed disabled:scale-100"
              style={{
                background: hasDeployableContent
                  ? 'linear-gradient(165deg, #6e6e73 0%, #48484a 25%, #3a3a3c 50%, #2c2c2e 75%, #1d1d1f 100%)'
                  : '#86868b',
                boxShadow: hasDeployableContent
                  ? '0 4px 12px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.18)'
                  : 'none',
              }}
            >
              Deploy to Production
            </button>
          </div>
        ) : (
          <div className="mt-6 p-5 bg-[#f5f5f7] rounded-[16px] border border-black/5">
            <h4 className="text-[0.7rem] font-bold text-[#1d1d1f] uppercase tracking-[0.2em] mb-4">Deployment Status</h4>
            <div className="space-y-3">
              <StatusRow 
                label="Committing to GitHub" 
                status={deployState === 'committing' ? 'loading' : 'done'} 
              />
              <StatusRow 
                label="Building on Cloud Run" 
                status={
                  deployState === 'committing' ? 'idle' : 
                  deployState === 'building' ? 'loading' : 'done'
                } 
              />
              <StatusRow 
                label="Routing traffic" 
                status={
                  deployState === 'committing' || deployState === 'building' ? 'idle' : 
                  deployState === 'routing' ? 'loading' : 'done'
                } 
              />
            </div>

            <AnimatePresence>
              {deployState === 'done' && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  className="mt-6 pt-5 border-t border-black/10"
                >
                  <div className="flex items-start gap-3 text-emerald-600 mb-2">
                    <div className="w-5 h-5 mt-0.5 shrink-0 rounded-full bg-emerald-500 flex items-center justify-center">
                      <span className="text-white text-[0.5rem] font-black">✓</span>
                    </div>
                    <div>
                      {serviceUrl ? (
                        <p className="text-[0.9rem] font-medium">Live at <a href={serviceUrl} target="_blank" rel="noopener noreferrer" className="font-mono text-[0.85em] underline underline-offset-2 hover:text-emerald-700 transition-colors">{serviceUrl}</a></p>
                      ) : (
                        <p className="text-[0.9rem] font-medium">Deployed successfully</p>
                      )}
                      {revision && <p className="text-[0.8rem] text-emerald-600/70 mt-1 font-mono">Revision: {revision}</p>}
                      {branch && <p className="text-[0.8rem] text-emerald-600/70 font-mono">Branch: {branch}</p>}
                    </div>
                  </div>
                </motion.div>
              )}
              {deployState === 'error' && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-4 bg-red-50 border border-red-200 rounded-[12px]"
                >
                  <p className="text-[0.85rem] text-red-700 font-medium">{errorDetail}</p>
                  <button
                    onClick={() => { setDeployState('idle'); setErrorDetail(''); }}
                    className="mt-2 text-[0.75rem] font-bold text-red-600 uppercase tracking-wider hover:text-red-800 transition-colors"
                  >
                    Retry
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusRow({ label, status }: { label: string, status: 'idle' | 'loading' | 'done' }) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-[0.85rem] ${status === 'idle' ? 'text-[#86868b]' : 'text-[#1d1d1f] font-medium'}`}>
        {label}{status === 'loading' ? '...' : ''}
      </span>
      <div className="w-5 h-5 flex items-center justify-center">
        {status === 'loading' && (
          <div className="w-4 h-4 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
        )}
        {status === 'done' && (
          <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
            <span className="text-white text-[0.4rem] font-black">✓</span>
          </div>
        )}
      </div>
    </div>
  );
}
