import React, { useRef, useState, useCallback, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Editor from 'react-simple-code-editor';
import Prism from 'prismjs';
import { Attachment } from '../../types';
import { ALLOWED_MIME_TYPES, MAX_ATTACHMENTS, MAX_FILE_SIZE, MAX_INPUT_LENGTH } from '../../lib/constants';
import { cn } from '../../lib/utils';
import GoogleDriveExplorer from '../ui/GoogleDriveExplorer';
import RepoFileExplorer from '../ui/RepoFileExplorer';

type OperationalMode = 'chat' | 'search' | 'research' | 'artifact' | 'build';

interface ModeConfig {
  id: OperationalMode;
  label: string;
}

const MODES: ModeConfig[] = [
  { id: 'chat',     label: 'Chat' },
  { id: 'search',   label: 'Search' },
  { id: 'research', label: 'Research' },
  { id: 'artifact', label: 'Artifact' },
  { id: 'build',    label: 'Build' },
];

const SPRING_EASE = [0.16, 1, 0.3, 1] as const;

interface ChatInputProps {
  onSend: (content: string, attachments: Attachment[]) => Promise<void>;
  onStop: () => void;
  isTyping: boolean;
  triggerError: (msg: string) => void;
  injectedTemplate: string;
  targetRepository?: string;
  onTargetRepositoryChange?: (v: string) => void;
  isEmpty?: boolean;
}

export const ChatInput = memo(({ onSend, onStop, isTyping, triggerError, injectedTemplate, targetRepository, onTargetRepositoryChange, isEmpty }: ChatInputProps) => {
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [activeMode, setActiveMode] = useState<OperationalMode>('chat');
  const [isModeMenuOpen, setIsModeMenuOpen] = useState(false);
  const [isDriveMenuOpen, setIsDriveMenuOpen] = useState(false);
  const [isRepoMenuOpen, setIsRepoMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modeMenuRef = useRef<HTMLDivElement>(null);

  // Effect to handle injected templates
  useEffect(() => {
    if (injectedTemplate) {
      setInput(injectedTemplate);
    }
  }, [injectedTemplate]);

  // Cleanup effect for blob URLs when component unmounts or attachments change
  useEffect(() => {
    return () => {
      attachments.forEach(a => {
        if (a.url.startsWith('blob:')) URL.revokeObjectURL(a.url);
      });
    };
  }, [attachments]);

  // Close mode menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modeMenuRef.current && !modeMenuRef.current.contains(e.target as Node)) {
        setIsModeMenuOpen(false);
        setIsDriveMenuOpen(false);
        setIsRepoMenuOpen(false);
      }
    };
    if (isModeMenuOpen || isDriveMenuOpen || isRepoMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isModeMenuOpen, isDriveMenuOpen, isRepoMenuOpen]);

  const handleDriveFileSelect = useCallback((fileId: string, name: string) => {
    setInput(prev => prev + (prev.endsWith(' ') || prev === '' ? '' : ' ') + `[${name}](drive://${fileId}) `);
    setIsDriveMenuOpen(false);
  }, []);

  const handleRepoFileSelect = useCallback((file: any, repoOwner: string, repoName: string) => {
    setInput(prev => prev + (prev.endsWith(' ') || prev === '' ? '' : ' ') + `[${file.path}](repo://${repoOwner}/${repoName}/${file.path}) `);
    setIsRepoMenuOpen(false);
  }, []);

  const processFile = useCallback((file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      triggerError('File exceeds the 5MB limit.');
      return;
    }
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      triggerError('Only JPEG, PNG, WEBP, and GIF files are allowed.');
      return;
    }
    if (attachments.length >= MAX_ATTACHMENTS) {
      triggerError(`Maximum of ${MAX_ATTACHMENTS} attachments allowed.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = (e.target?.result as string).split(',')[1];
      setAttachments(prev => [...prev, { mimeType: file.type, data: base64, url: URL.createObjectURL(file), name: file.name }]);
    };
    reader.onerror = () => {
      triggerError('Error reading file. Please try again.');
    };
    reader.readAsDataURL(file);
  }, [attachments.length, triggerError]);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  }, [processFile]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    let imagesProcessedInThisPaste = 0;
    
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        if (attachments.length + imagesProcessedInThisPaste >= MAX_ATTACHMENTS) {
          triggerError(`Maximum ${MAX_ATTACHMENTS} attachments limit reached.`);
          break;
        }
        const file = items[i].getAsFile();
        if (file) {
          processFile(file);
          imagesProcessedInThisPaste++;
        }
      }
    }
  }, [attachments.length, processFile, triggerError]);

  const removeAttachment = useCallback((index: number) => {
    setAttachments(prev => {
      const newAtt = [...prev];
      const removed = newAtt.splice(index, 1)[0];
      if (removed?.url.startsWith('blob:')) URL.revokeObjectURL(removed.url);
      return newAtt;
    });
  }, []);

  const handleSend = async () => {
    const trimmedInput = input.trim();
    if (isTyping || (!trimmedInput && attachments.length === 0)) return;

    if (trimmedInput.length > MAX_INPUT_LENGTH) {
      triggerError(`Input exceeds the ${MAX_INPUT_LENGTH} character limit.`);
      return;
    }

    // Convert staging attachments to base64 URIs before sending to parent
    const persistentAttachments = attachments.map(a => ({
      ...a,
      url: `data:${a.mimeType};base64,${a.data}`
    }));

    // Free staging object memory instantly after creating persistent copies
    attachments.forEach(a => { if (a.url.startsWith('blob:')) URL.revokeObjectURL(a.url); });

    await onSend(trimmedInput, persistentAttachments);
    setInput('');
    setAttachments([]);
  };

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isTyping && (input.trim() || attachments.length > 0)) {
        handleSend();
      }
    }
  }, [isTyping, input, attachments.length, handleSend]);

  const handleSelectMode = useCallback((mode: OperationalMode) => {
    setActiveMode(mode);
    setIsModeMenuOpen(false);
  }, []);

  const activeModeConfig = MODES.find(m => m.id === activeMode)!;

  return (
    <div className="absolute bottom-0 left-0 right-0 p-4 lg:p-8 bg-gradient-to-t from-white via-white/95 to-transparent pointer-events-none z-30">
      <div className="max-w-2xl mx-auto pointer-events-auto">
        {/* ─── Frost Glass Container ─── */}
        <div
          className="relative rounded-[24px] lg:rounded-[32px] p-2 transition-all"
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(248,248,248,0.90) 100%)',
            backdropFilter: 'blur(60px) saturate(180%)',
            WebkitBackdropFilter: 'blur(60px) saturate(180%)',
            boxShadow: '0 24px 48px -12px rgba(0,0,0,0.18), 0 4px 16px -4px rgba(0,0,0,0.08), inset 0 1px 1px rgba(255,255,255,1)',
            border: '1px solid rgba(0,0,0,0.06)',
          }}
        >
          {/* ─── Attachment Preview Strip ─── */}
          <AnimatePresence>
            {attachments.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: SPRING_EASE as any }}
                className="flex gap-2 overflow-x-auto p-3"
              >
                {attachments.map((a, i) => (
                  <div key={`${a.name}-${i}`} className="relative group flex-shrink-0">
                    <img 
                      src={a.url} 
                      className="w-14 h-14 lg:w-16 lg:h-16 rounded-[16px] object-cover border border-black/5" 
                      referrerPolicy="no-referrer" 
                      alt={`Queued visual attachment ${i + 1}`}
                    />
                    <button 
                      onClick={() => removeAttachment(i)}
                      className="absolute -top-1.5 -right-1.5 rounded-full w-4 h-4 flex items-center justify-center text-white transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-white"
                      style={{
                        background: 'linear-gradient(145deg, #5a5a5e 0%, #2c2c2e 50%, #1d1d1f 100%)',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.12)',
                      }}
                      aria-label="Remove specific attachment"
                    >
                      <span className="text-[0.45rem] font-bold leading-none mb-[0.5px]">X</span>
                    </button>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ─── Input Row ─── */}
          <div className="relative flex items-end gap-1.5 pr-2 pl-1.5 pb-1.5 pt-1">
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept={Array.from(ALLOWED_MIME_TYPES).join(', ')} 
              onChange={handleImageUpload} 
              aria-hidden="true"
            />

            {/* ─── Plus + Mode Triangle Cluster ─── */}
            <div className="relative flex items-center mb-0.5" ref={modeMenuRef}>
              {/* Metallic Pill Container */}
              <div
                className="flex items-center rounded-[10px]"
                style={{
                  background: 'linear-gradient(180deg, #ffffff 0%, #fcfcfc 100%)',
                  border: '1px solid rgba(0,0,0,0.05)',
                  boxShadow: '0 4px 12px -2px rgba(0,0,0,0.06), 0 1px 3px -1px rgba(0,0,0,0.03), inset 0 1px 1px rgba(255,255,255,1)',
                }}
              >
                {/* Media Upload */}
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={attachments.length >= MAX_ATTACHMENTS}
                  className="px-3.5 py-2 text-[#86868b] hover:text-[#1d1d1f] disabled:opacity-30 disabled:hover:text-[#86868b] disabled:cursor-not-allowed transition-colors flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20 rounded-l-[10px]"
                  aria-label="Upload visual context file"
                >
                  <span className="text-[0.6rem] font-bold uppercase tracking-[0.2em] mt-[1px]">Media</span>
                </button>

                {/* Divider */}
                <div
                  className="w-px h-4"
                  style={{
                    background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.08) 30%, rgba(0,0,0,0.08) 70%, transparent 100%)',
                  }}
                  aria-hidden="true"
                />

                {/* Drive Explorer Toggle */}
                <button
                  onClick={() => { setIsDriveMenuOpen(prev => !prev); setIsRepoMenuOpen(false); setIsModeMenuOpen(false); }}
                  className={cn(
                    "px-3.5 py-2 transition-colors flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20",
                    isDriveMenuOpen ? "text-[#1d1d1f]" : "text-[#86868b] hover:text-[#1d1d1f]"
                  )}
                  aria-label="Open Google Drive Explorer"
                >
                  <span className="text-[0.6rem] font-bold uppercase tracking-[0.2em] mt-[1px]">Drive</span>
                </button>

                {/* Divider */}
                <div
                  className="w-px h-4"
                  style={{
                    background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.08) 30%, rgba(0,0,0,0.08) 70%, transparent 100%)',
                  }}
                  aria-hidden="true"
                />

                {/* Repo Explorer Toggle */}
                <button
                  onClick={() => { setIsRepoMenuOpen(prev => !prev); setIsDriveMenuOpen(false); setIsModeMenuOpen(false); }}
                  className={cn(
                    "px-3.5 py-2 transition-colors flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20",
                    isRepoMenuOpen ? "text-[#1d1d1f]" : "text-[#86868b] hover:text-[#1d1d1f]"
                  )}
                  aria-label="Open Repository Explorer"
                >
                  <span className="text-[0.6rem] font-bold uppercase tracking-[0.2em] mt-[1px]">Repo</span>
                </button>

                {/* Divider */}
                <div
                  className="w-px h-4"
                  style={{
                    background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.08) 30%, rgba(0,0,0,0.08) 70%, transparent 100%)',
                  }}
                  aria-hidden="true"
                />

                {/* Mode Triangle Toggle */}
                <button
                  onClick={() => { setIsModeMenuOpen(prev => !prev); setIsDriveMenuOpen(false); setIsRepoMenuOpen(false); }}
                  className={cn(
                    "px-3.5 py-2 transition-all flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20 rounded-r-[10px]",
                    isModeMenuOpen
                      ? "text-[#1d1d1f]"
                      : "text-[#86868b] hover:text-[#1d1d1f]"
                  )}
                  aria-label={`Current mode: ${activeModeConfig.label}. Click to change mode.`}
                  aria-expanded={isModeMenuOpen}
                  aria-haspopup="listbox"
                >
                  {/* Pure CSS downward-pointing triangle */}
                  <span
                    className={cn(
                      "inline-block transition-transform duration-300",
                      isModeMenuOpen && "rotate-180"
                    )}
                    style={{
                      width: 0,
                      height: 0,
                      borderLeft: '4.5px solid transparent',
                      borderRight: '4.5px solid transparent',
                      borderTop: '5px solid currentColor',
                      transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                    aria-hidden="true"
                  />
                </button>
              </div>

              {/* ─── Floating Mode Menu ─── */}
              <AnimatePresence>
                {isDriveMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.22, ease: SPRING_EASE as any }}
                    className="absolute bottom-full left-0 mb-2.5 z-50 origin-bottom-left"
                  >
                    <GoogleDriveExplorer onFileSelect={handleDriveFileSelect} />
                  </motion.div>
                )}
                {isRepoMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.22, ease: SPRING_EASE as any }}
                    className="absolute bottom-full left-0 mb-2.5 z-50 origin-bottom-left"
                  >
                    <RepoFileExplorer onFileSelect={handleRepoFileSelect} />
                  </motion.div>
                )}
                {isModeMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.22, ease: SPRING_EASE as any }}
                    className="absolute bottom-full left-0 mb-2.5 w-44 rounded-xl overflow-hidden z-50"
                    style={{
                      background: 'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(248,248,248,0.90) 100%)',
                      backdropFilter: 'blur(60px) saturate(180%)',
                      WebkitBackdropFilter: 'blur(60px) saturate(180%)',
                      boxShadow: '0 20px 40px -8px rgba(0,0,0,0.15), 0 4px 12px -2px rgba(0,0,0,0.08), inset 0 1px 1px rgba(255,255,255,1)',
                      border: '1px solid rgba(0,0,0,0.06)',
                    }}
                    role="listbox"
                    aria-label="Select operational mode"
                  >
                    <div className="py-1">
                      {MODES.map((mode) => {
                        const isActive = activeMode === mode.id;
                        return (
                          <button
                            key={mode.id}
                            onClick={() => handleSelectMode(mode.id)}
                            className={cn(
                              "w-full flex items-center px-4 py-2.5 transition-all outline-none",
                              isActive
                                ? "text-[#1d1d1f] bg-black/[0.04]"
                                : "text-[#86868b] hover:text-[#1d1d1f] hover:bg-black/[0.02]"
                            )}
                            role="option"
                            aria-selected={isActive}
                          >
                            <span className="text-[0.6rem] font-bold uppercase tracking-[0.2em]">{mode.label}</span>
                            {isActive && (
                              <motion.div
                                layoutId="active-mode-dot"
                                className="ml-auto w-1.5 h-1.5 rounded-full bg-[#1d1d1f]"
                                transition={{ duration: 0.25, ease: SPRING_EASE as any }}
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ─── Text Editor Surface ─── */}
            <div className="flex-1 max-h-[40vh] overflow-y-auto text-[0.95rem] relative text-[#1d1d1f]" onPaste={handlePaste}>
              <Editor
                value={input}
                onValueChange={setInput}
                highlight={code => {
                  try {
                    return Prism.highlight(code || '', Prism.languages.markdown, 'markdown');
                  } catch {
                    return code || '';
                  }
                }}
                padding={12}
                placeholder=""
                style={{ fontFamily: 'inherit', backgroundColor: 'transparent', minHeight: '48px' }}
                textareaClassName="focus:outline-none placeholder:text-[#86868b]/60 placeholder:font-medium"
                onKeyDown={handleKeyDown}
                maxLength={MAX_INPUT_LENGTH}
              />
            </div>
            
            {/* ─── Action Button ─── */}
            {isTyping ? (
               <button
                onClick={onStop}
                className="mb-1 px-5 lg:px-6 py-2.5 text-white text-[0.7rem] font-bold rounded-[20px] hover:scale-[1.02] transition-transform duration-300 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-500 flex items-center uppercase"
                style={{
                  background: 'linear-gradient(145deg, #ef4444 0%, #dc2626 100%)',
                  boxShadow: '0 2px 8px rgba(220,38,38,0.35), inset 0 1px 0 rgba(255,255,255,0.15)',
                  letterSpacing: '0.25em',
                }}
                aria-label="Stop Generation"
              >
                <span>Stop</span>
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={(!input.trim() && attachments.length === 0)}
                className="mb-1 px-5 lg:px-6 py-2.5 text-white text-[0.7rem] font-bold rounded-[20px] disabled:opacity-25 disabled:scale-100 hover:scale-[1.02] transition-all duration-300 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#3a3a3c] cursor-pointer disabled:cursor-not-allowed uppercase group relative overflow-hidden"
                style={{
                  background: 'linear-gradient(165deg, #6e6e73 0%, #48484a 25%, #3a3a3c 50%, #2c2c2e 75%, #1d1d1f 100%)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.25), 0 1px 3px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(0,0,0,0.3)',
                  letterSpacing: '0.25em',
                }}
                aria-label="Send Payload"
              >
                {/* Hover glare effect */}
                <span
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{
                    background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.08) 45%, rgba(255,255,255,0.14) 50%, rgba(255,255,255,0.08) 55%, transparent 70%)',
                  }}
                  aria-hidden="true"
                />
                <span className="relative pl-1">Return</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
ChatInput.displayName = 'ChatInput';
