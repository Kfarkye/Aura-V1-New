const fs = require('fs');
const path = require('path');

const files = {
  'src/lib/schemas.ts': `export const DeployRequestSchema = {};`,
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
  'src/mocks/aura-contracts.ts': `export class RequestEnvelope {}; export enum EngineMode {}; export const CONTRACT_VERSION = "1.0"; export const validateResponseEnvelope = () => {};`,
  'src/mocks/governance.ts': `export class EnterpriseGovernanceService { apply_governance_policies(...args: any[]) { return args[0]; } }`
};

for (const [filepath, content] of Object.entries(files)) {
  const fullpath = path.join('/app/applet', filepath);
  fs.mkdirSync(path.dirname(fullpath), { recursive: true });
  fs.writeFileSync(fullpath, content, 'utf8');
}
console.log('Dummy files created successfully!');
