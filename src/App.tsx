import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Layers, Plus, Compass } from 'lucide-react';
import { ChatInput } from './components/ChatInput';
import { MessageRenderer } from './components/MessageRenderer';
import { WorkspaceDashboard } from './components/WorkspaceDashboard';
import { DriveFilePickerModal } from './components/DrivePickerModal';
import { initAuth, googleSignIn, logout } from './services/auth';
import type { DriveFile } from './services/drive';
import type { User } from 'firebase/auth';

interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('Chat');
  
  // Drive attachment state
  const [isDrivePickerOpen, setIsDrivePickerOpen] = useState(false);
  const [attachments, setAttachments] = useState<DriveFile[]>([]);
  
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(true);
  const [workspaceAuthError, setWorkspaceAuthError] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Check initial auth error state
    const checkAuthError = () => {
      const hasError = localStorage.getItem('aura_workspace_auth_error') === 'true';
      setWorkspaceAuthError(hasError);
    };
    
    checkAuthError();
    window.addEventListener('workspace_auth_status_changed', checkAuthError);
    
    return () => {
      window.removeEventListener('workspace_auth_status_changed', checkAuthError);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = initAuth(
      (u, token) => {
        setUser(u);
        setNeedsAuth(false);
      },
      () => {
        setUser(null);
        setNeedsAuth(true);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleAuth = async () => {
    if (user && !workspaceAuthError) {
      await logout();
      return;
    }
    
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setNeedsAuth(false);

        // Sync token to server for robust session management
        const idToken = await result.user.getIdToken();
        await fetch('/api/auth/google/store-token', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          },
          body: JSON.stringify({ 
            access_token: result.accessToken,
            scope: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/documents https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/tasks' // Scopes for server to track
          })
        }).catch(err => console.error('Failed to sync token to server:', err));
      }
    } catch (err: any) {
      console.error('Login failed:', err);
      let errorMsg = 'Authentication failed. Please try again.';
      if (err.code === 'auth/popup-blocked') {
        errorMsg = 'Popup blocked! Please allow popups for this site in your mobile browser settings and try again.';
      } else if (err.code === 'auth/cancelled-popup-request') {
        errorMsg = 'Sign-in cancelled. Please keep the popup window open.';
      }
      
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        content: `Error: ${errorMsg}`
      }]);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleFileSelect = (file: DriveFile) => {
    if (!attachments.some(a => a.id === file.id)) {
      setAttachments(prev => [...prev, file]);
    }
  };

  const handleSubmit = async () => {
    if ((!input.trim() && attachments.length === 0) || isLoading) return;

    let fullInput = input.trim();
    if (attachments.length > 0) {
      const attachmentList = attachments.map(a => `\n- [File: ${a.name}](${a.webViewLink})`).join('');
      fullInput += `\n\nAttached Drive Files:${attachmentList}`;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: fullInput.trim()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setAttachments([]);
    setIsLoading(true);

    try {
      let payloadMessages = [...messages, userMessage];
      
      if (user && !workspaceAuthError && /email|gmail|inbox|read|message|calendar|event|schedule|meet|doc|drive|sheet|slide|workspace|tasks/i.test(input)) {
        try {
          const { listMessages } = await import('./services/gmail');
          const { listUpcomingEvents } = await import('./services/calendar');
          const { getRecentDriveFiles } = await import('./services/drive');
          const { listTasks } = await import('./services/tasks');

          const [recentEmails, upcomingEvents, recentDocs, recentTasks] = await Promise.all([
            listMessages('', 5).catch(() => []),
            listUpcomingEvents(5).catch(() => []),
            getRecentDriveFiles('all').catch(() => []),
            listTasks().catch(() => [])
          ]);

          // Extract text for attachments from calendar events
          let attachmentTexts = '';
          try {
            const { getDocumentText } = await import('./services/docs');
            const fetchAttachmentPromises: Promise<string>[] = [];
            upcomingEvents.forEach((ev: any) => {
              if (ev.attachments) {
                ev.attachments.forEach((att: any) => {
                  fetchAttachmentPromises.push(
                    getDocumentText(att.fileId).then(text => `[SOURCE_EVENT_ATTACHMENT ID:${att.fileId} EVENT_ID:${ev.id}]\n- Title: ${att.title}\n- Content (Snippet): ${text.substring(0, 1000)}\n`)
                    .catch(() => '')
                  );
                });
              }
            });
            const results = await Promise.all(fetchAttachmentPromises);
            attachmentTexts = results.filter(r => r).join('\n');
          } catch (e) {
            console.error("Failed to fetch attachment texts", e);
          }

          const emailContext = recentEmails.map((msg: any) => {
            const headers = msg.payload?.headers || [];
            const subject = headers.find((h: any) => h.name === 'Subject')?.value || '(No Subject)';
            const from = headers.find((h: any) => h.name === 'From')?.value || 'Unknown';
            const date = headers.find((h: any) => h.name === 'Date')?.value || 'Unknown Date';
            return `[SOURCE_EMAIL ID:${msg.id} THREAD_ID:${msg.threadId}]\n- From: ${from}\n- Date: ${date}\n- Subject: ${subject}\n- Snippet: ${msg.snippet}\n`;
          }).join('\n');

          const calendarContext = upcomingEvents.map((event: any) => {
            const start = event.start?.dateTime || event.start?.date || 'Unknown';
            const end = event.end?.dateTime || event.end?.date || 'Unknown';
            const meetLink = event.hangoutLink ? `\n- Meet Link: ${event.hangoutLink}` : '';
            const attachments = event.attachments && event.attachments.length > 0
              ? `\n- Attachments: ${event.attachments.map((a: any) => `[ID:${a.fileId}] ${a.title}`).join(', ')}` 
              : '';
            return `[SOURCE_EVENT ID:${event.id}]\n- Title: ${event.summary}\n- Start: ${start}\n- End: ${end}${meetLink}${attachments}\n`;
          }).join('\n') + `\n\nATTACHMENT CONTENTS:\n${attachmentTexts}`;

          const docsContext = recentDocs.slice(0, 5).map((doc: any) => {
            return `[SOURCE_DOC ID:${doc.id}]\n- Name: ${doc.name}\n- Type: ${doc.mimeType}\n- Link: ${doc.webViewLink}\n`;
          }).join('\n');

          const tasksContext = recentTasks.slice(0, 10).map((task: any) => {
            return `[SOURCE_TASK ID:${task.id}]\n- Title: ${task.title}\n- Notes: ${task.notes || 'None'}\n- Due: ${task.due || 'None'}\n- Status: ${task.status}\n`;
          }).join('\n');
          
          const currentUserEmail = user?.email || 'connected workspace';
          const currentTime = new Date().toLocaleString();
          
          payloadMessages.push({
            id: 'system_context',
            role: 'user',
            content: `[SYSTEM AUTO-CONTEXT] Workspace user: ${currentUserEmail}\nCurrent Time: ${currentTime}

LATEST EMAILS:
${emailContext || 'No recent emails.'}

UPCOMING CALENDAR EVENTS:
${calendarContext || 'No upcoming events.'}

RECENT DRIVE DOCUMENTS:
${docsContext || 'No recent documents.'}

CURRENT TASKS:
${tasksContext || 'No current tasks.'}

CRITICAL INSTRUCTIONS FOR AURA ENGINE:
1. You MUST rely exclusively on this actual workspace data. DO NOT hallucinate.
2. Follow the user's instructions based on this data.
3. If the user asks to "create tasks", "add to tasks", or "extract action items to my tasks", you can specify a \`create_tasks\` array in your JSON artifact.
4. If the user asks you to draft a reply or compose an email, you can specify a \`create_drafts\` array in your JSON artifact. Make sure to include the EXACT thread headers if it's a reply (use \`inReplyToMessageId\` with the ID of the email AND \`threadId\`).
5. If the user asks you to "create a document", "draft a brief", or "write a report", you can specify a \`create_docs\` array in your JSON artifact.
6. If the user asks you to "track expenses", "log invoices", or organize data in a spreadsheet, you can specify a \`create_sheets\` array in your JSON artifact. Provide a title, headers, and an array of rows.
7. CLEARLY distinguish your high-level text response from the raw data. DO NOT output massive raw JSON blocks directly into the text response. 
8. If requested, you MUST format summaries, action items, or next steps in a curated dashboard artifact using the following EXACT tags:

[AURA_ARTIFACT type="work"]
{
  "title": "Your Custom Title",
  "summary": "Overall context summary.",
  "action_items": [ { "item": "To Do thing", "due": "When" } ],
  "next_steps": [ "Step 1", "Step 2" ],
  "data": [ { "id": "email_or_doc_id", "subject": "Subject of item", "from": "sender or author", "date": "date string", "snippet": "short context summary", "signal": "category tag e.g. Urgent", "action": "suggested action" } ],
  "create_tasks": [ { "title": "Buy groceries", "notes": "Milk and bread" } ],
  "create_drafts": [ { "to": "email@example.com", "subject": "Re: Subject", "body": "Hey there...", "inReplyToMessageId": "email_id_here", "threadId": "thread_id_here" } ],
  "create_docs": [ { "title": "Project Brief", "body": "1. Introduction\\n2. Goals..." } ],
  "create_sheets": [ { "id": "optional_existing_sheet_id", "title": "Expense Tracking", "headers": ["Date", "Description", "Amount"], "rows": [["2023-10-27", "Office Supplies", "45.00"]] } ],
  "meta": { "source": "Workspace", "account": "${currentUserEmail}", "scope": "Workspace Scan", "generated": "${currentTime}" }
}
[/AURA_ARTIFACT]`
          });
        } catch (err) {
          console.error("Failed to fetch workspace context", err);
        }
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: payloadMessages })
      });

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      const modelMessageId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, { id: modelMessageId, role: 'model', content: '' }]);

      let accumulatedContent = '';
      let done = false;
      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunkValue = decoder.decode(value, { stream: true });
        accumulatedContent += chunkValue;
        
        setMessages(prev => 
          prev.map(msg => 
            msg.id === modelMessageId 
              ? { ...msg, content: msg.content + chunkValue }
              : msg
          )
        );
      }

      // Check for create_tasks in accumulated content
      const blockRegex = /\[AURA_ARTIFACT\s+type="([^"]+)"\]([\s\S]*?)\[\/AURA_ARTIFACT\]/g;
      let match;
      while ((match = blockRegex.exec(accumulatedContent)) !== null) {
        try {
          const payload = JSON.parse(match[2]);
          if (payload.create_tasks && Array.isArray(payload.create_tasks)) {
             const { createTask } = await import('./services/tasks');
             for (const t of payload.create_tasks) {
               await createTask(t.title, t.notes, t.due).catch(console.error);
             }
          }
          if (payload.create_drafts && Array.isArray(payload.create_drafts)) {
             const { createDraft } = await import('./services/gmail');
             for (const d of payload.create_drafts) {
               await createDraft(d.to, d.subject, d.body, d.inReplyToMessageId, d.threadId).catch(console.error);
             }
          }
          if (payload.create_docs && Array.isArray(payload.create_docs)) {
             const { createDocument } = await import('./services/docs');
             for (const doc of payload.create_docs) {
               await createDocument(doc.title, doc.body).catch(console.error);
             }
          }
          if (payload.create_sheets && Array.isArray(payload.create_sheets)) {
             const { createSpreadsheet, appendRowsToSheet } = await import('./services/sheets');
             for (const sheet of payload.create_sheets) {
               try {
                 let sheetId = sheet.id;
                 if (!sheetId || sheetId === "optional_existing_sheet_id") {
                   const newSheet = await createSpreadsheet(sheet.title || "Untitled Spreadsheet", sheet.headers);
                   sheetId = newSheet.spreadsheetId;
                 }
                 if (sheetId && sheet.rows && sheet.rows.length > 0) {
                   await appendRowsToSheet(sheetId, 'Sheet1', sheet.rows);
                 }
               } catch (err) {
                 console.error(err);
               }
             }
          }
        } catch(e) {}
      }
    } catch (error) {
      console.error('Error during chat stream:', error);
      setMessages(prev => [
        ...prev,
        { id: Date.now().toString(), role: 'model', content: "I'm having trouble connecting to my cognitive engine right now." }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-black text-[#e0e0e0] font-sans selection:bg-indigo-500/30">
      {/* Sidebar */}
      <div className="hidden md:flex w-64 bg-black border-r border-[#1a1a1a] flex-col text-white">
        {/* Header */}
        <div className="pt-8 px-6 pb-6 flex items-center gap-3">
          <div className="w-6 h-6 rounded-full border-[5px] border-white box-border" />
          <span className="text-xl font-bold tracking-tight">AURA</span>
        </div>
        
        {/* Action Button */}
        <div className="px-6 mb-8">
          <button 
            onClick={() => setMessages([])} 
            className="w-full bg-white text-black font-semibold py-2.5 rounded-full text-sm hover:bg-gray-100 transition-colors shadow-sm"
          >
            + New Chat
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 mt-8">
          <h3 className="font-mono text-[10px] text-white/40 mb-4 px-6 uppercase tracking-[0.2em] font-medium">
            Perspective
          </h3>
          <div className="flex flex-col space-y-1 px-3">
            {['Chat', 'Research', 'Workspace', 'Maps'].map((item) => {
              const isActive = activeTab === item;
              return (
                <button
                  key={item}
                  onClick={() => setActiveTab(item)}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-[14px] transition-all duration-300 font-light ${
                    isActive 
                      ? 'bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]' 
                      : 'text-white/50 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </div>
        
        {/* Bottom Actions */}
        <div className="p-6 text-[13px] text-[#888888] flex flex-col gap-4 font-light">
          <button 
            onClick={handleAuth}
            disabled={isLoggingIn}
            className="flex items-center justify-between hover:text-white transition-colors w-full text-left disabled:opacity-50"
          >
            <span className={`truncate pr-3 ${workspaceAuthError ? 'text-red-400 font-medium' : ''}`}>
              {!user 
                ? 'Connect Google Workspace' 
                : workspaceAuthError 
                  ? 'Re-authenticate Workspace' 
                  : `Disconnect ${user.email || 'Workspace'}`}
            </span>
          </button>
          <button className="hover:text-white text-left transition-colors w-full">
            Settings
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col items-center relative overflow-hidden bg-black">
        {/* Main Header (Mobile) */}
        <div className="md:hidden w-full flex items-center gap-3 p-4 border-b border-[#1a1a1a] bg-black">
          <div className="w-5 h-5 rounded-full border-[3px] border-white box-border" />
          <span className="text-xl font-bold tracking-tight text-white">AURA</span>
        </div>

        {activeTab === 'Workspace' ? (
          user ? (
            <WorkspaceDashboard />
          ) : (
            <div className="flex flex-col items-center justify-center h-full w-full">
              <h2 className="text-xl font-semibold mb-2">Workspace Disconnected</h2>
              <p className="text-sm text-white/50 mb-6 max-w-sm text-center">
                Connect your Google Workspace to read and compose emails.
              </p>
              <button 
                onClick={handleAuth}
                disabled={isLoggingIn}
                className="bg-white text-black font-semibold py-2.5 px-6 rounded-full text-sm hover:bg-gray-100 transition-colors shadow-sm disabled:opacity-50"
              >
                 Connect Google Workspace
              </button>
            </div>
          )
        ) : (
          <>
            <div className="flex-1 w-full max-w-4xl overflow-y-auto overflow-x-hidden p-4 sm:p-6 pb-32 style-scrollbar">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full w-full opacity-80 rotate-[-1deg] scale-95 transition-all duration-1000">
                   <div className="w-16 h-16 rounded-full border-[8px] border-white/10 box-border mb-6 shadow-[0_0_40px_rgba(255,255,255,0.03)]" />
                   <h2 className="text-3xl font-light tracking-tight text-white/40">Essential Intelligence.</h2>
                </div>
              ) : (
                <div className="space-y-6 pt-4 flex flex-col pb-4">
                  <AnimatePresence>
                    {messages.map((msg) => (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
                        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                        className={`w-full max-w-3xl flex ${msg.role === 'user' ? 'justify-end ml-auto' : 'justify-start mr-auto'}`}
                      >
                        <div className={`flex gap-5 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                          {msg.role === 'model' && (
                            <div className="w-7 h-7 shrink-0 rounded-full border-[2px] border-white/80 box-border shadow-[0_0_15px_rgba(255,255,255,0.15)] opacity-90 backdrop-blur-md flex items-center justify-center">
                              <div className="w-3 h-3 rounded-full bg-white/20" />
                            </div>
                          )}
                          
                          <div className={`${msg.role === 'user' 
                              ? 'glass-panel py-3 px-5 rounded-[24px] rounded-tr-[4px] text-[15px] text-white leading-relaxed font-light tracking-wide shadow-sm' 
                              : 'py-0.5 text-white/90 text-[15px] leading-relaxed font-light tracking-wide'}`}>
                            {msg.role === 'user' ? (
                              <div className="whitespace-pre-wrap">{msg.content}</div>
                            ) : (
                              <MessageRenderer content={msg.content} />
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {isLoading && messages[messages.length - 1]?.role === 'user' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start mr-auto max-w-3xl w-full">
                      <div className="flex gap-5 max-w-[85%]">
                         <div className="w-7 h-7 shrink-0 rounded-full border-[2px] border-white/40 box-border shadow-[0_0_15px_rgba(255,255,255,0.05)] opacity-50 flex items-center justify-center">
                            <div className="w-3 h-3 rounded-full bg-white/10 animate-ping" />
                         </div>
                         <div className="bg-white/5 backdrop-blur-2xl border border-white/5 rounded-[24px] rounded-tl-[4px] flex items-center justify-center px-5 py-3 h-[46px] shadow-[0_4px_24px_rgba(0,0,0,0.2)]">
                            <div className="flex items-center gap-2 text-[10px] text-white/50 font-mono uppercase tracking-[0.2em]">
                              <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-pulse"></span>
                              Processing
                            </div>
                         </div>
                      </div>
                    </motion.div>
                  )}
                  <div ref={messagesEndRef} className="h-10" />
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="absolute w-full bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent pt-32 pb-8 px-4 backdrop-blur-[2px]">
              <div className="w-full max-w-3xl mx-auto relative group">
                 <ChatInput 
                   value={input} 
                   onChange={setInput} 
                   onSubmit={handleSubmit} 
                   isLoading={isLoading}
                   onOpenDrive={user ? () => setIsDrivePickerOpen(true) : undefined}
                   attachments={attachments}
                   onRemoveAttachment={(id) => setAttachments(prev => prev.filter(a => a.id !== id))}
                 />
                 <div className="text-center mt-5 mb-1 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                   <span className="font-mono text-[9px] text-white/20 uppercase tracking-[0.4em]">
                     Built for Enterprise on Gemini
                   </span>
                 </div>
              </div>
            </div>
            
            <DriveFilePickerModal 
              isOpen={isDrivePickerOpen} 
              onClose={() => setIsDrivePickerOpen(false)} 
              onFileSelect={handleFileSelect} 
            />
          </>
        )}
      </div>
    </div>
  );
}
