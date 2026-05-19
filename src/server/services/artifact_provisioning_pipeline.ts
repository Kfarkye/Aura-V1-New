import { EnterpriseGovernanceService } from '../../mocks/governance.ts';

export class ArtifactProvisioningPipeline {
  private enterpriseGovernanceService: EnterpriseGovernanceService;

  constructor(governanceService?: EnterpriseGovernanceService) {
    this.enterpriseGovernanceService = governanceService || new EnterpriseGovernanceService();
  }

  async provision_artifact_for_deployment(rawArtifactManifest: Record<string, any>, deployerPrincipal: Record<string, any>): Promise<Record<string, any>> {
    const actionContext = {
      action_requested: "deploy_critical",
      resource_identifier: {
        type: "production_artifact",
        name: rawArtifactManifest.deployment_id || "UNSPECIFIED_DEPLOYMENT",
        sensitivity: rawArtifactManifest.sensitivity_level || "STANDARD"
      }
    };

    try {
      const governedArtifactManifest = this.enterpriseGovernanceService.apply_governance_policies(
        rawArtifactManifest,
        deployerPrincipal,
        actionContext
      );
      return governedArtifactManifest;
    } catch (e: any) {
      this.enterpriseGovernanceService._record_audit_event(
        "artifact_deployment_provision_failed",
        {
          reason: e.message || String(e),
          deployment_id: rawArtifactManifest.deployment_id || "N/A",
          principal_id: deployerPrincipal.principal_id || "N/A"
        }
      );
      throw e;
    }
  }
}
