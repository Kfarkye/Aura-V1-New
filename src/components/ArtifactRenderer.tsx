import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Activity, Briefcase, Coins, LineChart, Music, Mail, Trash2, RefreshCw, CheckCircle2, ExternalLink } from 'lucide-react';
import clsx from 'clsx';
import { listMessages, trashMessage, untrashMessage } from '../services/gmail';

interface ArtifactBlock {
  type: 'sports' | 'crypto' | 'markets' | 'work' | 'music' | 'code' | 'emails' | 'unknown';
  payload: any;
}

interface ArtifactRendererProps {
  artifact: ArtifactBlock;
}

export function ArtifactRenderer({ artifact }: ArtifactRendererProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteComplete, setDeleteComplete] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreComplete, setRestoreComplete] = useState(false);
  const [restoreError, setRestoreError] = useState('');

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

  const [deletePreviews, setDeletePreviews] = useState<any[]>([]);
  const [deletePreviewsLoading, setDeletePreviewsLoading] = useState(false);

  useEffect(() => {
    if (artifact.payload?.delete_emails_query && Array.isArray(artifact.payload.delete_emails_query)) {
      const fetchPreviews = async () => {
        setDeletePreviewsLoading(true);
        try {
           const allEmails: any[] = [];
           for (const query of artifact.payload!.delete_emails_query) {
              const matched = await listMessages(query, 3); // fetch up to 3 previews for query
              allEmails.push(...matched);
           }
           setDeletePreviews(allEmails);
        } catch (e) {
           console.error("Preview fetch error", e);
        } finally {
           setDeletePreviewsLoading(false);
        }
      };
      fetchPreviews();
    }
  }, [artifact.payload?.delete_emails_query]);

  const [restorePreviews, setRestorePreviews] = useState<any[]>([]);
  const [restorePreviewsLoading, setRestorePreviewsLoading] = useState(false);

  useEffect(() => {
    if (artifact.payload?.restore_emails_query && Array.isArray(artifact.payload.restore_emails_query)) {
      const fetchPreviews = async () => {
        setRestorePreviewsLoading(true);
        try {
           const allEmails: any[] = [];
           for (const query of artifact.payload!.restore_emails_query) {
              const matched = await listMessages(query + ' in:trash', 3);
              allEmails.push(...matched);
           }
           setRestorePreviews(allEmails);
        } catch (e) {
           console.error("Preview fetch error", e);
        } finally {
           setRestorePreviewsLoading(false);
        }
      };
      fetchPreviews();
    }
  }, [artifact.payload?.restore_emails_query]);

  const executeDeleteEmails = async () => {
    if (!artifact.payload?.delete_emails_query) return;
    setIsDeleting(true);
    setDeleteError('');
    try {
      for (const query of artifact.payload.delete_emails_query) {
        const messagesToDelete = await listMessages(query, 50);
        for (const msg of messagesToDelete) {
          await trashMessage(msg.id);
        }
      }
      setDeleteComplete(true);
      window.dispatchEvent(new CustomEvent('refresh-workspace-gmail'));
    } catch (err: any) {
      console.error('Mass delete failed:', err);
      setDeleteError(err.message || 'Mass deletion failed.');
    } finally {
      setIsDeleting(false);
    }
  };

  const executeRestoreEmails = async () => {
    if (!artifact.payload?.restore_emails_query) return;
    setIsRestoring(true);
    setRestoreError('');
    try {
      for (const query of artifact.payload.restore_emails_query) {
        const messagesToRestore = await listMessages(query + ' in:trash', 50);
        for (const msg of messagesToRestore) {
          await untrashMessage(msg.id);
        }
      }
      setRestoreComplete(true);
      window.dispatchEvent(new CustomEvent('refresh-workspace-gmail'));
    } catch (err: any) {
      console.error('Mass restore failed:', err);
      setRestoreError(err.message || 'Mass restore failed.');
    } finally {
      setIsRestoring(false);
    }
  };

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
                
                <div className="mt-3 flex flex-col gap-3">
                  {item.action && (
                    <div className="flex items-start gap-3 bg-[#111111] border border-white/[0.05] rounded-[12px] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] group-hover:border-white/[0.08] transition-colors">
                       <div className="w-1.5 h-1.5 rounded-full bg-white mt-1.5 shrink-0 opacity-80 shadow-[0_0_8px_rgba(255,255,255,0.6)]" />
                      <span className="text-[13px] font-medium text-white/80 leading-relaxed">{item.action}</span>
                    </div>
                  )}
                  
                  <div className="flex flex-wrap items-center gap-2">
                    {item.action_url && (
                      <a href={item.action_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[12px] font-medium transition-colors">
                        <ExternalLink className="w-3 h-3" />
                        Open Link
                      </a>
                    )}
                    {item.id && (
                      <a href={`https://mail.google.com/mail/u/0/#all/${item.id}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-500/20 border border-indigo-500/30 hover:bg-indigo-500/30 hover:border-indigo-500/50 text-indigo-300 text-[12px] font-medium transition-colors">
                        <Mail className="w-3 h-3" />
                        Open in Gmail
                      </a>
                    )}
                  </div>
                </div>
                
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

            {artifact.payload?.delete_emails_query && Array.isArray(artifact.payload.delete_emails_query) && artifact.payload.delete_emails_query.length > 0 && (
               <div className="flex flex-col gap-3">
                 <h4 className="text-[10px] font-semibold text-rose-400/80 uppercase tracking-[0.2em] ml-1">Email Cleanup</h4>
                 <div className="flex flex-col gap-4 p-5 rounded-xl bg-rose-900/10 border border-rose-500/20">
                   <div className="flex items-center gap-3">
                     <Mail className="w-4 h-4 text-rose-400" />
                     <span className="text-[14px] font-medium text-white/90">
                       {deleteComplete ? 'Emails Deleted' : isDeleting ? 'Deleting...' : 'Requires Confirmation'}
                     </span>
                   </div>
                   <div className="text-[13px] text-white/70">
                     <div className="mb-2">Matched query:</div>
                     <ul className="list-disc ml-5 mb-4 text-rose-200/80 text-[12px] font-mono">
                        {artifact.payload.delete_emails_query.map((q: string, i: number) => <li key={i}>{q}</li>)}
                     </ul>
                     
                     {deletePreviewsLoading ? (
                       <div className="text-white/40 text-[12px] flex items-center gap-2"><RefreshCw className="w-3 h-3 animate-spin"/> Loading preview...</div>
                     ) : deletePreviews.length > 0 ? (
                       <div className="flex flex-col gap-2 mt-2">
                         <div className="text-[12px] font-medium text-white/50 uppercase tracking-widest border-b border-white/5 pb-2 mb-1">Impact Preview</div>
                         {deletePreviews.map((msg: any) => {
                           const subject = msg.payload?.headers?.find((h: any) => h.name === 'Subject')?.value || 'No Subject';
                           const from = msg.payload?.headers?.find((h: any) => h.name === 'From')?.value || 'Unknown';
                           const fromNameMatch = from.match(/^"?([^"<]+)"?\s*</);
                           const fromName = fromNameMatch ? fromNameMatch[1].trim() : from;
                           return (
                             <div key={msg.id} className="text-[13px] text-white/80 bg-black/20 p-2 rounded-lg border border-white/5 truncate">
                               <span className="font-medium">{fromName}</span> <span className="text-white/40 mx-1">—</span> <span className="text-white/60">{subject}</span>
                             </div>
                           )
                         })}
                         <div className="text-[11px] text-rose-300/60 mt-1 italic">*Plus any other emails matching this exact criteria.</div>
                       </div>
                     ) : (
                       <div className="text-rose-400/60 text-[12px] italic">No emails found for this query.</div>
                     )}
                   </div>
                   
                   {!deleteComplete ? (
                     <div className="flex items-center gap-3 mt-2">
                       <button
                         onClick={executeDeleteEmails}
                         disabled={isDeleting || (deletePreviews.length === 0 && !deletePreviewsLoading)}
                         className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium transition-all ${isDeleting || (deletePreviews.length === 0 && !deletePreviewsLoading) ? 'bg-rose-500/30 text-white/30 cursor-not-allowed' : 'bg-rose-500 hover:bg-rose-600 text-white shadow-sm shadow-rose-900'}`}
                       >
                         {isDeleting ? (
                           <>
                             <RefreshCw className="w-4 h-4 animate-spin" />
                             Deleting...
                           </>
                         ) : (
                           <>
                             <Trash2 className="w-4 h-4" />
                             Confirm Delete
                           </>
                         )}
                       </button>
                       {deleteError && <span className="text-rose-400 text-[12px]">{deleteError}</span>}
                     </div>
                   ) : null}
                 </div>
               </div>
            )}

            {artifact.payload?.restore_emails_query && Array.isArray(artifact.payload.restore_emails_query) && artifact.payload.restore_emails_query.length > 0 && (
               <div className="flex flex-col gap-3">
                 <h4 className="text-[10px] font-semibold text-emerald-400/80 uppercase tracking-[0.2em] ml-1">Email Recovery</h4>
                 <div className="flex flex-col gap-4 p-5 rounded-xl bg-emerald-900/10 border border-emerald-500/20">
                   <div className="flex items-center gap-3">
                     <Mail className="w-4 h-4 text-emerald-400" />
                     <span className="text-[14px] font-medium text-white/90">
                       {restoreComplete ? 'Emails Restored' : isRestoring ? 'Restoring...' : 'Requires Confirmation'}
                     </span>
                   </div>
                   <div className="text-[13px] text-white/70">
                     <div className="mb-2">Matched query in trash:</div>
                     <ul className="list-disc ml-5 mb-4 text-emerald-200/80 text-[12px] font-mono">
                        {artifact.payload.restore_emails_query.map((q: string, i: number) => <li key={i}>{q}</li>)}
                     </ul>
                     
                     {restorePreviewsLoading ? (
                       <div className="text-white/40 text-[12px] flex items-center gap-2"><RefreshCw className="w-3 h-3 animate-spin"/> Loading preview...</div>
                     ) : restorePreviews.length > 0 ? (
                       <div className="flex flex-col gap-2 mt-2">
                         <div className="text-[12px] font-medium text-white/50 uppercase tracking-widest border-b border-white/5 pb-2 mb-1">Impact Preview</div>
                         {restorePreviews.map((msg: any) => {
                           const subject = msg.payload?.headers?.find((h: any) => h.name === 'Subject')?.value || 'No Subject';
                           const from = msg.payload?.headers?.find((h: any) => h.name === 'From')?.value || 'Unknown';
                           const fromNameMatch = from.match(/^"?([^"<]+)"?\s*</);
                           const fromName = fromNameMatch ? fromNameMatch[1].trim() : from;
                           return (
                             <div key={msg.id} className="text-[13px] text-white/80 bg-black/20 p-2 rounded-lg border border-white/5 truncate">
                               <span className="font-medium">{fromName}</span> <span className="text-white/40 mx-1">—</span> <span className="text-white/60">{subject}</span>
                             </div>
                           )
                         })}
                         <div className="text-[11px] text-emerald-300/60 mt-1 italic">*Plus any other emails matching this exact criteria.</div>
                       </div>
                     ) : (
                       <div className="text-emerald-400/60 text-[12px] italic">No emails found for this query in the trash.</div>
                     )}
                   </div>
                   
                   {!restoreComplete ? (
                     <div className="flex items-center gap-3 mt-2">
                       <button
                         onClick={executeRestoreEmails}
                         disabled={isRestoring || (restorePreviews.length === 0 && !restorePreviewsLoading)}
                         className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium transition-all ${isRestoring || (restorePreviews.length === 0 && !restorePreviewsLoading) ? 'bg-emerald-500/30 text-white/30 cursor-not-allowed' : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm shadow-emerald-900'}`}
                       >
                         {isRestoring ? (
                           <>
                             <RefreshCw className="w-4 h-4 animate-spin" />
                             Restoring...
                           </>
                         ) : (
                           <>
                             <RefreshCw className="w-4 h-4" />
                             Confirm Restore
                           </>
                         )}
                       </button>
                       {restoreError && <span className="text-rose-400 text-[12px]">{restoreError}</span>}
                     </div>
                   ) : null}
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

            {(!data || data.length === 0) && !artifact.payload?.summary && !artifact.payload?.action_items && !artifact.payload?.next_steps && !artifact.payload?.create_tasks && !artifact.payload?.create_drafts && !artifact.payload?.create_docs && !artifact.payload?.create_sheets && !artifact.payload?.delete_emails_query && !artifact.payload?.restore_emails_query && (
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
