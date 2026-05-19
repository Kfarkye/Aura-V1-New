import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, FileText, File, HardDrive, RefreshCw, Table, Presentation } from 'lucide-react';
import { getRecentDriveFiles, DriveFile, DocumentType } from '../services/drive';
import { WorkspaceAuthError } from './WorkspaceAuthError';

interface DriveFilePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFileSelect: (file: DriveFile) => void;
}

export function DriveFilePickerModal({ isOpen, onClose, onFileSelect }: DriveFilePickerModalProps) {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<DocumentType>('all');

  useEffect(() => {
    if (isOpen) {
      loadFiles(filter);
    }
  }, [isOpen, filter]);

  const loadFiles = async (currentFilter: DocumentType) => {
    setLoading(true);
    setError('');
    try {
      const data = await getRecentDriveFiles(currentFilter);
      setFiles(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load Drive files');
    } finally {
      setLoading(false);
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('document') || mimeType.includes('word')) return <FileText className="w-5 h-5 text-blue-400" />;
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return <Table className="w-5 h-5 text-emerald-400" />;
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return <Presentation className="w-5 h-5 text-amber-400" />;
    return <File className="w-5 h-5 text-white/40" />;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-2xl glass-panel rounded-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              {/* Header */}
            <div className="flex flex-col border-b border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-transparent">
              <div className="flex items-center justify-between px-6 py-5 pb-4">
                <div className="flex items-center gap-3 text-white/90">
                  <HardDrive className="w-5 h-5 text-white/60" />
                  <h2 className="text-[15px] font-medium tracking-tight">Google Workspace</h2>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => loadFiles(filter)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/50 hover:text-white" disabled={loading}>
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                  <div className="w-px h-4 bg-white/10 mx-1" />
                  <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/50 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              {/* Tabs */}
              <div className="flex items-center gap-6 px-6">
                {(['all', 'docs', 'sheets', 'slides'] as DocumentType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setFilter(t)}
                    className={`pb-3 text-[13px] font-medium transition-colors relative ${filter === t ? 'text-white' : 'text-white/40 hover:text-white/70'}`}
                  >
                    <span className="capitalize">{t === 'all' ? 'All Files' : t}</span>
                    {filter === t && (
                      <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-[2px] bg-white rounded-t-full" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-3 style-scrollbar bg-black/20">
              {loading && files.length === 0 ? (
                <div className="flex justify-center items-center py-20">
                  <div className="w-6 h-6 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
                </div>
              ) : error ? (
                error.includes('Authentication error') ? (
                  <WorkspaceAuthError onRetry={() => loadFiles(filter)} message={error} onClose={onClose} />
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 px-6">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 mb-5">
                      <X className="h-7 w-7 text-red-500" aria-hidden="true" />
                    </div>
                    <h3 className="text-lg font-medium text-white mb-2">Error Loading Data</h3>
                    <p className="text-[13px] text-white/50 text-center max-w-sm mb-8 leading-relaxed">
                      {error}
                    </p>
                    <button onClick={() => loadFiles(filter)} className="w-full max-w-[200px] rounded-xl bg-white px-4 py-2.5 text-[14px] font-medium text-black shadow-sm hover:bg-white/90 transition-all">
                      Retry
                    </button>
                  </div>
                )
              ) : files.length === 0 ? (
                <div className="p-16 text-center text-white/40 text-[13px] font-light">No recent files found.</div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {files.map((file) => (
                    <button
                      key={file.id}
                      onClick={() => {
                        onFileSelect(file);
                        onClose();
                      }}
                      className="flex items-center gap-4 p-3 hover:bg-white/[0.04] rounded-xl transition-all duration-200 text-left group border border-transparent hover:border-white/[0.05]"
                    >
                      <div className="shrink-0 p-2.5 bg-[#111111] border border-white/[0.05] shadow-inner rounded-xl group-hover:scale-105 transition-transform duration-300">
                        {getFileIcon(file.mimeType)}
                      </div>
                      <div className="flex-1 min-w-0 pr-4">
                        <div className="text-[14px] text-white/90 font-medium truncate mb-1 group-hover:text-white transition-colors">{file.name}</div>
                        <div className="text-[11px] text-white/40 uppercase tracking-widest font-mono">
                          {new Date(file.modifiedTime).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
