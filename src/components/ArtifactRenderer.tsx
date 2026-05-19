import React from 'react';
import { motion } from 'motion/react';
import { Activity, Briefcase, Coins, LineChart, Music, Mail } from 'lucide-react';
import clsx from 'clsx';

interface ArtifactBlock {
  type: 'sports' | 'crypto' | 'markets' | 'work' | 'music' | 'code' | 'emails' | 'unknown';
  payload: any;
}

interface ArtifactRendererProps {
  artifact: ArtifactBlock;
}

export function ArtifactRenderer({ artifact }: ArtifactRendererProps) {
  const isCode = artifact.type === 'code';
  const isEmails = artifact.type === 'emails' || 
    (Array.isArray(artifact.payload?.data) && artifact.payload.data.length > 0 && artifact.payload.data[0].subject !== undefined);
  
  const Icons = {
    sports: Activity,
    crypto: Coins,
    markets: LineChart,
    work: Briefcase,
    music: Music,
    code: Briefcase,
    emails: Mail,
    unknown: Briefcase
  };

  const Icon = Icons[artifact.type] || Icons.unknown;

  if (isCode) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden mt-4 shadow-xl"
      >
        <div className="bg-slate-800/50 px-4 py-2 flex items-center gap-2 border-b border-slate-700/50">
          <Icon className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Generated Code</span>
        </div>
        <div className="p-4 overflow-x-auto text-sm font-mono text-slate-300 whitespace-pre">
          {artifact.payload?.code || JSON.stringify(artifact.payload, null, 2)}
        </div>
      </motion.div>
    );
  }

  // Dashboard-like rendering
  const title = artifact.payload?.title || `${artifact.type.toUpperCase()} ARTIFACT`;
  const data = artifact.payload?.data || [];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mt-6 w-full glass-panel rounded-[20px] overflow-hidden shadow-sm"
    >
      <div className="flex justify-between items-center px-5 py-4 border-b border-white/[0.08] bg-black/20">
        <div className="flex items-center gap-3">
          <Icon className="w-4 h-4 text-white/60" />
          <h3 className="text-[11px] font-semibold text-white/90 uppercase tracking-[0.15em]">
            {title}
          </h3>
        </div>
        <div className="font-mono text-[9px] text-white/30 tracking-[0.2em] uppercase">Aura Engine</div>
      </div>

      <div className="flex flex-col">
        {isEmails ? (
          <div className="divide-y divide-white/[0.06] bg-black/20">
            {artifact.payload?.meta && (
              <div className="p-5 grid grid-cols-2 lg:grid-cols-4 gap-y-4 gap-x-6 text-[10px] uppercase tracking-widest font-mono text-white/50 border-b border-white/[0.08] bg-black/40">
                <div><span className="text-white/20 block mb-1.5 uppercase text-[9px] tracking-[0.2em]">Source</span> {artifact.payload.meta.source}</div>
                <div><span className="text-white/20 block mb-1.5 uppercase text-[9px] tracking-[0.2em]">Scope</span> {artifact.payload.meta.scope}</div>
                <div><span className="text-white/20 block mb-1.5 uppercase text-[9px] tracking-[0.2em]">Account</span> <span className="truncate block">{artifact.payload.meta.account}</span></div>
                <div><span className="text-white/20 block mb-1.5 uppercase text-[9px] tracking-[0.2em]">Generated</span> <span className="truncate block">{artifact.payload.meta.generated}</span></div>
              </div>
            )}
            
            {Array.isArray(data) && data.map((item: any, idx: number) => (
              <div key={idx} className="p-6 hover:bg-white/[0.02] transition-colors duration-300 group flex flex-col gap-3">
                <div className="flex justify-between items-start gap-4">
                  <div className="min-w-0">
                    <h4 className="text-[15px] font-medium text-white tracking-tight truncate mr-2">{item.subject || 'Unavailable'}</h4>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="text-[12px] font-mono text-white/40 truncate max-w-[250px]">{item.from || 'Unavailable'}</span>
                      <span className="text-white/20 text-[10px]">•</span>
                      <span className="text-[11px] font-mono text-white/30 uppercase tracking-widest">{item.date ? new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Unavailable'}</span>
                    </div>
                  </div>
                  {item.signal && (
                    <div className="shrink-0 px-3 py-1.5 rounded-full bg-black/50 border border-white/10 text-[10px] font-mono text-white/70 uppercase tracking-[0.15em] shadow-sm backdrop-blur-md flex items-center">
                      {item.signal}
                    </div>
                  )}
                </div>
                
                <p className="text-[14px] text-white/60 leading-[1.7] font-light mt-1">{item.snippet || 'Unavailable'}</p>
                
                {item.action && (
                  <div className="mt-3 flex items-start gap-3 bg-[#111111] border border-white/[0.05] rounded-[12px] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] group-hover:border-white/[0.08] transition-colors">
                     <div className="w-1.5 h-1.5 rounded-full bg-white mt-1.5 shrink-0 opacity-80 shadow-[0_0_8px_rgba(255,255,255,0.6)]" />
                    <span className="text-[13px] font-medium text-white/80 leading-relaxed">{item.action}</span>
                  </div>
                )}
                
                {item.id && (
                  <div className="mt-2 text-[9px] font-mono text-white/10 uppercase tracking-[0.2em] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5">
                    <div className="w-1 h-1 rounded-full bg-white/20" />
                    Source ID: {item.id}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-5 flex flex-col gap-6 bg-black/20">
            {artifact.payload?.summary && (
              <div className="flex flex-col gap-2 relative">
                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-white/20 rounded-full" />
                <p className="text-[14px] text-white/80 leading-[1.6] font-light pl-4">
                  {artifact.payload.summary}
                </p>
              </div>
            )}
            
            {artifact.payload?.action_items && Array.isArray(artifact.payload.action_items) && artifact.payload.action_items.length > 0 && (
              <div className="flex flex-col gap-3">
                <h4 className="text-[10px] font-semibold text-white/40 uppercase tracking-[0.2em] ml-1">Action Items</h4>
                <div className="flex flex-col gap-2">
                  {artifact.payload.action_items.map((action: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-start gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:border-white/[0.1] transition-colors group">
                      <div className="flex items-start gap-3">
                        <div className="w-4 h-4 rounded-full border border-white/20 flex-shrink-0 mt-0.5 ml-1 flex items-center justify-center group-hover:border-white/40 transition-colors">
                          <div className="w-1.5 h-1.5 rounded-full bg-transparent group-hover:bg-white/40 transition-colors" />
                        </div>
                        <span className="text-[14px] text-white/90 leading-[1.5] group-hover:text-white transition-colors">{action.item || action.task || action}</span>
                      </div>
                      {(action.due || action.deadline) && (
                        <div className="shrink-0 px-2.5 py-1 rounded bg-black/40 border border-white/5 text-[10px] font-mono text-white/50 uppercase tracking-[0.1em]">
                          {action.due || action.deadline}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {artifact.payload?.next_steps && Array.isArray(artifact.payload.next_steps) && artifact.payload.next_steps.length > 0 && (
              <div className="flex flex-col gap-3">
                <h4 className="text-[10px] font-semibold text-white/40 uppercase tracking-[0.2em] ml-1">Next Steps</h4>
                <ul className="flex flex-col gap-2 list-none p-0 m-0">
                  {artifact.payload.next_steps.map((step: any, idx: number) => (
                     <li key={idx} className="flex items-start gap-3 text-[14px] text-white/70 leading-[1.6]">
                       <span className="text-white/20 mt-1.5 text-[8px]">■</span>
                       {typeof step === 'string' ? step : step.step || step.action || JSON.stringify(step)}
                     </li>
                  ))}
                </ul>
              </div>
            )}

            {artifact.payload?.create_tasks && Array.isArray(artifact.payload.create_tasks) && artifact.payload.create_tasks.length > 0 && (
               <div className="flex flex-col gap-3">
                 <h4 className="text-[10px] font-semibold text-emerald-400/80 uppercase tracking-[0.2em] ml-1">Automated Tasks Created</h4>
                 <div className="flex flex-col gap-2">
                   {artifact.payload.create_tasks.map((task: any, idx: number) => (
                     <div key={idx} className="flex items-start gap-4 p-4 rounded-xl bg-emerald-900/10 border border-emerald-500/20">
                       <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                         <div className="w-2 h-2 rounded-full bg-emerald-400" />
                       </div>
                       <div className="flex flex-col">
                         <span className="text-[14px] font-medium text-white/90">{task.title}</span>
                         {task.notes && <span className="text-[12px] text-white/50 mt-1">{task.notes}</span>}
                       </div>
                     </div>
                   ))}
                 </div>
               </div>
            )}

            {artifact.payload?.create_drafts && Array.isArray(artifact.payload.create_drafts) && artifact.payload.create_drafts.length > 0 && (
               <div className="flex flex-col gap-3">
                 <h4 className="text-[10px] font-semibold text-indigo-400/80 uppercase tracking-[0.2em] ml-1">Email Drafts Created</h4>
                 <div className="flex flex-col gap-2">
                   {artifact.payload.create_drafts.map((draft: any, idx: number) => (
                     <div key={idx} className="flex flex-col gap-3 p-4 rounded-xl bg-indigo-900/10 border border-indigo-500/20">
                       <div className="flex items-center gap-3 border-b border-indigo-500/10 pb-3">
                         <Mail className="w-4 h-4 text-indigo-400" />
                         <div className="flex flex-col">
                           <span className="text-[12px] text-indigo-200">To: <span className="text-white/80">{draft.to}</span></span>
                           <span className="text-[12px] text-indigo-200 truncate max-w-[250px]">Subject: <span className="text-white/80">{draft.subject}</span></span>
                         </div>
                       </div>
                       <p className="text-[13px] text-white/60 leading-relaxed font-light line-clamp-3">
                         {draft.body}
                       </p>
                     </div>
                   ))}
                 </div>
               </div>
            )}

            {artifact.payload?.create_docs && Array.isArray(artifact.payload.create_docs) && artifact.payload.create_docs.length > 0 && (
               <div className="flex flex-col gap-3">
                 <h4 className="text-[10px] font-semibold text-blue-400/80 uppercase tracking-[0.2em] ml-1">Documents Generated</h4>
                 <div className="flex flex-col gap-2">
                   {artifact.payload.create_docs.map((doc: any, idx: number) => (
                     <div key={idx} className="flex flex-col gap-3 p-4 rounded-xl bg-blue-900/10 border border-blue-500/20">
                       <div className="flex items-center gap-3 border-b border-blue-500/10 pb-3">
                         <Briefcase className="w-4 h-4 text-blue-400" />
                         <span className="text-[14px] font-medium text-white/90 truncate">{doc.title}</span>
                       </div>
                       <p className="text-[12px] text-white/50 leading-relaxed font-mono whitespace-pre-wrap max-h-[100px] overflow-hidden relative">
                         {doc.body}
                         <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-black/80 to-transparent" />
                       </p>
                     </div>
                   ))}
                 </div>
               </div>
            )}

            {artifact.payload?.create_sheets && Array.isArray(artifact.payload.create_sheets) && artifact.payload.create_sheets.length > 0 && (
               <div className="flex flex-col gap-3">
                 <h4 className="text-[10px] font-semibold text-green-400/80 uppercase tracking-[0.2em] ml-1">Spreadsheets Generated</h4>
                 <div className="flex flex-col gap-2">
                   {artifact.payload.create_sheets.map((sheet: any, idx: number) => (
                     <div key={idx} className="flex flex-col gap-3 p-4 rounded-xl bg-green-900/10 border border-green-500/20">
                       <div className="flex items-center gap-3 border-b border-green-500/10 pb-3">
                         <svg className="w-4 h-4 text-green-400" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M3 15h6"/><path d="M3 18h6"/><path d="M3 21h6"/></svg>
                         <span className="text-[14px] font-medium text-white/90 truncate">{sheet.title}</span>
                       </div>
                       {sheet.rows && sheet.rows.length > 0 && (
                         <div className="text-[12px] text-white/70 overflow-hidden">
                           Added {sheet.rows.length} {sheet.rows.length === 1 ? 'row' : 'rows'} of data (e.g. {Array.isArray(sheet.rows[0]) ? sheet.rows[0].join(', ') : '...'})
                         </div>
                       )}
                     </div>
                   ))}
                 </div>
               </div>
            )}

            {Array.isArray(data) && data.length > 0 && (
              <div className="flex flex-col gap-2">
                {data.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center py-3 border-b border-white/5 last:border-0">
                     <span className="text-[14px] text-white/70">{item.label || item.name || JSON.stringify(item)}</span>
                     <span className={`font-mono text-[13px] font-medium ${item.trend?.startsWith('+') ? 'text-emerald-400' : (item.trend?.startsWith('-') ? 'text-rose-400' : 'text-white/90')}`}>
                       {item.value}
                     </span>
                  </div>
                ))}
              </div>
            )}

            {(!data || data.length === 0) && !artifact.payload?.summary && !artifact.payload?.action_items && !artifact.payload?.next_steps && !artifact.payload?.create_tasks && !artifact.payload?.create_drafts && !artifact.payload?.create_docs && !artifact.payload?.create_sheets && (
              <div className="p-4 rounded-xl bg-black/40 text-xs text-white/50 font-mono overflow-auto border border-white/5 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]">
                {JSON.stringify(artifact.payload, null, 2)}
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
