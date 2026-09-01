"""Pydantic schemas for Audio and Multimodal event data."""

from datetime import datetime
from pydantic import BaseModel, Field


class AudioEventCreate(BaseModel):
    camera_id: str | None = "cam-1"
    event_type: str = Field(..., description="e.g. glass_break, scream_aggression, loud_impact, alarm_siren")
    confidence: float = Field(..., ge=0.0, le=1.0)
    decibel_level: float | None = None
    duration: float = 1.0
    source: str = "audio"
    is_simulated: bool = False
    metadata_json: dict | None = None


class AudioEventResponse(BaseModel):
    id: str
    camera_id: str | None
    event_type: str
    confidence: float
    decibel_level: float | None
    duration: float
    source: str
    is_simulated: bool
    metadata_json: dict | None
    timestamp: datetime

    model_config = {"from_attributes": True}


class AudioSimulateRequest(BaseModel):
    event_type: str = Field(default="glass_break", description="glass_break | scream_aggression | loud_impact | alarm_siren")
    camera_id: str = "cam-1"
    confidence: float = 0.92
    duration: float = 1.5


class MultimodalCorrelationResponse(BaseModel):
    id: str
    incident_id: str
    incident_type: str
    severity: str
    camera_id: str | None
    audio_event_type: str
    audio_confidence: float
    visual_event_type: str | None
    visual_confidence: float | None
    combined_confidence: float
    correlation_window_seconds: float
    status: str
    justification_text: str | None
    timestamp: datetime