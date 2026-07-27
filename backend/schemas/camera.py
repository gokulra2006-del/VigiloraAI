"""Pydantic schemas for Camera endpoints."""

from datetime import datetime
from pydantic import BaseModel


class CameraCreate(BaseModel):
    id: str
    name: str
    status: str = "online"
    source_type: str = "real_hardware"
    location: str = ""
    fps: int = 30
    resolution: str = "1080p"
    active_models: list[str] = []


class CameraResponse(BaseModel):
    id: str
    name: str
    status: str
    source_type: str
    location: str | None
    fps: int | None
    resolution: str | None
    active_models: list | None
    created_at: datetime | None

    model_config = {"from_attributes": True}
