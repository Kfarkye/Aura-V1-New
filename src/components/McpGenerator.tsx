import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, AlertTriangle, Bot, CheckCircle2, Code2, Database, Download, FileJson, FolderSearch, Github, Network, Play, Rocket, Search, ShieldAlert, Square, Terminal, User } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { Sandpack } from "@codesandbox/sandpack-react";

import { useSync } from "../contexts/SyncContext";
import { buildAssistantChatPayload, buildDeployPreviewPayload, buildGenerateMcpPayload, buildGithubSavePayload, buildIndexDocsPayload, buildRegistryEntry, buildSandboxRunPayload, buildSearchDocsPayload } from "../lib/payloads/mcpBuilders";
import type { AuditFinding, AuraApiResponse, AuraRegistryEntry, GeneratedFile, IntegrationPreset } from "../types/aura";

const AURA_SPRING = { type: "spring" as const, stiffness: 400, damping: 30, mass: 0.8 };
const VIEW_ANIMATION = { initial: { opacity: 0, y: 12, filter: "blur(8px)", scale: 0.98 }, animate: { opacity: 1, y: 0, filter: "blur(0px)", scale: 1 }, exit: { opacity: 0, y: -12, filter: "blur(8px)", scale: 0.98 }, transition: AURA_SPRING };
const VIEW_TOP_PAD = "pt-24 md:pt-32";

const PRESETS: IntegrationPreset[] = [
  { id: "stripe", title: "Stripe data, exported clean", desc: "Connect Stripe and query live sales data into an artifact.", provider: "Stripe", docsUrl: "https://docs.stripe.com/api", openApiUrl: "https://raw.githubusercontent.com/stripe/openapi/master/openapi/spec3.json", authType: "Bearer", status: "Connect required", statusColor: "text-amber-400 border-amber-400/20" },
  { id: "event-data", title: "Event data reader", desc: "Build a read-only connector for public event data and snapshots.", provider: "Event API", docsUrl: "https://docs.example.com", authType: "Key", status: "Ready", statusColor: "text-emerald-400 border-emerald-400/20" },
  { id: "github", title: "Commit generated tools with proof", desc: "Save generated files only after the server returns repository and commit evidence.", provider: "GitHub", docsUrl: "https://docs.github.com/en/rest", openApiUrl: "https://raw.githubusercontent.com/github/rest-api-description/main/descriptions/api.github.com/api.github.com.json", authType: "OAuth", status: "Connect required", statusColor: "text-amber-400 border-amber-400/20" },
  { id: "gmail", title: "Draft emails and clear your inbox", desc: "Read threads and create action artifacts from the inbox.", provider: "Gmail API", docsUrl: "https://developers.google.com/gmail/api", openApiUrl: "https://gmail.googleapis.com/$discovery/rest?version=v1", authType: "OAuth 2.0", status: "Connect required", statusColor: "text-amber-400 border-amber-400/20" },
  { id: "linear", title: "Create tickets and tasks", desc: "Turn messy work into tracked tasks and receipts.", provider: "Linear", docsUrl: "https://developers.linear.app/docs/graphql/working-with-the-graphql-api", authType: "Key", status: "Connect required", statusColor: "text-amber-400 border-amber-400/20" },
];

type TrafficRecord = { id: string; timestamp: string; tool: string; latency: string; status: "success" | "error" };
type GovernanceRule = { id: string; name: string; condition: string; action: "DENY" | "ALLOW"; active: boolean };
type BuildMode = "generator" | "governance" | "sandbox" | "traffic" | "registry" | "docs";
type ExecStatus = "idle" | "running" | "testing";
type SpinUpState = "idle" | "analyzing" | "writing" | "deploying" | "done";

async function readJson<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => null);
  if (!body) throw new Error(`Request failed with status ${response.status}. No JSON body returned.`);
  return body as T;
}

function assertReceipt<T>(data: AuraApiResponse<T>, actionLabel: string): asserts data is Extract<AuraApiResponse<T>, { ok: true }> {
  if (!data.ok) throw new Error(data.message || `${actionLabel} failed.`);
  if (!data.receipt_id) throw new Error(`Protocol Fault: ${actionLabel} returned success without receipt_id.`);
}

function receiptPreview(receiptId?: string) {
  if (!receiptId) return "missing";
  return receiptId.length > 22 ? `${receiptId.slice(0, 18)}…` : receiptId;
}

export function McpGenerator() {
  const [mode, setMode] = useState<BuildMode>("generator");
  const { chatMessages, setChatMessages, registry, setRegistry, isSyncing } = useSync();
  const [trafficData, setTrafficData] = useState<TrafficRecord[]>([]);
  const [governanceRules, setGovernanceRules] = useState<GovernanceRule[]>([
    { id: "1", name: "Read-only default", condition: "tool.method !== 'GET'", action: "DENY", active: true },
    { id: "2", name: "Block profile access", condition: "tool.name.includes('profile')", action: "DENY", active: false },
  ]);
  const [newRuleStr, setNewRuleStr] = useState("");
  const [specUrl, setSpecUrl] = useState("");
  const [specContent, setSpecContent] = useState("");
  const [name, setName] = useState("event-data");
  const [options] = useState({ pruneUnsafe: true, addZodSchemas: true, governanceChecks: true, artifactEnvelope: true });
  const [files, setFiles] = useState<GeneratedFile[]>([]);
  const [auditReport, setAuditReport] = useState<AuditFinding[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [docsDir, setDocsDir] = useState("./docs");
  const [docsQuery, setDocsQuery] = useState("");
  const [indexStats, setIndexStats] = useState<{ count: number } | null>(null);
  const [searchResults, setSearchResults] = useState<{ path: string; snippet: string }[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [spinUpState, setSpinUpState] = useState<SpinUpState>("idle");
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [execStatus, setExecStatus] = useState<ExecStatus>("idle");
  const [execLogs, setExecLogs] = useState<string[]>([]);
  const terminalRef = useRef<HTMLDivElement>(null);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployedUrl, setDeployedUrl] = useState("");
  const [targetArtifact] = useState("node");
  const [isShipping, setIsShipping] = useState(false);
  const selectedFileContent = useMemo(() => files.find((file) => file.path === selectedFile)?.content || "", [files, selectedFile]);

  useEffect(() => { if (!isSyncing) chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages, isSyncing]);
  useEffect(() => { if (terminalRef.current) terminalRef.current.scrollTop = terminalRef.current.scrollHeight; }, [execLogs]);

  const logActivity = (action: string, receiptId: string | undefined, timestamp: string | undefined, status: "success" | "error") => {
    if (!receiptId && status === "success") return;
    setTrafficData((prev) => [{ id: receiptId || `err_${Date.now()}`, timestamp: timestamp ? new Date(timestamp).toLocaleTimeString() : new Date().toLocaleTimeString(), tool: action, latency: status === "success" ? "Receipt verified" : "Failed", status }, ...prev]);
  };

  const upsertRegistry = (entry: AuraRegistryEntry) => {
    setRegistry((prev) => {
      const exists = prev.find((item) => item.name === entry.name);
      if (exists) return prev.map((item) => (item.name === entry.name ? { ...item, ...entry } : item));
      return [...prev, entry];
    });
  };

  const handleDownload = async () => {
    try { const zip = new JSZip(); files.forEach((file) => zip.file(file.path, file.content)); saveAs(await zip.generateAsync({ type: "blob" }), `aura-mcp-${name}.zip`); }
    catch (err: any) { setError(`Failed to package files: ${err.message}`); }
  };

  const handleBootSandbox = () => { setExecStatus("running"); setExecLogs(["Sandbox mounted. Run diagnostics for a receipt-backed check."]); };
  const handleStopSandbox = () => { setExecStatus("idle"); setExecLogs([]); };

  const handleTestTools = async () => {
    setExecStatus("testing"); setError("");
    try {
      const response = await fetch("/api/sandbox/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(buildSandboxRunPayload({ targetName: name, action: "diagnostics", files: files.map((file) => file.path) })) });
      const data = await readJson<AuraApiResponse<{ logs: string[] }>>(response);
      assertReceipt(data, "sandbox_test");
      if (!data.evidence?.logs_count && !data.result?.logs) throw new Error("Protocol Fault: sandbox_test requires logs evidence.");
      setExecLogs((prev) => [...prev, ...(data.result.logs || []), `Receipt: ${receiptPreview(data.receipt_id)}`]);
      logActivity("sandbox_test", data.receipt_id, data.timestamp, "success");
    } catch (err: any) { setExecLogs((prev) => [...prev, `[System Fault] ${err.message}`]); logActivity("sandbox_test", undefined, undefined, "error"); }
    finally { setExecStatus("running"); }
  };

  const handleGenerate = async () => {
    setIsLoading(true); setError("");
    try {
      const response = await fetch("/api/generate-mcp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(buildGenerateMcpPayload({ specUrl: specUrl.trim() || undefined, specContent: specContent.trim() || undefined, name, options, governanceRules, targetArtifact })) });
      const data = await readJson<AuraApiResponse<{ files: GeneratedFile[]; auditReport: AuditFinding[] }>>(response);
      assertReceipt(data, "generate_mcp");
      if (!data.result?.files || data.evidence?.file_count === undefined) throw new Error("Protocol Fault: generate_mcp requires files and file_count evidence.");
      setFiles(data.result.files); setAuditReport(data.result.auditReport || []); setSelectedFile(data.result.files[0]?.path || null); logActivity("generate_mcp", data.receipt_id, data.timestamp, "success");
    } catch (err: any) { setError(err.message); logActivity("generate_mcp", undefined, undefined, "error"); }
    finally { setIsLoading(false); }
  };

  const handleDeployToCloud = async () => {
    setIsDeploying(true); setDeployedUrl(""); setError("");
    try {
      const response = await fetch("/api/deploy", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(buildDeployPreviewPayload({ targetName: name, targetRuntime: targetArtifact, governanceRules, options, environment: "production", files: files.map((file) => file.path), summary: "AURA Cloud Deploy" })) });
      const data = await readJson<AuraApiResponse<{ endpoint_url?: string }>>(response);
      assertReceipt(data, "deploy");
      if (!data.evidence?.endpoint_url) throw new Error("Protocol Fault: deploy requires endpoint_url evidence.");
      setDeployedUrl(data.evidence.endpoint_url);
      upsertRegistry(buildRegistryEntry({ name, description: `Your tool for ${name}`, status: "Active (Cloud)", endpoint: data.evidence.endpoint_url, deployment_mode: "cloud", runtime: targetArtifact, source_receipt_id: data.receipt_id, updated_at: data.timestamp }));
      logActivity("deploy", data.receipt_id, data.timestamp, "success");
    } catch (err: any) { setError(`Deployment failed: ${err.message}`); logActivity("deploy", undefined, undefined, "error"); }
    finally { setIsDeploying(false); }
  };

  const handleShipToGithub = async () => {
    setIsShipping(true); setError("");
    try {
      const response = await fetch("/api/github/save-tool", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(buildGithubSavePayload({ targetName: name, files })) });
      const data = await readJson<AuraApiResponse<{ files_written?: string[] }>>(response);
      assertReceipt(data, "github_save");
      if (!data.evidence?.repo_url || !data.evidence?.commit_sha) throw new Error("Protocol Fault: github_save requires repo_url and commit_sha evidence.");
      upsertRegistry(buildRegistryEntry({ name, description: `Your tool for ${name}`, status: deployedUrl ? "Active (Cloud)" : "Active (Sandbox)", endpoint: deployedUrl, deployment_mode: deployedUrl ? "cloud" : "sandpack_preview", runtime: targetArtifact, source_receipt_id: data.receipt_id, updated_at: data.timestamp, source_repo: data.evidence.repo_url, commit_sha: data.evidence.commit_sha }));
      setChatMessages((prev) => [...prev, { role: "assistant", content: `GitOps Protocol Complete.\nRepository: ${data.evidence!.repo_url}\nCommit SHA: ${data.evidence!.commit_sha}\nReceipt ID: ${receiptPreview(data.receipt_id)}` }]);
      logActivity("github_save", data.receipt_id, data.timestamp, "success");
    } catch (err: any) { setChatMessages((prev) => [...prev, { role: "assistant", content: `[GitOps Fault] ${err.message}` }]); logActivity("github_save", undefined, undefined, "error"); }
    finally { setIsShipping(false); }
  };

  const handleIndexDocs = async () => {
    setIsLoading(true); setError("");
    try {
      const response = await fetch("/api/docs/index", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(buildIndexDocsPayload({ directory: docsDir.trim() })) });
      const data = await readJson<AuraApiResponse<Record<string, never>>>(response);
      assertReceipt(data, "docs_index");
      if (data.evidence?.file_count === undefined || !data.evidence?.source) throw new Error("Protocol Fault: docs_index requires file_count and source evidence.");
      setIndexStats({ count: data.evidence.file_count }); logActivity("docs_index", data.receipt_id, data.timestamp, "success");
    } catch (err: any) { setError(err.message); logActivity("docs_index", undefined, undefined, "error"); }
    finally { setIsLoading(false); }
  };

  const handleSearchDocs = async () => {
    if (!docsQuery.trim()) return; setIsSearching(true); setError("");
    try {
      const response = await fetch("/api/docs/search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(buildSearchDocsPayload({ query: docsQuery.trim() })) });
      const data = await readJson<AuraApiResponse<{ results: { path: string; snippet: string }[] }>>(response);
      assertReceipt(data, "docs_search");
      if (!data.result || !Array.isArray(data.result.results)) throw new Error("Protocol Fault: docs_search requires results evidence.");
      setSearchResults(data.result.results); logActivity("docs_search", data.receipt_id, data.timestamp, "success");
    } catch (err: any) { setError(err.message); logActivity("docs_search", undefined, undefined, "error"); }
    finally { setIsSearching(false); }
  };

  const handleChat = async (overrideMessage?: string | React.SyntheticEvent) => {
    const textToSubmit = typeof overrideMessage === "string" ? overrideMessage : chatInput.trim(); if (!textToSubmit) return;
    const newMessages = [...chatMessages, { role: "user" as const, content: textToSubmit }]; setChatMessages(newMessages); setChatInput(""); setIsChatLoading(true); setSpinUpState("analyzing");
    try {
      const response = await fetch("/api/mcp-chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(buildAssistantChatPayload({ messages: newMessages, vault: {} })) });
      const data = await readJson<AuraApiResponse<{ reply: string; actions: any[] }>>(response); assertReceipt(data, "assistant_chat");
      setChatMessages([...newMessages, { role: "assistant", content: data.result?.reply || "Done." }]); setSpinUpState("done"); logActivity("assistant_chat", data.receipt_id, data.timestamp, "success");
    } catch (err: any) { setChatMessages((prev) => [...prev, { role: "assistant", content: `[System Fault]: ${err.message}` }]); setSpinUpState("idle"); logActivity("assistant_chat", undefined, undefined, "error"); }
    finally { setIsChatLoading(false); setTimeout(() => setSpinUpState((prev) => (prev === "done" ? "idle" : prev)), 3000); }
  };

  const tabs: { id: BuildMode; label: string }[] = [{ id: "generator", label: "Build" }, { id: "governance", label: "Rules" }, { id: "sandbox", label: "Test" }, { id: "traffic", label: "Activity" }, { id: "registry", label: "My Tools" }, { id: "docs", label: "Help" }];

  return <div className="flex h-[100dvh] w-full overflow-hidden bg-black font-sans text-white antialiased"><div className="relative z-10 flex min-w-0 flex-1 flex-col overflow-hidden border-r border-white/[0.08] bg-white/[0.015] backdrop-blur-[64px]"><nav className="relative z-20 flex shrink-0 items-center justify-center pb-4 pt-8"><div className="flex rounded-full border border-white/[0.05] bg-white/[0.03] p-1.5 shadow-2xl backdrop-blur-xl">{tabs.map((tab) => { const isActive = mode === tab.id; return <button key={tab.id} onClick={() => setMode(tab.id)} className={`relative rounded-full px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.15em] ${isActive ? "text-black" : "text-white/40 hover:text-white"}`}>{isActive && <motion.div layoutId="active-nav-pill" className="absolute inset-0 z-[-1] rounded-full bg-[#F5F5F7] shadow-md" transition={AURA_SPRING} />}{tab.label}</button>; })}</div></nav><div className="relative flex-1 overflow-hidden"><AnimatePresence mode="wait">{mode === "generator" && files.length === 0 && <motion.div key="generator-empty" {...VIEW_ANIMATION} className={`absolute inset-0 overflow-y-auto px-10 md:px-16 pb-16 ${VIEW_TOP_PAD}`}><div className="mx-auto max-w-[900px] pb-12"><h1 className="mb-3 bg-gradient-to-b from-white to-white/55 bg-clip-text text-[44px] font-medium leading-[1.08] tracking-tighter text-transparent">Pick what you want. AURA builds the governed tool.</h1><p className="mb-10 max-w-2xl text-[16px] leading-7 text-white/45">Every successful action must return a receipt. No fake success states.</p><div className="grid grid-cols-1 gap-5 md:grid-cols-2">{PRESETS.map((preset) => <button key={preset.id} onClick={() => { setName(preset.id); handleChat(preset.openApiUrl ? `Forge an MCP for ${preset.provider}. Use the OpenAPI spec at ${preset.openApiUrl}.` : `Forge an MCP for ${preset.provider}. Read ${preset.docsUrl}.`); }} className="group flex min-h-[168px] flex-col justify-between rounded-[28px] border border-white/[0.04] bg-white/[0.02] p-7 text-left transition-all hover:border-white/[0.1] hover:bg-white/[0.04]"><div><h3 className="mb-2 text-[16px] font-medium text-white">{preset.title}</h3><p className="line-clamp-3 text-[14px] leading-[1.6] text-white/40">{preset.desc}</p></div><div className="mt-6 flex items-center justify-between"><span className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/30">{preset.provider}</span><span className={`rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.1em] ${preset.statusColor}`}>{preset.status}</span></div></button>)}</div><div className="mt-10 rounded-[28px] border border-white/[0.05] bg-white/[0.02] p-6"><div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_180px]"><input value={specUrl} onChange={(e) => setSpecUrl(e.target.value)} placeholder="OpenAPI URL or docs URL" className="rounded-[18px] border border-white/[0.08] bg-black/40 px-5 py-4 text-sm text-white outline-none" /><button onClick={handleGenerate} disabled={isLoading} className="rounded-[18px] bg-white px-5 py-4 text-[12px] font-bold uppercase tracking-[0.15em] text-black disabled:opacity-40">{isLoading ? "Building" : "Generate"}</button></div><textarea value={specContent} onChange={(e) => setSpecContent(e.target.value)} placeholder="Or paste OpenAPI JSON/YAML here" className="mt-4 h-32 w-full resize-none rounded-[18px] border border-white/[0.08] bg-black/40 px-5 py-4 font-mono text-sm text-white outline-none" />{error && <p className="mt-4 rounded-[16px] border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-300"><AlertTriangle className="mr-2 inline h-4 w-4" />{error}</p>}</div></div></motion.div>}{mode === "generator" && files.length > 0 && <motion.div key="generator-artifact" {...VIEW_ANIMATION} className="absolute inset-0 flex flex-col"><div className="mt-20 flex h-[80px] shrink-0 items-center justify-between border-b border-white/[0.04] bg-white/[0.01] px-10 md:mt-24"><div className="flex items-center gap-6"><Terminal className="h-6 w-6 text-white/80" /><div><h3 className="font-mono text-[16px] font-semibold text-white">aura-{name.toLowerCase()}-mcp</h3><p className="mt-1 text-xs text-white/40">{files.length} files · {auditReport.length} findings</p></div></div><div className="flex gap-3"><button onClick={handleShipToGithub} disabled={isShipping} className="rounded-full border border-white/[0.08] bg-white/[0.04] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.15em] text-white/70"><Github className="mr-2 inline h-4 w-4" />{isShipping ? "Saving" : "Push to Git"}</button><button onClick={handleDeployToCloud} disabled={isDeploying} className="rounded-full border border-white/[0.08] bg-white/[0.04] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.15em] text-white/70">{isDeploying ? "Deploying" : "Deploy"}</button><button onClick={handleDownload} className="rounded-full border border-white/[0.05] bg-white/[0.03] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.15em] text-white/60"><Download className="mr-2 inline h-4 w-4" />Download</button><button onClick={() => { setMode("sandbox"); setTimeout(handleBootSandbox, 50); }} className="rounded-full bg-white px-6 py-3 text-[11px] font-bold uppercase tracking-[0.15em] text-black"><Play className="mr-2 inline h-4 w-4 fill-current" />Test</button></div></div><div className="flex min-h-0 flex-1"><aside className="w-[300px] shrink-0 border-r border-white/[0.04] bg-white/[0.01] p-5">{files.map((file) => <button key={file.path} onClick={() => setSelectedFile(file.path)} className={`mb-2 flex w-full items-center gap-3 rounded-[16px] px-4 py-3 text-left font-mono text-[13px] ${selectedFile === file.path ? "bg-white/10 text-white" : "text-white/40 hover:bg-white/[0.04]"}`}><FileJson className="h-4 w-4" />{file.path.split("/").pop()}</button>)}</aside><main className="flex min-w-0 flex-1 flex-col bg-[#050505]"><div className="flex h-14 shrink-0 items-center justify-between border-b border-white/[0.04] px-8"><span className="font-mono text-xs text-white/30">{selectedFile}</span><span className="text-[11px] uppercase tracking-[0.18em] text-white/25">Final file</span></div><pre className="flex-1 overflow-auto p-10 font-mono text-[14px] leading-[1.8] text-white/80"><code>{selectedFileContent}</code></pre></main></div></motion.div>}{mode === "governance" && <Panel title="Safety Rules" icon={<ShieldAlert className="h-10 w-10 text-rose-400" />}><div className="space-y-5">{governanceRules.map((rule) => <div key={rule.id} className="rounded-[24px] border border-white/[0.05] bg-white/[0.02] p-6"><div className="flex items-center justify-between"><p className="font-mono text-sm text-white">{rule.name}</p><button onClick={() => setGovernanceRules(governanceRules.map((item) => item.id === rule.id ? { ...item, active: !item.active } : item))} className="rounded-full bg-white px-5 py-2 text-xs font-bold text-black">{rule.active ? "On" : "Off"}</button></div><p className="mt-4 rounded-[16px] bg-black/40 p-4 font-mono text-xs leading-6 text-white/60">if ({rule.condition}) block;</p></div>)}<div className="flex gap-3"><input value={newRuleStr} onChange={(e) => setNewRuleStr(e.target.value)} className="flex-1 rounded-[18px] border border-white/[0.08] bg-black/40 px-5 py-4 font-mono text-sm text-white" /><button onClick={() => { if (!newRuleStr.trim()) return; setGovernanceRules([...governanceRules, { id: String(Date.now()), name: "Custom rule", condition: newRuleStr, action: "DENY", active: true }]); setNewRuleStr(""); }} className="rounded-[18px] bg-white px-6 py-4 text-xs font-bold text-black">Add</button></div></div></Panel>}{mode === "sandbox" && <Panel title="Test Run" icon={<Code2 className="h-10 w-10" />}><div className="rounded-[28px] border border-white/[0.08] bg-[#050505]"><div className="flex items-center justify-between border-b border-white/[0.06] p-6"><span className="font-mono text-sm uppercase tracking-widest">Diagnostics</span><div className="flex gap-3">{execStatus === "idle" ? <button onClick={handleBootSandbox} className="rounded-full bg-white px-5 py-3 text-xs font-bold text-black"><Play className="mr-2 inline h-4 w-4" />Start</button> : <><button onClick={handleTestTools} className="rounded-full border border-white/[0.1] px-5 py-3 text-xs font-bold text-white"><Activity className="mr-2 inline h-4 w-4" />Check</button><button onClick={handleStopSandbox} className="rounded-full border border-rose-500/20 px-5 py-3 text-xs font-bold text-rose-400"><Square className="mr-2 inline h-4 w-4" />Stop</button></>}</div></div>{execStatus === "running" ? <Sandpack template="node" theme="dark" files={files.reduce((acc, file) => ({ ...acc, [`/${file.path}`]: file.content }), {})} options={{ showConsole: true, showLineNumbers: true, editorHeight: "520px" }} /> : <div ref={terminalRef} className="min-h-[360px] p-8 font-mono text-sm leading-7 text-white/60">{execLogs.length ? execLogs.map((line, index) => <div key={index} className={line.includes("Fault") ? "text-rose-400" : line.includes("Receipt") ? "text-emerald-400" : ""}>{line}</div>) : "Start the sandbox, then run diagnostics."}</div>}</div></Panel>}{mode === "traffic" && <Panel title="Activity" icon={<Activity className="h-10 w-10 text-emerald-400" />}><div className="rounded-[28px] border border-white/[0.05] bg-white/[0.02]">{trafficData.length === 0 ? <div className="py-24 text-center text-white/35">No auditable events recorded yet.</div> : trafficData.map((item) => <div key={item.id} className="grid grid-cols-12 gap-4 border-b border-white/[0.04] px-8 py-5 text-sm last:border-b-0"><span className="col-span-2 font-mono text-white/40">{item.timestamp}</span><span className="col-span-5 font-mono text-white">{item.tool}</span><span className="col-span-3 text-white/40">{item.latency}</span><span className={`col-span-2 text-right font-bold uppercase ${item.status === "success" ? "text-emerald-400" : "text-rose-400"}`}>{item.status === "success" ? "OK" : "Failed"}</span></div>)}</div></Panel>}{mode === "registry" && <Panel title="My Tools" icon={<Database className="h-10 w-10" />}><div className="grid grid-cols-1 gap-6 xl:grid-cols-2">{registry.length === 0 ? <div className="col-span-full rounded-[28px] border border-white/[0.05] py-32 text-center text-white/35">No tools saved yet.</div> : registry.map((tool) => <div key={tool.name} className="rounded-[28px] border border-white/[0.05] bg-white/[0.02] p-8"><Network className="mb-5 h-8 w-8" /><h3 className="font-mono text-lg text-white">{tool.name}</h3><p className="mt-3 text-sm leading-6 text-white/50">{tool.description}</p><p className="mt-5 rounded-[16px] bg-black/40 p-4 font-mono text-xs text-white/40">{tool.endpoint || "Sandbox only"}</p></div>)}</div></Panel>}{mode === "docs" && <Panel title="Search Help" icon={<FolderSearch className="h-10 w-10" />}><div className="rounded-[28px] border border-white/[0.05] bg-white/[0.02] p-8"><input value={docsDir} onChange={(e) => setDocsDir(e.target.value)} className="w-full rounded-[18px] border border-white/[0.08] bg-black/40 px-5 py-4 text-sm text-white" /><button onClick={handleIndexDocs} disabled={isLoading} className="mt-4 w-full rounded-[18px] bg-white px-5 py-4 text-xs font-bold uppercase tracking-widest text-black">{isLoading ? "Reading" : "Read Files"}</button>{indexStats && <p className="mt-4 rounded-[16px] border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-300">Ready: {indexStats.count} files indexed.</p>}<div className="relative mt-8"><Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" /><input value={docsQuery} onChange={(e) => setDocsQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearchDocs()} placeholder="Search docs" className="w-full rounded-[18px] border border-white/[0.08] bg-black/40 px-11 py-4 text-sm text-white" /></div><button onClick={handleSearchDocs} disabled={isSearching} className="mt-4 w-full rounded-[18px] border border-white/[0.08] px-5 py-4 text-xs font-bold uppercase tracking-widest text-white">{isSearching ? "Searching" : "Search"}</button></div>{searchResults.map((result, index) => <div key={`${result.path}-${index}`} className="mt-5 rounded-[24px] border border-white/[0.05] bg-white/[0.02] p-6"><p className="mb-3 font-mono text-xs text-white/50">{result.path}</p><p className="text-sm leading-7 text-white/65">{result.snippet}</p></div>)}</Panel>}</AnimatePresence></div></div><aside className="relative z-20 flex w-[450px] shrink-0 flex-col overflow-hidden border-l border-white/[0.08] bg-white/[0.015] backdrop-blur-[64px] xl:w-[480px]"><div className="flex shrink-0 items-center gap-6 border-b border-white/[0.04] px-10 py-8"><Bot className="h-8 w-8" /><div><div className="text-[16px] font-bold text-white">AURA Assistant</div><div className="mt-1 text-xs uppercase tracking-widest text-white/40">System Orchestrator</div></div></div><div className="flex-1 space-y-8 overflow-y-auto px-10 pb-10 pt-16"><AnimatePresence>{chatMessages.map((message, index) => <motion.div key={index} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex gap-5 ${message.role === "user" ? "flex-row-reverse" : "flex-row"}`}><div className="mt-1 shrink-0">{message.role === "assistant" ? <CheckCircle2 className="h-9 w-9 text-white/70" /> : <User className="h-9 w-9 text-white/60" />}</div><div className={`max-w-[85%] whitespace-pre-wrap px-7 py-5 text-[15px] leading-[1.8] ${message.role === "user" ? "rounded-[28px] rounded-tr-[8px] border border-white/[0.08] bg-white/[0.08] text-white" : "text-white/80"}`}>{message.content}</div></motion.div>)}{isChatLoading && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-white/40">{spinUpState === "analyzing" ? "Analyzing..." : spinUpState === "writing" ? "Writing..." : spinUpState === "deploying" ? "Deploying..." : "Working..."}</motion.div>}</AnimatePresence><div ref={chatEndRef} /></div><div className="border-t border-white/[0.04] p-8"><div className="relative"><textarea value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleChat(); } }} placeholder="Tell AURA what you need..." rows={1} className="max-h-48 w-full resize-none rounded-[32px] border border-white/[0.08] bg-black/40 py-6 pl-8 pr-[72px] text-[16px] text-white outline-none" /><button onClick={() => handleChat()} disabled={isChatLoading || !chatInput.trim()} className="absolute bottom-4 right-4 flex h-12 w-12 items-center justify-center rounded-full bg-white text-black disabled:opacity-50"><Rocket className="h-5 w-5" /></button></div><div className="mt-4 text-center font-mono text-[11px] uppercase tracking-[0.2em] text-white/30">Shift+Enter for a new line</div></div></aside></div>;
}

function Panel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return <motion.div {...VIEW_ANIMATION} className={`absolute inset-0 overflow-y-auto px-10 md:px-16 pb-16 ${VIEW_TOP_PAD}`}><div className="mx-auto max-w-6xl"><div className="mb-10 border-b border-white/[0.04] pb-8"><h2 className="mb-4 flex items-center gap-5 text-[36px] font-medium tracking-tight text-white">{icon}{title}</h2></div>{children}</div></motion.div>;
}
