"""Pydantic schemas for Alert endpoints."""

from datetime import datetime
from pydantic import BaseModel, ConfigDict


class AlertCreate(BaseModel):
    alert_type: str
    severity: str = "medium"
    source_type: str = "system"
    source_ref_id: str | None = None
    title: str
    message: str | None = None
    camera_id: str | None = None
    metadata_json: dict | None = None


class AlertResponse(BaseModel):
    id: str
    alert_type: str
    severity: str
    source_type: str
    source_ref_id: str | None
    title: str
    message: str | None
    status: str
    camera_id: str | None
    acknowledged_by: str | None
    acknowledged_at: datetime | None
    resolved_at: datetime | None
    created_at: datetime | None
    metadata_json: dict | None

    model_config = ConfigDict(from_attributes=True)
