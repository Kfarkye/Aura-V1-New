export class DataIntegrityEnforcer {
  static readonly REDACTION_TOKEN = "[ENTERPRISE_REDACTED_BY_POLICY]";

  enforce_policy_on_dict(data: Record<string, any>): Record<string, any> {
    const processed = { ...data };
    if ('personal_email' in processed) {
      processed['personal_email'] = DataIntegrityEnforcer.REDACTION_TOKEN;
    }
    if ('authentication_token' in processed) {
      processed['authentication_token'] = DataIntegrityEnforcer.REDACTION_TOKEN;
    }
    return processed;
  }
}

export class AccessControlEnforcer {
  enforce_access(principalContext: Record<string, any>, actionRequested: string, resourceIdentifier: Record<string, any>): boolean {
    const principalRoles = principalContext.roles || [];
    const resourceType = resourceIdentifier.type || 'UNKNOWN';
    const resourceSensitivity = resourceIdentifier.sensitivity || 'STANDARD';

    if (principalRoles.includes('global_administrator')) {
      return true;
    }

    if (actionRequested === 'read' && !['TOP_SECRET', 'CONFIDENTIAL'].includes(resourceSensitivity)) {
      return true;
    }

    if (actionRequested === 'deploy_critical' && principalRoles.includes('release_manager') && resourceType === 'production_artifact') {
      return true;
    }

    return false;
  }
}

export class EnterpriseGovernanceService {
  private dataIntegrityEnforcer = new DataIntegrityEnforcer();
  private accessControlEnforcer = new AccessControlEnforcer();
  public auditLogStream: Array<Record<string, any>> = [];

  apply_data_integrity_policies(dataPayload: Record<string, any>): Record<string, any> {
    const processed = this.dataIntegrityEnforcer.enforce_policy_on_dict(dataPayload);
    this._record_audit_event("data_integrity_policy_applied", {
      original_payload_hash: this.simpleHash(JSON.stringify(dataPayload)),
      processed_payload_hash: this.simpleHash(JSON.stringify(processed))
    });
    return processed;
  }

  authorize_operational_action(principalContext: Record<string, any>, actionRequested: string, resourceIdentifier: Record<string, any>): void {
    const isGranted = this.accessControlEnforcer.enforce_access(principalContext, actionRequested, resourceIdentifier);
    this._record_audit_event("access_control_policy_evaluated", {
      principal_id: principalContext.principal_id,
      action_requested: actionRequested,
      resource_type: resourceIdentifier.type,
      resource_name: resourceIdentifier.name,
      authorization_granted: isGranted
    });

    if (!isGranted) {
      throw new Error(`ACCESS_DENIED: Principal '${principalContext.principal_id}' lacks authorization for '${actionRequested}' on resource '${resourceIdentifier.name}'.`);
    }
  }

  apply_governance_policies(operationalPayload: Record<string, any>, principalContext?: Record<string, any>, actionContext?: Record<string, any>): Record<string, any> {
    // 1. Data Integrity and Privacy Policy Enforcement
    const governedPayload = this.apply_data_integrity_policies(operationalPayload);

    // 2. Access Control Policy Enforcement
    if (principalContext && actionContext) {
      const resourceIdentifier = actionContext.resource_identifier || {};
      this.authorize_operational_action(principalContext, actionContext.action_requested, resourceIdentifier);
    }

    this._record_audit_event("all_enterprise_governance_policies_applied", {
      payload_id: governedPayload.id || "N/A",
      status: "SUCCESS"
    });

    return governedPayload;
  }

  public _record_audit_event(eventType: string, details: Record<string, any>) {
    this.auditLogStream.push({
      timestamp_utc: new Date().toISOString(),
      event_type: eventType,
      details: details
    });
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0; // Convert to 32bit integer
    }
    return hash;
  }
}
