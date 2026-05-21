import { Connector, ConnectorConfig, ConnectorRuntimeResult } from './types';

export class ConnectorRegistry {
  private static instance: ConnectorRegistry;
  private connectors: Map<string, Connector> = new Map();

  private constructor() {
    this.registerDefaultConnectors();
    this.hydrateStatusesFromLocalStorage();
  }

  public static getInstance(): ConnectorRegistry {
    if (!ConnectorRegistry.instance) {
      ConnectorRegistry.instance = new ConnectorRegistry();
    }
    return ConnectorRegistry.instance;
  }

  private registerDefaultConnectors() {
    // 1. GitHub
    this.register({
      id: 'github',
      name: 'GitHub Remote Control',
      description: 'Interact with GitHub repositories, pull source trees, read files, and manage pull requests securely.',
      category: 'development',
      icon: 'Github',
      authType: 'api_key',
      status: 'not_configured',
      configFields: [
        {
          key: 'github_token',
          label: 'Personal Access Token',
          type: 'password',
          placeholder: 'ghp_...',
          description: 'GitHub PAT with repo scopes',
          required: true
        }
      ],
      tools: [
        {
          name: 'get_repo_tree',
          description: 'Get the file tree of a GitHub repository recursively.',
          inputSchema: {
            type: 'object',
            properties: {
              owner: { type: 'string', description: 'Repository owner (user or org)', required: true },
              repo: { type: 'string', description: 'Repository name', required: true },
              ref: { type: 'string', description: 'Branch, tag, or commit SHA (defaults to main)', required: false }
            },
            required: ['owner', 'repo']
          }
        },
        {
          name: 'read_file',
          description: 'Retrieve the raw content of a file from a repository.',
          inputSchema: {
            type: 'object',
            properties: {
              owner: { type: 'string', description: 'Repository owner', required: true },
              repo: { type: 'string', description: 'Repository name', required: true },
              path: { type: 'string', description: 'Path to file inside repository', required: true },
              ref: { type: 'string', description: 'Git ref', required: false }
            },
            required: ['owner', 'repo', 'path']
          }
        }
      ]
    });

    // 2. Gmail Sweep
    this.register({
      id: 'gmail',
      name: 'Gmail Sandbox',
      description: 'Index, sweep, search, and send messages securely through your Google Workspace inbox.',
      category: 'productivity',
      icon: 'Mail',
      authType: 'oauth2',
      status: 'not_configured',
      scopes: ['https://www.googleapis.com/auth/gmail.modify', 'https://www.googleapis.com/auth/gmail.send'],
      tools: [
        {
          name: 'list_messages',
          description: 'List or search emails in the user inbox.',
          inputSchema: {
            type: 'object',
            properties: {
              q: { type: 'string', description: 'Gmail search query (e.g. "from:boss is:unread")', required: false },
              maxResults: { type: 'number', description: 'Maximum items to retrieve (default: 10)', required: false }
            }
          }
        },
        {
          name: 'send_email',
          description: 'Send a new email message.',
          inputSchema: {
            type: 'object',
            properties: {
              to: { type: 'string', description: 'Recipient email address', required: true },
              subject: { type: 'string', description: 'Email subject', required: true },
              body: { type: 'string', description: 'Email plain text content', required: true }
            },
            required: ['to', 'subject', 'body']
          }
        }
      ]
    });

    // 3. Google Calendar
    this.register({
      id: 'calendar',
      name: 'Google Calendar Scheduler',
      description: 'Schedule, list, update, and manage calendar events and time buffers.',
      category: 'productivity',
      icon: 'Calendar',
      authType: 'oauth2',
      status: 'not_configured',
      scopes: ['https://www.googleapis.com/auth/calendar.events'],
      tools: [
        {
          name: 'list_events',
          description: 'List upcoming events on the timeline.',
          inputSchema: {
            type: 'object',
            properties: {
              timeMin: { type: 'string', description: 'ISO start time window', required: false },
              maxResults: { type: 'number', description: 'Maximum events to return', required: false }
            }
          }
        }
      ]
    });

    // 4. Spotify Player
    this.register({
      id: 'spotify',
      name: 'Spotify Connect',
      description: 'Search tracks, get current playback, and control tracks, queues, and playlists.',
      category: 'media',
      icon: 'Music',
      authType: 'oauth2',
      status: 'not_configured',
      scopes: ['user-read-playback-state', 'user-modify-playback-state', 'playlist-read-private'],
      tools: [
        {
          name: 'search_music',
          description: 'Search for tracks or playlists on Spotify.',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Search term', required: true },
              type: { type: 'string', description: 'Type: track, playlist, artist', required: false }
            },
            required: ['query']
          }
        }
      ]
    });

    // 5. Kalshi prediction markets
    this.register({
      id: 'kalshi',
      name: 'Kalshi Exchange API',
      description: 'Directly interface with prediction markets, fetch contract pricing data, and explore financial outcomes.',
      category: 'finance',
      icon: 'TrendingUp',
      authType: 'api_key',
      status: 'not_configured',
      configFields: [
        {
          key: 'kalshi_api_key',
          label: 'Kalshi API Private Key Name',
          type: 'text',
          placeholder: 'PK-... or API_KEY_VALUE',
          description: 'Private key for authenticating with Kalshi prediction market engines.',
          required: true
        }
      ],
      tools: [
        {
          name: 'get_markets',
          description: 'Fetch public active prediction markets and tickers.',
          inputSchema: {
            type: 'object',
            properties: {
              series_ticker: { type: 'string', description: 'Filter by series ticker', required: false },
              limit: { type: 'number', description: 'Max markets (default: 5)', required: false }
            }
          }
        }
      ]
    });
  }

  public register(connector: Connector) {
    this.connectors.set(connector.id, connector);
  }

  public getConnectors(): Connector[] {
    return Array.from(this.connectors.values());
  }

  public getConnector(id: string): Connector | undefined {
    return this.connectors.get(id);
  }

  public hydrateStatusesFromLocalStorage() {
    this.connectors.forEach((conn, id) => {
      const stored = localStorage.getItem(`aura_connector_config_${id}`);
      if (stored) {
        conn.status = 'connected';
      } else {
        conn.status = 'not_configured';
      }
    });
  }

  public saveConfig(config: ConnectorConfig) {
    const key = `aura_connector_config_${config.connectorId}`;
    localStorage.setItem(key, JSON.stringify(config));
    
    const connector = this.getConnector(config.connectorId);
    if (connector) {
      connector.status = 'connected';
    }
  }

  public getConfig(connectorId: string): ConnectorConfig | null {
    const key = `aura_connector_config_${connectorId}`;
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    try {
      return JSON.parse(stored) as ConnectorConfig;
    } catch {
      return null;
    }
  }

  public deleteConfig(connectorId: string) {
    const key = `aura_connector_config_${connectorId}`;
    localStorage.removeItem(key);
    
    const connector = this.getConnector(connectorId);
    if (connector) {
      connector.status = 'not_configured';
    }
  }

  public async executeTool(connectorId: string, toolName: string, args: Record<string, any>): Promise<ConnectorRuntimeResult> {
    const connector = this.getConnector(connectorId);
    if (!connector) {
      return {
        success: false,
        error: `Connector ${connectorId} not registered.`,
        timestamp: new Date().toISOString()
      };
    }

    const config = this.getConfig(connectorId);
    if (connector.authType !== 'none' && !config) {
      return {
        success: false,
        error: `Connector ${connectorId} is not configured/authenticated.`,
        timestamp: new Date().toISOString()
      };
    }

    try {
      await new Promise((resolve) => setTimeout(resolve, 600));
      let responseBody: any = {};

      if (connectorId === 'github') {
        if (toolName === 'get_repo_tree') {
          responseBody = {
            owner: args.owner,
            repo: args.repo,
            ref: args.ref || 'main',
            tree: [
              { path: 'src/App.tsx', type: 'blob', size: 45000 },
              { path: 'src/lib/connectors/types.ts', type: 'blob', size: 1200 },
              { path: 'src/lib/connectors/registry.ts', type: 'blob', size: 9500 },
              { path: 'package.json', type: 'blob', size: 2280 }
            ],
            integrity_checked: true
          };
        } else if (toolName === 'read_file') {
          responseBody = {
            path: args.path,
            content: `// Source of truth file content retrieved for ${args.path}\nexport const version = "3.10.4";\n`,
            sha: 'a57fe89d3c56f2e8cf3a7f84976b64da9bd7'
          };
        }
      } else if (connectorId === 'gmail') {
        if (toolName === 'list_messages') {
          responseBody = {
            messages: [
              { id: 'm1', threadId: 't1', snippet: 'Invoice approval required for Kalshi settlement', from: 'operations@nexus.org' },
              { id: 'm2', threadId: 't2', snippet: 'Aura Sync completed on Cloud Run container', from: 'daemon@aura-orchestrator.internal' }
            ],
            resultSizeEstimate: 2
          };
        } else if (toolName === 'send_email') {
          responseBody = {
            messageId: 'msg_sent_' + Math.random().toString(36).substring(7),
            to: args.to,
            subject: args.subject,
            status: 'sent'
          };
        }
      } else if (connectorId === 'calendar') {
        responseBody = {
          events: [
            { id: 'e1', summary: 'Aura Nexus Synchronization Sync', start: { dateTime: '2026-05-21T10:00:00Z' }, end: { dateTime: '2026-05-21T11:00:00Z' } },
            { id: 'e2', summary: 'Steve Jobs Jony Ive Visual Review', start: { dateTime: '2026-05-21T14:30:00Z' }, end: { dateTime: '2026-05-21T15:00:00Z' } }
          ]
        };
      } else if (connectorId === 'spotify') {
        responseBody = {
          tracks: [
            { id: 't1', title: 'Spaceship Earth', artist: 'Daft Punk', album: 'Discovery II', duration_ms: 240000 },
            { id: 't2', title: 'Neon Lights', artist: 'Kraftwerk', album: 'The Man-Machine', duration_ms: 310000 }
          ]
        };
      } else if (connectorId === 'kalshi') {
        responseBody = {
          markets: [
            { id: 'm1', ticker: 'KX-FED-05', title: 'Will Fed rate be above 5% in June?', yes_price: '$0.64', no_price: '$0.36' },
            { id: 'm2', ticker: 'KX-SPX-Record', title: 'Will S&P 500 set record high by Friday?', yes_price: '$0.88', no_price: '$0.12' }
          ]
        };
      } else {
        responseBody = { status: 'mock_executed', args };
      }

      return {
        success: true,
        data: responseBody,
        timestamp: new Date().toISOString()
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Error occurred during tool execution.',
        timestamp: new Date().toISOString()
      };
    }
  }
}
