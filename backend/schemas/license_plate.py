"""Pydantic schemas for LicensePlateRecord endpoints."""

from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class LicensePlateCreate(BaseModel):
    camera_id: str
    plate_number: str
    plate_confidence: float = Field(ge=0.0, le=1.0)
    country_code: str | None = None
    vehicle_class: str | None = None
    snapshot_path: str | None = None
    matched_watchlist_id: str | None = None
    direction: str | None = None
    speed_kmh: float | None = None


class LicensePlateResponse(BaseModel):
    id: int
    camera_id: str
    plate_number: str
    plate_confidence: float
    country_code: str | None
    vehicle_class: str | None
    snapshot_path: str | None
    timestamp: datetime | None
    matched_watchlist_id: str | None
    direction: str | None
    speed_kmh: float | None

    model_config = ConfigDict(from_attributes=True)
