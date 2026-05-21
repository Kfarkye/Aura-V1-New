import { useState, useRef, useEffect } from "react";
import {
  Terminal,
  CheckCircle2,
  Download,
  ShieldAlert,
  ShieldCheck,
  Search,
  FileText,
  AlertTriangle,
  FolderSearch,
  Bot,
  User,
  Cpu,
  Play,
  Square,
  Activity,
  Server as ServerIcon,
  Cloud,
  Network,
  Rocket,
  Database,
  Key,
  Code2,
  Globe,
  FileJson,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { useSync } from "../contexts/SyncContext";
import { Sandpack } from "@codesandbox/sandpack-react";
import {
  buildGenerateMcpPayload,
  buildDeployPreviewPayload,
  buildSandboxRunPayload,
  buildRegistryEntry,
  buildAssistantChatPayload,
} from "../lib/payloads/mcpBuilders";

interface GeneratedFile {
  path: string;
  content: string;
}

interface AuditFinding {
  endpoint: string;
  flag: string;
  level: "CRITICAL" | "HIGH" | "MEDIUM";
  mitigation: string;
}

// Apple-Grade Kinematics
const AURA_SPRING = {
  type: "spring" as const,
  stiffness: 400,
  damping: 30,
  mass: 0.8,
};

const VIEW_ANIMATION = {
  initial: { opacity: 0, y: 12, filter: "blur(8px)", scale: 0.98 },
  animate: { opacity: 1, y: 0, filter: "blur(0px)", scale: 1 },
  exit: { opacity: 0, y: -12, filter: "blur(8px)", scale: 0.98 },
  transition: AURA_SPRING,
};

const PRESETS = [
  {
    title: "Your Stripe sales, exported clean",
    desc: "Connect your Stripe account and automatically sync or query live sales data into a spreadsheet.",
    source: "Stripe API",
    status: "Requires Key",
    statusColor: "text-amber-400 border-amber-400/20",
  },
  {
    title: "Predict events and manage trades",
    desc: "Trade across real-world events and manage your Kalshi portfolio programmatically.",
    source: "Kalshi API",
    status: "Ready",
    statusColor: "text-emerald-400 border-emerald-400/20",
  },
  {
    title: "Live scores and team trends",
    desc: "Pull live sports data and historical game logs without checking the website.",
    source: "ESPN Scoreboard",
    status: "Ready",
    statusColor: "text-emerald-400 border-emerald-400/20",
  },
  {
    title: "Automate your issue triage",
    desc: "Manage repositories, pull requests, and organize team tasks effortlessly.",
    source: "GitHub API",
    status: "Requires Key",
    statusColor: "text-amber-400 border-amber-400/20",
  },
  {
    title: "Draft emails and clear your inbox",
    desc: "Analyze incoming threads and draft polite, concise responses on your behalf.",
    source: "Gmail API",
    status: "Requires Key",
    statusColor: "text-amber-400 border-amber-400/20",
  },
  {
    title: "Schedule your entire week",
    desc: "Find optimal meeting times across fragmented schedules without the back-and-forth.",
    source: "Google Calendar",
    status: "Requires Key",
    statusColor: "text-amber-400 border-amber-400/20",
  },
  {
    title: "Deploy code to the cloud",
    desc: "Trigger ephemeral deployments, manage builds, and track environment health.",
    source: "Vercel API",
    status: "Requires Key",
    statusColor: "text-amber-400 border-amber-400/20",
  },
  {
    title: "Track revenue and product analytics",
    desc: "Examine conversion funnels and user retention without writing SQL queries.",
    source: "PostHog API",
    status: "Requires Key",
    statusColor: "text-amber-400 border-amber-400/20",
  },
  {
    title: "Create interactive tickets and tasks",
    desc: "Break down large epics into manageable chunks assigned directly in your tracking software.",
    source: "Linear API",
    status: "Requires Key",
    statusColor: "text-amber-400 border-amber-400/20",
  },
  {
    title: "Fetch hyper-local weather stats",
    desc: "Pull atmospheric conditions, temperatures, and detailed precipitation forecasts.",
    source: "OpenWeather API",
    status: "Ready",
    statusColor: "text-emerald-400 border-emerald-400/20",
  },
  {
    title: "Push SMS alerts to your customers",
    desc: "Send automated updates, 2FA tokens, or campaign blasts directly to mobile devices.",
    source: "Twilio API",
    status: "Requires Key",
    statusColor: "text-amber-400 border-amber-400/20",
  },
  {
    title: "Generate dynamic branded invoices",
    desc: "Spin up accurate ledger entries and send billing links directly to clients.",
    source: "QuickBooks API",
    status: "Requires Key",
    statusColor: "text-amber-400 border-amber-400/20",
  },
  {
    title: "Scan your code for vulnerabilities",
    desc: "Analyze packages and dependencies for known exploits before they reach production.",
    source: "Snyk API",
    status: "Requires Key",
    statusColor: "text-amber-400 border-amber-400/20",
  },
  {
    title: "Draft and post content to socials",
    desc: "Queue up multi-platform campaigns and automate replies to common support queries.",
    source: "X (Twitter) API",
    status: "Requires Key",
    statusColor: "text-amber-400 border-amber-400/20",
  },
  {
    title: "Generate custom stock charts",
    desc: "Plot out intraday price action, moving averages, and detailed technical indicators.",
    source: "AlphaVantage API",
    status: "Requires Key",
    statusColor: "text-amber-400 border-amber-400/20",
  },
  {
    title: "Translate language documents instantly",
    desc: "Parse foreign PRs, emails, or knowledge bases comprehensively in seconds.",
    source: "DeepL API",
    status: "Requires Key",
    statusColor: "text-amber-400 border-amber-400/20",
  },
  {
    title: "Manage robust ad campaign spending",
    desc: "Modify bids, track aggregate impressions, and rotate out underperforming creatives.",
    source: "Google Ads API",
    status: "Requires Key",
    statusColor: "text-amber-400 border-amber-400/20",
  },
  {
    title: "Transcribe voice memos to typed text",
    desc: "Turn messy audio recordings and scattered meeting calls into clean, searchable notes.",
    source: "OpenAI Whisper",
    status: "Requires Key",
    statusColor: "text-amber-400 border-amber-400/20",
  },
  {
    title: "Pull local real estate property data",
    desc: "Analyze neighborhood comparables, rental yields, and price histories on the fly.",
    source: "Zillow API",
    status: "Requires Key",
    statusColor: "text-amber-400 border-amber-400/20",
  },
  {
    title: "Compile competitive SEO ranking reports",
    desc: "Retrieve domain authority, backlink velocity, and top-ranking keywords instantly.",
    source: "Ahrefs API",
    status: "Requires Key",
    statusColor: "text-amber-400 border-amber-400/20",
  },
  {
    title: "Play and manage YouTube Music",
    desc: "Connect your YouTube account to play songs, manage playlists, and discover new artists.",
    source: "YouTube Music",
    status: "Connect required",
    statusColor: "text-amber-400 border-amber-400/20",
  },
];

export function McpGenerator() {
  const [mode, setMode] = useState<string>("generator");
  const {
    secrets,
    setSecrets,
    chatMessages,
    setChatMessages,
    registry,
    setRegistry,
    isSyncing,
  } = useSync();

  // Vault State
  const [newSecretKey, setNewSecretKey] = useState("");

  // Live Traffic State
  const [trafficData, setTrafficData] = useState([
    {
      id: "t1",
      timestamp: new Date(Date.now() - 4000).toLocaleTimeString(),
      tool: "getMarkets",
      status: "success",
      latency: "142ms",
    },
    {
      id: "t2",
      timestamp: new Date(Date.now() - 15000).toLocaleTimeString(),
      tool: "getAccountBalance",
      status: "success",
      latency: "89ms",
    },
    {
      id: "t3",
      timestamp: new Date(Date.now() - 45000).toLocaleTimeString(),
      tool: "createOrder",
      status: "error",
      latency: "312ms",
    },
  ]);

  // Governance State
  const [governanceRules, setGovernanceRules] = useState([
    {
      id: "1",
      name: "Global Mutation Guard",
      condition:
        '["post","put","patch","delete"].includes((tool.method || "").toLowerCase()) || (tool.name || "").toLowerCase().match(/create|delete|update|submit|order|trade|cancel|transfer|withdraw|deposit/) || (tool.path || "").toLowerCase().includes("/portfolio/orders")',
      action: "DENY",
      active: true,
    },
    {
      id: "2",
      name: "Restrict PII Endpoint Access",
      condition:
        '(tool.name || "").includes("user") || (tool.name || "").includes("profile")',
      action: "DENY",
      active: false,
    },
  ]);
  const [newRuleStr, setNewRuleStr] = useState("");

  // Generator State
  const [specUrl, setSpecUrl] = useState("");
  const [specContent, setSpecContent] = useState("");
  const [name, setName] = useState("kalshi");
  const [options, setOptions] = useState({
    pruneUnsafe: true,
    addZodSchemas: true,
    governanceChecks: true,
    artifactEnvelope: true,
  });
  const [files, setFiles] = useState<GeneratedFile[]>([]);
  const [auditReport, setAuditReport] = useState<AuditFinding[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  // Global State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Docs State
  const [docsDir, setDocsDir] = useState("./");
  const [docsQuery, setDocsQuery] = useState("");
  const [indexStats, setIndexStats] = useState<{ count: number } | null>(null);
  const [searchResults, setSearchResults] = useState<
    { path: string; snippet: string }[]
  >([]);
  const [isSearching, setIsSearching] = useState(false);

  // Chat State
  const [spinUpState, setSpinUpState] = useState<
    "idle" | "analyzing" | "writing" | "deploying" | "done"
  >("idle");
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isSyncing) chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isSyncing]);

  // Execution Engine State
  const [execStatus, setExecStatus] = useState<
    "idle" | "booting" | "running" | "testing"
  >("idle");
  const [execLogs, setExecLogs] = useState<string[]>([]);
  const terminalRef = useRef<HTMLDivElement>(null);

  // Registry & Cloud Deployment State
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployedUrl, setDeployedUrl] = useState("");
  const [targetArtifact, setTargetArtifact] = useState("mcp");
  const [isShipping, setIsShipping] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [githubToken, setGithubToken] = useState("");
  const [githubTokenInput, setGithubTokenInput] = useState("");
  const [showGithubModal, setShowGithubModal] = useState(false);

  useEffect(() => {
    if (terminalRef.current)
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
  }, [execLogs]);

  // --- Handlers ---
  // Music View State
  const [musicQuery, setMusicQuery] = useState("");
  const [musicSearchLoading, setMusicSearchLoading] = useState(false);
  const [musicSearchResults, setMusicSearchResults] = useState<any[]>([]);
  const [nowPlayingTrack, setNowPlayingTrack] = useState<any>(null);
  const [isNowPlayingLoading, setIsNowPlayingLoading] = useState(false);
  const [musicPlaylists, setMusicPlaylists] = useState<any[]>([]);
  const [musicPlaylistLoading, setMusicPlaylistLoading] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [newPlaylistDesc, setNewPlaylistDesc] = useState("");
  const [selectedPlaylistId, setSelectedPlaylistId] = useState("");
  const [musicReceipt, setMusicReceipt] = useState<any>(null);
  const [musicError, setMusicError] = useState("");
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const verifyReceiptSignature = async () => {
    if (!musicReceipt) return;
    setIsVerifying(true);
    setVerificationResult(null);
    try {
      const res = await fetch("/api/music/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receipt: musicReceipt }),
      });
      const data = await res.json();
      setVerificationResult(data);
    } catch (err: any) {
      setVerificationResult({
        ok: false,
        valid: false,
        reason: err.message || "Failed to contact verification authority."
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const trackLatestReceipt = (data: any) => {
    if (data && data.ok) {
      setMusicReceipt(data);
      setVerificationResult(null); // Reset verification state when a new receipt arrives
      // Append activity to the dynamic ledger!
      setTrafficData((prev) => [
        {
          id: data.receipt_id,
          timestamp: new Date(data.timestamp).toLocaleTimeString(),
          tool: data.action,
          status: "success",
          latency: "receipt verified",
        },
        ...prev,
      ]);
    }
  };

  const loadNowPlaying = async () => {
    setIsNowPlayingLoading(true);
    try {
      const res = await fetch("/api/music/now-playing");
      const data = await res.json();
      if (data.ok) {
        setNowPlayingTrack(data.result);
        trackLatestReceipt(data);
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setIsNowPlayingLoading(false);
    }
  };

  const loadPlaylists = async () => {
    setMusicPlaylistLoading(true);
    try {
      const res = await fetch("/api/music/playlists");
      const data = await res.json();
      if (data.ok) {
        setMusicPlaylists(data.result.playlists);
        trackLatestReceipt(data);
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setMusicPlaylistLoading(false);
    }
  };

  const searchMusic = async () => {
    if (!musicQuery.trim()) return;
    setMusicSearchLoading(true);
    setMusicError("");
    try {
      const res = await fetch("/api/music/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: musicQuery, platform: "youtube" }),
      });
      const data = await res.json();
      if (data.ok) {
        setMusicSearchResults(data.result.results);
        trackLatestReceipt(data);
      } else {
        setMusicError(data.message || "Search failed.");
      }
    } catch (e: any) {
      setMusicError(e.message);
    } finally {
      setMusicSearchLoading(false);
    }
  };

  const playMusic = async (trackId: string) => {
    setMusicError("");
    try {
      const res = await fetch("/api/music/play", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ track_id: trackId, platform: "youtube" }),
      });
      const data = await res.json();
      if (data.ok) {
        setNowPlayingTrack(data.result);
        trackLatestReceipt(data);
        // Refresh now-playing
        loadNowPlaying();
      } else {
        setMusicError(data.message || "Play failed.");
      }
    } catch (e: any) {
      setMusicError(e.message);
    }
  };

  const createPlaylist = async () => {
    if (!newPlaylistName.trim()) return;
    setMusicError("");
    try {
      const res = await fetch("/api/music/playlist/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newPlaylistName, description: newPlaylistDesc }),
      });
      const data = await res.json();
      if (data.ok) {
        setNewPlaylistName("");
        setNewPlaylistDesc("");
        trackLatestReceipt(data);
        loadPlaylists();
      } else {
        setMusicError(data.message || "Create playlist failed.");
      }
    } catch (e: any) {
      setMusicError(e.message);
    }
  };

  const addToPlaylist = async (trackId: string, playlistId: string) => {
    setMusicError("");
    try {
      const res = await fetch("/api/music/playlist/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ track_id: trackId, playlist_id: playlistId }),
      });
      const data = await res.json();
      if (data.ok) {
        trackLatestReceipt(data);
        loadPlaylists();
        alert("Track successfully added to playlist with verified cryptographic receipt!");
      } else {
        setMusicError(data.message || "Add to playlist failed.");
      }
    } catch (e: any) {
      setMusicError(e.message);
    }
  };

  const controlPlayback = async (command: string) => {
    setMusicError("");
    try {
      const res = await fetch("/api/music/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command }),
      });
      const data = await res.json();
      if (data.ok) {
        trackLatestReceipt(data);
        loadNowPlaying();
      } else {
        setMusicError(data.message || "Control command failed.");
      }
    } catch (e: any) {
      setMusicError(e.message);
    }
  };

  const handleConnectYouTube = async () => {
    try {
      const response = await fetch('/api/music/auth/url');
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to construct authorization request. Please check whether client keys are registered in the Vault (.env.example).');
      }
      const { url } = await response.json();
      const popup = window.open(url, 'youtube_handshake', 'width=600,height=700');
      if (!popup) {
        alert("Please permit browser popups to complete secure authentications.");
      }
    } catch (err: any) {
      setMusicError(err.message);
    }
  };

  useEffect(() => {
    const handleOauthMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost') && !origin.includes('127.0.0.1')) {
        return;
      }
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        loadNowPlaying();
        loadPlaylists();
        alert("Active trust session established on YouTube Music! Audio visualization and playback stream state registered.");
      }
    };
    window.addEventListener('message', handleOauthMessage);
    return () => window.removeEventListener('message', handleOauthMessage);
  }, []);

  useEffect(() => {
    if (mode === "music") {
      loadNowPlaying();
      loadPlaylists();
    }
  }, [mode]);

  const handleDownload = async () => {
    try {
      const zip = new JSZip();
      files.forEach((file) => zip.file(file.path, file.content));
      const archive = await zip.generateAsync({ type: "blob" });
      saveAs(archive, `aura-mcp-${name}.zip`);
    } catch (err: any) {
      setError("Failed to zip package: " + err.message);
    }
  };

  const handleBootSandbox = () => {
    setExecStatus("running");
  };

  const handleTestTools = async () => {
    setExecStatus("testing");
    const testSequence = [
      `[AURA Client] -> {"jsonrpc":"2.0","method":"tools/list","id":1}`,
      `[MCP Server]  <- {"jsonrpc":"2.0","id":1,"result":{"tools":[{"name":"getMarkets","description":"Get active markets"}]}}`,
      `[AURA] Verification passing. Tool execution pipeline is stable.`,
    ];
    for (let i = 0; i < testSequence.length; i++) {
      await new Promise((r) => setTimeout(r, 800));
      setExecLogs((prev) => [...prev, testSequence[i]]);
    }
    setExecStatus("running");
  };

  const handleStopSandbox = () => {
    setExecStatus("idle");
    setExecLogs([]);
  };

  const handlePublishToRegistry = () => {
    if (!name) return;
    const exists = registry.find((r) => r.name === name);
    if (!exists) {
      const entry = buildRegistryEntry({
        name,
        description: `Autogenerated MCP Server for ${name}`,
        status: "Active (Sandbox)",
        endpoint: "",
        deployment_mode: "sandpack_preview",
        runtime: "node",
      });
      setRegistry([...registry, entry]);
    }
  };

  const handleDeployToCloud = async () => {
    setIsDeploying(true);
    setDeployedUrl("");
    let newDeployUrl = "";
    try {
      const deployPayload = buildDeployPreviewPayload({
        targetName: name,
        targetRuntime: targetArtifact,
        governanceRules,
        options,
      });
      const res = await fetch("/api/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(deployPayload),
      });
      if (res.ok) {
        const deployData = await res.json();
        newDeployUrl = deployData.endpoint_url || "";
        if (newDeployUrl) setDeployedUrl(newDeployUrl);
      }
    } catch (e) {
      console.error(e);
    }
    setIsDeploying(false);

    if (newDeployUrl) {
      const existing = registry.find((r) => r.name === name);
      if (existing) {
        setRegistry(
          registry.map((r) =>
            r.name === name
              ? {
                  ...r,
                  status: "Active (Cloud)",
                  endpoint: newDeployUrl,
                  deployment_mode: "cloud",
                  runtime: "node",
                }
              : r,
          ),
        );
      } else {
        const entry = buildRegistryEntry({
          name,
          description: `Autogenerated MCP Server for ${name}`,
          status: "Active (Cloud)",
          endpoint: newDeployUrl,
          deployment_mode: "cloud",
          runtime: "node",
        });
        setRegistry([...registry, entry]);
      }
    }
  };

  const handleSaveSecret = (id: string) => {
    setSecrets(secrets.map((s) => (s.id === id ? { ...s, isSet: true } : s)));
  };

  const handleAddSecret = () => {
    if (newSecretKey.trim()) {
      setSecrets([
        ...secrets,
        {
          id: Math.random().toString(),
          key: newSecretKey.toUpperCase(),
          value: "",
          isSet: false,
        },
      ]);
      setNewSecretKey("");
    }
  };

  const handleAddRule = () => {
    if (newRuleStr.trim()) {
      setGovernanceRules([
        ...governanceRules,
        {
          id: Math.random().toString(),
          name: "Custom Policy Rule",
          condition: newRuleStr,
          action: "DENY",
          active: true,
        },
      ]);
      setNewRuleStr("");
    }
  };

  const handleShipToGithub = async () => {
    if (!githubToken) {
      setGithubTokenInput("");
      setShowGithubModal(true);
      return;
    }
    setIsShipping(true);
    await new Promise((r) => setTimeout(r, 2000));
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 4000);
    setIsShipping(false);
  };

  const handleConnectGithub = async () => {
    const t = githubTokenInput.trim();
    if (!t) return;
    setGithubToken(t);
    setShowGithubModal(false);
    setGithubTokenInput("");
    setIsShipping(true);
    await new Promise((r) => setTimeout(r, 2000));
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 4000);
    setIsShipping(false);
  };

  const handleGenerate = async () => {
    setIsLoading(true);
    setError("");
    try {
      const payload = buildGenerateMcpPayload({
        specUrl: specUrl.trim() || undefined,
        specContent: specContent.trim() || undefined,
        name,
        options,
        governanceRules,
        targetArtifact,
      });
      const res = await fetch("/api/generate-mcp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Failed to generate MCP server");
      setFiles(data.files || []);
      setAuditReport(data.auditReport || []);
      setSelectedFile(data.files[0]?.path);
      setMode("generator");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleIndexDocs = async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/docs/index", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ directory: docsDir.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setIndexStats({ count: data.count });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchDocs = async () => {
    if (!docsQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch("/api/docs/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: docsQuery.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSearchResults(data.results || []);
    } catch (err: any) {
    } finally {
      setIsSearching(false);
    }
  };

  const handleAssistantAction = async (action: any) => {
    if (action.type === "INDEX_URL") {
      setIndexStats((prev) => ({ count: (prev?.count || 0) + 1 }));
      setSpinUpState("done");
    } else if (action.type === "GENERATE_MCP") {
      setSpinUpState("writing");
      setSpecUrl(action.payload.url);
      setName(action.payload.server_name);

      try {
        const payload = buildGenerateMcpPayload({
          specUrl: action.payload.url,
          name: action.payload.server_name,
          options,
        });
        const genRes = await fetch("/api/generate-mcp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const genData = await genRes.json();
        if (genRes.ok) {
          setFiles(genData.files || []);
          setAuditReport(genData.auditReport || []);
          setSelectedFile(genData.files[0]?.path);
          setSpinUpState("deploying");

          setIsDeploying(true);
          let newDeployUrl = "";
          try {
            const deployPayload = buildDeployPreviewPayload({
              targetName: action.payload.server_name,
              targetRuntime: action.payload.target_artifact || targetArtifact,
              governanceRules,
              options,
              environment: "preview",
              files: [],
              summary: "AURA Cloud Deploy",
            });
            const deployRes = await fetch("/api/deploy-preview", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(deployPayload),
            });
            if (deployRes.ok) {
              const deployData = await deployRes.json();
              newDeployUrl = deployData.endpoint_url || "";
              if (newDeployUrl) setDeployedUrl(newDeployUrl);
            }
          } catch (e) {
            console.error(e);
          }
          setIsDeploying(false);

          setRegistry((prev) => {
            if (!prev.find((r) => r.name === action.payload.server_name)) {
              const entry = buildRegistryEntry({
                name: action.payload.server_name,
                description: `Autogenerated MCP Server for ${action.payload.server_name}`,
                status: "Active (Production)",
                endpoint: newDeployUrl,
                deployment_mode: "cloud",
                runtime:
                  action.payload.target_artifact || targetArtifact || "node",
              });
              return [...prev, entry];
            }
            return prev;
          });

          setIsShipping(true);
          await new Promise((r) => setTimeout(r, 1500));
          setIsShipping(false);

          setSpinUpState("done");
          setTimeout(() => setMode("generator"), 1500);
        } else {
          throw new Error(genData.error || "Failed to generate MCP server");
        }
      } catch (e: any) {
        setError("Auto generation failed: " + e.message);
        setSpinUpState("idle");
      }
    }
  };

  const handleChat = async (
    overrideMessage?: string | React.SyntheticEvent,
  ) => {
    const textToSubmit =
      typeof overrideMessage === "string" ? overrideMessage : chatInput.trim();
    if (!textToSubmit) return;
    const newMessages = [
      ...chatMessages,
      { role: "user" as const, content: textToSubmit },
    ];
    setChatMessages(newMessages);
    setChatInput("");
    setIsChatLoading(true);
    setSpinUpState("analyzing");

    try {
      const vaultData = secrets.reduce(
        (acc, s) => ({ ...acc, [s.key]: s.value }),
        {},
      );
      const chatPayload = buildAssistantChatPayload({
        messages: newMessages,
        vault: vaultData,
      });

      const res = await fetch("/api/mcp-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(chatPayload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setChatMessages([
        ...newMessages,
        { role: "assistant", content: data.reply },
      ]);

      if (data.actions && data.actions.length > 0) {
        for (const action of data.actions) {
          await handleAssistantAction(action);
        }
      } else {
        setSpinUpState("done");
      }
    } catch (err: any) {
      setChatMessages((orig) => [
        ...orig,
        { role: "assistant", content: `[Error: ${err.message}]` },
      ]);
      setSpinUpState("idle");
    } finally {
      setIsChatLoading(false);
      setTimeout(() => {
        setSpinUpState((prev) => (prev === "done" ? "idle" : prev));
      }, 3000);
    }
  };

  const TABS = [
    { id: "generator", label: "Dev" },
    { id: "music", label: "Music" },
    { id: "governance", label: "Gov" },
    { id: "sandbox", label: "Sandbox" },
    { id: "vault", label: "Vault" },
    { id: "traffic", label: "Traffic" },
    { id: "registry", label: "Registry" },
    { id: "docs", label: "Docs" },
  ];

  return (
    <div className="flex w-full h-full overflow-hidden bg-transparent font-sans text-white selection:bg-white/20 antialiased">
      {/* ====== BACKGROUND MESH ====== */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/5 via-transparent to-transparent blur-[120px]" />
      </div>

      {/* ====== LEFT PANE: Main Toolchain Workspace ====== */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10 bg-transparent overflow-hidden isolate">
        {/* Dynamic Island Navigation */}
        <div className="flex items-center justify-center pt-6 pb-2 shrink-0 z-20 relative">
          <div className="flex bg-white/[0.03] p-1.5 rounded-full border border-white/[0.05] backdrop-blur-xl shadow-2xl">
            {TABS.map((tab) => {
              const isActive = mode === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setMode(tab.id)}
                  className={`relative px-5 py-2.5 text-[11px] font-bold rounded-full uppercase tracking-[0.15em] transition-colors duration-300 outline-none ${isActive ? "text-black" : "text-white/40 hover:text-white"}`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="active-nav-pill"
                      className="absolute inset-0 bg-[#F5F5F7] rounded-full shadow-md z-[-1]"
                      transition={AURA_SPRING}
                    />
                  )}
                  <span className="relative z-10">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area with Framer Motion AnimatePresence */}
        <div className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait">
            {/* ====== MCP GENERATOR : EMPTY STATE (PRESET LIBRARY) ====== */}
            {mode === "generator" && files.length === 0 && (
              <motion.div
                key="generator-empty"
                {...VIEW_ANIMATION}
                className="absolute inset-0 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full"
              >
                <div className="min-h-full w-full px-8 md:px-12 py-12 md:py-16 relative">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/[0.02] blur-[120px] rounded-full pointer-events-none z-0" />

                  <div className="max-w-[800px] mx-auto relative z-10 w-full pb-12">
                    <div className="text-left mb-12">
                      <h1 className="text-[28px] sm:text-[36px] font-medium tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60 mb-2 leading-[1.2]">
                        Connect a service and AURA builds the tool that pulls
                        your data — in seconds, no code.
                      </h1>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {PRESETS.map((preset, i) => (
                        <button
                          key={preset.title}
                          onClick={() =>
                            handleChat(
                              `Forge an MCP for the ${preset.source} to ${preset.title.toLowerCase()}`,
                            )
                          }
                          className="text-left bg-white/[0.02] border border-white/[0.04] p-6 rounded-[24px] hover:bg-white/[0.04] hover:border-white/[0.1] transition-all cursor-pointer backdrop-blur-3xl group flex flex-col justify-between min-h-[170px] shadow-[0_4px_24px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.2)]"
                        >
                          <div className="mb-6">
                            <h3 className="text-white font-medium text-[15px] leading-[1.4] mb-2 group-hover:text-white transition-colors">
                              {preset.title}
                            </h3>
                            <p className="text-white/40 font-light text-[13px] leading-[1.6] line-clamp-3">
                              {preset.desc}
                            </p>
                          </div>
                          <div className="flex items-center justify-between w-full mt-auto">
                            <span className="text-[11px] font-bold text-white/30 uppercase tracking-[0.15em] shrink-0">
                              {preset.source}
                            </span>
                            <span
                              className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border tracking-[0.1em] shrink-0 bg-white/[0.02] ${preset.statusColor}`}
                            >
                              {preset.status}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>

                    <div className="mt-12 text-center w-full">
                      <p className="text-[14px] text-white/30 font-medium tracking-wide">
                        Or describe your own intent in the chat on the right.
                      </p>
                    </div>

                    {error && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="p-5 rounded-[24px] bg-rose-500/10 text-rose-400 border border-rose-500/20 mt-6 text-[14px] flex items-start gap-4 backdrop-blur-xl"
                      >
                        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-rose-500" />
                        <div className="leading-relaxed font-medium">
                          {error}
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ====== MCP GENERATOR : ARTIFACT VIEWER ====== */}
            {mode === "generator" && files.length > 0 && (
              <motion.div
                key="generator-artifact"
                {...VIEW_ANIMATION}
                className="absolute inset-0 flex flex-col h-full bg-transparent"
              >
                {/* Context Bar */}
                <div className="h-[80px] shrink-0 border-b border-white/[0.04] bg-white/[0.01] px-8 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-[18px] bg-white/[0.03] border border-white/[0.05] flex items-center justify-center shadow-inner">
                      <Terminal className="w-5 h-5 text-white/80" />
                    </div>
                    <div>
                      <h3 className="text-[15px] font-semibold text-white tracking-tight font-mono">
                        aura-{name.toLowerCase() || "package"}-mcp
                      </h3>
                      <div className="flex items-center gap-2.5 mt-1.5">
                        <span className="text-[9px] uppercase font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-md tracking-widest border border-emerald-400/20">
                          Guarded Read-Only
                        </span>
                        <span className="text-[11px] text-white/40 font-medium tracking-wide">
                          AST Compiled
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setMode("sandbox");
                        setTimeout(() => handleBootSandbox(), 100);
                      }}
                      className="flex items-center gap-2 text-[11px] font-bold text-black bg-white hover:bg-white/90 transition-all active:scale-95 px-6 py-3 rounded-full uppercase tracking-[0.15em] shadow-lg"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" /> Deploy
                      Engine
                    </button>
                    <button
                      onClick={handleDownload}
                      className="flex items-center gap-2 text-[11px] font-bold text-white/60 hover:text-white transition-all px-5 py-3 bg-white/[0.03] hover:bg-white/[0.06] rounded-full uppercase tracking-[0.15em] cursor-pointer border border-white/[0.05] hover:border-white/10 active:scale-95"
                    >
                      <Download className="w-3.5 h-3.5" /> Source
                    </button>
                    <button
                      onClick={handleShipToGithub}
                      disabled={isShipping}
                      className="flex items-center gap-2 text-[11px] font-bold text-white bg-[#24292e] hover:bg-[#2f363d] transition-all px-5 py-3 rounded-full uppercase tracking-[0.15em] cursor-pointer border border-white/10 shadow-lg disabled:opacity-50"
                    >
                      <Code2 className="w-3.5 h-3.5" />{" "}
                      {isShipping ? "Shipping..." : "Ship to GitHub"}
                    </button>
                  </div>
                </div>

                <div className="flex-1 flex min-h-0">
                  {/* File Tree */}
                  <div className="w-[280px] shrink-0 border-r border-white/[0.04] bg-white/[0.01] flex flex-col backdrop-blur-md">
                    <div className="px-5 py-5 border-b border-white/[0.04]">
                      <span className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] block">
                        Directory
                      </span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full">
                      {files.map((file) => (
                        <button
                          key={file.path}
                          onClick={() => setSelectedFile(file.path)}
                          className={`w-full text-left px-4 py-3 rounded-[16px] text-[13px] font-mono flex items-center gap-3 transition-all ${selectedFile === file.path ? "bg-white/10 text-white font-medium shadow-sm" : "text-white/40 hover:bg-white/[0.04] hover:text-white"}`}
                        >
                          <FileJson
                            className={`w-4 h-4 shrink-0 ${selectedFile === file.path ? "opacity-100 text-white" : "opacity-40"}`}
                          />
                          <span className="truncate tracking-wide">
                            {file.path.split("/").pop()}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Editor */}
                  <div className="flex-1 flex flex-col bg-[#050505] min-w-0 shadow-[inset_0_0_60px_rgba(0,0,0,0.5)]">
                    <div className="h-12 border-b border-white/[0.04] px-6 flex items-center shrink-0 justify-between">
                      <span className="font-mono text-[11px] text-white/30 tracking-wider">
                        {files.find((f) => f.path === selectedFile)?.path ||
                          "No file selected"}
                      </span>
                    </div>
                    <div className="flex-1 overflow-auto p-8 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full">
                      <pre className="font-mono text-[14px] text-white/80 leading-[1.8] tracking-tight">
                        <code>
                          {files.find((f) => f.path === selectedFile)
                            ?.content || ""}
                        </code>
                      </pre>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ====== MUSIC VIEW ====== */}
            {mode === "music" && (
              <motion.div
                key="music"
                {...VIEW_ANIMATION}
                className="absolute inset-x-0 bottom-0 top-[80px] overflow-y-auto px-12 py-12 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full"
              >
                <div className="max-w-6xl mx-auto space-y-10 mt-4">
                  {/* Header Title */}
                  <div className="mb-10 border-b border-white/[0.06] pb-8 flex items-center justify-between">
                    <div>
                      <h2 className="text-[32px] font-medium tracking-tight text-white mb-2 flex items-center gap-3">
                        <Network className="w-8 h-8 text-white/80 animate-pulse" /> Aura Music Layer
                      </h2>
                      <p className="font-sans text-[16px] font-light text-white/50">
                        Extensible, governed, and fully auditable music control plane.
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={handleConnectYouTube}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black text-[11px] font-bold tracking-widest uppercase transition-all duration-300 shadow-[0_4px_20px_rgba(16,185,129,0.25)] active:scale-95 cursor-pointer"
                      >
                        <Network className="w-4 h-4 fill-current" /> Connect YouTube
                      </button>
                      {nowPlayingTrack?.is_playing && (
                        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[11px] font-bold tracking-widest uppercase">
                          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                          Aura Virtual Output Active
                        </div>
                      )}
                    </div>
                  </div>

                  {musicError && (
                    <div className="p-5 rounded-[24px] bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[14px]">
                      {musicError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* LEFT CONTAINER: NOW PLAYING */}
                    <div className="bg-white/[0.02] border border-white/[0.06] rounded-[36px] p-8 shadow-2xl backdrop-blur-3xl flex flex-col justify-between min-h-[350px]">
                      <div>
                        <span className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] block mb-6">
                          Now Playing Control Pane
                        </span>

                        {isNowPlayingLoading ? (
                          <div className="py-12 text-center text-white/30 animate-pulse">Scanning telemetrics...</div>
                        ) : nowPlayingTrack ? (
                          <div className="flex items-center gap-6">
                            {nowPlayingTrack.cover_url ? (
                              <img src={nowPlayingTrack.cover_url} alt="Cover" className="w-24 h-24 rounded-[24px] shadow-2xl object-cover border border-white/10" />
                            ) : (
                              <div className="w-24 h-24 rounded-[24px] bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                                <Cpu className="w-8 h-8 text-white/40" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <h3 className="text-[20px] font-bold text-white truncate">{nowPlayingTrack.title}</h3>
                              <p className="text-[15px] font-medium text-white/50 truncate mt-1">{nowPlayingTrack.artist}</p>
                              {nowPlayingTrack.album && (
                                <p className="text-[13px] text-white/30 truncate mt-0.5 font-mono">{nowPlayingTrack.album}</p>
                              )}
                              
                              {/* Progress bar simulation */}
                              <div className="mt-4">
                                <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                                  <div 
                                    className="bg-white h-full rounded-full transition-all duration-1000" 
                                    style={{ width: `${Math.min(100, (nowPlayingTrack.progress_ms / nowPlayingTrack.duration_ms) * 100)}%` }}
                                  />
                                </div>
                                <div className="flex justify-between mt-1.5 text-[11px] font-mono text-white/40">
                                  <span>{Math.floor(nowPlayingTrack.progress_ms / 60000)}:{(Math.floor((nowPlayingTrack.progress_ms % 60000) / 1000)).toString().padStart(2, '0')}</span>
                                  <span>{Math.floor(nowPlayingTrack.duration_ms / 60000)}:{(Math.floor((nowPlayingTrack.duration_ms % 60000) / 1000)).toString().padStart(2, '0')}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="py-12 text-center text-white/30 font-light text-[15px]">Aura playback idle. Ready to stream.</div>
                        )}
                      </div>

                      {/* Controls */}
                      <div className="mt-8 pt-6 border-t border-white/[0.04] flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => controlPlayback(nowPlayingTrack?.is_playing ? "pause" : "play")}
                            className="w-12 h-12 rounded-full bg-white text-black hover:scale-105 active:scale-95 transition-all flex items-center justify-center shadow-lg disabled:opacity-50"
                          >
                            {nowPlayingTrack?.is_playing ? <Square className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                          </button>
                          <button 
                            onClick={() => controlPlayback("skip")}
                            disabled={!nowPlayingTrack}
                            className="px-5 h-12 rounded-full bg-white/[0.04] border border-white/[0.06] text-white/80 hover:text-white hover:bg-white/[0.08] active:scale-95 transition-all flex items-center justify-center text-[12px] font-bold tracking-widest uppercase disabled:opacity-40"
                          >
                            Skip Track
                          </button>
                        </div>
                        <div className="flex items-center gap-4 text-white/30 text-[11px] font-mono">
                          <span>Volume: 50%</span>
                        </div>
                      </div>
                    </div>

                    {/* RIGHT CONTAINER: PLAYLISTS CARDS */}
                    <div className="bg-white/[0.02] border border-white/[0.06] rounded-[36px] p-8 shadow-2xl backdrop-blur-3xl flex flex-col justify-between min-h-[350px]">
                      <div>
                        <span className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] block mb-6">
                          Live Playlist Ledger
                        </span>

                        {musicPlaylistLoading ? (
                          <div className="py-12 text-center text-white/30 animate-pulse">Reading playlists database...</div>
                        ) : musicPlaylists.length === 0 ? (
                          <div className="py-12 text-center text-white/30 font-light text-[15px]">No playlists created. Make one below!</div>
                        ) : (
                          <div className="space-y-4 max-h-[160px] overflow-y-auto pr-2 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-white/10">
                            {musicPlaylists.map((plist: any) => (
                              <div key={plist.playlist_id} className="flex justify-between items-center bg-black/30 p-4 rounded-[20px] border border-white/[0.04] hover:bg-white/[0.03] transition-colors">
                                <div className="min-w-0 pr-4">
                                  <span className="font-bold text-[14px] text-white block truncate">{plist.playlist_name}</span>
                                  <span className="font-sans text-[12px] text-white/40 truncate">{plist.description || "No description"}</span>
                                </div>
                                <span className="shrink-0 text-[11px] font-mono font-bold text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full border border-emerald-400/20">
                                  {plist.track_count} tracks
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Create playlist Form */}
                      <div className="mt-6 pt-6 border-t border-white/[0.04] space-y-4">
                        <div className="flex gap-3">
                          <input 
                            type="text"
                            value={newPlaylistName}
                            onChange={(e) => setNewPlaylistName(e.target.value)}
                            placeholder="e.g. Chill Beats"
                            className="flex-1 bg-black/40 border border-white/[0.06] text-white rounded-[18px] px-5 py-3 text-[14px] focus:outline-none focus:border-white/20"
                          />
                          <button 
                            onClick={createPlaylist}
                            disabled={!newPlaylistName.trim()}
                            className="bg-white hover:bg-white/90 text-black px-6 py-3 rounded-[18px] text-[12px] font-bold uppercase tracking-widest transition-all active:scale-95 disabled:opacity-40"
                          >
                            Create
                          </button>
                        </div>
                        <input 
                          type="text"
                          value={newPlaylistDesc}
                          onChange={(e) => setNewPlaylistDesc(e.target.value)}
                          placeholder="Optional description"
                          className="w-full bg-black/40 border border-white/[0.06] text-white rounded-[18px] px-5 py-3 text-[14px] focus:outline-none focus:border-white/20"
                        />
                      </div>
                    </div>
                  </div>

                  {/* SEARCH BLOCK */}
                  <div className="bg-white/[0.02] border border-white/[0.06] rounded-[36px] p-8 shadow-2xl backdrop-blur-3xl">
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] block mb-6">
                      Search & Queue Grounded Music
                    </span>

                    <div className="flex gap-4 mb-8">
                      <input 
                        type="text"
                        value={musicQuery}
                        onChange={(e) => setMusicQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && searchMusic()}
                        placeholder="Search songs, artists, playlists..."
                        className="flex-1 bg-black/40 border border-white/[0.08] text-white placeholder-white/20 focus:bg-white/[0.04] focus:border-white/20 focus:outline-none rounded-[24px] px-6 py-4 text-[15px] transition-all"
                      />
                      <button 
                        onClick={searchMusic}
                        disabled={musicSearchLoading || !musicQuery.trim()}
                        className="bg-white hover:bg-white/90 text-black px-8 py-4 rounded-[24px] text-[13px] font-bold uppercase tracking-widest transition-all active:scale-95 disabled:opacity-40"
                      >
                        {musicSearchLoading ? "Searching..." : "Search"}
                      </button>
                    </div>

                    {musicSearchResults.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {musicSearchResults.map((track) => (
                          <div key={track.track_id} className="bg-black/30 p-5 rounded-[24px] border border-white/[0.04] hover:border-white/10 transition-all flex flex-col justify-between">
                            <div className="flex gap-4 mb-4">
                              {track.cover_url && (
                                <img src={track.cover_url} alt="Cover" className="w-14 h-14 rounded-[12px] object-cover shrink-0 border border-white/5" />
                              )}
                              <div className="min-w-0">
                                <span className="font-bold text-[14px] text-white tracking-tight block truncate">{track.title}</span>
                                <span className="text-[12px] text-white/50 block truncate">{track.artist}</span>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button 
                                onClick={() => playMusic(track.track_id)}
                                className="flex-1 bg-white hover:bg-white/90 text-black py-2.5 rounded-[12px] text-[11px] font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-1.5"
                              >
                                <Play className="w-3.5 h-3.5 fill-current" /> Play
                              </button>
                              <select 
                                onChange={(e) => {
                                  if (e.target.value) {
                                    addToPlaylist(track.track_id, e.target.value);
                                    e.target.value = ""; // Reset value
                                  }
                                }}
                                className="bg-white/[0.05] hover:bg-white/[0.08] text-white border border-white/[0.08] px-3 py-2 rounded-[12px] text-[11px] font-bold uppercase tracking-wide focus:outline-none"
                              >
                                <option value="" className="bg-black">Add To...</option>
                                {musicPlaylists.map(p => (
                                  <option key={p.playlist_id} value={p.playlist_id} className="bg-black">{p.playlist_name}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* BOTTOM SECTION: REALTIME AUDITABLE EVIDENCE LEDGER */}
                  {musicReceipt && (
                    <div className="bg-black/60 border border-white/[0.1] rounded-[36px] p-8 shadow-2xl relative overflow-hidden backdrop-blur-3xl">
                      <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                        <Code2 className="w-32 h-32 stroke-[1]" />
                      </div>
                      
                      <div className="flex items-center gap-3.5 mb-6">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.8)] animate-pulse" />
                        <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-emerald-400">
                          Active Trust Gate: Cryptographic Action Receipt Verified
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 text-[13px] font-mono">
                        <div className="bg-white/[0.02] border border-white/[0.04] p-4 rounded-[20px]">
                          <span className="text-white/40 block text-[11px] uppercase tracking-wider mb-1">Receipt ID</span>
                          <span className="text-white font-bold block truncate">{musicReceipt.receipt_id}</span>
                        </div>
                        <div className="bg-white/[0.02] border border-white/[0.04] p-4 rounded-[20px]">
                          <span className="text-white/40 block text-[11px] uppercase tracking-wider mb-1">Canonical Action</span>
                          <span className="text-emerald-400 font-bold block truncate">{musicReceipt.action}</span>
                        </div>
                        <div className="bg-white/[0.02] border border-white/[0.04] p-4 rounded-[20px]">
                          <span className="text-white/40 block text-[11px] uppercase tracking-wider mb-1">UTC Timestamp</span>
                          <span className="text-white/80 block truncate">{musicReceipt.timestamp}</span>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <span className="text-[11px] font-bold text-white/40 uppercase tracking-[0.2em] block">
                          Cryptographic Result Payload
                        </span>
                        <div className="bg-[#050505] rounded-[24px] p-6 border border-white/[0.05] overflow-auto select-all max-h-[180px] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-white/10">
                          <pre className="font-mono text-[13px] text-white/80 leading-relaxed tracking-tight">
                            <code>{JSON.stringify(musicReceipt, null, 2)}</code>
                          </pre>
                        </div>
                      </div>

                      {/* INTERACTIVE CRYPTOGRAPHIC VERIFICATION PANEL */}
                      <div className="mt-8 pt-8 border-t border-white/[0.08] space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="space-y-1">
                            <h4 className="text-white text-sm font-semibold tracking-wide">JWS Audit Assurance</h4>
                            <p className="text-white/50 text-[11px] leading-normal max-w-md">
                              Prove authenticity of this receipt by verifying the server-side JWS signature claims.
                            </p>
                          </div>
                          <button
                            onClick={verifyReceiptSignature}
                            disabled={isVerifying}
                            className={`px-5 py-2.5 rounded-full text-[11px] font-bold tracking-widest uppercase transition-all duration-300 flex items-center gap-2 cursor-pointer select-none active:scale-95 ${
                              isVerifying 
                                ? "bg-white/10 text-white/50 cursor-not-allowed" 
                                : "bg-white text-black hover:bg-white/95 shadow-[0_4px_20px_rgba(255,255,255,0.15)]"
                            }`}
                          >
                            {isVerifying ? (
                              <>
                                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Auditing...
                              </>
                            ) : (
                              <>
                                <Key className="w-4 h-4" />
                                Verify Signature
                              </>
                            )}
                          </button>
                        </div>

                        {verificationResult && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`rounded-2xl p-5 border text-[13px] leading-relaxed transition-all ${
                              verificationResult.valid
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              {verificationResult.valid ? (
                                <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5 text-emerald-400" />
                              ) : (
                                <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
                              )}
                              <div className="space-y-1 flex-1">
                                <span className="font-bold text-sm block tracking-wide">
                                  {verificationResult.valid ? "Cryptographic Signature Verified" : "Verification Rejected"}
                                </span>
                                <p className="text-white/80 text-[12px] leading-normal mt-1">
                                  {verificationResult.valid
                                    ? "Success! The JWS signature matches the claims perfectly. The content of this receipt has been signed and proven authentic by AURA authority. No fields have been altered."
                                    : `Authenticity compromised. Reason: ${verificationResult.reason || "Invalid signature or manipulated fields."}`}
                                </p>
                                
                                {verificationResult.valid && verificationResult.decoded && (
                                  <div className="mt-4 pt-4 border-t border-emerald-500/10 grid grid-cols-2 gap-4 text-[11px] font-mono text-white/80">
                                    <div>
                                      <span className="text-emerald-500/60 block uppercase mb-0.5">Algorithm</span>
                                      <span className="font-semibold block">{musicReceipt.receipt_id.startsWith("ey") ? "HS256" : "Asymmetric"}</span>
                                    </div>
                                    <div>
                                      <span className="text-emerald-500/60 block uppercase mb-0.5">Signed Claims Match</span>
                                      <span className="font-semibold text-emerald-400 block">100% Intact</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ====== DOCS VIEW ====== */}
            {mode === "docs" && (
              <motion.div
                key="docs"
                {...VIEW_ANIMATION}
                className="absolute inset-0 overflow-y-auto px-12 py-12 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full"
              >
                <div className="max-w-2xl mx-auto space-y-8 mt-4">
                  <div className="mb-10 border-b border-white/[0.06] pb-8">
                    <h2 className="text-[32px] font-medium tracking-tight text-white mb-3 flex items-center gap-3">
                      <FolderSearch className="w-8 h-8 text-white/80" /> Doc
                      Retrieval
                    </h2>
                    <p className="font-sans text-[16px] font-light text-white/50">
                      Query the real-time indexed knowledge base for
                      documentation and code context.
                    </p>
                  </div>

                  <div className="space-y-6 bg-white/[0.02] border border-white/[0.06] rounded-[32px] p-10 shadow-2xl backdrop-blur-3xl">
                    <div>
                      <label className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] block mb-3">
                        Local Directory Path
                      </label>
                      <input
                        type="text"
                        value={docsDir}
                        onChange={(e) => setDocsDir(e.target.value)}
                        className="w-full bg-black/20 border border-white/[0.08] text-white placeholder-white/20 focus:bg-white/[0.04] focus:border-white/20 focus:outline-none rounded-[20px] p-5 text-[15px] transition-all shadow-inner"
                        placeholder="./docs"
                      />
                      <button
                        onClick={handleIndexDocs}
                        disabled={isLoading}
                        className="mt-5 w-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white py-4 rounded-[20px] text-[13px] font-bold tracking-widest uppercase transition-all active:scale-[0.98] disabled:opacity-50"
                      >
                        {isLoading ? "Indexing..." : "Build Index"}
                      </button>
                    </div>

                    {indexStats && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-5 bg-emerald-500/10 border border-emerald-500/20 rounded-[20px] flex justify-between items-center relative overflow-hidden"
                      >
                        <span className="text-[11px] font-bold uppercase text-emerald-400 tracking-widest flex items-center gap-3">
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                          Live Index Active
                        </span>
                        <span className="font-mono text-[14px] text-emerald-400 font-bold">
                          {indexStats.count} files
                        </span>
                      </motion.div>
                    )}

                    <div className="border-t border-white/[0.06] pt-8 mt-4">
                      <label className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] block mb-3">
                        Search Pattern
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                          <Search className="h-5 w-5 text-white/40" />
                        </div>
                        <input
                          type="text"
                          value={docsQuery}
                          onChange={(e) => setDocsQuery(e.target.value)}
                          onKeyDown={(e) =>
                            e.key === "Enter" && handleSearchDocs()
                          }
                          className="w-full bg-black/20 border border-white/[0.08] text-white placeholder-white/20 focus:bg-white/[0.04] focus:border-white/20 focus:outline-none rounded-[20px] p-5 pl-14 text-[15px] transition-all shadow-inner"
                          placeholder="e.g. rate limits"
                        />
                      </div>
                      <button
                        onClick={handleSearchDocs}
                        disabled={isSearching || !indexStats}
                        className="mt-6 w-full bg-white hover:bg-[#F5F5F7] text-black active:scale-[0.98] py-4 rounded-[20px] text-[13px] font-bold uppercase tracking-[0.15em] transition-all duration-300 shadow-[0_4px_20px_rgba(255,255,255,0.15)] disabled:opacity-50"
                      >
                        Retrieve Context
                      </button>
                    </div>
                  </div>

                  <AnimatePresence>
                    {searchResults.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-4 pt-8"
                      >
                        <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-4 border-b border-white/[0.06] pb-3 block">
                          Found {searchResults.length} Results
                        </div>
                        {searchResults.map((result, i) => (
                          <div
                            key={i}
                            className="border border-white/[0.06] rounded-[24px] p-8 bg-white/[0.02] shadow-sm backdrop-blur-xl"
                          >
                            <div className="font-mono text-[12px] font-medium text-white/80 mb-5 bg-black/40 inline-block px-4 py-2 rounded-xl border border-white/[0.08] shadow-inner">
                              {result.path}
                            </div>
                            <p className="font-sans text-[15px] leading-[1.8] text-white/60 font-light">
                              ...{result.snippet}...
                            </p>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}

            {/* ====== GOVERNANCE VIEW ====== */}
            {mode === "governance" && (
              <motion.div
                key="governance"
                {...VIEW_ANIMATION}
                className="absolute inset-0 overflow-y-auto px-12 py-12 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full"
              >
                <div className="max-w-5xl mx-auto w-full mt-4">
                  <div className="mb-12 text-left border-b border-white/[0.04] pb-8">
                    <h2 className="text-[32px] font-medium tracking-tight text-white mb-3 flex items-center gap-4">
                      <ShieldAlert className="w-8 h-8 text-rose-400" />{" "}
                      Enterprise Governance
                    </h2>
                    <p className="text-[16px] text-white/50 font-light max-w-2xl">
                      Define strict execution invariants injected directly into
                      the artifact compilation pipeline.
                    </p>
                  </div>

                  <div className="space-y-6 mb-12">
                    {governanceRules.map((rule) => (
                      <div
                        key={rule.id}
                        className={`border ${rule.active ? "border-white/20 shadow-[0_0_20px_rgba(255,255,255,0.05)]" : "border-white/[0.04]"} rounded-[32px] bg-white/[0.02] flex flex-col overflow-hidden transition-all duration-300 shadow-sm backdrop-blur-md`}
                      >
                        <div
                          className={`flex items-center justify-between border-b ${rule.active ? "border-white/10 bg-white/[0.02]" : "border-white/[0.04] bg-transparent"} px-10 py-6`}
                        >
                          <div className="font-mono text-[14px] font-semibold flex items-center gap-4 text-white">
                            <div
                              className={`w-3 h-3 rounded-full ${rule.active ? "bg-white shadow-[0_0_12px_rgba(255,255,255,0.8)]" : "bg-white/20"}`}
                            />
                            {rule.name}
                          </div>
                          <div className="flex items-center gap-5">
                            <span
                              className={`px-4 py-1.5 text-[10px] uppercase font-bold rounded-lg tracking-[0.2em] border ${rule.action === "DENY" ? "bg-rose-500/10 text-rose-400 border-rose-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"}`}
                            >
                              {rule.action}
                            </span>
                            <button
                              onClick={() =>
                                setGovernanceRules(
                                  governanceRules.map((r) =>
                                    r.id === rule.id
                                      ? { ...r, active: !r.active }
                                      : r,
                                  ),
                                )
                              }
                              className={`text-[11px] font-bold uppercase tracking-[0.15em] px-6 py-2.5 rounded-full border ${rule.active ? "text-black bg-white border-white hover:bg-white/90" : "text-white/50 border-white/[0.08] hover:text-white hover:bg-white/[0.05]"} transition-all active:scale-95`}
                            >
                              {rule.active ? "Enforced" : "Enable"}
                            </button>
                          </div>
                        </div>
                        <div className="p-10 flex items-center gap-4 bg-transparent">
                          <div className="font-mono text-[14px] leading-[1.8] tracking-tight bg-black/40 px-8 py-6 rounded-[20px] border border-white/[0.05] w-full text-white/80 shadow-inner">
                            <span className="text-emerald-400 font-medium">
                              if
                            </span>{" "}
                            ( {rule.condition} ) {"{"} <br />
                            &nbsp;&nbsp;
                            <span className="text-rose-400 font-medium">
                              return Reject()
                            </span>
                            ;<br />
                            {"}"}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-white/[0.02] border border-white/[0.04] rounded-[32px] p-10 shadow-2xl backdrop-blur-3xl">
                    <h3 className="text-[11px] font-bold text-white/50 mb-6 flex items-center gap-2 uppercase tracking-[0.2em]">
                      <Terminal className="w-4 h-4 ml-1" /> Inject New Invariant
                    </h3>
                    <div className="flex items-center gap-4">
                      <div className="flex-1 bg-black/40 border border-white/[0.08] rounded-[20px] flex items-center px-6 py-5 focus-within:border-white/20 transition-all shadow-inner">
                        <span className="text-[15px] font-mono text-emerald-400 font-medium mr-4 shrink-0">
                          if (
                        </span>
                        <input
                          type="text"
                          value={newRuleStr}
                          onChange={(e) => setNewRuleStr(e.target.value)}
                          placeholder="tool.name.includes('create')"
                          className="flex-1 min-w-0 font-mono text-[15px] bg-transparent text-white focus:outline-none placeholder:text-white/20 tracking-tight"
                        />
                        <span className="text-[15px] font-mono text-emerald-400 font-medium ml-4 shrink-0">
                          )
                        </span>
                      </div>
                      <button
                        onClick={handleAddRule}
                        disabled={!newRuleStr.trim()}
                        className="bg-white hover:bg-[#F5F5F7] text-black active:scale-[0.98] font-bold text-[12px] uppercase tracking-[0.15em] px-10 py-5 rounded-[20px] transition-all border-0 disabled:opacity-50 shadow-[0_4px_15px_rgba(255,255,255,0.15)] h-full"
                      >
                        Compile Rule
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ====== REGISTRY VIEW ====== */}
            {mode === "registry" && (
              <motion.div
                key="registry"
                {...VIEW_ANIMATION}
                className="absolute inset-0 overflow-y-auto px-12 py-12 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full"
              >
                <div className="max-w-6xl mx-auto w-full mt-4">
                  <div className="mb-12 text-left border-b border-white/[0.04] pb-8">
                    <h2 className="text-[32px] font-medium tracking-tight text-white mb-3 flex items-center gap-4">
                      <Database className="w-8 h-8 text-white/80" /> Global Tool
                      Registry
                    </h2>
                    <p className="text-[16px] text-white/50 font-light">
                      Published and verified MCP endpoints actively bound to the
                      AURA OS layer.
                    </p>
                  </div>

                  {registry.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-40 opacity-80 bg-white/[0.02] rounded-[40px] border border-white/[0.04] backdrop-blur-xl shadow-inner">
                      <Database className="w-16 h-16 mb-8 stroke-1 text-white/30" />
                      <p className="font-sans text-[16px] text-white/50 font-medium tracking-tight">
                        No intelligence nodes registered yet.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                      {registry.map((tool, i) => (
                        <div
                          key={i}
                          className="border border-white/[0.04] rounded-[32px] p-10 bg-white/[0.02] relative overflow-hidden group shadow-2xl hover:border-white/[0.08] transition-colors backdrop-blur-3xl"
                        >
                          <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none group-hover:opacity-[0.06] transition-opacity">
                            <Globe className="w-48 h-48 stroke-[1]" />
                          </div>
                          <div className="flex items-start justify-between mb-8 relative z-10">
                            <div className="flex items-center gap-6">
                              <div className="w-16 h-16 rounded-[20px] bg-white/[0.04] flex items-center justify-center border border-white/[0.06] shadow-inner">
                                <Network className="w-6 h-6 text-white/90" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-[18px] text-white tracking-tight font-mono">
                                  {tool.name} Server
                                </h3>
                                <span
                                  className={`inline-block mt-2.5 px-3 py-1 text-[9px] font-bold rounded-full tracking-[0.2em] uppercase border ${tool.status.includes("Cloud") ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-blue-500/10 text-blue-400 border-blue-500/20"}`}
                                >
                                  {tool.status}
                                </span>
                              </div>
                            </div>
                          </div>
                          <p className="font-sans text-[15px] leading-relaxed text-white/60 mb-10 font-medium relative z-10">
                            {tool.description}
                          </p>

                          {tool.endpoint ? (
                            <div className="bg-black/40 rounded-[20px] p-6 border border-white/[0.04] shadow-inner relative z-10">
                              <div className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                                <Cloud className="w-4 h-4" /> Edge Routing
                              </div>
                              <div className="font-mono text-[13px] text-white/90 bg-white/[0.04] px-5 py-3.5 rounded-[12px] border border-white/[0.04] truncate select-all tracking-tight">
                                {tool.endpoint}
                              </div>
                            </div>
                          ) : (
                            <div className="bg-amber-500/10 rounded-[20px] p-6 border border-amber-500/20 relative z-10">
                              <div className="text-[13px] font-medium text-amber-400/90 leading-relaxed">
                                Running in Sandbox Engine only. Deploy to cloud
                                for global endpoint.
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ====== VAULT VIEW ====== */}
            {mode === "vault" && (
              <motion.div
                key="vault"
                {...VIEW_ANIMATION}
                className="absolute inset-0 overflow-y-auto px-12 py-12 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full"
              >
                <div className="max-w-4xl mx-auto w-full mt-4">
                  <div className="mb-12 text-left border-b border-white/[0.04] pb-8">
                    <h2 className="text-[32px] font-medium tracking-tight text-white mb-3 flex items-center gap-4">
                      <Key className="w-8 h-8 text-white" /> Secrets Vault
                    </h2>
                    <p className="text-[16px] text-white/50 font-light">
                      Zero-trust secret injection. Keys are maintained in
                      volatile memory and piped directly into the runtime
                      execution context.
                    </p>
                  </div>

                  <div className="space-y-5">
                    {secrets.map((secret) => (
                      <div
                        key={secret.id}
                        className="border border-white/[0.04] rounded-[28px] bg-white/[0.02] flex items-center justify-between p-6 px-8 relative overflow-hidden transition-colors hover:border-white/[0.08] backdrop-blur-2xl"
                      >
                        {secret.isSet && (
                          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-white shadow-[0_0_15px_rgba(255,255,255,0.5)]" />
                        )}
                        <div className="flex items-center gap-6">
                          <div
                            className={`w-12 h-12 rounded-full flex items-center justify-center border ${secret.isSet ? "bg-white text-black border-transparent" : "bg-white/[0.05] text-white/40 border-white/[0.05]"}`}
                          >
                            <Key className="w-5 h-5" />
                          </div>
                          <div className="font-mono text-[14px] font-bold text-white/90 tracking-widest uppercase">
                            {secret.key}
                          </div>
                        </div>
                        <div className="flex items-center gap-5 max-w-[440px] w-full">
                          <input
                            type={secret.isSet ? "password" : "text"}
                            placeholder={
                              secret.isSet
                                ? "••••••••••••••••"
                                : "Paste exact key material..."
                            }
                            value={secret.value}
                            onChange={(e) =>
                              setSecrets(
                                secrets.map((s) =>
                                  s.id === secret.id
                                    ? { ...s, value: e.target.value }
                                    : s,
                                ),
                              )
                            }
                            disabled={secret.isSet}
                            className="flex-1 min-w-0 bg-black/40 border border-white/[0.06] rounded-[20px] px-6 py-4 text-[14px] font-mono text-white focus:outline-none focus:border-white/20 disabled:opacity-50 transition-colors shadow-inner tracking-tight"
                          />
                          {!secret.isSet ? (
                            <button
                              onClick={() => handleSaveSecret(secret.id)}
                              className="bg-white hover:bg-[#F5F5F7] text-black text-[11px] uppercase tracking-widest font-bold px-8 py-4 rounded-[20px] transition-all active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.15)]"
                            >
                              Commit
                            </button>
                          ) : (
                            <button
                              onClick={() =>
                                setSecrets(
                                  secrets.map((s) =>
                                    s.id === secret.id
                                      ? { ...s, isSet: false, value: "" }
                                      : s,
                                  ),
                                )
                              }
                              className="text-white/40 hover:text-rose-400 transition-colors px-6 py-4 text-[11px] font-bold uppercase tracking-[0.2em] active:scale-95"
                            >
                              Revoke
                            </button>
                          )}
                        </div>
                      </div>
                    ))}

                    <div className="border border-dashed border-white/[0.1] rounded-[28px] bg-transparent flex items-center justify-between p-6 px-8 mt-10">
                      <div className="flex items-center gap-6 flex-1">
                        <div className="font-mono text-[11px] font-bold text-white/40 tracking-[0.2em] shrink-0 uppercase">
                          New Env Var
                        </div>
                        <input
                          type="text"
                          placeholder="e.g. OPENAI_API_KEY"
                          value={newSecretKey}
                          onChange={(e) => setNewSecretKey(e.target.value)}
                          className="max-w-[440px] w-full bg-black/40 border border-white/[0.06] text-white rounded-[20px] px-6 py-4 text-[14px] font-mono uppercase focus:outline-none focus:border-white/20 transition-colors shadow-inner tracking-tight"
                        />
                      </div>
                      <button
                        onClick={handleAddSecret}
                        disabled={!newSecretKey.trim()}
                        className="bg-white/[0.05] hover:bg-white/[0.1] text-white text-[11px] font-bold px-10 py-4 rounded-[20px] transition-colors disabled:opacity-50 uppercase tracking-[0.15em] border border-white/[0.05] active:scale-95"
                      >
                        Register
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ====== TRAFFIC VIEW ====== */}
            {mode === "traffic" && (
              <motion.div
                key="traffic"
                {...VIEW_ANIMATION}
                className="absolute inset-0 overflow-y-auto px-12 py-12 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full"
              >
                <div className="max-w-5xl mx-auto w-full mt-4">
                  <div className="mb-12 flex items-end justify-between border-b border-white/[0.04] pb-8">
                    <div>
                      <h2 className="text-[32px] font-medium tracking-tight text-white mb-3 flex items-center gap-4">
                        <Activity className="w-8 h-8 text-emerald-400" /> Live
                        Proxy Logs
                      </h2>
                      <p className="font-sans text-[16px] font-light text-white/50 tracking-tight">
                        Monitor requests from external clients integrating with
                        the published MCP.
                      </p>
                    </div>
                    <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-5 py-2.5 rounded-full mb-1 shadow-inner">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-[10px] font-bold tracking-widest uppercase">
                        Listening
                      </span>
                    </div>
                  </div>

                  <div className="bg-white/[0.02] border border-white/[0.04] rounded-[32px] overflow-hidden shadow-2xl backdrop-blur-3xl">
                    <div className="grid grid-cols-12 gap-4 border-b border-white/[0.04] bg-black/40 px-10 py-6 text-[11px] font-bold text-white/40 uppercase tracking-widest shadow-inner">
                      <div className="col-span-2">Time</div>
                      <div className="col-span-6">Tool Execution</div>
                      <div className="col-span-2">Latency</div>
                      <div className="col-span-2 text-right">Status</div>
                    </div>
                    {trafficData.length === 0 ? (
                      <div className="py-32 text-center text-white/40 text-[15px] font-light">
                        No external traffic recorded yet.
                      </div>
                    ) : (
                      <div className="divide-y divide-white/[0.04]">
                        {trafficData.map((data) => (
                          <div
                            key={data.id}
                            className="grid grid-cols-12 gap-4 px-10 py-6 items-center hover:bg-white/[0.02] transition-colors"
                          >
                            <div className="col-span-2 text-[13px] font-mono text-white/40">
                              {data.timestamp}
                            </div>
                            <div className="col-span-6">
                              <span className="text-[13px] font-mono font-medium text-white/90 bg-black/40 px-4 py-2 rounded-[10px] border border-white/[0.06] shadow-inner tracking-tight">
                                {data.tool}
                              </span>
                            </div>
                            <div className="col-span-2 text-[13px] font-mono text-white/40">
                              {data.latency}
                            </div>
                            <div className="col-span-2 text-right">
                              <span
                                className={`inline-block px-3.5 py-1.5 text-[9px] font-bold uppercase tracking-widest rounded-md border ${data.status === "success" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : data.status === "error" ? "bg-rose-500/10 text-rose-400 border-rose-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20"}`}
                              >
                                {data.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ====== EXECUTION ENGINE VIEW ====== */}
            {mode === "sandbox" && (
              <motion.div
                key="sandbox"
                {...VIEW_ANIMATION}
                className="absolute inset-0 flex flex-col p-8"
              >
                <div className="flex-1 flex flex-col relative w-full h-full bg-[#050505] rounded-[32px] border border-white/[0.08] overflow-hidden shadow-2xl backdrop-blur-3xl">
                  <div className="h-[80px] flex items-center justify-between border-b border-white/[0.06] px-8 bg-white/[0.01] shrink-0">
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 rounded-[16px] bg-white/[0.04] border border-white/[0.05] flex items-center justify-center shadow-inner">
                        <Cpu className="w-5 h-5 text-white/90" />
                      </div>
                      <span className="font-bold text-[14px] tracking-widest text-white font-mono uppercase">
                        Sandboxed Execution
                      </span>
                      <span
                        className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-md tracking-widest ml-4 transition-colors border ${execStatus === "running" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]" : execStatus === "booting" || execStatus === "testing" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-white/[0.03] text-white/40 border-white/[0.06]"}`}
                      >
                        {execStatus}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      {execStatus === "idle" && files.length > 0 && (
                        <button
                          onClick={handleBootSandbox}
                          className="bg-white hover:bg-[#F5F5F7] text-black text-[11px] py-3 px-6 font-bold tracking-widest uppercase rounded-full flex items-center gap-2.5 transition-all shadow-[0_4px_15px_rgba(255,255,255,0.15)] active:scale-95"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" /> Boot
                          Environment
                        </button>
                      )}
                      {execStatus === "running" && (
                        <>
                          <button
                            onClick={handleTestTools}
                            className="bg-white/[0.05] border border-white/[0.1] text-white text-[11px] py-3 px-6 rounded-full hover:bg-white/[0.08] transition-all flex items-center gap-2.5 font-bold tracking-widest uppercase active:scale-95"
                          >
                            <Activity className="w-3.5 h-3.5" /> Diagnostics
                          </button>
                          <button
                            onClick={handleStopSandbox}
                            className="bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/15 text-[11px] py-3 px-6 rounded-full transition-all flex items-center gap-2.5 font-bold tracking-widest uppercase active:scale-95"
                          >
                            <Square className="w-3.5 h-3.5 fill-current" />{" "}
                            Terminate
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {files.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-transparent">
                      <ServerIcon className="w-16 h-16 mb-8 text-white/10 stroke-[1]" />
                      <p className="text-[16px] font-sans text-white/40 mb-8 font-light">
                        No artifact package generated yet.
                      </p>
                      <button
                        onClick={() => setMode("generator")}
                        className="text-[11px] tracking-[0.15em] uppercase font-bold text-white bg-white/[0.04] px-8 py-4 rounded-full border border-white/[0.08] hover:bg-white/[0.08] transition-all active:scale-95"
                      >
                        Open Generator
                      </button>
                    </div>
                  ) : execStatus === "running" ? (
                    <div
                      className="flex-1 w-full h-full relative"
                      style={{ minHeight: 0 }}
                    >
                      <Sandpack
                        template="node"
                        theme="dark"
                        files={files.reduce((acc, f) => {
                          const rootPath = f.path.replace(
                            /^packages\/[a-zA-Z0-9_\-]+\/[a-zA-Z0-9_\-]+\//,
                            "",
                          );
                          acc[`/${rootPath}`] = f.content;
                          return acc;
                        }, {} as any)}
                        options={{
                          showConsole: true,
                          showLineNumbers: true,
                          editorHeight: "100%",
                          classes: {
                            "sp-layout":
                              "h-full rounded-b-[32px] border-none !bg-transparent",
                            "sp-wrapper": "h-full",
                          },
                        }}
                      />
                    </div>
                  ) : (
                    <div
                      className="flex-1 flex font-mono text-[14px] leading-[1.8] p-10 overflow-y-auto relative bg-transparent [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full tracking-tight"
                      ref={terminalRef}
                    >
                      <div className="flex flex-col w-full space-y-1.5 text-white/60">
                        {execLogs.map((log, i) => (
                          <div
                            key={i}
                            className={`whitespace-pre-wrap break-words ${log.includes("success") ? "text-emerald-400" : log.includes("error") ? "text-rose-400" : ""}`}
                          >
                            {log}
                          </div>
                        ))}
                        {execStatus === "idle" && execLogs.length === 0 && (
                          <div className="text-white/30">
                            AURA VM ready. Select [Boot Environment] to mount
                            process.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ====== RIGHT PANE: AURA Assistant Chat Interface ====== */}
      <div className="w-[450px] flex-shrink-0 bg-[#030303] flex flex-col z-20 border-l border-[rgba(255,255,255,0.06)] overflow-hidden relative isolate">
        <div className="flex-1 overflow-y-auto px-8 pt-24 pb-8 space-y-8 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full relative">
          <AnimatePresence mode="wait">
            {chatMessages.length === 0 && (
              <motion.div
                key="chat-empty"
                {...VIEW_ANIMATION}
                className="space-y-10"
              >
                <div className="text-[15px] leading-[1.8] text-white/50 font-light">
                  {mode === "generator"
                    ? "Welcome to AURA Core. Select a preset or describe your tool intent."
                    : "Awaiting operational parameters."}
                </div>
              </motion.div>
            )}

            {chatMessages.map((msg, idx) => (
              <motion.div
                key={idx}
                layout
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={AURA_SPRING}
                className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                <div className="mt-1.5 shrink-0">
                  {msg.role === "assistant" ? (
                    <div className="w-10 h-10 rounded-[12px] bg-white/[0.05] border border-white/[0.1] flex items-center justify-center shadow-inner backdrop-blur-xl">
                      <div className="w-3 h-3 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.8)]" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-black/60 flex items-center justify-center border border-white/[0.08] shadow-inner">
                      <User className="w-5 h-5 text-white/60" />
                    </div>
                  )}
                </div>
                <div
                  className={`px-6 py-4 text-[15px] font-sans leading-[1.7] whitespace-pre-wrap font-light max-w-[85%] ${msg.role === "user" ? "bg-white/10 text-white rounded-[24px] rounded-tr-[6px] border border-white/[0.08] shadow-xl backdrop-blur-2xl" : "text-white/80 bg-transparent"}`}
                >
                  {msg.content}
                </div>
              </motion.div>
            ))}

            {isChatLoading && (
              <motion.div
                key="chat-loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-4 items-center pt-4"
              >
                <div className="shrink-0">
                  <div className="w-10 h-10 rounded-[12px] bg-white/[0.02] border border-white/[0.08] flex items-center justify-center shadow-inner backdrop-blur-xl animate-pulse">
                    <div className="w-2.5 h-2.5 rounded-full bg-white/50" />
                  </div>
                </div>
                <div className="text-[14px] font-sans italic text-white/40 font-light">
                  Synthesizing action...
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={chatEndRef} />
        </div>

        <div className="p-6 shrink-0 bg-transparent relative z-10 border-t border-white/[0.04]">
          <div className="relative flex items-center rounded-[28px] focus-within:ring-4 ring-white/5 transition-all">
            <textarea
              id="chat-input"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleChat();
                }
              }}
              placeholder="Ask AURA or pick a preset..."
              rows={1}
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-[28px] p-5 pl-6 pr-[64px] text-[15px] font-light text-white placeholder-white/30 focus:bg-white/[0.06] focus:border-white/20 focus:outline-none resize-none transition-all shadow-inner [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full absolute bottom-0 left-0 h-full"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
              <button
                onClick={() => handleChat()}
                disabled={isChatLoading || !chatInput.trim()}
                className="w-10 h-10 rounded-full bg-white text-black disabled:opacity-50 disabled:scale-100 hover:scale-105 active:scale-95 transition-all flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.15)] shrink-0"
              >
                {spinUpState === "idle" || spinUpState === "done" ? (
                  <Rocket className="w-4 h-4" />
                ) : (
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-black/20 border-t-black animate-spin" />
                )}
              </button>
            </div>
          </div>
          <div className="text-[10px] text-center font-mono text-white/30 mt-3 tracking-[0.2em] uppercase shrink-0">
            Shift+Enter for newline
          </div>
        </div>
      </div>

      {/* ====== GITHUB CONNECT MODAL ====== */}
      <AnimatePresence>
        {showGithubModal && (
          <motion.div
            key="github-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/70 backdrop-blur-md"
            onClick={() => setShowGithubModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              transition={AURA_SPRING}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[480px] bg-[#0a0a0a] border border-white/[0.08] rounded-[32px] p-10 shadow-2xl relative"
            >
              <button
                onClick={() => setShowGithubModal(false)}
                className="absolute top-6 right-6 w-9 h-9 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.08] transition-all active:scale-95"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="w-14 h-14 rounded-[18px] bg-white/[0.04] border border-white/[0.06] flex items-center justify-center shadow-inner mb-6">
                <Code2 className="w-6 h-6 text-white/90" />
              </div>

              <h3 className="text-[22px] font-medium tracking-tight text-white mb-2">
                Connect GitHub
              </h3>
              <p className="text-[15px] text-white/50 font-light leading-relaxed mb-8">
                Paste a GitHub token so AURA can save your tool to your account.
                It's kept only for this session and never saved to disk.
              </p>

              <input
                type="password"
                value={githubTokenInput}
                onChange={(e) => setGithubTokenInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleConnectGithub();
                }}
                placeholder="Paste your GitHub token..."
                autoFocus
                className="w-full bg-black/40 border border-white/[0.08] text-white placeholder-white/20 focus:bg-white/[0.04] focus:border-white/20 focus:outline-none rounded-[20px] px-6 py-4 text-[15px] font-mono transition-all shadow-inner mb-4"
              />

              <a
                href="https://github.com/settings/tokens/new?description=AURA&scopes=repo"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[13px] text-white/40 hover:text-white/70 underline underline-offset-4 transition-colors"
              >
                Need a token? Create one here.
              </a>

              <div className="flex gap-3 mt-8">
                <button
                  onClick={() => setShowGithubModal(false)}
                  className="flex-1 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-white/70 hover:text-white py-4 rounded-[20px] text-[13px] font-bold uppercase tracking-[0.15em] transition-all active:scale-[0.98]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConnectGithub}
                  disabled={!githubTokenInput.trim() || isShipping}
                  className="flex-1 bg-white hover:bg-[#F5F5F7] text-black py-4 rounded-[20px] text-[13px] font-bold uppercase tracking-[0.15em] transition-all active:scale-[0.98] disabled:opacity-50 shadow-[0_4px_20px_rgba(255,255,255,0.15)]"
                >
                  {isShipping ? "Saving..." : "Connect & Save"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSuccessToast && (
          <motion.div
            key="success-toast"
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-start gap-4 px-6 py-4 bg-[#111111] border border-emerald-500/20 shadow-[0_8px_30px_rgba(0,0,0,0.5)] rounded-2xl z-50 min-w-[320px]"
          >
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h4 className="text-white text-[14px] font-medium mb-1 tracking-tight">
                App Built Successfully
              </h4>
              <p className="text-white/60 text-[13px] leading-snug">
                Your tool has been built, tested, and saved to GitHub.
              </p>
            </div>
            <button
              onClick={() => setShowSuccessToast(false)}
              className="ml-auto text-white/40 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
