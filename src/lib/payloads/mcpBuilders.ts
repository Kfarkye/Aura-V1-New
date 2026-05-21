export function buildGenerateMcpPayload(params: { specUrl?: string; specContent?: string; name: string; options: any; governanceRules?: any; targetArtifact?: string }) {
  return {
    specUrl: params.specUrl,
    specContent: params.specContent,
    name: params.name,
    options: params.options,
    governanceRules: params.governanceRules,
    targetArtifact: params.targetArtifact
  };
}

export function buildDeployPreviewPayload(params: { targetName: string; targetRuntime: string; governanceRules: any; options: any; environment?: string; files?: any[]; summary?: string }) {
  return {
    targetName: params.targetName,
    targetRuntime: params.targetRuntime,
    governanceRules: params.governanceRules,
    options: params.options,
    environment: params.environment || "preview",
    files: params.files || [],
    summary: params.summary || "AURA Cloud Deploy"
  };
}

export function buildSandboxRunPayload(params: { name: string; targetArtifact: string }) {
  return {
    name: params.name,
    targetArtifact: params.targetArtifact
  };
}

export function buildRegistryEntry(params: { name: string; description: string; status: string; endpoint: string; deployment_mode: string; runtime: string; source_receipt_id?: string; updated_at?: string }) {
  return {
    name: params.name,
    description: params.description,
    status: params.status,
    endpoint: params.endpoint,
    deployment_mode: params.deployment_mode,
    runtime: params.runtime,
    source_receipt_id: params.source_receipt_id || "null",
    updated_at: params.updated_at || new Date().toISOString()
  };
}

export function buildAssistantChatPayload(params: { messages: any[]; vault: Record<string, string> }) {
  // Sanitize Vault: only return keys and presence, not raw values
  // unless explicitly requested by the backend for execution context.
  const sanitizedVault = Object.keys(params.vault).reduce((acc, key) => {
    acc[key] = { credential_present: !!params.vault[key] };
    return acc;
  }, {} as Record<string, { credential_present: boolean }>);

  return {
    messages: params.messages,
    vaultData: sanitizedVault // Safe mapping
  };
}
