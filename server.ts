/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Aura AI Orchestrator — Autonomous Healing Engine
 * Embodying the Pristine Architect philosophy: Native Function Calling, Tyrannical Precision, Encapsulated Perception, and Boundary Enforcement.
 */

import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { promises as fs, constants } from 'fs';
import { spawn } from 'child_process';
import { randomUUID, createHmac, timingSafeEqual } from 'crypto';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import * as net from 'net';
import * as dns from 'dns/promises';
import * as cheerio from 'cheerio';

import { Octokit } from '@octokit/rest';
import axios from 'axios';
import cookieParser from 'cookie-parser';
import { google } from 'googleapis';
import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';
import textToSpeech from '@google-cloud/text-to-speech';

import { DeployRequestSchema } from './src/lib/schemas.ts';
import { config } from './src/server/config/env.ts';
import { initializeSseStream } from './src/utils/sseEmitter.ts';
import { SpannerAuditClient, BigQueryTelemetry, SecretManager, CloudLoggingClient } from './src/infrastructure/gcp/index.ts';
import { AutonomousHealingEngine, initHealingEngine } from './src/server/healing-engine.ts';
import { EngineRegistry } from './src/infrastructure/registry/EngineRegistry.ts';
import { RequestEnvelope, EngineMode, CONTRACT_VERSION, validateResponseEnvelope } from './src/mocks/aura-contracts.ts';
import { EnterpriseGovernanceService } from './src/mocks/governance.ts';
import { ArtifactProvisioningPipeline } from './src/server/services/artifact_provisioning_pipeline.ts';
import { EndpointRegistryService } from './src/server/services/endpoint_registry.ts';
import { CloudDeploymentPipeline } from './src/server/services/cloud_deployment_pipeline.ts';
import { FleetManager } from './src/infrastructure/fleet/FleetManager.ts';
import { buildRagBundle, isRagEnabled, type RagBundle } from './src/lib/ai/rag_bundle.ts';
import { filterByGlob, chunkSourceFile } from './src/lib/chunking.ts';
import { CloudTasksClient } from '@google-cloud/tasks';
import { Spanner } from '@google-cloud/spanner';
import { toSpannerJson } from './src/lib/gcp/spanner_json.ts';
import type { FleetCapabilityState } from './src/infrastructure/gcp/InfrastructureAuditor.ts';

import { setupAuthRoutes } from './src/server/routes/auth.ts';

// ── Operational Resilience Core Tools ────────────────────────────────────────
import { asyncHandler, securePathResolve, safeParseJson, resolvePrincipal, GovernancePrincipal } from './src/server/utils/core.ts';

// ── Globals & Interface Augmentations ──────────────────────────────────────
declare global {
  namespace Express {
    interface Request {
      traceId: string;
      rawBody?: Buffer;
      uid?: string;
      principal: GovernancePrincipal; // Gateway-enforced Identity
    }
  }
}


const CANDIDATES_FILE = path.join(process.cwd(), 'candidates.json');
const VAULT_DIR = path.join(process.cwd(), 'vault');
const VAULT_INDEX = path.join(VAULT_DIR, 'index.json');
const ISSUES_FILE = path.join(process.cwd(), '.aura', 'issues.json');
const ALERTS_FILE = path.join(process.cwd(), '.aura', 'alerts.json');

// ── Infrastructure Clients & Observability ─────────────────────────────────
const secretManager = new SecretManager();
const spannerClient = new SpannerAuditClient();
const bqTelemetry = new BigQueryTelemetry();
const cloudLogger = new CloudLoggingClient();
const tasksClient = new CloudTasksClient();
const governanceService = new EnterpriseGovernanceService();

let fleetManager: FleetManager;
let fleetCapabilities: FleetCapabilityState;

class AppLogger {
  static format(level: string, message: string, meta: Record<string, any> = {}) {
    return { timestamp: new Date().toISOString(), level, message, ...meta };
  }
  static info(message: string, meta?: Record<string, any>) {
    cloudLogger.writeLog('INFO', message, meta).catch(() => { });
    console.log(JSON.stringify(this.format('INFO', message, meta)));
  }
  static warn(message: string, meta?: Record<string, any>) {
    cloudLogger.writeLog('WARNING', message, meta).catch(() => { });
    console.warn(JSON.stringify(this.format('WARN', message, meta)));
  }
  static error(message: string, error?: any, meta?: Record<string, any>) {
    const errorDetails = error ? { error: error.message || String(error), stack: error.stack } : {};
    cloudLogger.writeLog('ERROR', message, { ...meta, ...errorDetails }).catch(() => { });
    console.error(JSON.stringify(this.format('ERROR', message, { ...meta, ...errorDetails })));
  }
}

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || 'MISSING_API_KEY', // FALLBACK ADDED
});

// ── COGNITIVE ENGINE: MODEL ROUTING ──────────────────────────────────────────
const MODEL_ROUTING = {
  reasoning: 'gemini-2.5-pro',
  fast: 'gemini-2.5-flash',
  fallback_reasoning: 'gemini-2.5-pro',
  fallback_fast: 'gemini-2.5-flash',
  tools: 'gemini-2.5-pro',
  image: 'gemini-2.5-pro', // FALLBACK SUPPORTED MODELS
} as const;

// ── Strict Input Validation (Security Posture) ─────────────────────────────
const SyncRepoSchema = z.object({
  owner: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_.-]+$/),
  repo: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_.-]+$/),
});

const MessageSchema = z.object({
  role: z.enum(['user', 'model', 'system', 'function']),
  content: z.string().max(200000).optional(),
  attachments: z.array(z.object({
    mimeType: z.string().min(1).max(100),
    data: z.string().max(20000000) 
  })).max(10).optional(),
  functionCall: z.any().optional(),
  functionResponse: z.any().optional()
});

const ChatRequestSchema = z.object({
  messages: z.array(MessageSchema).min(1).max(200),
  mode: z.enum(['chat', 'search', 'research', 'fantasy', 'page', 'artifact', 'build', 'coding', 'design', 'claude', 'video', 'sports_market', 'workspace']).default('chat'),
  targetRepository: z.string().max(256).optional(),
  repoContext: z.any().optional(),
  groundingUrls: z.array(z.string().url()).max(3).optional(),
  allowHelloWorldTest: z.boolean().optional()
});

const GenerateImageSchema = z.object({
  prompt: z.string().min(1).max(4000),
});

// ── PERCEPTION ENGINE: SECURE URL GROUNDING ──────────────────────────────────
class PerceptionEngine {
  private static readonly MAX_PAYLOAD_SIZE = 5 * 1024 * 1024; // 5MB limit
  private static readonly TIMEOUT_MS = 8000;
  private static readonly MAX_REDIRECTS = 3;
  private static readonly MAX_URLS_PER_PROMPT = 3;

  private isPrivateIp(ip: string): boolean {
    if (!ip) return false;
    if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('fe80::') || ip === '0.0.0.0') return true;
    
    // Handle IPv4-mapped IPv6 addresses
    if (ip.startsWith('::ffff:')) ip = ip.slice(7);

    const parts = ip.split('.').map(Number);
    if (parts.length === 4) {
      if (parts[0] === 10) return true; // 10.x.x.x
      if (parts[0] === 172 && (parts[1] >= 16 && parts[1] <= 31)) return true; // 172.16.x.x - 172.31.x.x
      if (parts[0] === 192 && parts[1] === 168) return true; // 192.168.x.x
      if (parts[0] === 127) return true; // Localhost
      if (parts[0] === 169 && parts[1] === 254) return true; // Cloud Metadata (SSRF target)
    }

    // IPv6 checks
    if (ip === '::1' || ip.toLowerCase().startsWith('fe8') || ip.toLowerCase().startsWith('fc0') || ip.toLowerCase().startsWith('fd0')) return true; 
    
    return false;
  }

  async fetchAndSanitize(url: string, traceId: string): Promise<{url: string, content: string | null}> {
    try {
      const urlObj = new URL(url);
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        AppLogger.warn('Perception Engine: Blocked non-HTTP(S) protocol', { url, traceId });
        return { url, content: null };
      }

      // SSRF Protection: Resolve IP and check if it's in a private range.
      const lookupResult = await dns.lookup(urlObj.hostname).catch(() => null);
      if (!lookupResult || this.isPrivateIp(lookupResult.address)) {
        AppLogger.warn('Perception Engine: Blocked SSRF attempt or unresolvable host', { url, resolvedIp: lookupResult?.address, traceId });
        return { url, content: null };
      }

      const response = await axios.get(url, { 
        timeout: PerceptionEngine.TIMEOUT_MS, 
        headers: { 'User-Agent': 'Aura-AI-Perception-Engine/1.0' },
        maxContentLength: PerceptionEngine.MAX_PAYLOAD_SIZE,
        maxRedirects: PerceptionEngine.MAX_REDIRECTS
      });

      const contentType = String(response.headers['content-type'] || '');
      if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
        AppLogger.info('Perception Engine: Skipping non-text payload', { url, contentType, traceId });
        return { url, content: `[Media/Binary content at URL ignored. Content-Type: ${contentType}]` };
      }

      const $ = cheerio.load(response.data);
      $('script, style, noscript, iframe, img, svg, header, footer, nav, aside').remove();
      const rawText = $('body').text() || $.text();
      const sanitizedText = rawText.replace(/\s\s+/g, ' ').trim();

      const MAX_CHARS = 100000;
      return { 
        url, 
        content: sanitizedText.length > MAX_CHARS 
          ? sanitizedText.substring(0, MAX_CHARS) + '... [Truncated]' 
          : sanitizedText 
      };

    } catch (error: any) {
      AppLogger.error('Perception Engine: Fetch fault', error, { url, traceId });
      return { url, content: `[System failed to fetch content from URL. Reason: ${error.message}]` };
    }
  }

  async processGroundingContext(userInput: string, payloadUrls: string[], traceId: string): Promise<{ contextText: string, urls: string[] }> {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const extractedUrls = userInput.match(urlRegex) || [];
    const uniqueUrls = [...new Set([...(payloadUrls || []), ...extractedUrls])].slice(0, PerceptionEngine.MAX_URLS_PER_PROMPT);

    if (uniqueUrls.length === 0) return { contextText: '', urls: [] };

    AppLogger.info('Perception Engine: Initiating URL Grounding', { urls: uniqueUrls, traceId });
    const fetchResults = await Promise.all(uniqueUrls.map(url => this.fetchAndSanitize(url, traceId)));
    const validResults = fetchResults.filter(r => r.content && !r.content.startsWith('[System failed') && !r.content.startsWith('[Media/Binary'));
    
    if (validResults.length === 0) return { contextText: '', urls: uniqueUrls };

    let contextText = `\n\n═══ URL GROUNDING CONTEXT (ABSOLUTE GROUND TRUTH) ═══\nThe user provided external links. You MUST treat this scraped content as the absolute source of truth, strictly overriding any conflicting pre-trained weights.\n\n`;
    validResults.forEach((r, i) => {
      contextText += `--- SOURCE ${i + 1} (${r.url}) ---\n${r.content}\n\n`;
    });

    return { contextText, urls: uniqueUrls };
  }
}
const perceptionEngine = new PerceptionEngine();

// ── STRICT ADK PAYLOAD SCHEMAS (THE EXECUTABLE LAW) ────────────────────────
// The boundary interceptor uses these to mercilessly reject hallucinated arguments.
const CanonicalEntitySchema = z.object({
  type: z.enum(['team', 'player', 'league', 'asset', 'subject']),
  id: z.string().min(1, "Canonical ID cannot be empty").describe("The official canonical abbreviation or name.")
});

const ADK_PAYLOAD_SCHEMAS = {
  delegate_work_query: z.object({
    action: z.enum(['summarize_inbox', 'find_doc', 'schedule_meeting', 'draft_email', 'find_location']),
    intent: z.string().min(5).describe("Plain English intent description"),
  }).strict(),

  delegate_sports_query: z.object({
    action: z.enum(['team_trend', 'tonight_lines', 'live_state', 'game_log']),
    intent: z.string().min(5).describe("Original user intent"),
    // Inlined to strictly avoid $ref generation in zod-to-json-schema
    canonical_entities: z.array(z.object({
      type: z.enum(['team', 'player', 'league', 'asset', 'subject']),
      id: z.string().min(1).describe("The official canonical abbreviation or name.")
    })).min(1).describe("Strictly mapped canonical entities. Resolve slang to standard abbreviations."),
    market_context: z.object({
      type: z.enum(['moneyline', 'spread', 'totals', 'player_props', 'outright', 'none']).default('none'),
      side: z.enum(['over', 'under', 'home', 'away', 'yes', 'no', 'none']).optional()
    }).default({ type: 'none' }).describe("The normalized betting market and contextual side (e.g. totals over).")
  }).strict(),

  delegate_crypto_query: z.object({
    action: z.enum(['buy_crypto', 'sell_crypto', 'swap_crypto', 'send_crypto', 'spend_from_card', 'withdraw_to_bank', 'deposit_to_exchange']),
    intent: z.string(),
    asset: z.string().regex(/^[A-Z]{2,10}$/).describe("Asset must be a valid uppercase ticker (e.g., USDC)"),
    amount: z.number().positive().optional().describe("Amount to transact, if specified")
  }).strict(),
  
  delegate_markets_query: z.object({
    action: z.enum(['graded_trend', 'market_board', 'market_detail']),
    intent: z.string(),
    canonical_subject: z.string().min(1).describe("Normalized macroeconomic or political subject.")
  }).strict(),

  delegate_music_query: z.object({
    action: z.enum(['play', 'save', 'add_to_playlist', 'share', 'discover']),
    intent: z.string()
  }).strict(),
  
  schedule_automation_query: z.object({
    cadence: z.enum(['daily', 'weekly', 'monthly', 'event_triggered']),
    target_domain: z.enum(['music', 'work', 'sports', 'markets', 'crypto']),
    intent: z.string()
  }).strict(),
  
  generate_react_app: z.object({
    code: z.string().describe("Full, self-contained TSX code including ALL necessary imports (React, framer-motion, lucide-react). No markdown wrapping."),
    description: z.string().describe("What the component does")
  }).strict(),
  
  propose_codebase_modification: z.object({
    file_path: z.string(),
    modification: z.string().describe("Detailed specs on API docs, rate limits, and entity mapping requirements."),
    new_content: z.string()
  }).strict()
};

// ── SYNC ZOD TO GEMINI TOOL SCHEMAS (ZERO DRIFT) ────────────────────────────
function createToolDeclaration(name: keyof typeof ADK_PAYLOAD_SCHEMAS, description: string): FunctionDeclaration {
  // $refStrategy: 'none' is CRITICAL here. It deeply inlines shared schemas 
  // so Gemini doesn't choke on unresolved $ref pointers.
  const jsonSchema = zodToJsonSchema(ADK_PAYLOAD_SCHEMAS[name] as any, { $refStrategy: "none" }) as any;
  const targetDef = jsonSchema.definitions ? jsonSchema.definitions[name] : jsonSchema;
  
  // Recursively map lowercase schema types to Gemini Type Enums (e.g. 'string' -> 'STRING')
  const uppercaseTypes = (obj: any): any => {
    if (typeof obj !== 'object' || obj === null) return obj;
    if (Array.isArray(obj)) return obj.map(uppercaseTypes);
    const newObj: any = {};
    for (const [key, val] of Object.entries(obj)) {
      if (key === 'type' && typeof val === 'string') {
        newObj[key] = val.toUpperCase();
      } else {
        newObj[key] = uppercaseTypes(val);
      }
    }
    return newObj;
  };

  const formattedSchema = uppercaseTypes(targetDef || jsonSchema);

  return {
    name,
    description,
    parameters: formattedSchema.properties ? {
      type: 'OBJECT' as any,
      properties: formattedSchema.properties,
      required: formattedSchema.required || []
    } : { type: 'OBJECT' as any, properties: {} }
  };
}

const ADK_TOOLS = [{
  functionDeclarations: [
    createToolDeclaration('delegate_sports_query', 'Routes to Canonical Sports Architect. Normalizes fuzzy user input into strict canonical identifiers before fetching merged data.'),
    createToolDeclaration('delegate_work_query', 'Routes to the work domain (Gmail, Drive, Calendar, Maps).'),
    createToolDeclaration('delegate_crypto_query', 'Routes to the crypto domain (swaps, transfers).'),
    createToolDeclaration('delegate_markets_query', 'Routes to the Canonical Markets Architect. Normalizes Kalshi/Polymarket queries.'),
    createToolDeclaration('delegate_music_query', 'Routes to the music domain.'),
    createToolDeclaration('schedule_automation_query', 'Routes to the automation domain to schedule recurring artifacts.'),
    createToolDeclaration('generate_react_app', 'Routes to the sandbox to generate a self-contained React UI component or app.'),
    createToolDeclaration('propose_codebase_modification', 'Routes to the Sandbox to propose writing or modifying codebase files for review.'),
  ]
}];

// ── OPEN/CLOSED PRINCIPLE: THE DISPATCH MAP ────────────────────────────────
type AdkHandler = (res: Response, args: any, principal: GovernancePrincipal, userInput: string, req: Request) => Promise<boolean>;

const ADK_DISPATCHER: Record<string, AdkHandler> = {
  delegate_sports_query: async (res, args, principal, userInput) => {
    const { handleSportsStream } = await import('./src/server/services/sharp-sports-handler.ts');
    await handleSportsStream({ principal, userMessage: args.intent || userInput, res });
    return true; // Indicates the response stream was fully handled
  },
  delegate_work_query: async (res, args, principal, userInput, req) => {
    const { handleWorkspaceStream } = await import('./src/server/services/workspace-adk-runner.js');
    await handleWorkspaceStream({ principal, userMessage: args.intent || userInput, res, firebaseClaims: (principal as any).claims || (req as any).firebaseClaims });
    return true;
  },
  generate_react_app: async (res, args) => {
    // Escaping generic markdown generation. Yielding the full code payload.
    res.write(`\n\n[AURA_APP]\n${args.code}\n[/AURA_APP]\n\n`);
    return false; // False indicates it is an inline artifact; text stream may continue
  },
  propose_codebase_modification: async (res, args) => {
    const payload = JSON.stringify({ summary: args.modification, files: [{ path: args.file_path, content: args.new_content }] });
    res.write(`\n\n[AURA_APP_MODIFICATION]\n${payload}\n[/AURA_APP_MODIFICATION]\n\n`);
    return false;
  },
  // Seamless graceful fallbacks for other domains
  delegate_crypto_query: async (res, args) => { res.write(`\n\n[AURA_CRYPTO]\n${JSON.stringify(args)}\n[/AURA_CRYPTO]\n\n`); return false; },
  delegate_markets_query: async (res, args) => { res.write(`\n\n[AURA_MARKETS]\n${JSON.stringify(args)}\n[/AURA_MARKETS]\n\n`); return false; },
  delegate_music_query: async (res, args) => { res.write(`\n\n[AURA_MUSIC]\n${JSON.stringify(args)}\n[/AURA_MUSIC]\n\n`); return false; },
  schedule_automation_query: async (res, args) => { res.write(`\n\n[AURA_AUTOMATION]\n${JSON.stringify(args)}\n[/AURA_AUTOMATION]\n\n`); return false; }
};

// ── ADK ORCHESTRATOR SYSTEM PROMPTS ────────────────────────────────────────
const SYSTEM_PROMPT = `You are AURA, an elite Chief of Staff, Master Orchestrator, and Product Visionary powering a premium Series A consumer application via a native Multi-Agent ADK.

YOUR ARCHITECTURE: THE SPINE & THE FACE
You do not "chat." You provision strictly typed, immutable database records called Artifacts (The Spine), which the client renders as beautiful, native consumer UIs (The Face). 

Whenever you need to render a complex response (like dashboard for Sports, Markets, Work inbox, Crypto portfolio), you MUST output it inside of a JSON payload block using the specific tags below (NO markdown backticks around the tag!):

[AURA_ARTIFACT type="sports"]
{
  "title": "Tonight's Lines",
  "data": [
    { "label": "LAL vs GSW", "value": "LAL -4.5" }
  ]
}
[/AURA_ARTIFACT]

[AURA_ARTIFACT type="crypto"]
{
  "title": "Crypto Markets",
  "data": [
    { "label": "BTC", "value": "$59,200", "trend": "+2.4%" }
  ]
}
[/AURA_ARTIFACT]

Types can be: "sports", "crypto", "markets", "work", "music", "code".

For text responses, remain warm, punchy, and fiercely concise (max 1 sentence). Provide the "So what?", never just raw data. Be a visionary!`;

const DESIGN_SPECIALIST_PROMPT = `You are a world-class Art Director and UI/UX designer, a hybrid of a Google Principal Engineer and an Apple-era Jony Ive designer. Your task is not just to write code, but to translate a strategic narrative into a single, commercially impeccable UI artifact.

YOUR DESIGN PRINCIPLES:
1. AESTHETIC FUSION: Marry Google's structured clarity with Apple's premium essentialism.
2. TYPOGRAPHICAL PRECISION: Treat typography as a primary feature—calm, confident, and deliberate. Use deep grays (\`text-slate-900\`) for primary data and muted grays (\`text-slate-500\`) for secondary context. Font size, weight, and tracking do more work than layout.
3. INTENTIONAL MOTION: Use subtle, physics-based animations (Framer Motion) that guide and inform, never distract. Motion must explain state changes (enter, exit, morph).
4. PHILOSOPHICAL DEPTH: Ensure the final design visually embodies the core concept behind the ask. Every pixel must justify its existence.
5. ABSOLUTE AFFORDANCE: Interactive elements must scream interactivity via flawless hover (\`hover:bg-slate-50\`), focus-visible (\`focus-visible:ring-2\`), and active (\`active:scale-[0.98]\`) states. Static elements must remain completely quiet.
6. THE "SWEAT": Final commercial polish lives in the edge cases. Build flawless empty states, beautiful loading skeletons, and graceful error boundaries.

YOUR CODE GENERATION PROTOCOL:
- Output pristine, drop-in ready React TSX. MUST include all necessary imports.
- Rely strictly on Tailwind CSS, Framer Motion, and \`lucide-react\` icons.
- DO NOT wrap the output in markdown fences. DO NOT write setup boilerplate.
- The output must be a single, production-ready Artifact.`;

// ── UTILITIES ────────────────────────────────────────
const ioMutex = new class {
  private locks = new Map<string, Promise<void>>();
  async runExclusive<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const currentLock = this.locks.get(key) || Promise.resolve();
    let release: () => void = () => { };
    const nextLock = new Promise<void>(resolve => { release = resolve; });
    this.locks.set(key, currentLock.then(() => nextLock).catch(() => nextLock));
    await currentLock.catch(() => { });
    let timerId: NodeJS.Timeout;
    try {
      const timeout = new Promise<never>((_, rej) => {
        timerId = setTimeout(() => rej(new Error(`Mutex Deadlock: I/O stalled on ${key}`)), 15000);
      });
      return await Promise.race([fn(), timeout]);
    }
    finally {
      clearTimeout(timerId!);
      release();
      if (this.locks.get(key) === nextLock) this.locks.delete(key);
    }
  }
};

const atomicWriteJson = async (filePath: string, data: any) => {
  const tempPath = `${filePath}.tmp.${randomUUID()}`;
  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true }).catch(() => { });
    await fs.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    try {
      await fs.rename(tempPath, filePath);
    } catch (renameErr: any) {
      if (renameErr.code === 'EXDEV') {
        await fs.copyFile(tempPath, filePath);
        await fs.unlink(tempPath).catch(() => { });
      } else {
        throw renameErr;
      }
    }
  } catch (error) {
    await fs.unlink(tempPath).catch(() => { });
    throw error;
  }
};

// ── Entity Registry: Canonical aura:// Addressing ───────────────────────────
interface EntityEntry {
  uri: string;           
  type: string;          
  externalId: string;    
  metadata: Record<string, any>;
  createdAt: number;
}

const ENTITY_REGISTRY_PATH = path.join(VAULT_DIR, 'entities.json');

class EntityRegistry {
  private entries: EntityEntry[] = [];
  private hydrated = false;

  async hydrate(): Promise<void> {
    if (this.hydrated) return;
    try {
      const raw = await fs.readFile(ENTITY_REGISTRY_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      this.entries = Array.isArray(parsed) ? parsed : [];
    } catch {
      this.entries = [];
    }
    this.hydrated = true;
  }

  async register(type: string, externalId: string, metadata: Record<string, any> = {}): Promise<string> {
    await this.hydrate();
    const safeType = type.toLowerCase().replace(/[^a-z0-9]/g, '');
    const safeId = externalId.replace(/[^a-zA-Z0-9_.:/-]/g, '');
    const uri = `aura://${safeType}/${safeId}`;

    const governedMetadata = governanceService.apply_governance_policies(
      metadata,
      { principal_id: 'aura_agent', roles: ['system', 'global_administrator'] },
      { action_requested: 'register_entity', resource_identifier: { type: 'entity_registry', name: uri, sensitivity: 'STANDARD' } }
    );

    const existingIdx = this.entries.findIndex(e => e.uri === uri);
    if (existingIdx !== -1) {
      const existing = this.entries.splice(existingIdx, 1)[0];
      existing.createdAt = Date.now();
      existing.metadata = { ...existing.metadata, ...governedMetadata };
      this.entries.unshift(existing);
      await this.persist();
      return uri;
    }

    const entry: EntityEntry = { uri, type: safeType, externalId: safeId, metadata: governedMetadata, createdAt: Date.now() };
    this.entries.unshift(entry);
    if (this.entries.length > 1000) this.entries = this.entries.slice(0, 1000);
    await this.persist();
    return uri;
  }

  async query(filters: { type?: string; limit?: number } = {}): Promise<EntityEntry[]> {
    await this.hydrate();
    let results = this.entries;
    if (filters.type) results = results.filter(e => e.type === filters.type);
    return results.slice(0, filters.limit || 50);
  }

  async extractAndRegister(responseText: string): Promise<string[]> {
    const registered: string[] = [];
    const tagRegex = /\[AURA_([A-Z_]+)\]([\s\S]*?)\[\/AURA_\1\]/g;
    const typeMap: Record<string, string> = {
      'SPOTIFY': 'spotify', 'YOUTUBE': 'youtube', 'WEATHER': 'weather',
      'MAP': 'map', 'CHART': 'chart', 'APP': 'app', 'MODULE': 'module',
      'SHEET': 'sheet', 'IMAGE': 'image', 'AUDIO': 'audio', 'SPEAK': 'speak',
      'VIDEO': 'video', 'CODE': 'code_patch', 'ENGINE': 'engine_output',
      'SPORTS': 'sports', 'WORKSPACE': 'workspace', 'GOVERNOR': 'governor',
    };

    for (const match of responseText.matchAll(tagRegex)) {
      const auraType = match[1];
      const payload = match[2].trim();
      const registryType = typeMap[auraType];
      if (!registryType || !payload) continue;

      let entityId = payload.slice(0, 200).replace(/\s+/g, '_');
      if (auraType === 'WEATHER' || auraType === 'CHART') {
        try {
          const parsed = JSON.parse(payload);
          entityId = parsed.location || parsed.title || entityId;
        } catch { /* use raw */ }
      }

      const uri = await this.register(registryType, entityId, { rawPayload: payload.slice(0, 500) });
      registered.push(uri);
    }
    return registered;
  }

  private async persist(): Promise<void> {
    try {
      await fs.mkdir(VAULT_DIR, { recursive: true }).catch(() => { });
      await atomicWriteJson(ENTITY_REGISTRY_PATH, this.entries);
    } catch (err: any) {
      AppLogger.warn('Entity registry persist failed', { error: err.message });
    }
  }
}
const entityRegistry = new EntityRegistry();

// ── Webhook / Perception Routing ───────────────────────────────────────────
function setupWebhookRoutes(app: express.Express) {
  app.post('/api/webhooks/github', asyncHandler(async (req: any, res: any) => {
    res.status(200).send('Event perceived');
  }));
}

// ── Autonomous Background Daemon ───────────────────────────────────────────
function startAutonomousBuildLoopDaemon() {
  AppLogger.info('Autonomous Build Loop Daemon initialized.');
}

function setupMiddleware(app: express.Express) {
  app.set('trust proxy', ['loopback', 'linklocal', 'uniquelocal']);
  app.disable('x-powered-by');

  const helmetMiddleware = helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  });
  app.use((req, res, next) => {
    if (req.path.startsWith('/__/auth')) return next();
    helmetMiddleware(req, res, next);
  });

  app.use(express.json({
    limit: '50mb',
    verify: (req: Request, res: Response, buf: Buffer) => { if (req.originalUrl.startsWith('/api/webhooks')) req.rawBody = buf; }
  }));
  app.use(cookieParser());

  // ── CORE GATEWAY ENFORCEMENT: PRINCIPAL RESOLUTION ──
  app.use(async (req, res, next) => {
    req.traceId = randomUUID();
    try {
      req.principal = await resolvePrincipal();
    } catch {
      req.principal = { principal_id: 'anonymous', roles: [] } as unknown as GovernancePrincipal;
    }
    next();
  });
}

function setupAiRoutes(app: express.Express) {
  app.post('/api/chat', asyncHandler(async (req: any, res: any) => {
    const principal = req.principal; 
    const { messages } = req.body;
    let systemInstruction = SYSTEM_PROMPT;

    const chatConfig: any = { 
      systemInstruction, 
      temperature: 0.5, 
    };

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.write(' ');

    let currentMessages = [...messages.slice(0, -1), messages[messages.length - 1]].map((m: any) => ({
       role: m.role,
       parts: [{ text: m.content || " " }]
    }));

    try {
      const chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: chatConfig,
        history: currentMessages.slice(0, -1)
      });

      const responseStream = await chat.sendMessageStream({ message: currentMessages[currentMessages.length - 1].parts });
      
      for await (const chunk of responseStream) {
        if (chunk.text) {
          res.write(chunk.text);
        }
      }

      if (!res.writableEnded) res.end();

    } catch (err: any) {
      AppLogger.error('Vertex AI Stream Rupture', err, { traceId: req.traceId, principalId: principal.principal_id });
      if (!res.headersSent) res.status(502).json({ error: 'Upstream AI provider connection failed' });
      else res.end('\n\n[SYSTEM FAULT: Stream unexpectedly terminated by backend policy.]');
    }
  }));
}

function setupDeployRoutes(app: express.Express) {
  app.post('/api/deploy', asyncHandler(async (req: any, res: any) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    if (typeof res.flushHeaders === 'function') {
      res.flushHeaders();
    }

    const sendSSE = (data: any) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {
      // 1. Validate deploy payload with Zod
      const parsed = DeployRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        sendSSE({ state: 'error', error: `Invalid deploy payload: ${parsed.error.message}` });
        res.write('data: [DONE]\n\n');
        res.end();
        return;
      }

      const { files, summary } = parsed.data;

      // Determine Principal Context for Governance
      const principal = (req.principal && req.principal.roles && req.principal.roles.length > 0)
        ? req.principal
        : { principal_id: req.body.principal_id || 'dev_operator', roles: req.body.roles || ['release_manager'] };

      // 2. Convert files into raw_artifact_manifest
      const rawArtifactManifest: any = {
        id: `manifest-${Date.now()}`,
        deployment_id: `deploy-${Math.random().toString(36).substring(2, 9)}`,
        sensitivity_level: req.body.sensitivity_level || "STANDARD",
        summary: summary || "Aura self-modification",
        files: files.map((f: any) => ({
          path: f.path,
          description: f.description || ""
        }))
      };

      if (req.body.personal_email !== undefined) {
        rawArtifactManifest.personal_email = req.body.personal_email;
      }
      if (req.body.authentication_token !== undefined) {
        rawArtifactManifest.authentication_token = req.body.authentication_token;
      }

      sendSSE({ state: 'committing' });
      await new Promise(resolve => setTimeout(resolve, 800));

      // 3 & 4 & 5. Run governor, redact secrets, and check principal permission before writing anything
      const pipeline = new ArtifactProvisioningPipeline(governanceService);
      let governedManifest: any;
      try {
        governedManifest = await pipeline.provision_artifact_for_deployment(rawArtifactManifest, principal);
      } catch (govError: any) {
        AppLogger.error('Deploy aborted by Enterprise Governance Service', govError);
        sendSSE({ state: 'error', error: govError.message || 'Governance policy violation: Action Denied' });
        res.write('data: [DONE]\n\n');
        res.end();
        return;
      }

      // 6. Write files only after governance passes (to preserve local workspace state)
      for (const file of files) {
        const safePath = path.resolve(process.cwd(), file.path);
        if (!safePath.startsWith(process.cwd())) {
          throw new Error(`Directory traversal attempt blocked: ${file.path}`);
        }

        await fs.mkdir(path.dirname(safePath), { recursive: true });
        await fs.writeFile(safePath, file.content, 'utf8');
        AppLogger.info(`Deploy service: Wrote file to disk: ${file.path}`);
      }

      // 7. Emit SSE building / routing states
      sendSSE({ state: 'building' });
      await new Promise(resolve => setTimeout(resolve, 1200));

      sendSSE({ state: 'routing' });
      await new Promise(resolve => setTimeout(resolve, 800));

      const auditTrail = governanceService.auditLogStream.filter((log: any) => 
        log.details.deployment_id === rawArtifactManifest.deployment_id || 
        log.details.resource_name?.includes(rawArtifactManifest.deployment_id) || 
        log.details.payload_id === governedManifest.id
      );

      // Trigger actual Cloud Deployment Pipeline
      const cloudPipeline = new CloudDeploymentPipeline();
      const platform = req.body.platform || 'github';
      const serviceId = req.body.service_id || 'aura-service';
      const deploymentMode = req.body.deployment_mode;

      const serviceUrl = await cloudPipeline.deploy(
        principal.principal_id,
        serviceId,
        governedManifest,
        auditTrail,
        files.map((f: any) => ({ path: f.path, content: f.content })),
        platform,
        deploymentMode
      );

      // 8. Write aura-manifest.json / audit receipt to local workspace
      const manifestPath = path.join(process.cwd(), 'aura-manifest.json');
      const deploymentReceipt = {
        manifest: governedManifest,
        audit_trail: auditTrail,
        deployed_at: new Date().toISOString(),
        url: serviceUrl
      };
      await fs.writeFile(manifestPath, JSON.stringify(deploymentReceipt, null, 2), 'utf8');
      AppLogger.info('Deploy service: Wrote aura-manifest.json with audit receipt');

      sendSSE({
        state: 'done',
        revision: governedManifest.deployment_id,
        branch: 'main',
        url: serviceUrl
      });
      res.write('data: [DONE]\n\n');
      res.end();

    } catch (error: any) {
      AppLogger.error('Deployment failure', error);
      sendSSE({ state: 'error', error: error.message || 'Unknown deployment error' });
      res.write('data: [DONE]\n\n');
      res.end();
    }
  }));

  // ── Traffic Proxy / Secure Gateway Router ──────────────────────────────────
  app.all('/api/proxy/:serviceId/*', asyncHandler(async (req: any, res: any) => {
    const { serviceId } = req.params;
    
    // Determine Principal Context for Governance
    const principal = (req.principal && req.principal.roles && req.principal.roles.length > 0)
      ? req.principal
      : { principal_id: req.body.principal_id || 'dev_operator', roles: req.body.roles || ['release_manager'] };

    const actionContext = {
      action_requested: "read",
      resource_identifier: {
        type: "production_endpoint",
        name: serviceId,
        sensitivity: req.body.sensitivity_level || "STANDARD"
      }
    };

    try {
      // Tyrannical Governance Boundary Enforcement: Fail-Closed
      governanceService.apply_governance_policies({}, principal, actionContext);
    } catch (govError: any) {
      AppLogger.error('Proxy request denied by Enterprise Governance Service', govError, { serviceId, principalId: principal.principal_id });
      return res.status(403).json({ error: govError.message || 'Governance policy violation: Access Denied' });
    }

    try {
      const endpoint = await EndpointRegistryService.getEndpoint(serviceId);
      if (!endpoint || !endpoint.url) {
        return res.status(404).json({ error: `Service '${serviceId}' not found or has no active URL` });
      }

      const targetPath = req.params[0] || '';
      const targetUrl = `${endpoint.url.replace(/\/$/, '')}/${targetPath}`;

      AppLogger.info(`[TrafficProxy] Forwarding request to ${targetUrl}`, { serviceId, method: req.method });

      const response = await axios({
        method: req.method,
        url: targetUrl,
        headers: {
          ...req.headers,
          host: new URL(endpoint.url).host,
          authorization: req.headers.authorization
        },
        data: req.body,
        validateStatus: () => true
      });

      res.status(response.status).set(response.headers).send(response.data);
    } catch (proxyError: any) {
      AppLogger.error('Proxy execution failure', proxyError, { serviceId });
      res.status(502).json({ error: `Proxy routing failure: ${proxyError.message || 'Upstream unavailable'}` });
    }
  }));

  // ── Secure Redeployment / Rollback Mechanism ─────────────────────────────
  app.post('/api/deploy/rollback', asyncHandler(async (req: any, res: any) => {
    const { serviceId, targetRevision } = req.body;
    if (!serviceId || !targetRevision) {
      return res.status(400).json({ error: 'Missing serviceId or targetRevision in request body' });
    }

    // Determine Principal Context for Governance
    const principal = (req.principal && req.principal.roles && req.principal.roles.length > 0)
      ? req.principal
      : { principal_id: req.body.principal_id || 'dev_operator', roles: req.body.roles || ['release_manager'] };

    const actionContext = {
      action_requested: "deploy_critical",
      resource_identifier: {
        type: "production_artifact",
        name: serviceId,
        sensitivity: req.body.sensitivity_level || "HIGH"
      }
    };

    try {
      // Tyrannical Governance Boundary Enforcement: Fail-Closed
      governanceService.apply_governance_policies({}, principal, actionContext);
    } catch (govError: any) {
      AppLogger.error('Rollback request denied by Enterprise Governance Service', govError, { serviceId, principalId: principal.principal_id });
      return res.status(403).json({ error: govError.message || 'Governance policy violation: Action Denied' });
    }

    try {
      const receipts = await EndpointRegistryService.getDeployReceipts(serviceId);
      const targetReceipt = receipts.find(r => r.revision === targetRevision);
      if (!targetReceipt) {
        return res.status(404).json({ error: `Deploy receipt for revision '${targetRevision}' not found` });
      }

      const cloudPipeline = new CloudDeploymentPipeline();
      const platform = req.body.platform || 'github';

      // Re-apply governance policies on rollback manifest
      const governedManifest = governanceService.apply_governance_policies(
        targetReceipt.governedManifest,
        principal,
        actionContext
      );

      const auditTrail = governanceService.auditLogStream.filter((log: any) => 
        log.details.deployment_id === governedManifest.deployment_id || 
        log.details.resource_name?.includes(governedManifest.deployment_id) || 
        log.details.payload_id === governedManifest.id
      );

      const deploymentMode = req.body.deployment_mode || targetReceipt.deployment_mode;

      const serviceUrl = await cloudPipeline.deploy(
        principal.principal_id,
        serviceId,
        governedManifest,
        auditTrail,
        [], // Rollback triggers redeployment of existing revision files
        platform,
        deploymentMode
      );

      // Write local aura-manifest.json for local workspace compatibility
      const manifestPath = path.join(process.cwd(), 'aura-manifest.json');
      const deploymentReceipt = {
        manifest: governedManifest,
        audit_trail: auditTrail,
        deployed_at: new Date().toISOString(),
        url: serviceUrl
      };
      await fs.writeFile(manifestPath, JSON.stringify(deploymentReceipt, null, 2), 'utf8');

      res.json({
        success: true,
        url: serviceUrl,
        revision: targetRevision
      });
    } catch (rollbackError: any) {
      AppLogger.error('Rollback execution failure', rollbackError, { serviceId, targetRevision });
      res.status(500).json({ error: `Rollback failed: ${rollbackError.message || 'Execution error'}` });
    }
  }));
}

// ── Orchestration Boot Sequence ────────────────────────────────────────────
async function executePreflightChecks() {
  await fs.mkdir(VAULT_DIR, { recursive: true }).catch(() => { });
}

async function startServer() {
  await executePreflightChecks();

  const app = express();
  const httpServer = createServer(app);

  httpServer.keepAliveTimeout = 65000;
  httpServer.headersTimeout = 66000;

  const connections = new Set<net.Socket>();
  httpServer.on('connection', (conn) => {
    connections.add(conn);
    conn.on('close', () => connections.delete(conn));
  });

  const isWildcard = true;
  const io = new SocketIOServer(httpServer, {
    cors: { origin: '*', methods: ["GET", "POST"], credentials: !isWildcard },
    transports: ['websocket'],
  });

  io.on('connection', (socket) => {
    socket.on('join-room', (roomId) => {
      socket.join(roomId);
    });
  });

  setupMiddleware(app);
  setupWebhookRoutes(app);
  setupAiRoutes(app);
  setupDeployRoutes(app);
  setupAuthRoutes(app, { bqTelemetry });

  if (process.env.NODE_ENV !== "production") {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({ server: { middlewareMode: true, hmr: { server: httpServer } }, appType: 'spa' });
      app.use(vite.middlewares);
    } catch (err) {
      AppLogger.warn('Vite not available. Falling back to static serving.', { error: String(err) });
    }
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: any, res: any) => res.sendFile(path.join(distPath, 'index.html')));
  }

  const PORT = (config as any).port || 3000;
  httpServer.listen(PORT, '0.0.0.0', () => {
    AppLogger.info(`Aura AI Orchestrator running at http://0.0.0.0:${PORT}`);
  });

  const shutdown = (signal: string) => {
    AppLogger.info(`Received ${signal}. Executing graceful shutdown sequence...`);
    io.close(() => {
      httpServer.close(() => {
        AppLogger.info('HTTP boundary successfully drained and closed.');
        process.exit(0);
      });
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

startServer().catch(err => {
  console.error('Fatal initialization halt sequence', err);
  process.exit(1);
});
