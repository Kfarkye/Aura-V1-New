import React, { useState } from 'react';
import { motion } from 'motion/react';
import { FolderKanban, RefreshCw, X, AlertTriangle } from 'lucide-react';
import { googleSignIn } from '../services/auth';

interface WorkspaceAuthErrorProps {
  onRetry: () => void;
  onClose?: () => void;
  message?: string;
}

const tabs = ['All Files', 'Docs', 'Sheets', 'Slides'];

export const WorkspaceAuthError: React.FC<WorkspaceAuthErrorProps> = ({ onRetry, onClose, message }) => {
  const [activeTab, setActiveTab] = useState('All Files');
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    try {
      await googleSignIn();
      onRetry();
    } catch (err) {
      console.error("Sign in failed", err);
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="flex items-center justify-center p-4 h-full w-full bg-black/40 backdrop-blur-md absolute inset-0 z-50">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md overflow-hidden rounded-2xl glass-panel"
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <FolderKanban className="h-6 w-6 text-white/50" />
            <span className="text-[15px] font-medium text-white">Google Workspace</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onRetry} className="p-2 rounded-full hover:bg-white/10 transition-colors">
              <RefreshCw className="h-4 w-4 text-white/50" />
            </button>
            {onClose && (
              <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors">
                <X className="h-4 w-4 text-white/50" />
              </button>
            )}
          </div>
        </div>

        <div>
          <div className="border-b border-white/10">
            <nav className="-mb-px flex space-x-6 px-5" aria-label="Tabs">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`
                    ${
                      activeTab === tab
                        ? 'border-white text-white'
                        : 'border-transparent text-white/40 hover:text-white/70 hover:border-white/20'
                    }
                    whitespace-nowrap py-3 px-1 border-b-2 font-medium text-[13px] transition-all tracking-wide
                  `}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>
        </div>

        <div className="px-8 py-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 mb-6 shadow-[inset_0_0_12px_rgba(239,68,68,0.2)]">
            <AlertTriangle className="h-6 w-6 text-red-500" aria-hidden="true" />
          </div>
          <h3 className="text-lg font-medium text-white tracking-tight">Authentication Failed</h3>
          <p className="mt-3 text-[14px] text-white/60 leading-relaxed max-w-[280px] mx-auto">
            {message || 'Your connection to Google Workspace has expired. Please sign in again.'}
          </p>
          <div className="mt-10">
            <button
              type="button"
              onClick={handleSignIn}
              disabled={isSigningIn}
              className="w-full rounded-xl bg-white px-4 py-3 text-[14px] font-medium text-black shadow-sm hover:bg-white/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white transition-all disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]"
            >
              {isSigningIn ? 'Connecting to Workspace...' : 'Sign In to Google'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
