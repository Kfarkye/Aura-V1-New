import React, { memo, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { motion } from 'motion/react';
import { Message, MessageRole } from '../../types';
import { cn, cleanJSON } from '../../lib/utils';
import { MAX_TASK_LENGTH } from '../../lib/constants';

import { CodeBlock } from '../ui/CodeBlock';
import { SafeArtifactBoundary } from '../ui/SafeArtifactBoundary';
import { AuraChart } from '../AuraArtifact'; // Assuming existing component
import { AuraApp } from '../AuraArtifact'; // Assuming existing component
import { AuraImage } from '../AuraImage'; // Assuming existing component
import { AppModification } from '../AppModification'; // Assuming existing component
import { InboxSummaryCard } from '../workspace/InboxSummaryCard';

import { Database, HardDrive, ChevronRight } from 'lucide-react';

// Markdown rendering components, including XSS hardening for links
const markdownComponents = {
  pre: ({ children, node, ...props }: any) => <pre {...props}>{children}</pre>,
  code: CodeBlock as any,
  a: ({ node, href, children, ...props }: any) => {
    if (href?.startsWith('drive://')) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3 py-1.5 my-1 bg-white border border-black/10 rounded-[12px] shadow-[var(--shadow-contact)] hover:scale-[1.02] hover:shadow-md transition-all group no-underline">
          <HardDrive className="w-4 h-4 text-sky-500" />
          <span className="text-[0.75rem] font-medium text-[#1d1d1f] tracking-tight truncate max-w-[200px]">{children}</span>
          <ChevronRight className="w-3.5 h-3.5 text-black/20 group-hover:text-black/40 transition-colors ml-1" />
        </a>
      );
    }
    if (href?.startsWith('repo://')) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3 py-1.5 my-1 bg-white border border-black/10 rounded-[12px] shadow-[var(--shadow-contact)] hover:scale-[1.02] hover:shadow-md transition-all group no-underline">
          <Database className="w-4 h-4 text-emerald-500" />
          <span className="text-[0.75rem] font-medium text-[#1d1d1f] tracking-tight truncate max-w-[200px]">{children}</span>
          <ChevronRight className="w-3.5 h-3.5 text-black/20 group-hover:text-black/40 transition-colors ml-1" />
        </a>
      );
    }
    return (
      <a href={href} {...props} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline break-words cursor-pointer">{children}</a>
    );
  }
};

export const MessageItem = memo(({ m, onAddTask, onResolveTool, onSendMessage }: { 
  m: Message; 
  onAddTask: (t: string) => void;
  onResolveTool?: (toolName: string, resolution: Record<string, any>) => Promise<void>;
  onSendMessage?: (content: string, attachments: any[], mode?: any) => Promise<void>;
}) => {
  const isUser = m.role === MessageRole.USER;
  
  const contentParts = useMemo(() => {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0; 
    let iterations = 0; // ReDoS protection counter
    
    try {
      // Instantiate regex locally for thread safety in React Concurrent Mode
      const artifactRegex = /(\[AURA_CHART\]([\s\S]*?)\[\/AURA_CHART\])|(\[AURA_APP\]([\s\S]*?)\[\/AURA_APP\])|(\[AURA_TASK\]([\s\S]*?)\[\/AURA_TASK\])|(\[AURA_IMAGE\]([\s\S]*?)\[\/AURA_IMAGE\])|(\[AURA_APP_MODIFICATION\]([\s\S]*?)\[\/AURA_APP_MODIFICATION\])|(\[AURA_INBOX\]([\s\S]*?)\[\/AURA_INBOX\])/g;
      let match;

      while ((match = artifactRegex.exec(m.content)) !== null) {
        // ReDoS Protection: Break if too many iterations
        if (iterations++ > 150) {
          console.warn("Regex iteration limit reached for message parsing. Halting to prevent thread lockup.");
          parts.push(
            <div key={`${m.id}-redos-text`} className="markdown-body text-[0.95rem] leading-relaxed">
              <ReactMarkdown components={markdownComponents}>{m.content.substring(lastIndex)}</ReactMarkdown>
            </div>
          );
          lastIndex = m.content.length;
          break;
        }

        // Add text before the current artifact match
        if (match.index > lastIndex) {
          parts.push(
            <div key={`${m.id}-${match.index}-text`} className="markdown-body text-[0.95rem] leading-relaxed">
              <ReactMarkdown components={markdownComponents}>{m.content.substring(lastIndex, match.index)}</ReactMarkdown>
            </div>
          );
        }

        const matchKey = `${m.id}-artifact-${match.index}`;

        // Process different artifact types
        if (match[1]) { // AURA_CHART
          try { 
            const chartData = JSON.parse(cleanJSON(match[2]));
            if (chartData && typeof chartData === 'object') {
              parts.push(<SafeArtifactBoundary key={matchKey} name="Chart"><AuraChart data={chartData} /></SafeArtifactBoundary>); 
            } else {
              throw new Error('Invalid schema format for chart data.');
            }
          } 
          catch (e: any) { 
            parts.push(<div key={`err-chart-${match.index}`} className="text-red-500 text-xs italic p-3 border border-red-200 rounded-lg bg-red-50 shadow-sm mt-2">⚠️ Artifact Render Error: Invalid Chart Data Structure ({e.message})</div>); 
          }
        } else if (match[3]) { // AURA_APP
          parts.push(<SafeArtifactBoundary key={matchKey} name="App"><AuraApp code={match[4]} /></SafeArtifactBoundary>);
        } else if (match[5]) { // AURA_TASK
          const taskTitle = match[6].trim().slice(0, MAX_TASK_LENGTH);
          parts.push(
            <div key={matchKey} className="my-6 bg-white/60 backdrop-blur-2xl border border-black/[0.03] rounded-[24px] p-5 flex items-center justify-between shadow-[0_12px_32px_-8px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,1)] transition-all duration-500 hover:shadow-[0_20px_48px_-12px_rgba(0,0,0,0.08),inset_0_1px_1px_rgba(255,255,255,1)] hover:bg-white/90">
              <div className="flex items-center gap-5 min-w-0">
                <div className="w-10 h-10 rounded-[12px] bg-gradient-to-b from-black/[0.02] to-black/[0.04] border border-black/[0.04] flex items-center justify-center shadow-inner shrink-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#1d1d1f]" />
                </div>
                <div className="min-w-0 pr-4">
                  <p className="text-[10px] font-medium text-[#86868b] uppercase tracking-[0.25em] mb-1 font-sans">Essential Action</p>
                  <p className="text-[15px] font-medium text-[#1d1d1f] tracking-tight truncate font-sans">{taskTitle}</p>
                </div>
              </div>
              <button 
                onClick={() => onAddTask(taskTitle)}
                className="flex items-center gap-1.5 px-6 py-2.5 bg-[#1d1d1f] text-white border-none rounded-full text-[13px] font-medium tracking-wide hover:bg-black hover:scale-[1.02] transition-all duration-300 shadow-[0_4px_12px_rgba(0,0,0,0.15)] focus:outline-none shrink-0 ml-2 font-sans"
                aria-label={`Add task to queue: ${taskTitle}`}
              >
                Engage
              </button>
            </div>
          );
        } else if (match[7]) { // AURA_IMAGE
          parts.push(<SafeArtifactBoundary key={matchKey} name="Image"><AuraImage prompt={match[8].trim()} /></SafeArtifactBoundary>);
        } else if (match[9]) { // AURA_APP_MODIFICATION
          try { 
            const modData = JSON.parse(cleanJSON(match[10]));
            if (modData && typeof modData === 'object' && Array.isArray(modData.files)) {
              parts.push(<SafeArtifactBoundary key={matchKey} name="App Modification"><AppModification files={modData.files} previewCode={modData.previewCode} /></SafeArtifactBoundary>); 
            } else {
              throw new Error('Invalid schema format for app modification data.');
            }
          } 
          catch (e: any) { 
            parts.push(<div key={`err-mod-${match.index}`} className="text-red-500 text-xs italic p-3 border border-red-200 rounded-lg bg-red-50 shadow-sm mt-2">⚠️ Artifact Render Error: Invalid Modification Data ({e.message})</div>); 
          }
        } else if (match[11]) { // AURA_INBOX
          try {
            const inboxData = JSON.parse(cleanJSON(match[12]));
            parts.push(
              <SafeArtifactBoundary key={matchKey} name="Inbox">
                <div className="flex justify-center w-full py-4">
                  <InboxSummaryCard 
                    emails={inboxData.emails || []} 
                    isLoading={false} 
                    onArchive={(id) => console.log('Archive', id)} 
                  />
                </div>
              </SafeArtifactBoundary>
            );
          } catch (e: any) {
            parts.push(<div key={`err-inbox-${match.index}`} className="text-red-500 text-xs italic p-3 border border-red-200 rounded-lg bg-red-50 shadow-sm mt-2">⚠️ Artifact Render Error: Invalid Inbox Data ({e.message})</div>);
          }
        }
        lastIndex = artifactRegex.lastIndex;
      }
    } catch (e) { 
       console.error("Critical regex parsing execution timeout or failure in MessageItem.", e);
       parts.push(
        <div key={`${m.id}-critical-err-text`} className="markdown-body text-[0.95rem] leading-relaxed">
          <ReactMarkdown components={markdownComponents}>{m.content.substring(lastIndex)}</ReactMarkdown>
        </div>
      );
    }

    // Add any remaining text after the last artifact
    if (lastIndex < m.content.length) {
      parts.push(
        <div key={`${m.id}-final-text`} className="markdown-body text-[0.95rem] leading-relaxed break-words">
          <ReactMarkdown components={markdownComponents}>{m.content.substring(lastIndex)}</ReactMarkdown>
        </div>
      );
    }
    return parts;
  }, [m.content, m.id, onAddTask]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      layout
      className={cn("flex flex-col mb-8", isUser ? "items-end" : "items-start")}
    >
      <div className="text-[10px] text-[#86868b] font-medium uppercase tracking-[0.2em] mb-3 px-2 select-none flex items-center gap-2">
          {isUser ? 'Intent' : 'Response'} 
          <span className="w-1 h-1 rounded-full bg-[#d2d2d7]" /> 
          {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
      
      <div className={cn(
        "max-w-[95%] md:max-w-[85%] px-7 py-6 md:px-10 md:py-8 rounded-[32px] transition-all overflow-hidden relative font-sans",
        isUser 
          ? "bg-[#f5f5f7] text-[#1d1d1f] rounded-br-[12px] border border-black/[0.02] shadow-[inset_0_1px_1px_rgba(255,255,255,1)]" 
          : "bg-white/80 backdrop-blur-3xl border border-white/40 text-[#1d1d1f] rounded-bl-[12px] shadow-[0_24px_48px_-12px_rgba(0,0,0,0.08),0_8px_16px_-8px_rgba(0,0,0,0.03),inset_0_1px_1px_rgba(255,255,255,1)]"
      )}>
        {m.attachments && m.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {m.attachments.map((a, i) => (
              <img 
                key={`${a.name || 'attachment'}-${i}`}
                src={a.url} 
                alt={a.name || "Context Upload"} 
                className="w-24 h-24 md:w-32 md:h-32 object-cover rounded-2xl border border-black/5 shadow-sm bg-slate-100"
                referrerPolicy="no-referrer"
                loading="lazy"
                onError={(e) => {
                  if (a.data && !e.currentTarget.src.startsWith('data:')) {
                    e.currentTarget.src = `data:${a.mimeType};base64,${a.data}`;
                  }
                }}
              />
            ))}
          </div>
        )}
        {contentParts}
      </div>
    </motion.div>
  );
});
MessageItem.displayName = 'MessageItem';
