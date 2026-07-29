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
    # Human-readable location used by the live dashboard and camera management UI.
    location = Column(String(200), nullable=True)
    status = Column(String(20), default="online")  # 'online' | 'offline' | 'degraded'
    source_type = Column(String(20), default="rtsp") # 'rtsp' | 'hls' | 'webcam' | 'video_file'
    stream_url = Column(String, nullable=True) # e.g. rtsp://... or path/to/video.mp4
    fps = Column(Integer, default=30)
    resolution = Column(String(20), default="1080p") # e.g. "720p", "1080p", "4K"
    is_enabled = Column(Boolean, default=True)
    location_lat = Column(Float, nullable=True)
    location_lng = Column(Float, nullable=True)
    zone_id = Column(String, ForeignKey("zones.id"), nullable=True)
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
    justification_text = Column(Text, nullable=True)

    # SentinelVision Phase 1 — alert enrichment fields
    correlation_group = Column(String(64), nullable=True, index=True)
    autonomy_tier = Column(String(30), nullable=True)  # auto_resolve | suggest_confirm | require_ack
    approval_status = Column(String(20), nullable=True)  # pending | approved | rejected
    zone = Column(String(100), nullable=True, index=True)
    source = Column(String(20), nullable=True, default="camera")  # camera | audio | thermal | iot | manual
    model_confidence = Column(Float, nullable=True)  # 0.0 – 1.0

    # Optional Link to Case (Layer 1: Data)
    case_id = Column(String, ForeignKey("cases.id"), nullable=True)

    # Relationships
    camera = relationship("Camera", back_populates="incidents")
    assignee = relationship("User", back_populates="assigned_incidents")
    case = relationship("Case", back_populates="incidents", lazy="selectin")


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


# ---------------------------------------------------------------------------
# Case (Layer 1: Data)
# ---------------------------------------------------------------------------

class Case(Base):
    __tablename__ = "cases"

    id = Column(String, primary_key=True, default=_uuid, index=True)
    title = Column(String(150), nullable=False)
    status = Column(String(20), default="open")  # 'open' | 'investigating' | 'closed'
    severity = Column(String(20), default="medium")  # 'critical' | 'high' | 'medium' | 'low'
    assigned_to = Column(String, ForeignKey("users.id"), nullable=True)
    summary = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)  # AI bundle justification
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    closed_at = Column(DateTime(timezone=True), nullable=True)

    # SentinelVision Phase 1 — case metrics
    bundle_confidence = Column(Float, nullable=True)  # 0–100
    correlated_alert_count = Column(Integer, nullable=True)
    affected_zones = Column(String(300), nullable=True)
    resolution = Column(String(30), nullable=True)  # true_positive | false_positive | undetermined
    time_to_resolve = Column(Float, nullable=True)  # minutes

    # Relationships
    incidents = relationship("Incident", back_populates="case", lazy="selectin")
    assignee = relationship("User", lazy="selectin")


# ---------------------------------------------------------------------------
# Watchlist (Layer 1: Data)
# ---------------------------------------------------------------------------

class Watchlist(Base):
    __tablename__ = "watchlists"

    id = Column(String, primary_key=True, default=_uuid, index=True)
    name = Column(String(100), nullable=False)
    category = Column(String(20), nullable=False)  # 'POI' | 'Suspect' | 'Missing' | 'VIP'
    status = Column(String(20), default="active")  # 'active' | 'inactive'
    photo_url = Column(String(300), nullable=True)
    notes = Column(Text, nullable=True)
    added_at = Column(DateTime(timezone=True), server_default=func.now())
    last_match = Column(DateTime(timezone=True), nullable=True)


# ---------------------------------------------------------------------------
# Zone (Layer 1: Data)
# ---------------------------------------------------------------------------

class Zone(Base):
    __tablename__ = "zones"

    id = Column(String, primary_key=True, default=_uuid, index=True)
    name = Column(String(100), nullable=False)
    polygon_coords = Column(JSON, nullable=False)  # List of coordinate pairs [[lat, lng], ...]
    rule = Column(String(100), nullable=True)  # e.g., 'no_parking', 'no_intrusion'
    status = Column(String(20), default="active")  # 'active' | 'inactive'
    color = Column(String(20), default="#ff0000")  # hex color string
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ---------------------------------------------------------------------------
# Playbook (Layer 1: Data)
# ---------------------------------------------------------------------------

class Playbook(Base):
    __tablename__ = "playbooks"

    id = Column(String, primary_key=True, default=_uuid, index=True)
    name = Column(String(100), nullable=False)
    trigger_type = Column(String(50), nullable=False)  # 'critical_alert' | 'case_opened' | 'manual'
    actions_json = Column(JSON, nullable=False)  # List of actions, e.g. [{"action": "notify_slack", "channel": "alerts"}]
    status = Column(String(20), default="active")  # 'active' | 'inactive'
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_triggered = Column(DateTime(timezone=True), nullable=True)


# ---------------------------------------------------------------------------
# Anomaly Baseline (per-camera motion baseline — Genesis Layer 1)
# ---------------------------------------------------------------------------

class AnomalyBaseline(Base):
    __tablename__ = "anomaly_baselines"

    id = Column(String, primary_key=True, default=_uuid, index=True)
    camera_id = Column(String, ForeignKey("cameras.id"), nullable=False, unique=True, index=True)
    avg_motion = Column(Float, default=0.0)       # normalised 0-1 mean motion score
    stddev_motion = Column(Float, default=0.1)    # standard deviation
    peak_hours = Column(JSON, default=list)        # e.g. [8, 9, 17, 18]
    sample_count = Column(Integer, default=0)      # how many samples used
    last_calibrated = Column(DateTime(timezone=True), nullable=True)

    camera = relationship("Camera", lazy="selectin")


# ---------------------------------------------------------------------------
# WatchlistMatch (face-match audit — Genesis Layer 1)
# ---------------------------------------------------------------------------

class WatchlistMatch(Base):
    __tablename__ = "watchlist_matches"

    id = Column(Integer, primary_key=True, autoincrement=True)
    watchlist_id = Column(String, ForeignKey("watchlists.id"), nullable=False, index=True)
    camera_id = Column(String, ForeignKey("cameras.id"), nullable=True)
    confidence = Column(Float, nullable=False)          # 0.0 – 1.0
    frame_path = Column(String(300), nullable=True)     # snapshot path
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    watchlist_entry = relationship("Watchlist", lazy="selectin")
    camera = relationship("Camera", lazy="selectin")


# ---------------------------------------------------------------------------
# PlaybookExecution (SOAR audit log — Genesis Layer 4)
# ---------------------------------------------------------------------------

class PlaybookExecution(Base):
    __tablename__ = "playbook_executions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    playbook_id = Column(String, ForeignKey("playbooks.id"), nullable=False, index=True)
    trigger_event = Column(String(100), nullable=False)   # e.g. "weapon_detected", "case_opened"
    trigger_ref_id = Column(String(50), nullable=True)    # id of the triggering object
    actions_taken = Column(JSON, nullable=False, default=list)   # list of {"action":..., "status":...}
    justification_text = Column(Text, nullable=True)
    executed_at = Column(DateTime(timezone=True), server_default=func.now())

    playbook = relationship("Playbook", lazy="selectin")


# ---------------------------------------------------------------------------
# PlaybookApproval (Human-in-the-Loop - Gap 5)
# ---------------------------------------------------------------------------

class PlaybookApproval(Base):
    __tablename__ = "playbook_approvals"

    id = Column(Integer, primary_key=True, autoincrement=True)
    playbook_id = Column(String, ForeignKey("playbooks.id"), nullable=False, index=True)
    trigger_event = Column(String(100), nullable=False)
    trigger_ref_id = Column(String(50), nullable=True)
    tier = Column(String(50), nullable=False) # 'suggest_and_confirm' or 'alert_and_require_ack'
    status = Column(String(20), nullable=False, default="pending") # 'pending', 'approved', 'rejected'
    context_json = Column(JSON, nullable=True) # stores actions to execute upon approval
    justification_text = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    playbook = relationship("Playbook", lazy="selectin")


# ---------------------------------------------------------------------------
# RiskScore (hourly per-zone risk — Genesis Layer 2)
# ---------------------------------------------------------------------------

class RiskScore(Base):
    __tablename__ = "risk_scores"

    id = Column(Integer, primary_key=True, autoincrement=True)
    zone_id = Column(String, ForeignKey("zones.id"), nullable=False, index=True)
    score = Column(Float, nullable=False)                  # 0.0 – 100.0
    factors_json = Column(JSON, nullable=True)             # {time_of_day, alert_density, historical}
    computed_at = Column(DateTime(timezone=True), server_default=func.now())

    zone = relationship("Zone", lazy="selectin")


# ---------------------------------------------------------------------------
# IncidentReport (PDF report reference — Genesis Layer 3)
# ---------------------------------------------------------------------------

class IncidentReport(Base):
    __tablename__ = "incident_reports"

    id = Column(String, primary_key=True, default=_uuid, index=True)
    case_id = Column(String, ForeignKey("cases.id"), nullable=False, index=True)
    pdf_path = Column(String(300), nullable=True)          # path on disk
    summary_text = Column(Text, nullable=True)             # AI-generated summary
    generated_at = Column(DateTime(timezone=True), server_default=func.now())

    case = relationship("Case", lazy="selectin")
