export type ConnectorId =
  | 'google_drive'
  | 'google_docs'
  | 'google_sheets'
  | 'gmail'
  | 'google_calendar'
  | 'github'
  | 'kalshi';

export type ConnectorAuthType =
  | 'oauth_user'
  | 'service_secret'
  | 'service_signed_request'
  | 'oauth_or_pat';

export type ConnectorActionMode =
  | 'read'
  | 'write'
  | 'financial_state'
  | 'financial_mutation'
  | 'admin';

export type ConnectorExecutionStatus =
  | 'success'
  | 'auth_required'
  | 'approval_required'
  | 'blocked'
  | 'error';

export interface ConnectorActionConfig {
  mode: ConnectorActionMode;
  description: string;
  approvalRequired: boolean;
  headlessAllowed: boolean;
  requiredScopes?: string[];
  requiredSecrets?: string[];
}

export interface ConnectorConfig {
  id: ConnectorId;
  label: string;
  provider: string;
  authType: ConnectorAuthType;
  description: string;
  actions: Record<string, ConnectorActionConfig>;
}

export interface ConnectorExecutionInput<TInput = unknown> {
  connector: ConnectorId;
  action: string;
  userId: string;
  input?: TInput;
  context?: Record<string, unknown>;
  requestId?: string;
}

export interface ConnectorAuthRequiredResult {
  status: 'auth_required';
  connector: ConnectorId;
  connectUrl: string;
  message: string;
}

export interface ConnectorApprovalRequiredResult {
  status: 'approval_required';
  connector: ConnectorId;
  action: string;
  approvalId: string;
  message: string;
}

export interface ConnectorBlockedResult {
  status: 'blocked';
  connector: ConnectorId;
  action: string;
  reason: string;
  receiptId?: string;
}

export interface ConnectorSuccessResult<TOutput = unknown> {
  status: 'success';
  connector: ConnectorId;
  action: string;
  output: TOutput;
  artifactId?: string;
  receiptId?: string;
}

export interface ConnectorErrorResult {
  status: 'error';
  connector: ConnectorId;
  action: string;
  error: {
    code: string;
    message: string;
  };
  receiptId?: string;
}

export type ConnectorExecutionResult<TOutput = unknown> =
  | ConnectorSuccessResult<TOutput>
  | ConnectorAuthRequiredResult
  | ConnectorApprovalRequiredResult
  | ConnectorBlockedResult
  | ConnectorErrorResult;

export interface ConnectorAuthContext {
  type: ConnectorAuthType;
  accessToken?: string;
  apiKey?: string;
  keyId?: string;
  privateKey?: string;
  expiresAt?: string;
  metadata?: Record<string, unknown>;
}

export interface ConnectorAdapter<TInput = unknown, TOutput = unknown> {
  execute(args: {
    action: string;
    input?: TInput;
    auth: ConnectorAuthContext;
    userId: string;
    context?: Record<string, unknown>;
  }): Promise<TOutput>;
}

export interface ConnectorReceipt {
  id: string;
  connector: ConnectorId;
  action: string;
  userId: string;
  status: ConnectorExecutionStatus;
  inputHash?: string;
  outputHash?: string;
  reason?: string;
  artifactId?: string;
  createdAt: string;
}
