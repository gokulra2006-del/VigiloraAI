from datetime import datetime
from pydantic import BaseModel
from models.enums import SecurityEventTypeEnum, SeverityEnum

class SecurityEventCreate(BaseModel):
    event_type: SecurityEventTypeEnum
    source_ip: str | None = None
    target_username: str | None = None
    description: str | None = None
    mitre_technique_id: str | None = None
    mitre_technique_name: str | None = None
    severity: SeverityEnum = SeverityEnum.medium

class SecurityEventResponse(BaseModel):
    id: int
    event_type: SecurityEventTypeEnum
    source_ip: str | None
    target_username: str | None
    description: str | None
    mitre_technique_id: str | None
    mitre_technique_name: str | None
    severity: SeverityEnum
    is_resolved: bool
    timestamp: datetime

    model_config = {"from_attributes": True}
