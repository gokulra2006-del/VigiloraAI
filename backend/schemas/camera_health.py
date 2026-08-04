"""Pydantic schemas for CameraHealth endpoints."""

from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class CameraHealthCreate(BaseModel):
    camera_id: str
    status: str = "healthy"
    cpu_temp: float | None = None
    fps_actual: float | None = None
    storage_used_pct: float | None = Field(default=None, ge=0.0, le=100.0)
    network_latency_ms: float | None = None
    uptime_seconds: int | None = None
    last_frame_hash: str | None = None
    notes: str | None = None


class CameraHealthResponse(BaseModel):
    id: int
    camera_id: str
    status: str
    cpu_temp: float | None
    fps_actual: float | None
    storage_used_pct: float | None
    network_latency_ms: float | None
    uptime_seconds: int | None
    last_frame_hash: str | None
    notes: str | None
    checked_at: datetime | None

    model_config = ConfigDict(from_attributes=True)
