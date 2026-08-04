"""SentinelVision Phase 1 — Traffic & Operations ORM models.

New tables:
    CameraHealth     — periodic camera heartbeat / health checks
    TrafficEvent     — CV detection events (vehicle, pedestrian, lane, etc.)
    Violation        — traffic violations requiring review
    LicensePlateRecord — ANPR reads
    Alert            — system-generated alerts from any source
    AuditLog         — operator and system action audit trail
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    JSON,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from config.database import Base


def _uuid() -> str:
    return uuid.uuid4().hex[:12]


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# Camera Health
# ---------------------------------------------------------------------------

class CameraHealth(Base):
    """Periodic heartbeat / health record for a single camera."""
    __tablename__ = "camera_health"

    id = Column(Integer, primary_key=True, autoincrement=True)
    camera_id = Column(String, ForeignKey("cameras.id"), nullable=False, index=True)
    status = Column(String(30), nullable=False, default="healthy")  # CameraHealthStatusEnum
    cpu_temp = Column(Float, nullable=True)           # °C
    fps_actual = Column(Float, nullable=True)         # real measured FPS
    storage_used_pct = Column(Float, nullable=True)   # 0–100
    network_latency_ms = Column(Float, nullable=True)
    uptime_seconds = Column(Integer, nullable=True)
    last_frame_hash = Column(String(64), nullable=True)  # SHA-256 of last frame (frozen-feed detect)
    notes = Column(Text, nullable=True)
    checked_at = Column(DateTime(timezone=True), server_default=func.now())

    camera = relationship("Camera", lazy="selectin")


# ---------------------------------------------------------------------------
# Traffic Event
# ---------------------------------------------------------------------------

class TrafficEvent(Base):
    """A single computer-vision detection event on the road."""
    __tablename__ = "traffic_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    camera_id = Column(String, ForeignKey("cameras.id"), nullable=False, index=True)
    event_type = Column(String(40), nullable=False, index=True)  # TrafficEventTypeEnum
    confidence = Column(Float, nullable=False)        # 0.0–1.0
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    location_description = Column(String(200), nullable=True)  # human-readable spot
    lane_number = Column(Integer, nullable=True)
    direction = Column(String(20), nullable=True)     # "north", "south", "east", "west"
    vehicle_class = Column(String(40), nullable=True) # "car", "truck", "motorcycle", …
    speed_kmh = Column(Float, nullable=True)
    bbox_json = Column(Text, nullable=True)           # "[x1, y1, x2, y2]"
    snapshot_path = Column(String(300), nullable=True)
    metadata_json = Column(JSON, nullable=True)       # arbitrary extra data

    camera = relationship("Camera", lazy="selectin")


# ---------------------------------------------------------------------------
# Violation
# ---------------------------------------------------------------------------

class Violation(Base):
    """A traffic violation detected by CV, pending human review."""
    __tablename__ = "violations"

    id = Column(String, primary_key=True, default=_uuid, index=True)
    camera_id = Column(String, ForeignKey("cameras.id"), nullable=False, index=True)
    traffic_event_id = Column(Integer, ForeignKey("traffic_events.id"), nullable=True)
    violation_type = Column(String(30), nullable=False, index=True)  # ViolationTypeEnum
    confidence = Column(Float, nullable=False)
    plate_number = Column(String(20), nullable=True, index=True)
    vehicle_description = Column(String(200), nullable=True)
    status = Column(String(20), nullable=False, default="pending_review")  # ViolationStatusEnum
    evidence_snapshot = Column(String(300), nullable=True)
    evidence_video_ref = Column(String(300), nullable=True)
    reviewing_operator_id = Column(String, ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    audit_history = Column(JSON, default=list)  # [{action, by, at}, ...]

    camera = relationship("Camera", lazy="selectin")
    traffic_event = relationship("TrafficEvent", lazy="selectin")
    reviewing_operator = relationship("User", lazy="selectin")


# ---------------------------------------------------------------------------
# License Plate Record
# ---------------------------------------------------------------------------

class LicensePlateRecord(Base):
    """Every ANPR (Automatic Number Plate Recognition) read."""
    __tablename__ = "license_plate_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    camera_id = Column(String, ForeignKey("cameras.id"), nullable=False, index=True)
    plate_number = Column(String(20), nullable=False, index=True)
    plate_confidence = Column(Float, nullable=False)  # 0.0–1.0
    country_code = Column(String(5), nullable=True)   # e.g. "QA"
    vehicle_class = Column(String(40), nullable=True)
    snapshot_path = Column(String(300), nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    matched_watchlist_id = Column(String, ForeignKey("watchlists.id"), nullable=True)
    direction = Column(String(20), nullable=True)
    speed_kmh = Column(Float, nullable=True)

    camera = relationship("Camera", lazy="selectin")
    matched_watchlist = relationship("Watchlist", lazy="selectin")


# ---------------------------------------------------------------------------
# Alert
# ---------------------------------------------------------------------------

class Alert(Base):
    """System-generated alert from any source (camera, detection, security)."""
    __tablename__ = "alerts"

    id = Column(String, primary_key=True, default=_uuid, index=True)
    alert_type = Column(String(60), nullable=False, index=True)
    severity = Column(String(20), nullable=False, default="medium")  # AlertSeverityEnum
    source_type = Column(String(20), nullable=False, default="system")  # camera|system|detection|security
    source_ref_id = Column(String(60), nullable=True)  # ID of the triggering object
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=True)
    status = Column(String(20), nullable=False, default="active")  # AlertStatusEnum
    camera_id = Column(String, ForeignKey("cameras.id"), nullable=True, index=True)
    acknowledged_by = Column(String, ForeignKey("users.id"), nullable=True)
    acknowledged_at = Column(DateTime(timezone=True), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    metadata_json = Column(JSON, nullable=True)

    camera = relationship("Camera", lazy="selectin")
    acknowledger = relationship("User", lazy="selectin")


# ---------------------------------------------------------------------------
# Audit Log
# ---------------------------------------------------------------------------

class AuditLog(Base):
    """Immutable record of every operator and system action."""
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=True, index=True)
    action = Column(String(30), nullable=False, index=True)  # AuditActionEnum
    resource_type = Column(String(60), nullable=True)  # e.g. "camera", "incident", "violation"
    resource_id = Column(String(60), nullable=True)
    details = Column(Text, nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(300), nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    success = Column(Boolean, default=True)

    user = relationship("User", lazy="selectin")
