"""Pydantic schemas for SOAR Engine (Security Orchestration, Automation & Response)."""

from datetime import datetime
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, ConfigDict, Field


class PlaybookCondition(BaseModel):
    field: str  # severity | threat_type | source | confidence
    operator: str = "=="  # == | != | >= | > | <= | in
    value: Any  # e.g. "CRITICAL", "ransomware", 0.85


class PlaybookActionDef(BaseModel):
    action: str  # isolate_endpoint | block_ip | revoke_session | create_incident | notify_soc | etc.
    label: Optional[str] = None
    target: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = None
    is_simulated: bool = True
    stop_on_failure: bool = False


class SOARPlaybookCreate(BaseModel):
    name: str
    description: Optional[str] = None
    category: str = "general"  # ransomware | brute_force | vision_ai | data_exfiltration | malware | general
    trigger_type: str = "threat_detected"  # threat_detected | critical_alert | case_opened | weapon_detected | manual
    conditions: List[PlaybookCondition] = []
    actions: List[PlaybookActionDef] = []
    execution_mode: str = "automatic"  # automatic | human_approval
    status: str = "active"  # active | inactive


class SOARPlaybookUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    trigger_type: Optional[str] = None
    conditions: Optional[List[PlaybookCondition]] = None
    actions: Optional[List[PlaybookActionDef]] = None
    execution_mode: Optional[str] = None
    status: Optional[str] = None


class SOARPlaybookResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    category: str
    trigger_type: str
    conditions_json: Optional[Any] = None
    actions_json: Optional[Any] = None
    execution_mode: str
    version: int
    status: str
    created_at: Optional[datetime] = None
    last_triggered: Optional[datetime] = None
    execution_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class SOARSimulationRequest(BaseModel):
    scenario_type: str = "ransomware"  # ransomware | brute_force | vision_ai | data_exfiltration | custom
    severity: str = "CRITICAL"  # LOW | MEDIUM | HIGH | CRITICAL
    threat_title: Optional[str] = None
    source: str = "SIEM Detection"  # SIEM | Network | Endpoint | Vision AI | Nova
    target_host: Optional[str] = "FINANCE-SRV-01"
    target_ip: Optional[str] = "192.168.1.185"
    confidence: float = 0.94
    playbook_id: Optional[str] = None
    execution_mode: Optional[str] = "automatic"


class SOARExecutionStep(BaseModel):
    step_index: int
    action_name: str
    action_label: str
    status: str  # SUCCESS | SIMULATED | FAILED | PENDING_APPROVAL
    timestamp: str
    log_message: str
    duration_ms: int = 120


class SecurityStateDelta(BaseModel):
    threat_status: str  # COMPROMISED -> CONTAINED
    endpoint_status: str  # ACTIVE -> ISOLATED
    session_status: str  # 3 ACTIVE -> REVOKED
    indicator_status: str  # MALICIOUS -> BLOCKED
    network_status: str  # CONNECTED -> RESTRICTED


class SOARExecutionResponse(BaseModel):
    execution_id: str
    playbook_id: str
    playbook_name: str
    trigger_event: str
    severity: str
    status: str  # CONTAINED | IN_PROGRESS | PENDING_APPROVAL | FAILED
    response_time_sec: float
    steps: List[SOARExecutionStep] = []
    terminal_logs: List[str] = []
    before_state: Dict[str, str] = {}
    after_state: Dict[str, str] = {}
    incident_id: Optional[str] = None
    is_simulation: bool = True
    executed_at: str


class SOARApprovalItem(BaseModel):
    id: int
    playbook_id: str
    playbook_name: str
    trigger_event: str
    tier: str
    status: str  # pending | approved | rejected
    action_name: str
    justification_text: Optional[str] = None
    created_at: Optional[datetime] = None


class SOARApprovalResponse(BaseModel):
    action: str  # approve | reject
    comment: Optional[str] = None


class SOARStatsResponse(BaseModel):
    active_playbooks: int
    executions_today: int
    threats_contained: int
    pending_approvals: int
    failed_actions: int
    success_rate_percent: float
    avg_response_time_sec: float


class SOARAuditLogItem(BaseModel):
    id: int
    execution_id: Optional[str] = None
    playbook_id: Optional[str] = None
    playbook_name: Optional[str] = None
    user: str
    trigger_event: str
    action: str
    status: str
    timestamp: str
    details: Optional[Dict[str, Any]] = None