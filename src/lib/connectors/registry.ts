import type { ConnectorConfig, ConnectorId } from './types';

export const CONNECTOR_REGISTRY: Record<ConnectorId, ConnectorConfig> = {
  google_drive: {
    id: 'google_drive',
    label: 'Google Drive',
    provider: 'google',
    authType: 'oauth_user',
    description: 'Access Drive files and folders.',
    actions: {
      list_files: {
        mode: 'read',
        description: 'List files visible to the authenticated user.',
        approvalRequired: false,
        headlessAllowed: true,
        requiredScopes: ['https://www.googleapis.com/auth/drive.readonly'],
      },
      read_file: {
        mode: 'read',
        description: 'Read a selected Drive file.',
        approvalRequired: false,
        headlessAllowed: true,
        requiredScopes: ['https://www.googleapis.com/auth/drive.readonly'],
      },
      create_doc_from_artifact: {
        mode: 'write',
        description: 'Create a Google Doc from an AURA artifact.',
        approvalRequired: true,
        headlessAllowed: false,
        requiredScopes: ['https://www.googleapis.com/auth/documents'],
      },
    },
  },

  google_docs: {
    id: 'google_docs',
    label: 'Google Docs',
    provider: 'google',
    authType: 'oauth_user',
    description: 'Create and manage Google Docs workflows.',
    actions: {
      create_doc: {
        mode: 'write',
        description: 'Create a new Google Doc.',
        approvalRequired: true,
        headlessAllowed: false,
        requiredScopes: ['https://www.googleapis.com/auth/documents'],
      },
    },
  },

  google_sheets: {
    id: 'google_sheets',
    label: 'Google Sheets',
    provider: 'google',
    authType: 'oauth_user',
    description: 'Read and update spreadsheet data.',
    actions: {
      read_sheet: {
        mode: 'read',
        description: 'Read spreadsheet data.',
        approvalRequired: false,
        headlessAllowed: true,
        requiredScopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
      },
      update_sheet: {
        mode: 'write',
        description: 'Update spreadsheet data.',
        approvalRequired: true,
        headlessAllowed: false,
        requiredScopes: ['https://www.googleapis.com/auth/spreadsheets'],
      },
    },
  },

  gmail: {
    id: 'gmail',
    label: 'Gmail',
    provider: 'google',
    authType: 'oauth_user',
    description: 'Read, summarize, draft, and send email.',
    actions: {
      summarize_inbox: {
        mode: 'read',
        description: 'Summarize inbox messages.',
        approvalRequired: false,
        headlessAllowed: true,
        requiredScopes: ['https://www.googleapis.com/auth/gmail.readonly'],
      },
      draft_email: {
        mode: 'write',
        description: 'Create an email draft.',
        approvalRequired: true,
        headlessAllowed: false,
        requiredScopes: ['https://www.googleapis.com/auth/gmail.compose'],
      },
      send_email: {
        mode: 'write',
        description: 'Send an email.',
        approvalRequired: true,
        headlessAllowed: false,
        requiredScopes: ['https://www.googleapis.com/auth/gmail.send'],
      },
    },
  },

  google_calendar: {
    id: 'google_calendar',
    label: 'Google Calendar',
    provider: 'google',
    authType: 'oauth_user',
    description: 'Read and manage calendar events.',
    actions: {
      list_events: {
        mode: 'read',
        description: 'List upcoming calendar events.',
        approvalRequired: false,
        headlessAllowed: true,
        requiredScopes: ['https://www.googleapis.com/auth/calendar.readonly'],
      },
      create_event: {
        mode: 'write',
        description: 'Create a calendar event.',
        approvalRequired: true,
        headlessAllowed: false,
        requiredScopes: ['https://www.googleapis.com/auth/calendar.events'],
      },
    },
  },

  github: {
    id: 'github',
    label: 'GitHub',
    provider: 'github',
    authType: 'oauth_or_pat',
    description: 'Read repositories and create governed pull requests.',
    actions: {
      read_repo_file: {
        mode: 'read',
        description: 'Read a repository file.',
        approvalRequired: false,
        headlessAllowed: true,
      },
      create_pull_request: {
        mode: 'write',
        description: 'Create a pull request from an AURA artifact.',
        approvalRequired: true,
        headlessAllowed: false,
      },
    },
  },

  kalshi: {
    id: 'kalshi',
    label: 'Kalshi',
    provider: 'kalshi',
    authType: 'service_signed_request',
    description: 'Read Kalshi markets and live event data under governance.',
    actions: {
      get_markets: {
        mode: 'read',
        description: 'Get active Kalshi markets.',
        approvalRequired: false,
        headlessAllowed: true,
        requiredSecrets: ['KALSHI_API_KEY_ID', 'KALSHI_PRIVATE_KEY'],
      },
      get_game_stats: {
        mode: 'read',
        description: 'Get play-by-play game stats for a supported Kalshi milestone.',
        approvalRequired: false,
        headlessAllowed: true,
        requiredSecrets: ['KALSHI_API_KEY_ID', 'KALSHI_PRIVATE_KEY'],
      },
      get_portfolio: {
        mode: 'financial_state',
        description: 'Read account-specific Kalshi portfolio state.',
        approvalRequired: true,
        headlessAllowed: false,
        requiredSecrets: ['KALSHI_API_KEY_ID', 'KALSHI_PRIVATE_KEY'],
      },
      create_order: {
        mode: 'financial_mutation',
        description: 'Create a Kalshi order.',
        approvalRequired: true,
        headlessAllowed: false,
        requiredSecrets: ['KALSHI_API_KEY_ID', 'KALSHI_PRIVATE_KEY'],
      },
    },
  },
};

export function getConnectorConfig(connectorId: ConnectorId): ConnectorConfig {
  const config = CONNECTOR_REGISTRY[connectorId];

  if (!config) {
    throw new Error(`Unknown connector: ${connectorId}`);
  }

  return config;
}
