import React, { memo, useState, useCallback, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { Task } from '../../types';

// --- Types & Constants ---
interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeRail: string;
  onRailChange: (id: string) => void;
  tasks: Task[];
  isGitHubConnected: boolean;
  isGoogleConnected: boolean;
  githubUser?: string;
  googleUser?: string;
  onOAuthConnect: (provider: 'github' | 'google') => void;
  onRepoSync?: (context?: { repo: string; branch: string; tree: any[] }) => void;
  onLogout: () => void;
}

const NAV_ITEMS = [
  { id: 'music', label: 'Music' },
  { id: 'sports', label: 'Sports' },
  { id: 'prediction-markets', label: 'Prediction Markets' },
  { id: 'crypto', label: 'Crypto' },
  { id: 'work', label: 'Work' },
  { id: 'automation', label: 'Automation' },
];

// --- Custom Hook for Repo Sync Logic ---
const useRepoSync = (isGitHubConnected: boolean, onRepoSync?: SidebarProps['onRepoSync']) => {
  const [repos, setRepos] = useState<{ name: string; private: boolean; url: string }[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState('');
  const [syncingRepo, setSyncingRepo] = useState(false);
  const [syncedRepo, setSyncedRepo] = useState('');

  const fetchRepos = useCallback(async () => {
    if (repos.length > 0 || loadingRepos) return;
    setLoadingRepos(true);
    try {
      const res = await fetch('/api/github/repos');
      if (res.ok) setRepos(await res.json());
    } catch (e) {
      console.error('Failed to load repos:', e);
    } finally {
      setLoadingRepos(false);
    }
  }, [repos.length, loadingRepos]);

  useEffect(() => {
    if (isGitHubConnected) {
      fetchRepos();
    }
  }, [isGitHubConnected, fetchRepos]);

  const handleSync = useCallback(async () => {
    if (!selectedRepo) return;
    setSyncingRepo(true);
    try {
      const [owner, repo] = selectedRepo.split('/');
      const res = await fetch('/api/github/repos/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner, repo }),
      });
      if (res.ok) {
        const data = await res.json();
        setSyncedRepo(selectedRepo);
        onRepoSync?.({ repo: selectedRepo, branch: data.branch, tree: data.tree });
      }
    } catch (e) {
      console.error('Sync failed:', e);
    } finally {
      setSyncingRepo(false);
    }
  }, [selectedRepo, onRepoSync]);

  return { repos, loadingRepos, selectedRepo, syncingRepo, syncedRepo, setSelectedRepo, setSyncedRepo, fetchRepos, handleSync };
};

// --- Child Components ---

const SidebarHeader = memo(({ onClose }: { onClose: () => void }) => (
  <div className="p-6 pb-4 flex items-center justify-between">
    <div className="flex items-center">
      <span className="font-display font-medium tracking-widest text-[12px] uppercase text-aura-heading opacity-90">A U R A</span>
    </div>
    <button className="lg:hidden p-2 opacity-50 hover:opacity-100 transition-opacity" onClick={onClose} aria-label="Close sidebar">
      <span className="text-[10px] uppercase tracking-widest font-medium">Close</span>
    </button>
  </div>
));
SidebarHeader.displayName = 'SidebarHeader';

const NewChatButton = memo(({ onRailChange }: { onRailChange: (id: string) => void }) => (
  <div className="px-5 py-2">
    <button onClick={() => onRailChange('chat')} className="w-full text-center py-2 px-4 bg-transparent border border-aura-border text-aura-heading hover:bg-aura-heading hover:text-aura-bg transition-all duration-300 text-[11px] font-medium tracking-widest uppercase rounded-none">
      New Chat
    </button>
  </div>
));
NewChatButton.displayName = 'NewChatButton';

const Navigation = memo(({ activeRail, onRailChange, tasks }: Pick<SidebarProps, 'activeRail' | 'onRailChange' | 'tasks'>) => {
  const actionCount = tasks.filter(t => !t.completed).length;
  return (
    <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto style-scrollbar" role="navigation" aria-label="Sidebar">
      {NAV_ITEMS.map((item) => (
        <button
          key={item.id}
          onClick={() => onRailChange(item.id)}
          className={cn(
            "w-full text-left px-3 py-2 text-[12px] transition-all duration-300 group flex items-center justify-between",
            activeRail === item.id ? "text-aura-heading font-medium" : "text-aura-text hover:text-aura-heading font-normal opacity-70 hover:opacity-100"
          )}
        >
          <span className="tracking-wide">{item.label}</span>
          {item.id === 'workspace' && actionCount > 0 && (
            <span className="text-[10px] font-medium text-aura-heading">
              {actionCount}
            </span>
          )}
        </button>
      ))}
    </nav>
  );
});
Navigation.displayName = 'Navigation';

const IntegrationRow = memo(({ label, connected, username, onConnect }: { label: string; connected: boolean; username?: string; onConnect: () => void }) => (
  <div className="flex items-center justify-between py-1">
    <div className="flex items-center gap-3">
      <div className={cn("w-[3px] h-[3px] rounded-full", connected ? "bg-aura-heading" : "bg-aura-border")} />
      <span className="text-[11px] tracking-wide text-aura-text">{label}</span>
      {connected && username && <span className="text-[10px] text-aura-accent-muted font-medium opacity-60 truncate max-w-[80px]">{username}</span>}
    </div>
    {!connected && <button onClick={onConnect} className="text-[10px] font-medium uppercase tracking-widest text-aura-accent-muted hover:text-aura-heading transition-colors">Connect</button>}
  </div>
));
IntegrationRow.displayName = 'IntegrationRow';

const IntegrationsPanel = memo((props: Pick<SidebarProps, 'isGoogleConnected' | 'googleUser' | 'isGitHubConnected' | 'githubUser' | 'onOAuthConnect' | 'onRepoSync'>) => {
  const [isOpen, setIsOpen] = useState(false);
  const { repos, loadingRepos, selectedRepo, syncingRepo, syncedRepo, setSelectedRepo, setSyncedRepo, handleSync } = useRepoSync(props.isGitHubConnected, props.onRepoSync);

  const handleToggle = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  const handleRepoChange = () => {
    setSyncedRepo('');
    props.onRepoSync?.(undefined);
  }

  return (
    <>
      <button onClick={handleToggle} className="flex items-center justify-between w-full text-aura-text hover:text-aura-heading transition-colors cursor-pointer group" aria-expanded={isOpen}>
        <span className="text-[10px] uppercase tracking-widest font-medium opacity-70 group-hover:opacity-100 transition-opacity">Integrations</span>
        <span className="text-[10px] font-mono opacity-50">{isOpen ? '-' : '+'}</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }} className="overflow-hidden">
            <div className="space-y-3 pt-4 pb-2">
              <IntegrationRow label="Google Workspace" connected={props.isGoogleConnected} username={props.googleUser?.split('@')[0]} onConnect={() => props.onOAuthConnect('google')} />
              <IntegrationRow label="GitHub" connected={props.isGitHubConnected} username={props.githubUser} onConnect={() => props.onOAuthConnect('github')} />

              {props.isGitHubConnected && (
                <div className="pt-2">
                  {syncedRepo ? (
                    <div className="flex items-center justify-between py-1">
                       <div className="flex items-center gap-3">
                          <div className="w-[3px] h-[3px] rounded-full bg-aura-heading"/>
                          <span className="text-[11px] font-medium text-aura-heading tracking-wide truncate">{syncedRepo.split('/')[1]}</span>
                      </div>
                      <button onClick={handleRepoChange} className="text-[10px] uppercase tracking-widest font-medium text-aura-accent-muted hover:text-aura-heading transition-colors">Change</button>
                    </div>
                  ) : (
                    <div className="space-y-3 mt-2">
                      <select className="w-full text-[11px] tracking-wide bg-transparent text-aura-text py-1 border-b border-aura-border outline-none appearance-none cursor-pointer rounded-none" value={selectedRepo} onChange={(e) => setSelectedRepo(e.target.value)} disabled={loadingRepos || syncingRepo}>
                        <option value="" disabled>{loadingRepos ? 'Loading...' : 'Select repository'}</option>
                        {repos.map(r => <option key={r.name} value={r.name}>{r.name.split('/')[1]}</option>)}
                      </select>
                      <button onClick={handleSync} disabled={syncingRepo || !selectedRepo} className="w-full py-1.5 bg-transparent border border-aura-border text-aura-heading text-[10px] uppercase tracking-widest font-medium hover:bg-aura-heading hover:text-aura-bg disabled:opacity-30 transition-all">
                        {syncingRepo ? 'Syncing...' : 'Sync Repository'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
});
IntegrationsPanel.displayName = 'IntegrationsPanel';

// --- Main Sidebar Component ---

export const Sidebar = memo((props: SidebarProps) => (
  <aside className={cn(
    "fixed lg:relative inset-y-0 left-0 z-[100] w-[260px] bg-aura-bg border-r border-aura-border flex flex-col shrink-0 transform transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] lg:transform-none",
    props.isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
  )}>
    <SidebarHeader onClose={props.onClose} />
    <NewChatButton onRailChange={props.onRailChange} />
    <Navigation activeRail={props.activeRail} onRailChange={props.onRailChange} tasks={props.tasks} />

    <div className="p-6 pt-4 space-y-6">
      <IntegrationsPanel {...props} />
      <button onClick={() => props.onRailChange('settings')} className="flex items-center w-full text-aura-text hover:text-aura-heading transition-colors cursor-pointer group">
        <span className="text-[10px] uppercase tracking-widest font-medium opacity-70 group-hover:opacity-100 transition-opacity">Settings</span>
      </button>
    </div>
  </aside>
));
Sidebar.displayName = 'Sidebar';
