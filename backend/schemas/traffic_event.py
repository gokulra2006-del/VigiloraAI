"""Pydantic schemas for TrafficEvent endpoints."""

from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class TrafficEventCreate(BaseModel):
    camera_id: str
    event_type: str
    confidence: float = Field(ge=0.0, le=1.0)
    location_description: str | None = None
    lane_number: int | None = None
    direction: str | None = None
    vehicle_class: str | None = None
    speed_kmh: float | None = None
    bbox_json: str | None = None
    snapshot_path: str | None = None
    metadata_json: dict | None = None


class TrafficEventResponse(BaseModel):
    id: int
    camera_id: str
    event_type: str
    confidence: float
    timestamp: datetime | None
    location_description: str | None
    lane_number: int | None
    direction: str | None
    vehicle_class: str | None
    speed_kmh: float | None
    bbox_json: str | None
    snapshot_path: str | None
    metadata_json: dict | None

    model_config = ConfigDict(from_attributes=True)


class TrafficEventFilter(BaseModel):
    """Query parameters for filtering traffic events."""
    camera_id: str | None = None
    event_type: str | None = None
    min_confidence: float | None = Field(default=None, ge=0.0, le=1.0)
    start_time: datetime | None = None
    end_time: datetime | None = None
    limit: int = Field(default=100, ge=1, le=1000)
    offset: int = Field(default=0, ge=0)
