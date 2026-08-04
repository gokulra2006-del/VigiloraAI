from datetime import datetime
from pydantic import BaseModel, Field
from models.enums import IncidentStatusEnum, SeverityEnum, AutonomyTierEnum, ApprovalStatusEnum, AlertSourceEnum

class IncidentCreate(BaseModel):
    camera_id: str | None = None
    type: str
    severity: SeverityEnum = SeverityEnum.medium
    description: str | None = None
    zone: str | None = None
    source: AlertSourceEnum = AlertSourceEnum.camera
    model_confidence: float | None = Field(default=None, ge=0.0, le=1.0)

class IncidentTransition(BaseModel):
    status: IncidentStatusEnum

class IncidentResponse(BaseModel):
    id: str
    camera_id: str | None
    type: str
    severity: SeverityEnum
    status: IncidentStatusEnum
    description: str | None
    assigned_to: str | None
    case_id: str | None = None

    detected_at: datetime | None
    acknowledged_at: datetime | None
    in_progress_at: datetime | None
    resolved_at: datetime | None
    closed_at: datetime | None

    justification_text: str | None = None
    correlation_group: str | None = None
    autonomy_tier: str | None = None
    approval_status: str | None = None
    zone: str | None = None
    source: str | None = None
    model_confidence: float | None = None
    evidence_refs: list | None = None
    audit_history: list | None = None

    model_config = {"from_attributes": True}
