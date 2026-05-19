import React, { useState, useEffect, useCallback, memo } from 'react';
import { Copy, Check } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface CodeBlockProps extends React.HTMLAttributes<HTMLElement> {
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
  node?: any;
}

export const CodeBlock = memo(({ inline, className, children, node, ...props }: CodeBlockProps) => {
  const match = /language-(\w+)/.exec(className || '');
  const [copied, setCopied] = useState(false);
  const timeoutRef = React.useRef<NodeJS.Timeout>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleCopy = useCallback(async () => {
    const text = String(children).replace(/\n$/, '');
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  }, [children]);

  const isBlock = !inline && (match || String(children).includes('\n'));

  if (isBlock) {
    return (
      <div 
        className="relative group rounded-[20px] md:rounded-[24px] overflow-hidden my-6 transition-all"
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(248,248,248,0.90) 100%)',
          backdropFilter: 'blur(60px) saturate(180%)',
          WebkitBackdropFilter: 'blur(60px) saturate(180%)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04), inset 0 1px 1px rgba(255,255,255,0.9)',
          border: '1px solid rgba(0,0,0,0.08)',
        }}
      >
        <div className="flex items-center justify-between px-4 md:px-5 py-2 md:py-3 border-b border-black/5 bg-white/40">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5 mr-2">
              <div className="w-2.5 h-2.5 rounded-full bg-black/10" />
              <div className="w-2.5 h-2.5 rounded-full bg-black/10" />
              <div className="w-2.5 h-2.5 rounded-full bg-black/10" />
            </div>
            <span className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-[#86868b]">{match?.[1] || 'code'}</span>
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 -mr-2 rounded-lg text-[#86868b] hover:text-[#1d1d1f] hover:bg-black/5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
            aria-label="Copy code block"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="text-[0.65rem] font-bold uppercase tracking-wider">{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
        <pre className="!my-0 p-4 md:p-5 overflow-x-auto text-[0.8rem] md:text-[0.85rem] leading-relaxed font-mono bg-transparent text-[#1d1d1f]">
          <code className={className} {...props}>
            {children}
          </code>
        </pre>
      </div>
    );
  }

  return (
    <code 
      className={cn(
        "bg-black/5 text-[#1d1d1f] px-1.5 py-0.5 rounded-[6px] text-[0.85em] font-mono break-words",
        "border border-black/[0.04]",
        className
      )} 
      {...props}
    >
      {children}
    </code>
  );
});
CodeBlock.displayName = 'CodeBlock';
