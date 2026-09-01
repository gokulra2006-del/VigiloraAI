"""Pydantic schemas for Camera endpoints."""

from datetime import datetime
from pydantic import BaseModel, ConfigDict


class CameraCreate(BaseModel):
    id: str | None = None
    name: str
    status: str = "online"
    source_type: str = "webcam"  # webcam | rtsp_phone | real_hardware | video_file
    location: str = ""
    fps: int = 30
    resolution: str = "1080p"
    active_models: list[str] = ["YOLOv8"]
    stream_url: str | None = None
    location_lat: float | None = None
    location_lng: float | None = None
    area: str | None = None
    installation_date: datetime | None = None


class CameraUpdate(BaseModel):
    name: str | None = None
    status: str | None = None
    source_type: str | None = None
    location: str | None = None
    fps: int | None = None
    resolution: str | None = None
    active_models: list[str] | None = None
    stream_url: str | None = None
    location_lat: float | None = None
    location_lng: float | None = None
    area: str | None = None


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
    stream_url: str | None = None
    location_lat: float | None = None
    location_lng: float | None = None
    last_heartbeat: datetime | None = None
    health_status: str | None = None
    installation_date: datetime | None = None
    area: str | None = None

    model_config = ConfigDict(from_attributes=True)

