import React, { useEffect, useState } from 'react';
import { listMessages, sendMessage } from '../services/gmail';
import { listUpcomingEvents, CalendarEvent } from '../services/calendar';
import { getRecentDriveFiles, DriveFile } from '../services/drive';
import { listTasks, Task, createTask } from '../services/tasks';
import { Mail, RefreshCw, PenSquare, X, Send, Calendar, Clock, FileText, Presentation, Table as TableIcon, CheckSquare, Plus, Video, Paperclip } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { WorkspaceAuthError } from './WorkspaceAuthError';

type Tab = 'gmail' | 'calendar' | 'docs' | 'tasks';

export function WorkspaceDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('gmail');

  const [messages, setMessages] = useState<any[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [docs, setDocs] = useState<DriveFile[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [isComposing, setIsComposing] = useState(false);
  const [sending, setSending] = useState(false);
  const [composeForm, setComposeForm] = useState({ to: '', subject: '', body: '' });

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      if (activeTab === 'gmail') {
        const data = await listMessages();
        setMessages(data);
      } else if (activeTab === 'calendar') {
        const data = await listUpcomingEvents(15);
        setEvents(data);
      } else if (activeTab === 'docs') {
        const data = await getRecentDriveFiles('all');
        const filterSupported = data.filter(d => 
          d.mimeType === 'application/vnd.google-apps.document' || 
          d.mimeType === 'application/vnd.google-apps.spreadsheet' || 
          d.mimeType === 'application/vnd.google-apps.presentation'
        );
        setDocs(filterSupported.slice(0, 15));
      } else if (activeTab === 'tasks') {
        const data = await listTasks();
        setTasks(data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleSend = async () => {
    if (!composeForm.to || !composeForm.subject || !composeForm.body) return;
    
    const confirmed = window.confirm(`Send email to ${composeForm.to}?`);
    if (!confirmed) return;

    setSending(true);
    try {
      await sendMessage(composeForm.to, composeForm.subject, composeForm.body);
      setIsComposing(false);
      setComposeForm({ to: '', subject: '', body: '' });
    } catch (err: any) {
      alert(err.message || 'Error sending email');
    } finally {
      setSending(false);
    }
  };

  if (loading && !messages.length && !events.length && !docs.length && !tasks.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full">
        <RefreshCw className="w-6 h-6 text-white/40 animate-spin mb-4" />
        <p className="text-sm text-white/50 tracking-wide font-medium">Syncing {activeTab === 'gmail' ? 'Inbox' : activeTab === 'calendar' ? 'Calendar' : activeTab === 'docs' ? 'Docs' : 'Tasks'}</p>
      </div>
    );
  }

  if (error) {
    const isAuthError = error.includes('Authentication error');
    if (isAuthError) {
      return <WorkspaceAuthError onRetry={fetchData} message={error} />;
    }
    
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 h-full">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 mb-5 shadow-[inset_0_0_12px_rgba(239,68,68,0.2)]">
          <X className="h-7 w-7 text-red-500" aria-hidden="true" />
        </div>
        <h3 className="text-lg font-medium text-white tracking-tight mb-2">Error Loading Data</h3>
        <p className="text-[14px] text-white/60 text-center max-w-sm mb-8 leading-relaxed">
          {error}
        </p>
        <div className="flex gap-3">
          <button onClick={fetchData} className="px-5 py-2.5 glass-panel rounded-xl text-[14px] font-medium text-white hover:bg-white/10 transition-all shadow-sm">
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col h-full pt-8 px-6 pb-24 relative">
      <div className="flex items-end justify-between mb-8 pb-4 border-b border-white/10">
         <div className="flex gap-6">
           <button 
             onClick={() => setActiveTab('gmail')}
             className={`pb-4 -mb-4 text-[15px] font-medium transition-all ${activeTab === 'gmail' ? 'text-white border-b-2 border-white' : 'text-white/40 hover:text-white/80'}`}
           >
             Mail
           </button>
           <button 
             onClick={() => setActiveTab('calendar')}
             className={`pb-4 -mb-4 text-[15px] font-medium transition-all ${activeTab === 'calendar' ? 'text-white border-b-2 border-white' : 'text-white/40 hover:text-white/80'}`}
           >
             Calendar
           </button>
           <button 
             onClick={() => setActiveTab('docs')}
             className={`pb-4 -mb-4 text-[15px] font-medium transition-all ${activeTab === 'docs' ? 'text-white border-b-2 border-white' : 'text-white/40 hover:text-white/80'}`}
           >
             Docs & Drive
           </button>
           <button 
             onClick={() => setActiveTab('tasks')}
             className={`pb-4 -mb-4 text-[15px] font-medium transition-all ${activeTab === 'tasks' ? 'text-white border-b-2 border-white' : 'text-white/40 hover:text-white/80'}`}
           >
             Tasks
           </button>
         </div>
         <div className="flex items-center gap-3">
           {activeTab === 'gmail' && (
             <button onClick={() => setIsComposing(true)} className="flex items-center gap-2 px-4 py-2 bg-white text-black font-medium rounded-lg hover:bg-white/90 transition-all text-[13px] shadow-sm hover:scale-[1.02] active:scale-[0.98] tracking-tight">
               <PenSquare className="w-4 h-4" />
               Compose
             </button>
           )}
           <button onClick={fetchData} className="p-2 glass-panel text-white/60 hover:text-white rounded-lg transition-all shadow-sm">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin cursor-wait' : ''}`} />
           </button>
         </div>
      </div>

      <div className="flex flex-col gap-3">
        {activeTab === 'gmail' && messages.map((msg, i) => {
          const headers = msg.payload?.headers || [];
          const subject = headers.find((h: any) => h.name === 'Subject')?.value || '(No Subject)';
          const from = headers.find((h: any) => h.name === 'From')?.value || 'UnknownSender';
          const snippet = msg.snippet;

          return (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} key={i} className="flex flex-col gap-1 p-5 rounded-2xl glass-panel glass-panel-hover transition-all cursor-pointer group">
               <div className="flex items-center justify-between mb-1">
                 <span className="text-[14px] font-semibold text-white/90 truncate mr-4 tracking-tight">{from}</span>
                 <span className="text-[12px] text-white/40 whitespace-nowrap hidden sm:block font-medium tracking-wide">
                    {new Date(parseInt(msg.internalDate)).toLocaleDateString()}
                 </span>
               </div>
               <h3 className="text-[15px] font-medium text-white line-clamp-1 tracking-tight">{subject}</h3>
               <p className="text-[14px] text-white/50 line-clamp-2 leading-relaxed mt-1">{snippet}</p>
            </motion.div>
          );
        })}

        {activeTab === 'calendar' && events.map((event, i) => {
          const startDate = new Date(event.start.dateTime || event.start.date || '');
          const endDate = new Date(event.end.dateTime || event.end.date || '');
          const isAllDay = !event.start.dateTime;
          
          return (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} key={event.id} className="flex gap-5 p-5 rounded-2xl glass-panel glass-panel-hover transition-all group">
                <div className="flex flex-col items-center justify-center w-14 h-14 rounded-xl bg-white/5 border border-white/10 shrink-0">
                  <span className="text-[11px] font-bold text-white/40 uppercase tracking-wider">{startDate.toLocaleDateString('en-US', { month: 'short' })}</span>
                  <span className="text-[18px] font-semibold text-white tracking-tight">{startDate.getDate()}</span>
                </div>
                <div className="flex flex-col justify-center overflow-hidden flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[15px] font-medium text-white truncate tracking-tight">{event.summary || '(No Title)'}</h3>
                    {event.hangoutLink && (
                      <a href={event.hangoutLink} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-[12px] font-medium hover:bg-emerald-500/30 transition-colors">
                        <Video className="w-3.5 h-3.5" />
                        Join Meet
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    <span className="flex items-center gap-1.5 text-[13px] text-white/50 font-medium tracking-wide">
                      <Clock className="w-3.5 h-3.5 text-white/40" />
                      {isAllDay ? 'All event' : `${startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - ${endDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`}
                    </span>
                  </div>
                  {event.attachments && event.attachments.length > 0 && (
                    <div className="flex flex-col gap-2 mt-3">
                      {event.attachments.map(att => (
                        <a key={att.fileId} href={att.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors w-fit border border-white/5">
                          <Paperclip className="w-3 h-3 text-white/40" />
                          <span className="text-[12px] text-white/70 truncate max-w-[200px]">{att.title}</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
            </motion.div>
          );
        })}

        {activeTab === 'docs' && docs.map((doc, i) => {
          const isDoc = doc.mimeType === 'application/vnd.google-apps.document';
          const isSheet = doc.mimeType === 'application/vnd.google-apps.spreadsheet';
          const isSlide = doc.mimeType === 'application/vnd.google-apps.presentation';
          const DocIcon = isDoc ? FileText : isSheet ? TableIcon : Presentation;
          const colorClass = isDoc ? 'text-blue-400' : isSheet ? 'text-emerald-400' : 'text-amber-400';
          
          return (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} key={doc.id} onClick={() => window.open(doc.webViewLink, '_blank')} className="flex items-center gap-4 p-4 rounded-2xl glass-panel glass-panel-hover transition-all cursor-pointer group">
               <div className={`p-3 rounded-xl bg-white/5 border border-white/10 shrink-0 ${colorClass}`}>
                  <DocIcon className="w-5 h-5" />
               </div>
               <div className="flex flex-col flex-1 overflow-hidden">
                 <h3 className="text-[15px] font-medium text-white truncate tracking-tight group-hover:text-white/90 transition-colors">{doc.name}</h3>
                 <span className="text-[13px] text-white/50 font-medium tracking-wide mt-1">
                   Modified {new Date(doc.modifiedTime).toLocaleDateString()}
                 </span>
               </div>
            </motion.div>
          );
        })}

        {activeTab === 'tasks' && tasks.map((task, i) => {
          return (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} key={task.id} className="flex items-start gap-4 p-4 rounded-2xl glass-panel glass-panel-hover transition-all cursor-pointer group">
               <div className={`p-1 mt-0.5 rounded-lg border border-white/20 shrink-0`}>
                  <CheckSquare className="w-5 h-5 text-white/40 group-hover:text-white/80 transition-colors" />
               </div>
               <div className="flex flex-col flex-1 overflow-hidden">
                 <h3 className="text-[15px] font-medium text-white tracking-tight">{task.title}</h3>
                 {task.notes && (
                   <p className="text-[13px] text-white/50 mt-1 line-clamp-2">{task.notes}</p>
                 )}
                 {task.due && (
                   <span className="text-[12px] text-white/40 font-mono tracking-wide mt-2">
                     Due {new Date(task.due).toLocaleDateString()}
                   </span>
                 )}
               </div>
            </motion.div>
          );
        })}

        {activeTab === 'gmail' && messages.length === 0 && !loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16 glass-panel rounded-2xl">
            <Mail className="w-8 h-8 text-white/20 mx-auto mb-4" />
            <p className="text-[14px] text-white/60 font-medium tracking-tight">Your inbox is completely empty.</p>
          </motion.div>
        )}

        {activeTab === 'calendar' && events.length === 0 && !loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16 glass-panel rounded-2xl">
            <Calendar className="w-8 h-8 text-white/20 mx-auto mb-4" />
            <p className="text-[14px] text-white/60 font-medium tracking-tight">No upcoming events found.</p>
          </motion.div>
        )}

        {activeTab === 'docs' && docs.length === 0 && !loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16 glass-panel rounded-2xl">
            <FileText className="w-8 h-8 text-white/20 mx-auto mb-4" />
            <p className="text-[14px] text-white/60 font-medium tracking-tight">No recent documents found.</p>
          </motion.div>
        )}

        {activeTab === 'tasks' && tasks.length === 0 && !loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16 glass-panel rounded-2xl">
            <CheckSquare className="w-8 h-8 text-white/20 mx-auto mb-4" />
            <p className="text-[14px] text-white/60 font-medium tracking-tight">No tasks found. You're all caught up!</p>
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {isComposing && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-end sm:justify-center p-4 bg-black/40 backdrop-blur-md sm:pl-[16rem]"
          >
            <motion.div 
              initial={{ y: 50, scale: 0.95, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 20, scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-2xl glass-panel rounded-2xl sm:rounded-3xl shadow-[0_16px_64px_rgba(0,0,0,0.8)] overflow-hidden relative"
            >
              <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/20">
                <h3 className="text-[14px] font-medium text-white tracking-wide uppercase">New Message</h3>
                <button onClick={() => setIsComposing(false)} className="p-1.5 hover:bg-white/10 rounded-full text-white/60 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-5 flex flex-col gap-5">
                <input 
                  placeholder="To" 
                  value={composeForm.to}
                  onChange={e => setComposeForm(p => ({...p, to: e.target.value}))}
                  className="w-full bg-transparent border-b border-white/10 pb-3 text-[15px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-colors tracking-wide"
                />
                <input 
                  placeholder="Subject" 
                  value={composeForm.subject}
                  onChange={e => setComposeForm(p => ({...p, subject: e.target.value}))}
                  className="w-full bg-transparent border-b border-white/10 pb-3 text-[15px] text-white font-medium placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-colors tracking-tight"
                />
                <textarea
                  placeholder="Write your email..."
                  value={composeForm.body}
                  onChange={e => setComposeForm(p => ({...p, body: e.target.value}))}
                  className="w-full bg-transparent text-[15px] text-white/80 placeholder:text-white/30 focus:outline-none resize-none min-h-[220px] mt-2 leading-relaxed tracking-wide"
                />
              </div>
              <div className="p-4 border-t border-white/10 bg-black/20 flex justify-end gap-3 rounded-b-2xl sm:rounded-b-3xl">
                <button 
                  onClick={() => setIsComposing(false)}
                  className="px-5 py-2 rounded-full text-[13px] font-medium text-white/60 hover:text-white hover:bg-white/10 transition-colors tracking-wide"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSend}
                  disabled={sending || !composeForm.to}
                  className="flex items-center gap-2 px-6 py-2 bg-white hover:bg-white/90 disabled:bg-white/20 disabled:text-white/50 text-black rounded-full text-[13px] font-semibold transition-all shadow-sm hover:scale-[1.02] active:scale-[0.98] tracking-wide"
                >
                  {sending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Send
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
