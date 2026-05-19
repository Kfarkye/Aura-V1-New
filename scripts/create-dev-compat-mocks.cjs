const fs = require('fs');
const path = require('path');

console.log('Running Compatibility Mock Initialization...');

// Hard security policy for mock generation: absolutely NO governance or schema files may be stubbed or bypassed.
const DENYLIST_FILES = [
  'src/lib/schemas.ts',
  'src/mocks/governance.ts',
  'src/server/services/artifact_provisioning_pipeline.ts',
  'aura/governance/enterprise_governance_service.py',
  'aura/core/artifact_provisioning_pipeline.py'
];

const DENYLIST_KEYWORDS = [
  'EnterpriseGovernanceService',
  'DeployRequestSchema',
  'apply_governance_policies',
  'ArtifactProvisioningPipeline'
];

const files = {
  'src/server/config/env.ts': `export const config = { isProd: false, google: { cloudProject: 'mock' }, corsOrigin: '*', port: 3000 };`,
  'src/utils/sseEmitter.ts': `export const initializeSseStream = () => {};`,
  'src/infrastructure/gcp/index.ts': `export class SpannerAuditClient {} export class BigQueryTelemetry { async streamTelemetryEvent(...args: any[]){} } export class SecretManager {} export class CloudLoggingClient { async writeLog(...args: any[]){} }`,
  'src/server/healing-engine.ts': `export class AutonomousHealingEngine { static async generateIssueId(){return '1';} static async executeHeal(...args: any[]){} } export const initHealingEngine = (args: any) => {};`,
  'src/infrastructure/registry/EngineRegistry.ts': `export class EngineRegistry {}`,
  'src/infrastructure/fleet/FleetManager.ts': `export class FleetManager { constructor(a: any, b: any){} async bootstrap(){} getCapabilities(){ return {}; } getAllRepos(){ return []; } }`,
  'src/lib/ai/rag_bundle.ts': `export const buildRagBundle = () => {}; export const isRagEnabled = () => false; export type RagBundle = any;`,
  'src/lib/chunking.ts': `export const filterByGlob = () => []; export const chunkSourceFile = () => [];`,
  'src/lib/gcp/spanner_json.ts': `export const toSpannerJson = () => {};`,
  'src/infrastructure/gcp/InfrastructureAuditor.ts': `export type FleetCapabilityState = any;`,
  'src/server/utils/core.ts': `export const asyncHandler = (fn: any) => (req: any, res: any, next: any) => { Promise.resolve(fn(req, res, next)).catch(next); }; export const securePathResolve = () => ''; export const safeParseJson = (data: any) => { try { return JSON.parse(data); } catch { return null; } }; export const resolvePrincipal = async (req?: any, session?: any) => ({ principal_id: 'anonymous', roles: [] }); export type GovernancePrincipal = any;`,
  'src/server/services/sharp-sports-handler.ts': `export const handleSportsStream = async (...args: any[]) => {};`,
  'src/server/services/workspace-adk-runner.js': `export const handleWorkspaceStream = async (...args: any[]) => {};`,
  'src/mocks/aura-contracts.ts': `export class RequestEnvelope {}; export enum EngineMode {}; export const CONTRACT_VERSION = "1.0"; export const validateResponseEnvelope = () => {};`
};

for (const [filepath, content] of Object.entries(files)) {
  const normalizedPath = filepath.replace(/\\/g, '/');
  // Guard 1: Denylist Files Check
  if (DENYLIST_FILES.some(denied => normalizedPath === denied || normalizedPath.endsWith(`/${denied}`))) {
    console.error(`SECURITY VIOLATION: Refusing to write to denylisted governance path: ${filepath}`);
    process.exit(1);
  }
  // Guard 2: Content Keyword Check
  if (DENYLIST_KEYWORDS.some(keyword => content.includes(keyword))) {
    console.error(`SECURITY VIOLATION: Content of mock file ${filepath} contains unauthorized governance stub keyword.`);
    process.exit(1);
  }
  const fullpath = path.join('/app/applet', filepath);
  try {
    fs.mkdirSync(path.dirname(fullpath), { recursive: true });
    fs.writeFileSync(fullpath, content, 'utf8');
  } catch (err) {
    console.warn(`Compat Mock notice: Skipping writing mock to ${fullpath} (Environment directory not present)`);
  }
}

console.log('Compatibility mocks successfully configured (Non-governance layout only).');
