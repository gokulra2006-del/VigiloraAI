from datetime import datetime
from pydantic import BaseModel, Field
from models.enums import IncidentStatusEnum, SeverityEnum

class IncidentCreate(BaseModel):
    camera_id: str | None = None
    type: str
    severity: SeverityEnum = SeverityEnum.medium
    description: str | None = None

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
    
    detected_at: datetime | None
    acknowledged_at: datetime | None
    in_progress_at: datetime | None
    resolved_at: datetime | None
    closed_at: datetime | None

    model_config = {"from_attributes": True}
