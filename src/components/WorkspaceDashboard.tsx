import React, { useEffect, useState } from "react";
import { listMessages, sendMessage, trashMessage } from "../services/gmail";
import { listUpcomingEvents, CalendarEvent } from "../services/calendar";
import {
  getRecentDriveFiles,
  exportDriveFile,
  DriveFile,
} from "../services/drive";
import { listTasks, Task, createTask } from "../services/tasks";
import {
  Sparkles,
  Mail,
  RefreshCw,
  PenSquare,
  X,
  Send,
  Calendar,
  Clock,
  FileText,
  Presentation,
  Table as TableIcon,
  CheckSquare,
  Plus,
  Video,
  Paperclip,
  HardDrive,
  Layers,
  Trash2,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Markdown from "react-markdown";

import { WorkspaceAuthError } from "./WorkspaceAuthError";

type Tab = "gmail" | "calendar" | "docs" | "tasks";

interface WorkspaceDashboardProps {
  onAskAI?: (contextText: string, metadata?: string) => void;
}

export function WorkspaceDashboard({ onAskAI }: WorkspaceDashboardProps) {
  const [activeTab, setActiveTab] = useState<Tab>("gmail");

  const [messages, setMessages] = useState<any[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [docs, setDocs] = useState<DriveFile[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  const [expandedEmailId, setExpandedEmailId] = useState<string | null>(null);
  const [triageLoading, setTriageLoading] = useState<Record<string, boolean>>(
    {},
  );
  const [triageData, setTriageData] = useState<
    Record<string, { summary: string; actions: string[]; replyDraft?: string }>
  >({});

  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [synthesizing, setSynthesizing] = useState(false);
  const [synthesisResult, setSynthesisResult] = useState<string | null>(null);

  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [wrapupNotes, setWrapupNotes] = useState<Record<string, string>>({});
  const [wrapupLoading, setWrapupLoading] = useState<Record<string, boolean>>(
    {},
  );
  const [wrapupResults, setWrapupResults] = useState<
    Record<string, { summary?: string; tasksCreated?: string[] }>
  >({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [isComposing, setIsComposing] = useState(false);
  const [sending, setSending] = useState(false);
  const [composeForm, setComposeForm] = useState({
    to: "",
    subject: "",
    body: "",
  });

  const handleIntelligentTriage = async (
    e: React.MouseEvent,
    msgId: string,
    emailContent: string,
  ) => {
    e.stopPropagation();
    if (expandedEmailId === msgId) {
      setExpandedEmailId(null);
      return;
    }

    setExpandedEmailId(msgId);

    if (triageData[msgId] || triageLoading[msgId]) return;

    setTriageLoading((prev) => ({ ...prev, [msgId]: true }));

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "chat",
          messages: [
            {
              role: "user",
              content: `You are an Intelligent Triage AI. Given the following email thread snippet, output a JSON object exactly adhering to this format: {"summary": "A 1-2 sentence summary of the thread.", "actions": ["extract", "any", "action items", "or deadlines"]}.\n\nHere is the email:\n${emailContent}`,
            },
          ],
        }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) fullText += decoder.decode(value, { stream: true });
        }
      }

      const jsonMatch = fullText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        setTriageData((prev) => ({
          ...prev,
          [msgId]: { summary: data.summary || "", actions: data.actions || [] },
        }));
      }
    } catch (e) {
      console.error("Triage failed", e);
    } finally {
      setTriageLoading((prev) => ({ ...prev, [msgId]: false }));
    }
  };

  const handleGenerateReply = async (
    e: React.MouseEvent,
    msgId: string,
    emailContent: string,
    fromName: string,
  ) => {
    e.stopPropagation();
    setTriageLoading((prev) => ({ ...prev, [msgId]: true }));
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "chat",
          messages: [
            {
              role: "user",
              content: `You are to draft a contextual response to this email from ${fromName}. Match the tone of the sender. Just output the body of the email reply text block, without introductory fluff or pleasantries about being an AI.\n\nEmail:\n${emailContent}`,
            },
          ],
        }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) fullText += decoder.decode(value, { stream: true });
        }
      }

      setTriageData((prev) => ({
        ...prev,
        [msgId]: {
          ...(prev[msgId] || { summary: "", actions: [] }),
          replyDraft: fullText.trim(),
        },
      }));
    } catch (err) {
      console.error("Generate reply failed", err);
    } finally {
      setTriageLoading((prev) => ({ ...prev, [msgId]: false }));
    }
  };

  const handleDeleteEmail = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      setMessages((prev) => prev.filter((msg) => msg.id !== id));
      await trashMessage(id);
    } catch (err) {
      console.error("Delete failed", err);
      // Optional: Handle error visually, maybe fetch messages again to restore
    }
  };

  const handleSynthesize = async () => {
    if (selectedDocs.length === 0) return;
    setSynthesizing(true);
    setSynthesisResult("");

    try {
      const texts: string[] = [];
      for (const id of selectedDocs) {
        const doc = docs.find((d) => d.id === id);
        if (doc) {
          const content = await exportDriveFile(id, doc.mimeType);
          texts.push(
            `--- Document: ${doc.name} ---\n${content.substring(0, 15000)}`,
          );
        }
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "chat",
          messages: [
            {
              role: "user",
              content: `You are an expert executive assistant focusing on essentialism. Provide a unified executive summary and synthesis of the following documents. Find common themes, key takeaways, and action items across them. Do not hallucinate. Use formatting appropriately (lists and bold text). Keep the tone professional, concise, and structured with Markdown headers.\n\n${texts.join("\n\n")}`,
            },
          ],
        }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            fullText += decoder.decode(value, { stream: true });
            setSynthesisResult(fullText);
          }
        }
      }
    } catch (err) {
      console.error(err);
      setSynthesisResult("Error synthesizing documents.");
    } finally {
      setSynthesizing(false);
    }
  };

  const handleMeetingWrapup = async (e: React.MouseEvent, eventId: string) => {
    e.stopPropagation();
    const notes = wrapupNotes[eventId];
    if (!notes || wrapupLoading[eventId]) return;

    setWrapupLoading((prev) => ({ ...prev, [eventId]: true }));
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "chat",
          messages: [
            {
              role: "user",
              content: `You are an intelligent executive assistant. Parse the following meeting notes and identify all action items. Return a JSON object with this exact format: {"summary": "Brief 1 sentence summary of notes", "actions": [{"title": "Action title", "due": "YYYY-MM-DD"}]}. If no deadline is explicitly mentioned, set it to 3 days from now. Today's date is: ${new Date().toISOString().split("T")[0]}.\n\nMeeting Notes:\n${notes}`,
            },
          ],
        }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) fullText += decoder.decode(value, { stream: true });
        }
      }

      const jsonMatch = fullText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        const tasksCreated = [];
        if (data.actions && Array.isArray(data.actions)) {
          for (const action of data.actions) {
            const created = await createTask(
              action.title,
              `From meeting notes: ${data.summary}`,
              action.due ? `${action.due}T00:00:00.000Z` : undefined,
            );
            tasksCreated.push(created.title);
          }
        }
        setWrapupResults((prev) => ({
          ...prev,
          [eventId]: { summary: data.summary, tasksCreated },
        }));
        if (activeTab === "tasks") {
          const newTasks = await listTasks();
          setTasks(newTasks);
        } else {
          // Pre-fetch tasks so they are ready
          listTasks().then(setTasks);
        }
      }
    } catch (err) {
      console.error("Meeting wrap-up failed", err);
    } finally {
      setWrapupLoading((prev) => ({ ...prev, [eventId]: false }));
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      if (activeTab === "gmail") {
        const data = await listMessages();
        setMessages(data);
      } else if (activeTab === "calendar") {
        const data = await listUpcomingEvents(15);
        setEvents(data);
      } else if (activeTab === "docs") {
        const data = await getRecentDriveFiles("all");
        const filterSupported = data.filter(
          (d) =>
            d.mimeType === "application/vnd.google-apps.document" ||
            d.mimeType === "application/vnd.google-apps.spreadsheet" ||
            d.mimeType === "application/vnd.google-apps.presentation" ||
            d.mimeType.startsWith("image/") ||
            d.mimeType.startsWith("video/"),
        );
        setDocs(filterSupported.slice(0, 15));
      } else if (activeTab === "tasks") {
        const data = await listTasks();
        setTasks(data);
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  useEffect(() => {
    const handleRefresh = () => {
      // If we are on gmail tab, refetch. If not, maybe we don't care because when we switch back it will refetch?
      // Actually it's better to just refetch so the data updates if we are looking at it.
      if (activeTab === "gmail") {
        fetchData();
      }
    };
    window.addEventListener("refresh-workspace-gmail", handleRefresh);
    return () =>
      window.removeEventListener("refresh-workspace-gmail", handleRefresh);
  }, [activeTab]);

  const handleSend = async () => {
    if (!composeForm.to || !composeForm.subject || !composeForm.body) return;

    const confirmed = window.confirm(`Send email to ${composeForm.to}?`);
    if (!confirmed) return;

    setSending(true);
    try {
      await sendMessage(composeForm.to, composeForm.subject, composeForm.body);
      setIsComposing(false);
      setComposeForm({ to: "", subject: "", body: "" });
    } catch (err: any) {
      alert(err.message || "Error sending email");
    } finally {
      setSending(false);
    }
  };

  if (
    loading &&
    !messages.length &&
    !events.length &&
    !docs.length &&
    !tasks.length
  ) {
    return (
      <div className="w-full mx-auto max-w-5xl flex flex-col h-full pt-10 px-8 pb-32 relative overflow-y-auto custom-scrollbar font-sans">
        <div className="flex items-end justify-between mb-10 pb-5 border-b border-white/[0.06]">
          <div className="flex gap-6">
            <div className="h-6 w-16 bg-white/5 rounded animate-pulse" />
            <div className="h-6 w-20 bg-white/5 rounded animate-pulse" />
            <div className="h-6 w-24 bg-white/5 rounded animate-pulse" />
            <div className="h-6 w-16 bg-white/5 rounded animate-pulse" />
          </div>
          <div className="h-8 w-24 bg-white/5 rounded animate-pulse" />
        </div>
        <div className="flex flex-col gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="flex gap-4 p-5 rounded-2xl bg-[#030303] border border-white/[0.05] shadow-[0_0_20px_rgba(0,0,0,0.5)] backdrop-blur-2xl animate-pulse opacity-50"
            >
              <div className="w-12 h-12 rounded-xl bg-white/10 shrink-0" />
              <div className="flex flex-col gap-2 flex-1 pt-1">
                <div className="h-4 w-1/3 bg-white/10 rounded" />
                <div className="h-3 w-2/3 bg-white/10 rounded" />
                <div className="h-3 w-1/2 bg-white/10 rounded mt-1" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    const isAuthError = error.includes("Authentication error");
    if (isAuthError) {
      return <WorkspaceAuthError onRetry={fetchData} message={error} />;
    }

    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 h-full">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 mb-5 shadow-[inset_0_0_12px_rgba(239,68,68,0.2)]">
          <X className="h-7 w-7 text-red-500" aria-hidden="true" />
        </div>
        <h3 className="text-lg font-medium text-white tracking-tight mb-2">
          Error Loading Data
        </h3>
        <p className="text-[14px] text-white/60 text-center max-w-sm mb-8 leading-relaxed">
          {error}
        </p>
        <div className="flex gap-3">
          <button
            onClick={fetchData}
            className="px-5 py-2.5 bg-[#030303] border border-white/[0.05] shadow-[0_0_20px_rgba(0,0,0,0.5)] backdrop-blur-2xl rounded-xl text-[14px] font-medium text-white hover:bg-white/10 transition-all shadow-sm"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col h-full pt-8 px-6 pb-24 relative overflow-y-auto custom-scrollbar">
      <div className="flex items-end justify-between mb-8 pb-4 border-b border-white/10">
        <div className="flex gap-6 overflow-x-auto custom-scrollbar">
          <button
            onClick={() => setActiveTab("gmail")}
            className={`pb-4 -mb-4 text-[14px] sm:text-[15px] font-medium transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === "gmail" ? "text-white border-b-2 border-white" : "text-white/40 hover:text-white/80"}`}
          >
            <Mail className="w-4 h-4 hidden sm:block" />
            Mail
          </button>
          <button
            onClick={() => setActiveTab("calendar")}
            className={`pb-4 -mb-4 text-[14px] sm:text-[15px] font-medium transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === "calendar" ? "text-white border-b-2 border-white" : "text-white/40 hover:text-white/80"}`}
          >
            <Calendar className="w-4 h-4 hidden sm:block" />
            Calendar
          </button>
          <button
            onClick={() => setActiveTab("docs")}
            className={`pb-4 -mb-4 text-[14px] sm:text-[15px] font-medium transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === "docs" ? "text-white border-b-2 border-white" : "text-white/40 hover:text-white/80"}`}
          >
            <HardDrive className="w-4 h-4 hidden sm:block" />
            Docs & Drive
          </button>
          <button
            onClick={() => setActiveTab("tasks")}
            className={`pb-4 -mb-4 text-[14px] sm:text-[15px] font-medium transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === "tasks" ? "text-white border-b-2 border-white" : "text-white/40 hover:text-white/80"}`}
          >
            <CheckSquare className="w-4 h-4 hidden sm:block" />
            Tasks
          </button>
        </div>
        <div className="flex items-center gap-3">
          {activeTab === "gmail" && (
            <button
              onClick={() => setIsComposing(true)}
              className="flex items-center gap-2.5 px-6 py-2.5 bg-white text-black font-bold uppercase tracking-[0.1em] rounded-full hover:bg-white/90 transition-all duration-300 text-[11px] shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-[0.98]"
            >
              <PenSquare className="w-4 h-4" />
              Compose
            </button>
          )}
          <button
            onClick={fetchData}
            className="p-2 bg-[#030303] border border-white/[0.05] shadow-[0_0_20px_rgba(0,0,0,0.5)] backdrop-blur-2xl text-white/60 hover:text-white rounded-lg transition-all shadow-sm"
          >
            <RefreshCw
              className={`w-4 h-4 ${loading ? "animate-spin cursor-wait" : ""}`}
            />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {activeTab === "gmail" &&
          messages.map((msg, i) => {
            const headers = msg.payload?.headers || [];
            const subject =
              headers.find((h: any) => h.name === "Subject")?.value ||
              "(No Subject)";
            const from =
              headers.find((h: any) => h.name === "From")?.value ||
              "UnknownSender";
            // Extract just the name from "Name <email@example.com>" if possible
            const fromNameMatch = from.match(/^"?([^"<]+)"?\s*</);
            const fromName = fromNameMatch ? fromNameMatch[1].trim() : from;
            const initial = fromName.charAt(0).toUpperCase();
            const snippet = msg.snippet;

            return (
              <div key={msg.id} className="relative mb-4 group">
                <div className="absolute inset-0 bg-red-500/10 rounded-2xl flex items-center justify-end pr-6 pointer-events-none">
                  <Trash2 className="w-5 h-5 text-red-400" />
                </div>
                <motion.div
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={{ left: 0.15, right: 0 }}
                  onDragEnd={(e, info) => {
                    if (info.offset.x < -100 || info.velocity.x < -500) {
                      handleDeleteEmail(
                        e as unknown as React.MouseEvent,
                        msg.id,
                      );
                    }
                  }}
                  initial={{ opacity: 0, y: 10, x: 0 }}
                  animate={{ opacity: 1, y: 0, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  style={{ touchAction: "pan-y" }}
                  className={`flex flex-col p-5 rounded-2xl bg-[#030303] border border-white/[0.05] shadow-[0_0_20px_rgba(0,0,0,0.5)] backdrop-blur-2xl transition-all cursor-pointer relative z-10 ${expandedEmailId === msg.id ? "ring-1 ring-white/20 bg-[rgba(255,255,255,0.03)] shadow-xl" : "hover:bg-white/[0.04] hover:shadow-[0_0_40px_rgba(255,255,255,0.03)] active:scale-[0.99] border hover:border-white/[0.08] transition-all duration-300 group"}`}
                  onClick={(e) => handleIntelligentTriage(e, msg.id, snippet)}
                >
                  <div className="flex gap-5 items-start">
                    <div className="flex-shrink-0 w-11 h-11 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shadow-inner">
                      <span className="text-lg font-medium text-[white]">
                        {initial || "?"}
                      </span>
                    </div>
                    <div className="flex flex-col flex-1 overflow-hidden min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <span className="text-[14px] font-semibold text-[white] truncate tracking-tight">
                            {fromName}
                          </span>
                          {onAskAI && expandedEmailId !== msg.id && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onAskAI(
                                  `Email from: ${from}\nSubject: ${subject}\nSnippet: ${snippet}`,
                                );
                              }}
                              className="text-[11px] opacity-0 group-hover:opacity-100 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[white]/10 hover:bg-[white]/20 text-[white] transition-all tracking-wide shrink-0"
                            >
                              <Sparkles className="w-3 h-3" />
                              Ask AI
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-4 shrink-0">
                          <span className="text-[12px] text-[rgba(255,255,255,0.5)] whitespace-nowrap hidden sm:block font-medium tracking-wide">
                            {new Date(
                              parseInt(msg.internalDate),
                            ).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                          <button
                            onClick={(e) => handleDeleteEmail(e, msg.id)}
                            className="opacity-0 group-hover:opacity-100 flex items-center justify-center p-1.5 rounded-md hover:bg-white/10 text-[rgba(255,255,255,0.5)] hover:text-red-400 transition-all shrink-0"
                            title="Delete Email"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <h3 className="text-[14px] sm:text-[15px] font-medium text-[white] line-clamp-1 tracking-tight mb-1">
                        {subject}
                      </h3>
                      <p
                        className={`text-[13px] sm:text-[14px] text-[rgba(255,255,255,0.5)] leading-relaxed ${expandedEmailId === msg.id ? "" : "line-clamp-2"}`}
                      >
                        {snippet}
                      </p>
                    </div>
                  </div>

                  {/* Intelligent Triage UI */}
                  <AnimatePresence>
                    {expandedEmailId === msg.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                        animate={{ opacity: 1, height: "auto", marginTop: 16 }}
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        className="flex flex-col gap-4 overflow-hidden border-t border-[rgba(255,255,255,0.06)] pt-5"
                      >
                        {triageLoading[msg.id] && !triageData[msg.id] ? (
                          <div className="flex flex-col items-center justify-center gap-3 text-[rgba(255,255,255,0.5)] text-[13px] py-8 w-full">
                            <RefreshCw className="w-5 h-5 animate-spin text-[white]" />
                            <span className="tracking-wide">
                              AI is analyzing thread intelligence...
                            </span>
                          </div>
                        ) : triageData[msg.id] ? (
                          <div className="flex flex-col gap-6">
                            {/* Summary */}
                            <div className="bg-[#050505] rounded-xl p-5 border border-[rgba(255,255,255,0.06)] shadow-sm">
                              <h4 className="text-[11px] font-bold text-[rgba(255,255,255,0.5)] uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5" /> Thread
                                Summary
                              </h4>
                              <p className="text-[14px] text-[white] leading-relaxed font-light">
                                {triageData[msg.id].summary}
                              </p>
                            </div>

                            {/* Action Items */}
                            {triageData[msg.id].actions &&
                              triageData[msg.id].actions.length > 0 && (
                                <div className="bg-[#050505] rounded-xl p-5 border border-[rgba(255,255,255,0.06)] shadow-sm">
                                  <h4 className="text-[11px] font-bold text-[rgba(255,255,255,0.5)] uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                    <CheckSquare className="w-3.5 h-3.5" />{" "}
                                    Action Items
                                  </h4>
                                  <ul className="flex flex-col gap-3">
                                    {triageData[msg.id].actions.map(
                                      (action, idx) => (
                                        <li
                                          key={idx}
                                          className="text-[13px] text-[white] flex items-start gap-3"
                                        >
                                          <span className="w-1.5 h-1.5 rounded-full bg-[white] mt-1.5 flex-shrink-0 shadow-[0_0_8px_rgba(255,255,255,0.4)]" />
                                          <span className="leading-relaxed font-light">
                                            {action}
                                          </span>
                                        </li>
                                      ),
                                    )}
                                  </ul>
                                </div>
                              )}

                            {/* Reply Generator */}
                            {!triageData[msg.id].replyDraft ? (
                              <button
                                onClick={(e) =>
                                  handleGenerateReply(
                                    e,
                                    msg.id,
                                    snippet,
                                    fromName,
                                  )
                                }
                                disabled={triageLoading[msg.id]}
                                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[white] text-[#050505] font-medium text-[13px] hover:bg-[rgba(255,255,255,0.9)] transition-all shadow-md active:scale-[0.98] disabled:opacity-50"
                              >
                                {triageLoading[msg.id] ? (
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : (
                                  <PenSquare className="w-4 h-4" />
                                )}
                                Generate Reply
                              </button>
                            ) : (
                              <div className="flex flex-col gap-3">
                                <div className="bg-[#050505] rounded-xl p-5 border border-[rgba(255,255,255,0.06)] relative group focus-within:ring-1 focus-within:ring-white/20 transition-all shadow-sm">
                                  <h4 className="text-[11px] font-bold text-[rgba(255,255,255,0.5)] uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                    <Mail className="w-3.5 h-3.5" /> Contextual
                                    Draft
                                  </h4>
                                  <textarea
                                    defaultValue={triageData[msg.id].replyDraft}
                                    className="w-full bg-transparent text-[14px] text-[white] leading-relaxed resize-none outline-none focus:ring-0 min-h-[140px] font-light"
                                  />
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(
                                      `https://mail.google.com/mail/u/0/#inbox/${msg.id}`,
                                      "_blank",
                                    );
                                  }}
                                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-transparent text-[white] font-medium text-[13px] hover:bg-white/5 transition-all border border-[rgba(255,255,255,0.06)] shadow-sm active:scale-[0.98]"
                                >
                                  <Send className="w-4 h-4" />
                                  Open in Gmail to Send
                                </button>
                              </div>
                            )}
                          </div>
                        ) : null}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </div>
            );
          })}

        {activeTab === "calendar" &&
          events.map((event, i) => {
            const startDate = new Date(
              event.start.dateTime || event.start.date || "",
            );
            const endDate = new Date(
              event.end.dateTime || event.end.date || "",
            );
            const isAllDay = !event.start.dateTime;

            return (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                key={event.id}
                className={`flex flex-col p-5 rounded-2xl bg-[#030303] border border-white/[0.05] shadow-[0_0_20px_rgba(0,0,0,0.5)] backdrop-blur-2xl transition-all cursor-pointer ${expandedEventId === event.id ? "ring-1 ring-white/20 bg-[rgba(255,255,255,0.03)] shadow-xl" : "hover:bg-white/[0.04] hover:shadow-[0_0_40px_rgba(255,255,255,0.03)] active:scale-[0.99] border hover:border-white/[0.08] transition-all duration-300 group"}`}
                onClick={() =>
                  setExpandedEventId((prev) =>
                    prev === event.id ? null : event.id,
                  )
                }
              >
                <div className="flex gap-5">
                  <div className="flex flex-col items-center justify-center w-14 h-14 rounded-xl bg-white/5 border border-white/10 shrink-0 shadow-inner">
                    <span className="text-[11px] font-bold text-[rgba(255,255,255,0.5)] uppercase tracking-wider">
                      {startDate.toLocaleDateString("en-US", {
                        month: "short",
                      })}
                    </span>
                    <span className="text-[18px] font-semibold text-[white] tracking-tight">
                      {startDate.getDate()}
                    </span>
                  </div>
                  <div className="flex flex-col justify-center overflow-hidden flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-[15px] font-medium text-[white] truncate tracking-tight">
                        {event.summary || "(No Title)"}
                      </h3>
                      {event.hangoutLink && (
                        <a
                          href={event.hangoutLink}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[white]/10 text-[white] text-[12px] font-medium hover:bg-[white]/20 transition-colors shrink-0"
                        >
                          <Video className="w-3.5 h-3.5" />
                          Join Meet
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="flex items-center gap-1.5 text-[13px] text-[rgba(255,255,255,0.5)] font-medium tracking-wide">
                        <Clock className="w-3.5 h-3.5 opacity-70" />
                        {isAllDay
                          ? "All event"
                          : `${startDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} - ${endDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`}
                      </span>
                    </div>
                    {event.attachments && event.attachments.length > 0 && (
                      <div className="flex flex-col gap-2 mt-3">
                        {event.attachments.map((att) => (
                          <a
                            key={att.fileId}
                            href={att.fileUrl}
                            onClick={(e) => e.stopPropagation()}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors w-fit border border-white/5"
                          >
                            <Paperclip className="w-3 h-3 text-white/40" />
                            <span className="text-[12px] text-white/70 truncate max-w-[200px]">
                              {att.title}
                            </span>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Wrap-up AI Block */}
                <AnimatePresence>
                  {expandedEventId === event.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, marginTop: 0 }}
                      animate={{ opacity: 1, height: "auto", marginTop: 16 }}
                      exit={{ opacity: 0, height: 0, marginTop: 0 }}
                      className="flex flex-col gap-4 overflow-hidden border-t border-[rgba(255,255,255,0.06)] pt-5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Sparkles className="w-3.5 h-3.5 text-[white]" />
                        <h4 className="text-[11px] font-bold text-[rgba(255,255,255,0.5)] uppercase tracking-widest">
                          Meeting Wrap-up
                        </h4>
                      </div>

                      {!wrapupResults[event.id] ? (
                        <div className="flex flex-col gap-3">
                          <textarea
                            placeholder="Dump your rough meeting notes here..."
                            className="w-full bg-[#050505] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 text-[14px] text-[white] leading-relaxed resize-y min-h-[120px] outline-none focus:ring-1 focus:ring-white/20 transition-all font-light shadow-sm"
                            value={wrapupNotes[event.id] || ""}
                            onChange={(e) =>
                              setWrapupNotes((prev) => ({
                                ...prev,
                                [event.id]: e.target.value,
                              }))
                            }
                          />
                          <button
                            onClick={(e) => handleMeetingWrapup(e, event.id)}
                            disabled={
                              !wrapupNotes[event.id] || wrapupLoading[event.id]
                            }
                            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[white] text-[#050505] font-medium text-[13px] hover:bg-[rgba(255,255,255,0.9)] transition-all shadow-md active:scale-[0.98] disabled:opacity-50 tracking-wide"
                          >
                            {wrapupLoading[event.id] ? (
                              <RefreshCw className="w-4 h-4 animate-spin text-[#050505]" />
                            ) : (
                              <CheckSquare className="w-4 h-4 text-[#050505]" />
                            )}
                            {wrapupLoading[event.id]
                              ? "Parsing Action Items..."
                              : "Extract & Create Tasks"}
                          </button>
                        </div>
                      ) : (
                        <div className="bg-[#050505] border border-[rgba(255,255,255,0.06)] rounded-xl p-5 shadow-sm flex flex-col gap-4">
                          <p className="text-[14px] text-[white] font-light leading-relaxed">
                            {wrapupResults[event.id].summary}
                          </p>
                          {wrapupResults[event.id].tasksCreated &&
                            wrapupResults[event.id].tasksCreated.length > 0 && (
                              <div className="pt-3 border-t border-[rgba(255,255,255,0.06)]">
                                <h5 className="text-[12px] font-medium text-[rgba(255,255,255,0.5)] mb-3">
                                  Generated Tasks
                                </h5>
                                <ul className="flex flex-col gap-2">
                                  {wrapupResults[event.id].tasksCreated.map(
                                    (task, idx) => (
                                      <li
                                        key={idx}
                                        className="text-[13px] text-[white] flex items-start gap-2 bg-white/5 rounded-lg px-3 py-2 border border-white/5"
                                      >
                                        <CheckSquare className="w-4 h-4 text-[white] mt-0.5 shrink-0" />
                                        <span className="font-light">
                                          {task}
                                        </span>
                                      </li>
                                    ),
                                  )}
                                </ul>
                                <div className="mt-4 flex justify-end">
                                  <button
                                    onClick={() => setActiveTab("tasks")}
                                    className="text-[12px] text-[white] hover:underline"
                                  >
                                    View all tasks →
                                  </button>
                                </div>
                              </div>
                            )}
                          {!wrapupResults[event.id].tasksCreated?.length && (
                            <p className="text-[13px] text-[rgba(255,255,255,0.5)] italic">
                              No clear action items identified.
                            </p>
                          )}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}

        {activeTab === "docs" && (
          <div className="flex justify-between items-center mb-8 h-10 border-b border-white/[0.06] pb-5">
            <h2 className="text-[12px] uppercase tracking-widest font-bold text-[rgba(255,255,255,0.5)] flex items-center gap-2">
              <Layers className="w-4 h-4" /> Deep Search
            </h2>
            {selectedDocs.length > 0 && (
              <button
                onClick={handleSynthesize}
                disabled={synthesizing}
                className="flex items-center gap-2 px-4 py-2 bg-[white] text-[#050505] rounded-full text-xs font-semibold hover:bg-[rgba(255,255,255,0.9)] transition-all shadow-md active:scale-95 disabled:opacity-50 tracking-wide"
              >
                {synthesizing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                {synthesizing
                  ? "Synthesizing..."
                  : `Synthesize (${selectedDocs.length}/3)`}
              </button>
            )}
          </div>
        )}

        {activeTab === "docs" &&
          docs.map((doc, i) => {
            const isDoc =
              doc.mimeType === "application/vnd.google-apps.document";
            const isSheet =
              doc.mimeType === "application/vnd.google-apps.spreadsheet";
            const isSlide =
              doc.mimeType === "application/vnd.google-apps.presentation";
            const isMedia =
              doc.mimeType.startsWith("image/") ||
              doc.mimeType.startsWith("video/");
            const DocIcon = isDoc
              ? FileText
              : isSheet
                ? TableIcon
                : isSlide
                  ? Presentation
                  : isMedia
                    ? Video
                    : FileText;
            const colorClass = isDoc
              ? "text-blue-400"
              : isSheet
                ? "text-emerald-400"
                : isSlide
                  ? "text-amber-400"
                  : "text-purple-400";

            const isSelected = selectedDocs.includes(doc.id);

            return (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                key={doc.id}
                className={`flex items-center gap-4 p-5 rounded-2xl bg-[#030303] border border-white/[0.05] shadow-[0_0_20px_rgba(0,0,0,0.5)] backdrop-blur-2xl hover:bg-white/[0.04] hover:shadow-[0_0_40px_rgba(255,255,255,0.03)] active:scale-[0.99] border hover:border-white/[0.08] transition-all duration-300 transition-all group cursor-pointer ${isSelected ? "ring-2 ring-[white] bg-[rgba(255,255,255,0.03)]" : ""}`}
                onClick={() => {
                  if (isSelected) {
                    setSelectedDocs((prev) =>
                      prev.filter((id) => id !== doc.id),
                    );
                  } else if (selectedDocs.length < 3) {
                    setSelectedDocs((prev) => [...prev, doc.id]);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <div
                  className={`w-12 h-12 flex items-center justify-center rounded-2xl bg-white/[0.04] border border-white/[0.08] shadow-inner shrink-0 relative ${colorClass}`}
                >
                  <DocIcon className="w-6 h-6" />
                  {isSelected && (
                    <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[white] rounded-full flex items-center justify-center shadow-md">
                      <CheckSquare className="w-3 h-3 text-[#050505]" />
                    </div>
                  )}
                </div>
                <div className="flex flex-col flex-1 overflow-hidden min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <h3 className="text-[14px] sm:text-[15px] font-medium text-white truncate tracking-tight group-hover:text-white/90 transition-colors">
                      {doc.name}
                    </h3>
                    <div className="flex items-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(doc.webViewLink, "_blank");
                        }}
                        className="text-[11px] opacity-0 group-hover:opacity-100 flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[rgba(255,255,255,0.5)] hover:text-[white] transition-all tracking-wide shrink-0 mr-2"
                      >
                        Open
                      </button>
                      {onAskAI && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onAskAI(
                              `Drive File: ${doc.name}\nType: ${doc.mimeType}\nLink: ${doc.webViewLink}`,
                            );
                          }}
                          className="text-[11px] opacity-0 group-hover:opacity-100 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[white]/10 hover:bg-[white]/20 text-[white] transition-all tracking-wide shrink-0"
                        >
                          <Sparkles className="w-3 h-3" />
                          Ask AI
                        </button>
                      )}
                    </div>
                  </div>
                  <span className="text-[13px] text-white/50 font-medium tracking-wide">
                    {isDoc
                      ? "Google Doc"
                      : isSheet
                        ? "Google Sheet"
                        : isSlide
                          ? "Google Slide"
                          : isMedia
                            ? "Media File"
                            : "File"}{" "}
                    • Modified{" "}
                    {new Date(doc.modifiedTime).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </motion.div>
            );
          })}

        {activeTab === "tasks" &&
          tasks.map((task, i) => {
            return (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                key={task.id}
                className="flex items-start gap-4 p-5 rounded-2xl bg-[#030303] border border-white/[0.05] shadow-[0_0_20px_rgba(0,0,0,0.5)] backdrop-blur-2xl hover:bg-white/[0.04] hover:shadow-[0_0_40px_rgba(255,255,255,0.03)] active:scale-[0.99] border hover:border-white/[0.08] transition-all duration-300 transition-all cursor-pointer group"
              >
                <div
                  className={`p-1.5 mt-0.5 rounded-lg border border-white/20 shrink-0 bg-white/5`}
                >
                  <CheckSquare className="w-5 h-5 text-white/40 group-hover:text-white/80 transition-colors" />
                </div>
                <div className="flex flex-col flex-1 overflow-hidden min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <h3 className="text-[14px] sm:text-[15px] font-medium text-white tracking-tight">
                      {task.title}
                    </h3>
                    {onAskAI && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onAskAI(
                            `Task: ${task.title}\nDue: ${task.due || "No due date"}\nNotes: ${task.notes || "None"}`,
                          );
                        }}
                        className="text-[11px] opacity-0 group-hover:opacity-100 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[white]/10 hover:bg-[white]/20 text-[white] transition-all tracking-wide shrink-0 ml-4"
                      >
                        <Sparkles className="w-3 h-3" />
                        Ask AI
                      </button>
                    )}
                  </div>
                  {task.notes && (
                    <p className="text-[13px] text-white/50 mt-1 line-clamp-2 leading-relaxed">
                      {task.notes}
                    </p>
                  )}
                  {task.due && (
                    <span className="text-[12px] text-white/40 font-mono tracking-wide mt-2.5 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      Due{" "}
                      {new Date(task.due).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}

        {activeTab === "gmail" && messages.length === 0 && !loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-24 px-6 bg-gradient-to-b from-white/[0.02] to-transparent rounded-[24px] border border-white/[0.05] shadow-[0_0_40px_rgba(255,255,255,0.02)] backdrop-blur-3xl"
          >
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-5 border border-white/10">
              <Mail className="w-8 h-8 text-white/40" />
            </div>
            <h3 className="text-[18px] text-white font-semibold tracking-[-0.02em] mb-3">
              Inbox Empty
            </h3>
            <p className="text-[14px] text-white/50 tracking-wide max-w-sm mx-auto leading-relaxed">
              You're all caught up. New messages will appear here when they
              arrive.
            </p>
          </motion.div>
        )}

        {activeTab === "calendar" && events.length === 0 && !loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20 px-6 bg-[#030303] border border-white/[0.05] shadow-[0_0_20px_rgba(0,0,0,0.5)] backdrop-blur-2xl rounded-2xl border border-white/5 border-dashed bg-white/[0.02]"
          >
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-5 border border-white/10">
              <Calendar className="w-8 h-8 text-white/40" />
            </div>
            <h3 className="text-[16px] text-white font-medium tracking-tight mb-2">
              No Upcoming Events
            </h3>
            <p className="text-[14px] text-white/50 tracking-wide max-w-sm mx-auto leading-relaxed">
              Your schedule is clear. Take a break or create a new event in
              Google Calendar.
            </p>
          </motion.div>
        )}

        {activeTab === "docs" && docs.length === 0 && !loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20 px-6 bg-[#030303] border border-white/[0.05] shadow-[0_0_20px_rgba(0,0,0,0.5)] backdrop-blur-2xl rounded-2xl border border-white/5 border-dashed bg-white/[0.02]"
          >
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-5 border border-white/10">
              <HardDrive className="w-8 h-8 text-white/40" />
            </div>
            <h3 className="text-[16px] text-white font-medium tracking-tight mb-2">
              No Recent Files
            </h3>
            <p className="text-[14px] text-white/50 tracking-wide max-w-sm mx-auto leading-relaxed">
              Files you open or modify in Google Drive will show up here for
              quick access.
            </p>
          </motion.div>
        )}

        {activeTab === "tasks" && tasks.length === 0 && !loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20 px-6 bg-[#030303] border border-white/[0.05] shadow-[0_0_20px_rgba(0,0,0,0.5)] backdrop-blur-2xl rounded-2xl border border-white/5 border-dashed bg-white/[0.02]"
          >
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-5 border border-white/10">
              <CheckSquare className="w-8 h-8 text-white/40" />
            </div>
            <h3 className="text-[16px] text-white font-medium tracking-tight mb-2">
              All tasks completed
            </h3>
            <p className="text-[14px] text-white/50 tracking-wide max-w-sm mx-auto leading-relaxed">
              You've finished everything on your list. Enjoy the rest of your
              day!
            </p>
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {isComposing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-end sm:justify-center p-4 bg-black/60 backdrop-blur-2xl sm:pl-[14rem]"
          >
            <motion.div
              initial={{ y: 50, scale: 0.95, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 20, scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-2xl bg-[#050505]/80 border border-white/10 rounded-[28px] shadow-[0_0_80px_rgba(0,0,0,0.8)] backdrop-blur-3xl overflow-hidden relative"
            >
              <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-white/[0.01]">
                <h3 className="text-[12px] font-bold text-white/50 tracking-[0.2em] uppercase">
                  New Message
                </h3>
                <button
                  onClick={() => setIsComposing(false)}
                  className="p-1.5 hover:bg-white/10 rounded-full text-white/60 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-5 flex flex-col gap-5">
                <input
                  placeholder="To"
                  value={composeForm.to}
                  onChange={(e) =>
                    setComposeForm((p) => ({ ...p, to: e.target.value }))
                  }
                  className="w-full bg-transparent border-b border-white/5 pb-4 mb-2 text-[14px] text-white focus:outline-none focus:border-white/20 transition-all font-medium placeholder-white/30 tracking-wide"
                />
                <input
                  placeholder="Subject"
                  value={composeForm.subject}
                  onChange={(e) =>
                    setComposeForm((p) => ({ ...p, subject: e.target.value }))
                  }
                  className="w-full bg-transparent border-b border-white/5 pb-4 mb-2 text-[15px] text-white focus:outline-none focus:border-white/20 transition-all font-semibold placeholder-white/30 tracking-tight"
                />
                <textarea
                  placeholder="Write your email..."
                  value={composeForm.body}
                  onChange={(e) =>
                    setComposeForm((p) => ({ ...p, body: e.target.value }))
                  }
                  className="w-full bg-transparent text-[14px] text-white/80 placeholder:text-white/30 focus:outline-none resize-none min-h-[240px] mt-4 leading-relaxed font-light custom-scrollbar"
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
                  {sending ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Send
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {synthesisResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex flex-col items-center justify-center p-4 sm:p-8 bg-black/60 backdrop-blur-xl sm:pl-[16rem]"
          >
            <motion.div
              initial={{ y: 20, scale: 0.95, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 20, scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-4xl max-h-[85vh] flex flex-col bg-[#050505]/95 border border-white/10 rounded-[32px] shadow-[0_40px_140px_rgba(0,0,0,0.9)] backdrop-blur-3xl overflow-hidden relative"
            >
              <div className="flex items-center justify-between p-6 sm:px-10 sm:py-8 border-b border-white/5 bg-white/[0.01]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[white]/20 flex items-center justify-center shadow-inner">
                    <Sparkles className="w-4 h-4 text-[white]" />
                  </div>
                  <h3 className="text-[18px] sm:text-[22px] font-bold text-white tracking-tight">
                    AI Synthesis
                  </h3>
                </div>
                <button
                  onClick={() => setSynthesisResult(null)}
                  className="p-2 hover:bg-white/10 rounded-full text-white/60 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 sm:p-10 overflow-y-auto custom-scrollbar flex-1">
                <div className="markdown-body">
                  <Markdown>{synthesisResult}</Markdown>
                </div>
              </div>

              <div className="p-5 sm:px-8 sm:py-5 border-t border-white/10 bg-black/40 flex justify-end">
                <button
                  onClick={() => setSynthesisResult(null)}
                  className="px-8 py-3 rounded-full text-[12px] font-bold uppercase tracking-[0.1em] bg-white text-black hover:bg-[#F5F5F7] transition-all duration-300 shadow-[0_0_30px_rgba(255,255,255,0.1)] active:scale-95"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
