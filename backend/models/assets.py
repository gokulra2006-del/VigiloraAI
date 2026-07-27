"""SQLAlchemy ORM models for Sentinel-ai."""

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
# User
# ---------------------------------------------------------------------------

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=_uuid)
    username = Column(String(80), unique=True, nullable=False, index=True)
    hashed_password = Column(String(256), nullable=False)
    role = Column(String(20), nullable=False, default="operator")  # RoleEnum value
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    assigned_incidents = relationship("Incident", back_populates="assignee", lazy="selectin")
    login_attempts = relationship("LoginAttempt", back_populates="user_rel", lazy="selectin")


# ---------------------------------------------------------------------------
# Camera
# ---------------------------------------------------------------------------

class Camera(Base):
    __tablename__ = "cameras"

    id = Column(String, primary_key=True, index=True)
    name = Column(String(120), index=True)
    status = Column(String(20), default="online")  # 'online' | 'offline' | 'degraded'
    source_type = Column(String(20), default="real_hardware") # 'real_hardware' | 'rtsp_phone' | 'video_file' | 'webcam'
    location = Column(String(200))
    fps = Column(Integer, default=30)
    resolution = Column(String(20), default="1080p")
    active_models = Column(JSON, default=list)  # e.g. ["YOLOv8"]
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    detections = relationship("Detection", back_populates="camera", lazy="selectin")
    incidents = relationship("Incident", back_populates="camera", lazy="selectin")


# ---------------------------------------------------------------------------
# Detection
# ---------------------------------------------------------------------------

class Detection(Base):
    __tablename__ = "detections"

    id = Column(Integer, primary_key=True, autoincrement=True)
    camera_id = Column(String, ForeignKey("cameras.id"), nullable=False, index=True)
    class_name = Column(String(60), nullable=False, index=True)  # e.g. "car", "person", "stationary_vehicle"
    confidence = Column(Float, nullable=False)
    bbox_json = Column(Text, nullable=True)  # JSON string "[x1, y1, x2, y2]"
    snapshot_path = Column(String(300), nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    camera = relationship("Camera", back_populates="detections")


# ---------------------------------------------------------------------------
# Incident (5-state lifecycle)
# ---------------------------------------------------------------------------

class Incident(Base):
    __tablename__ = "incidents"

    id = Column(String, primary_key=True, default=_uuid, index=True)
    camera_id = Column(String, ForeignKey("cameras.id"), nullable=True)
    type = Column(String(80), nullable=False)  # e.g. "illegal_parking", "intrusion"
    severity = Column(String(20), nullable=False, default="medium")  # SeverityEnum
    status = Column(String(20), nullable=False, default="detected")  # IncidentStatusEnum
    description = Column(Text, nullable=True)
    assigned_to = Column(String, ForeignKey("users.id"), nullable=True)

    # State-machine timestamps
    detected_at = Column(DateTime(timezone=True), server_default=func.now())
    acknowledged_at = Column(DateTime(timezone=True), nullable=True)
    in_progress_at = Column(DateTime(timezone=True), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    closed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    camera = relationship("Camera", back_populates="incidents")
    assignee = relationship("User", back_populates="assigned_incidents")


# ---------------------------------------------------------------------------
# Security Event (SOC / Cyber)
# ---------------------------------------------------------------------------

class SecurityEvent(Base):
    __tablename__ = "security_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    event_type = Column(String(60), nullable=False, index=True)  # SecurityEventTypeEnum
    source_ip = Column(String(45), nullable=True)
    target_username = Column(String(80), nullable=True)
    description = Column(Text, nullable=True)
    mitre_technique_id = Column(String(20), nullable=True)   # e.g. "T1110"
    mitre_technique_name = Column(String(120), nullable=True)  # e.g. "Brute Force"
    severity = Column(String(20), nullable=False, default="medium")
    is_resolved = Column(Boolean, default=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())


# ---------------------------------------------------------------------------
# Login Attempt (for brute-force detection)
# ---------------------------------------------------------------------------

class LoginAttempt(Base):
    __tablename__ = "login_attempts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(80), nullable=False, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=True)
    success = Column(Boolean, nullable=False)
    ip_address = Column(String(45), nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user_rel = relationship("User", back_populates="login_attempts")


# ---------------------------------------------------------------------------
# Traffic Metric (kept from original — still simulated)
# ---------------------------------------------------------------------------

class TrafficMetric(Base):
    __tablename__ = "traffic_metrics"

    id = Column(Integer, primary_key=True, autoincrement=True)
    time = Column(String(10))  # e.g. "14:00"
    vehicles = Column(Integer, default=0)
    pedestrians = Column(Integer, default=0)
    avg_speed = Column(Float, default=0.0)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())


# ---------------------------------------------------------------------------
# Threat Intel (kept from original — fed by CISA KEV)
# ---------------------------------------------------------------------------

class ThreatIntel(Base):
    __tablename__ = "threat_intel"

    id = Column(String, primary_key=True, index=True)  # CVE ID
    title = Column(String(300))
    cvss = Column(Float, nullable=True)
    status = Column(String(20), default="active")
    details = Column(Text, nullable=True)
    published_date = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ---------------------------------------------------------------------------
# Alert Channel (Automated Alerting — Feature 1)
# ---------------------------------------------------------------------------

class AlertChannel(Base):
    """Stores a single notification destination (Slack, Discord, Telegram, Email, SMS)."""

    __tablename__ = "alert_channels"

    id = Column(String, primary_key=True, default=_uuid)
    name = Column(String(120), nullable=False)
    channel_type = Column(String(20), nullable=False)  # 'slack'|'discord'|'telegram'|'email'|'sms'

    # Delivery config — only the relevant field will be populated per type
    webhook_url = Column(String(500), nullable=True)    # Slack / Discord
    bot_token = Column(String(300), nullable=True)      # Telegram
    chat_id = Column(String(100), nullable=True)        # Telegram
    email_address = Column(String(200), nullable=True)  # Email
    phone_number = Column(String(30), nullable=True)    # SMS (Twilio)

    # SMTP config stored as JSON: {"host","port","username","password","use_tls"}
    smtp_config = Column(JSON, nullable=True)

    # Twilio credentials stored as JSON: {"account_sid","auth_token","from_number"}
    twilio_config = Column(JSON, nullable=True)

    # Filtering
    severity_threshold = Column(String(20), nullable=False, default="high")  # SeverityEnum min
    incident_types = Column(JSON, nullable=True)  # list of types to filter, None = all

    enabled = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
