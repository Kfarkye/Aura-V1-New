import { ArrowUp, HardDrive, X } from 'lucide-react';
import React, { useRef, useEffect } from 'react';
import { DriveFile } from '../services/drive';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  onOpenDrive?: () => void;
  attachments?: DriveFile[];
  onRemoveAttachment?: (id: string) => void;
}

export function ChatInput({ value, onChange, onSubmit, isLoading, onOpenDrive, attachments = [], onRemoveAttachment }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if ((value.trim() || attachments.length > 0) && !isLoading) {
        onSubmit();
      }
    }
  };

  return (
    <div className="relative flex flex-col w-full group">
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3 px-2">
          {attachments.map(file => (
            <div key={file.id} className="flex items-center gap-2 bg-white/10 hover:bg-white/15 border border-white/10 text-white/90 text-xs px-3 py-1.5 rounded-full transition-colors backdrop-blur-md">
              <span className="truncate max-w-[150px] font-medium">{file.name}</span>
              {onRemoveAttachment && (
                <button onClick={() => onRemoveAttachment(file.id)} className="text-white/50 hover:text-white/90 rounded-full focus:outline-none p-0.5">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      <div className="relative flex items-end w-full">
        <div className="absolute inset-0 -z-10 rounded-full blur-2xl bg-white/5 opacity-0 group-focus-within:opacity-100 transition-opacity duration-700" />
        
        {onOpenDrive && (
          <button
            onClick={onOpenDrive}
            type="button"
            className="absolute left-2 mb-2 h-10 w-10 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors focus:outline-none z-10"
            title="Attach from Google Drive"
          >
            <HardDrive className="h-5 w-5" />
          </button>
        )}
        
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Query the engine..."
          className={`w-full glass-panel rounded-[32px] py-4 ${onOpenDrive ? 'pl-12' : 'pl-6'} pr-16 focus:outline-none focus:border-white/30 transition-all duration-500 text-white placeholder:font-mono placeholder:text-white/20 placeholder:text-[13px] resize-none leading-relaxed text-[15px] font-light block`}
          rows={1}
          style={{ minHeight: '56px' }}
        />
        
        <button
          onClick={onSubmit}
          disabled={(!value.trim() && attachments.length === 0) || isLoading}
          className="absolute right-2 mb-2 h-10 w-10 rounded-full flex items-center justify-center transition-all duration-300 focus:outline-none 
            disabled:bg-transparent disabled:text-white/20 disabled:scale-100
            bg-white text-black hover:bg-gray-200 hover:scale-[1.04] shadow-[0_2px_10px_rgba(255,255,255,0.15)] z-10"
        >
          <ArrowUp className="h-[18px] w-[18px]" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
