import pytest
from aura.core.artifact_provisioning_pipeline import ArtifactProvisioningPipeline

def test_pipeline_denies_unprivileged_deployer():
    """
    Initiate an artifact deployment request through ArtifactProvisioningPipeline
    with a simulated unprivileged deployer_principal and a resource_identifier
    marked as HIGH sensitivity; verify the deployment is explicitly denied with a PermissionError.
    """
    pipeline = ArtifactProvisioningPipeline()
    
    unprivileged_principal = {
        "principal_id": "unprivileged_operator",
        "roles": ["developer"]  # Lacks global_administrator or release_manager
    }
    
    raw_manifest = {
        "deployment_id": "critical-game-asset-004",
        "sensitivity_level": "HIGH",
        "personal_email": "operator@unprivileged.com",
        "authentication_token": "dev_token_abc123"
    }
    
    # Verify PermissionError is raised on deploy_critical
    with pytest.raises(PermissionError) as exc_info:
        pipeline.provision_artifact_for_deployment(raw_manifest, deployer_principal=unprivileged_principal)
        
    assert "ACCESS_DENIED" in str(exc_info.value)
    
    # Confirm that data integrity (redaction) is applied and logged on audit stream
    # as apply_governance_policies runs data integrity policies before access checks
    audit_logs = pipeline.enterprise_governance_service.audit_log_stream
    
    # Let's verify that a failed deployment logs 'artifact_deployment_provision_failed'
    assert any(log["event_type"] == "artifact_deployment_provision_failed" for log in audit_logs)
