"""Pydantic schemas for Violation endpoints."""

from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class ViolationCreate(BaseModel):
    camera_id: str
    violation_type: str
    confidence: float = Field(ge=0.0, le=1.0)
    traffic_event_id: int | None = None
    plate_number: str | None = None
    vehicle_description: str | None = None
    evidence_snapshot: str | None = None
    evidence_video_ref: str | None = None


class ViolationResponse(BaseModel):
    id: str
    camera_id: str
    traffic_event_id: int | None
    violation_type: str
    confidence: float
    plate_number: str | None
    vehicle_description: str | None
    status: str
    evidence_snapshot: str | None
    evidence_video_ref: str | None
    reviewing_operator_id: str | None
    reviewed_at: datetime | None
    created_at: datetime | None
    audit_history: list | None

    model_config = ConfigDict(from_attributes=True)


class ViolationStatusUpdate(BaseModel):
    """Transition violation status (e.g. confirm, dismiss)."""
    status: str  # ViolationStatusEnum value
    justification: str | None = None
