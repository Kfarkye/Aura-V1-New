export function buildGenerateMcpPayload(params: {
  specUrl?: string;
  specContent?: string;
  name: string;
  options: Record<string, unknown>;
  governanceRules?: unknown;
  targetArtifact?: string;
}) {
  return {
    specUrl: params.specUrl,
    specContent: params.specContent,
    name: params.name,
    options: params.options,
    governanceRules: params.governanceRules,
    targetArtifact: params.targetArtifact,
  };
}

export function buildDeployPreviewPayload(params: {
  targetName: string;
  targetRuntime: string;
  governanceRules: unknown;
  options: Record<string, unknown>;
  environment?: "preview" | "production" | string;
  files?: string[];
  summary?: string;
}) {
  return {
    targetName: params.targetName,
    targetRuntime: params.targetRuntime,
    governanceRules: params.governanceRules,
    options: params.options,
    environment: params.environment || "preview",
    files: params.files || [],
    summary: params.summary || "AURA Cloud Deploy",
  };
}

export function buildSandboxRunPayload(params: {
  targetName: string;
  action: "diagnostics" | "list_tools" | "smoke_test" | string;
  files: string[];
}) {
  return {
    targetName: params.targetName,
    action: params.action,
    files: params.files,
  };
}

export function buildRegistryEntry(params: {
  name: string;
  description: string;
  status: string;
  endpoint?: string;
  deployment_mode: string;
  runtime: string;
  source_receipt_id?: string;
  updated_at?: string;
  source_repo?: string;
  commit_sha?: string;
}) {
  return {
    name: params.name,
    description: params.description,
    status: params.status,
    endpoint: params.endpoint || "",
    deployment_mode: params.deployment_mode,
    runtime: params.runtime,
    source_receipt_id: params.source_receipt_id,
    updated_at: params.updated_at || new Date().toISOString(),
    source_repo: params.source_repo,
    commit_sha: params.commit_sha,
  };
}

export function buildAssistantChatPayload(params: {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  context: Record<string, unknown>;
}) {
  return {
    messages: params.messages,
    context: params.context,
  };
}

export function buildIndexDocsPayload(params: { directory: string }) {
  return {
    directory: params.directory,
  };
}

export function buildSearchDocsPayload(params: { query: string }) {
  return {
    query: params.query,
  };
}

export function buildGithubSavePayload(params: {
  targetName: string;
  files: Array<{ path: string; content: string }>;
}) {
  return {
    targetName: params.targetName,
    files: params.files,
  };
}
