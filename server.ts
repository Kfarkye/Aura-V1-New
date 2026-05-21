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
import { 
  ORCHESTRATOR_PROMPT, 
  SPORTS_SPECIALIST, 
  WORK_SPECIALIST, 
  DESIGN_SPECIALIST, 
  CODE_SPECIALIST,
  CRYPTO_SPECIALIST,
  MARKETS_SPECIALIST,
  MUSIC_SPECIALIST,
  AUTOMATION_SPECIALIST
} from './src/server/prompts.ts';
import { SpannerAuditClient, BigQueryTelemetry, SecretManager, CloudLoggingClient } from './src/infrastructure/gcp/index.ts';
import { AutonomousHealingEngine, initHealingEngine } from './src/server/healing-engine.ts';
import { EngineRegistry } from './src/infrastructure/registry/EngineRegistry.ts';
import { RequestEnvelope, EngineMode, CONTRACT_VERSION, validateResponseEnvelope } from './src/mocks/aura-contracts.ts';
import { EnterpriseGovernanceService } from './src/mocks/governance.ts';
import { FleetManager } from './src/infrastructure/fleet/FleetManager.ts';
import { buildRagBundle, isRagEnabled, type RagBundle } from './src/lib/ai/rag_bundle.ts';
import { filterByGlob, chunkSourceFile } from './src/lib/chunking.ts';
import { CloudTasksClient } from '@google-cloud/tasks';
import { Spanner } from '@google-cloud/spanner';
import { toSpannerJson } from './src/lib/gcp/spanner_json.ts';
import type { FleetCapabilityState } from './src/infrastructure/gcp/InfrastructureAuditor.ts';

import { setupAuthRoutes } from './src/server/routes/auth.ts';
import { addMcpGeneratorRoutes } from './src/server/mcp-generator.ts';

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

const createAiClient = (vault?: any) => {
  const apiKey = (vault && vault['GEMINI_API_KEY']) || process.env.GEMINI_API_KEY;
  const project = (vault && vault['GOOGLE_CLOUD_PROJECT']) || process.env.GOOGLE_CLOUD_PROJECT;
  const location = (vault && vault['GOOGLE_CLOUD_LOCATION']) || process.env.GOOGLE_CLOUD_LOCATION || 'us-west2';

  // If a custom cloud project is provided, attempt Vertex
  if (project && project !== 'gen-lang-client-0281999829') {
    return new GoogleGenAI({ enterprise: true, project, location });
  }
  
  // Default to standard AI Studio API Key (bypasses IAM 403s on the default project)
  return new GoogleGenAI({ apiKey: apiKey || 'MISSING_API_KEY' });
};

const ai = createAiClient();

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

      // Workspace URLs require OAuth and cannot be anonymously scraped
      if (['drive.google.com', 'docs.google.com', 'sheets.google.com', 'slides.google.com'].includes(urlObj.hostname)) {
        AppLogger.info('Perception Engine: Skipping authenticated workspace URL', { url, traceId });
        return { url, content: '[Google Workspace URLs cannot be anonymously scraped. Use the Drive integration.]' };
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
      if (error.response?.status === 401 || error.response?.status === 403) {
         AppLogger.warn('Perception Engine: Access denied', { url, status: error.response.status, traceId });
      } else {
         AppLogger.warn('Perception Engine: Fetch fault', { url, error: error.message, traceId });
      }
      return { url, content: `[System failed to fetch content from URL. Reason: ${error.message}]` };
    }
  }

  async processGroundingContext(userInput: string, payloadUrls: string[], traceId: string): Promise<{ contextText: string, urls: string[] }> {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    let extractedUrls: string[] = userInput.match(urlRegex) || [];
    
    // Clean trailing punctuation from URLs (e.g. if embedded in quotes, backticks, parens)
    extractedUrls = extractedUrls.map(u => u.replace(/[.,;:'"`)]+$/, ''));
    
    // Filter out obvious code template strings
    extractedUrls = extractedUrls.filter(u => !u.includes('${'));
    
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
    action: z.string().optional().describe("Action such as summarize_inbox, find_doc, draft_email, etc."),
    intent: z.string().min(5).optional().describe("Plain English intent description"),
    delete_emails_query: z.array(z.string()).optional().describe("List of Gmail search queries for deletion"),
  }).passthrough(),

  delegate_sports_query: z.object({
    action: z.string().optional().describe("Action such as team_trend, tonight_lines, live_state, game_log"),
    intent: z.string().optional().describe("Original user intent"),
    canonical_entities: z.array(z.object({
      type: z.string().optional(),
      id: z.string().optional()
    })).optional().describe("Strictly mapped canonical entities."),
    market_context: z.object({
      type: z.string().optional(),
      side: z.string().optional()
    }).optional()
  }).passthrough(),

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
    action: z.string().describe("The music control plane action to dispatch (e.g. 'play_music', 'search_music', 'add_to_playlist', 'create_playlist', 'get_playlists', 'get_now_playing', 'control_playback', 'play', 'save', 'share', 'discover')"),
    intent: z.string().optional().describe("Fuzzy natural language query, song details, or command intent"),
    track_id: z.string().optional().describe("Associated track ID (iTunes/YouTube) if applicable"),
    playlist_id: z.string().optional().describe("Associated playlist ID if applicable"),
    playlist_name: z.string().optional().describe("Associated playlist name if applicable"),
    command: z.string().optional().describe("The control playback command (e.g., 'pause', 'skip')")
  }),
  
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
    file_path: z.string().describe("The file path to modify, starting with / (e.g. /src/App.tsx)"),
    modification: z.string().describe("Summary of the changes (e.g. 'Added a button')"),
    new_content: z.string().min(1).describe("The complete entirely new content for the file. This replaces the old file."),
    modification_type: z.string().optional(),
    target_block_identifier: z.string().optional()
  }),
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
    await handleSportsStream({ 
        principal, 
        userMessage: args.intent || userInput, 
        canonicalEntities: args.canonical_entities, 
        marketContext: args.market_context, 
        systemInstruction: SPORTS_SPECIALIST,
        res 
    });
    return true; // Indicates the response stream was fully handled
  },
  delegate_work_query: async (res, args, principal, userInput, req) => {
    const { handleWorkspaceStream } = await import('./src/server/services/workspace-adk-runner.js');
    await handleWorkspaceStream({ 
        principal, 
        userMessage: args.intent || userInput, 
        systemInstruction: WORK_SPECIALIST,
        res, 
        firebaseClaims: (principal as any).claims || (req as any).firebaseClaims 
    });
    return true;
  },
  generate_react_app: async (res, args) => {
    // Escaping generic markdown generation. Yielding the full code payload.
    res.write(`\n\n[AURA_APP]\n${args.code}\n[/AURA_APP]\n\n`);
    return false; // False indicates it is an inline artifact; text stream may continue
  },
  propose_codebase_modification: async (res, args) => {
    // Generate canonical payload for the sandbox
    const payload = JSON.stringify({ 
      summary: args.modification, 
      files: [{ path: args.file_path, content: args.new_content }] 
    });
    res.write(`\n\n[AURA_APP_MODIFICATION]\n${payload}\n[/AURA_APP_MODIFICATION]\n\n`);
    return false;
  },
  // Seamless graceful fallbacks for other domains
  delegate_crypto_query: async (res, args) => { res.write(`\n\n[AURA_CRYPTO]\n${JSON.stringify(args)}\n[/AURA_CRYPTO]\n\n`); return false; },
  delegate_markets_query: async (res, args) => { res.write(`\n\n[AURA_MARKETS]\n${JSON.stringify(args)}\n[/AURA_MARKETS]\n\n`); return false; },
  delegate_music_query: async (res, args, principal, userInput) => {
    const { handleMusicStream } = await import('./src/server/services/music-handler.ts');
    await handleMusicStream({
        principal,
        userMessage: args.intent || userInput,
        action: args.action,
        systemInstruction: MUSIC_SPECIALIST,
        res
    });
    return true;
  },
  schedule_automation_query: async (res, args) => { res.write(`\n\n[AURA_AUTOMATION]\n${JSON.stringify(args)}\n[/AURA_AUTOMATION]\n\n`); return false; }
};

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
    // ── GATEWAY AUTHORIZATION ──
    const principal = req.principal; 
    
    // Shield boundary at the endpoint level
    if (typeof (governanceService as any).can === 'function' && !(governanceService as any).can(principal, 'execute:ai_chat')) {
      AppLogger.warn('Principal blocked at Gateway. Missing execute:ai_chat role.', { principalId: principal.principal_id, roles: principal.roles?.join(',') || 'none', traceId: req.traceId });
      return res.status(403).json({ error: "Principal does not have 'execute:ai_chat' grant." });
    } else if (typeof (governanceService as any).can !== 'function') {
        // Fallback check if 'can' method is missing during structural updates
        if (!principal.roles || (!principal.roles.includes('system') && !principal.roles.includes('execute:ai_chat'))) {
             AppLogger.warn('Principal blocked at Gateway (Fallback check).', { principalId: principal.principal_id, traceId: req.traceId });
             return res.status(403).json({ error: "Principal lacks authorization." });
        }
    }

    const { messages, mode, groundingUrls } = ChatRequestSchema.parse(req.body);
    let resolvedMode: string = mode;

    const userInput = messages[messages.length - 1]?.content || '';
    if (!userInput || userInput.trim().length === 0) {
      return res.status(400).json({ error: "missing_user_input", message: "Build loop requires explicit user input." });
    }

    AppLogger.info('Chat Request Initialized', { requestedMode: mode, resolvedMode, traceId: req.traceId, principalId: principal.principal_id });

    // ── AUTONOMOUS URL PERCEPTION & GROUNDING ──
    const { contextText, urls: processedUrls } = await perceptionEngine.processGroundingContext(userInput, groundingUrls || [], req.traceId);
    let systemInstruction = ORCHESTRATOR_PROMPT;

    if (contextText) {
      systemInstruction += contextText;
    }

    // Sanitize input format for Gemini SDK
    const contents = messages.map((m: any) => {
      const parts = [];
      if (m.functionCall) parts.push({ functionCall: m.functionCall });
      if (m.functionResponse) parts.push({ functionResponse: m.functionResponse });
      if (m.attachments?.length > 0) {
        parts.push(...m.attachments.map((a: any) => {
          const pureBase64 = a.data.includes(',') ? a.data.split(',')[1] : a.data;
          return { inlineData: { mimeType: a.mimeType, data: pureBase64 } };
        }));
      }
      if (m.content) parts.push({ text: m.content });
      if (parts.length === 0) parts.push({ text: ' ' }); // Fallback
      return { role: m.role, parts };
    });

    const recentEntities = await entityRegistry.query({ limit: 10 });
    if (recentEntities.length > 0) {
      systemInstruction += '\n\nRECENT ENTITIES (Reference their canonical aura:// URI):\n';
      systemInstruction += recentEntities.map(e => `- [${e.type}] ${e.uri}`).join('\n');
    }

    const repoContext = (req.body as any).repoContext;
    if (repoContext && repoContext.repo) {
      systemInstruction += `\n\nCONNECTED REPOSITORY: ${repoContext.repo} (branch: ${repoContext.branch || 'main'})\n`;
      if (repoContext.tree && Array.isArray(repoContext.tree)) {
        systemInstruction += `\nFILE TREE (${repoContext.tree.length} files):\n`;
        systemInstruction += repoContext.tree.map((f: any) => `- ${f.path} (${f.size || '?'}b)`).join('\n');
      }
      systemInstruction += `\nYou are connected to this repository. You can read files, analyze code, and make changes using the propose_codebase_modification tool.`;
    }

    let temperature = 0.5;

    // Explicit Cognitive Overrides
    const isComplex = ['research', 'coding', 'design', 'build', 'artifact'].includes(resolvedMode);
    
    switch (resolvedMode) {
      case 'research': systemInstruction += '\n\nMODE: RESEARCH — Conduct structural multi-source investigation.'; temperature = 0.3; break;
      case 'design': systemInstruction += '\n\n' + DESIGN_SPECIALIST; temperature = 0.2; break;
      case 'coding': systemInstruction += '\n\n' + CODE_SPECIALIST; temperature = 0.2; break;
      case 'artifact': temperature = 1.0; break;
    }

    // ── Primary ADK Orchestrator ──
    const chatConfig: any = { 
      systemInstruction, 
      temperature, 
      thinkingConfig: { thinkingBudget: 8192 } 
    };

    const useTools = ['chat', 'search', 'artifact', 'build', 'design', 'research'].includes(resolvedMode);
    if (useTools) {
      chatConfig.tools = [...ADK_TOOLS];
      if (resolvedMode === 'search') chatConfig.tools.push({ googleSearch: {} } as any);
    }

    if (resolvedMode === 'build') {
      chatConfig.toolConfig = { functionCallingConfig: { mode: 'AUTO', allowedFunctionNames: ['propose_codebase_modification'] } };
    } else if (resolvedMode === 'artifact' || resolvedMode === 'design') {
      chatConfig.toolConfig = { functionCallingConfig: { mode: 'AUTO', allowedFunctionNames: ['generate_react_app'] } };
    } else {
      chatConfig.toolConfig = { functionCallingConfig: { mode: 'AUTO' } };
    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.write(' ');

    let clientDisconnected = false;
    res.on('close', () => { clientDisconnected = true; });

    // ── DYNAMIC RETRY BUDGET (THE HEALING LOOP LIMIT) ──
    const getRetryBudget = (p: GovernancePrincipal & { tier?: string }, mode: string) => {
        if (p.tier === 'enterprise' || p.roles?.includes('premium_tier') || p.roles?.includes('global_administrator') || p.roles?.includes('system')) {
            return 3;
        }
        return isComplex ? 2 : 1; 
    };
    
    let maxRetries = getRetryBudget(principal, resolvedMode);
    let currentMessages = [...contents.slice(0, -1), contents[contents.length - 1]];

    const targetModel = isComplex ? MODEL_ROUTING.reasoning : MODEL_ROUTING.fast;

    while (maxRetries >= 0) {
      try {
        let chat;
        try {
          chat = ai.chats.create({
            model: targetModel,
            config: chatConfig,
            history: currentMessages.slice(0, -1)
          });
        } catch (initErr) {
           AppLogger.warn(`Primary model ${targetModel} unavailable, falling back`, { traceId: req.traceId, principalId: principal.principal_id });
           chat = ai.chats.create({
             model: isComplex ? MODEL_ROUTING.fallback_reasoning : MODEL_ROUTING.fallback_fast,
             config: chatConfig,
             history: currentMessages.slice(0, -1)
           });
        }

        const stream = await chat.sendMessageStream({ message: currentMessages[currentMessages.length - 1].parts });
        
        let streamedResponse = '';
        let isDelegated = false;
        let retryTriggered = false;

        for await (const chunk of stream) {
          if (clientDisconnected || res.writableEnded) break;

          // ── THE AUTONOMOUS HEALING EXECUTION BOUNDARY ──
          if (chunk.functionCalls && chunk.functionCalls.length > 0) {
            for (const call of chunk.functionCalls) {
              AppLogger.info(`[adk.orchestrator] Native Tool Invocation: ${call.name}`, { traceId: req.traceId, principalId: principal.principal_id });

              const schema = ADK_PAYLOAD_SCHEMAS[call.name as keyof typeof ADK_PAYLOAD_SCHEMAS];
              let pristineArgs: any;

              if (schema) {
                // THE GATEKEEPER WALL
                const validation = schema.safeParse(call.args);
                
                if (!validation.success) {
                  // INSTRUMENT FAILURE
                  const errorContext = validation.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(' | ');
                  AppLogger.warn(`[adk.boundary_rejection] Schema violation on ${call.name}`, { traceId: req.traceId, errors: errorContext, principalId: principal.principal_id });
                  
                  bqTelemetry.streamTelemetryEvent('LLM_SCHEMA_VIOLATION', {
                    traceId: req.traceId,
                    principal_id: principal.principal_id,
                    tool_name: call.name,
                    attempted_payload: JSON.stringify(call.args),
                    violations: errorContext
                  }).catch(() => {});

                  if (maxRetries > 0) {
                    // THE SELF-HEALING LOOP
                    maxRetries--;
                    currentMessages.push({ role: 'model', parts: [{ functionCall: call }] });
                    currentMessages.push({ 
                      role: 'user', 
                      parts: [{ 
                        functionResponse: {
                          name: call.name,
                          response: {
                            error: "SCHEMA_VALIDATION_FAILED",
                            details: errorContext,
                            instruction: "Correct your JSON payload to match the exact schema requirements and call the function again. Do NOT invent strings for Enums."
                          }
                        }
                      }]
                    });
                    retryTriggered = true;
                    break; 
                  } else {
                     res.write(`\n\n> [!WARNING]\n> **Blocked Action Receipt**\n> Agent attempted to execute \`${call.name}\` with a malformed payload. Zod firewall held.\n> Violations: ${errorContext}\n`);
                     isDelegated = true;
                     break;
                  }
                }
                pristineArgs = validation.data;
              } else {
                pristineArgs = call.args; 
              }

              if (retryTriggered) break;

              // ── PRISTINE O/C TYPE-SAFE DISPATCH ──
              try {
                const handler = ADK_DISPATCHER[call.name as keyof typeof ADK_DISPATCHER];
                if (handler) {
                  isDelegated = await handler(res, pristineArgs, principal, userInput, req);
                } else {
                  AppLogger.warn(`[adk.orchestrator] Unknown function call: ${call.name}`, { traceId: req.traceId, principalId: principal.principal_id });
                }
              } catch (subErr: any) {
                AppLogger.error(`[adk.orchestrator] Agent execution failed: ${call.name}`, subErr, { traceId: req.traceId, principalId: principal.principal_id });
                res.write(`\n\n> [!WARNING]\n> **Agent Delegation Failed**\n> Sub-Agent: \`${call.name}\`\n> Fault: ${subErr.message}\n`);
              }
            }
            if (retryTriggered || isDelegated) break; 
          }

          if (chunk.text && !isDelegated && !retryTriggered) {
            res.write(chunk.text);
            streamedResponse += chunk.text;
          }
        }

        if (retryTriggered) continue; // Loop again and let LLM heal itself
        
        if (streamedResponse.includes('[AURA_')) {
          entityRegistry.extractAndRegister(streamedResponse).catch(() => { });
        }
        
        if (!res.writableEnded) res.end();
        break; // Exit while loop naturally

      } catch (err: any) {
        AppLogger.error('Vertex AI Stream Rupture', err, { traceId: req.traceId, principalId: principal.principal_id });
        if (!res.headersSent) res.status(502).json({ error: 'Upstream AI provider connection failed' });
        else res.end('\n\n[SYSTEM FAULT: Stream unexpectedly terminated by backend policy.]');
        break;
      }
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
  
  const { chronosRouter } = await import('./src/services/automation-runner/index.ts');
  app.use(chronosRouter);

  setupWebhookRoutes(app);
  setupAiRoutes(app);
  setupAuthRoutes(app, { bqTelemetry });
  addMcpGeneratorRoutes(app);

  const { setupMusicRoutes } = await import('./src/server/routes/music.ts');
  setupMusicRoutes(app);

  app.use((err: any, req: any, res: any, next: any) => {
    AppLogger.error('Unhandled request boundary fault', err, { traceId: req.traceId });
    if (err && err.name === 'ZodError') {
      return res.status(400).json({ error: 'SCHEMA_VALIDATION_FAILED', details: err.errors });
    }
    res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', message: err.message || 'An unexpected error occurred.' });
  });

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
