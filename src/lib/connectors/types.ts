export type ConnectorStatus = 'connected' | 'disconnected' | 'expired' | 'not_configured';

export type ConnectorAuthType = 'oauth2' | 'api_key' | 'none';

export type ConnectorCategory = 'productivity' | 'development' | 'media' | 'finance' | 'utility';

export interface ConnectorToolField {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required?: boolean;
}

export interface ConnectorTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, ConnectorToolField>;
    required?: string[];
  };
}

export interface Connector {
  id: string;
  name: string;
  description: string;
  category: ConnectorCategory;
  icon: string; // Name of Lucide Icon
  authType: ConnectorAuthType;
  status: ConnectorStatus;
  scopes?: string[];
  configFields?: {
    key: string;
    label: string;
    type: 'password' | 'text' | 'boolean';
    placeholder?: string;
    description: string;
    required: boolean;
  }[];
  tools: ConnectorTool[];
}

export interface ConnectorConfig {
  connectorId: string;
  accessToken?: string;
  apiKey?: string;
  refreshToken?: string;
  expiresAt?: number; // timestampms
  meta?: Record<string, any>;
}

export interface ConnectorRuntimeResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}
