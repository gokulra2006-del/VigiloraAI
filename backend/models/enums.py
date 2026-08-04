"""Enumeration types used across models."""
import enum


class RoleEnum(str, enum.Enum):
    """User role for authorization."""
    operator = "operator"          # legacy — kept for backward compat
    soc_operator = "soc_operator"  # SentinelVision SOC Operator
    admin = "admin"
    auditor = "auditor"


class IncidentStatusEnum(str, enum.Enum):
    """
    Five-state incident lifecycle.

    Valid transitions:
        DETECTED → ACKNOWLEDGED → IN_PROGRESS → RESOLVED → CLOSED
    """
    detected = "detected"
    acknowledged = "acknowledged"
    in_progress = "in_progress"
    resolved = "resolved"
    closed = "closed"


# Legal transitions: current_status → set of allowed next statuses
INCIDENT_TRANSITIONS: dict[IncidentStatusEnum, set[IncidentStatusEnum]] = {
    IncidentStatusEnum.detected: {IncidentStatusEnum.acknowledged},
    IncidentStatusEnum.acknowledged: {IncidentStatusEnum.in_progress},
    IncidentStatusEnum.in_progress: {IncidentStatusEnum.resolved},
    IncidentStatusEnum.resolved: {IncidentStatusEnum.closed},
    IncidentStatusEnum.closed: set(),  # terminal state
}


class SeverityEnum(str, enum.Enum):
    """Severity level for incidents and security events."""
    critical = "critical"
    high = "high"
    medium = "medium"
    low = "low"


class SecurityEventTypeEnum(str, enum.Enum):
    """Types of security events detected by the SOC module."""
    brute_force = "brute_force"
    unauthorized_access = "unauthorized_access"
    anomalous_traffic = "anomalous_traffic"
    privilege_escalation = "privilege_escalation"
    data_exfiltration = "data_exfiltration"
    camera_tampering = "camera_tampering"
    frozen_feed = "frozen_feed"
    replay_attack = "replay_attack"
    unauthorized_export = "unauthorized_export"


class AutonomyTierEnum(str, enum.Enum):
    auto_resolve = "auto_resolve"
    suggest_confirm = "suggest_confirm"
    require_ack = "require_ack"


class ApprovalStatusEnum(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class AlertSourceEnum(str, enum.Enum):
    camera = "camera"
    audio = "audio"
    thermal = "thermal"
    iot = "iot"
    manual = "manual"


class CaseResolutionEnum(str, enum.Enum):
    true_positive = "true_positive"
    false_positive = "false_positive"
    undetermined = "undetermined"


# -----------------------------------------------------------------------
# SentinelVision Phase 1 — new enumerations
# -----------------------------------------------------------------------

class CameraHealthStatusEnum(str, enum.Enum):
    """Health status reported by camera heartbeat checks."""
    healthy = "healthy"
    degraded = "degraded"
    offline = "offline"
    tampered = "tampered"
    frozen_feed = "frozen_feed"
    replay_suspected = "replay_suspected"


class TrafficEventTypeEnum(str, enum.Enum):
    """Types of traffic events produced by the CV pipeline."""
    vehicle_detected = "vehicle_detected"
    vehicle_classified = "vehicle_classified"
    traffic_count = "traffic_count"
    lane_occupancy = "lane_occupancy"
    stopped_vehicle = "stopped_vehicle"
    wrong_way = "wrong_way"
    red_light_violation = "red_light_violation"
    debris_detected = "debris_detected"
    pedestrian_detected = "pedestrian_detected"
    speed_estimated = "speed_estimated"


class ViolationTypeEnum(str, enum.Enum):
    """Traffic violation categories."""
    red_light = "red_light"
    speeding = "speeding"
    wrong_way = "wrong_way"
    illegal_parking = "illegal_parking"
    no_seatbelt = "no_seatbelt"
    phone_use = "phone_use"


class ViolationStatusEnum(str, enum.Enum):
    """Lifecycle states for a traffic violation."""
    pending_review = "pending_review"
    confirmed = "confirmed"
    dismissed = "dismissed"
    appealed = "appealed"


class AlertSeverityEnum(str, enum.Enum):
    """Alert severity levels."""
    critical = "critical"
    high = "high"
    medium = "medium"
    low = "low"
    info = "info"


class AlertStatusEnum(str, enum.Enum):
    """Alert lifecycle states."""
    active = "active"
    acknowledged = "acknowledged"
    resolved = "resolved"
    expired = "expired"


class AuditActionEnum(str, enum.Enum):
    """Actions recorded in the audit log."""
    login = "login"
    logout = "logout"
    view_record = "view_record"
    create_record = "create_record"
    update_record = "update_record"
    delete_record = "delete_record"
    export_data = "export_data"
    search_plate = "search_plate"
    add_watchlist = "add_watchlist"
    approve_action = "approve_action"
    deny_action = "deny_action"
    generate_report = "generate_report"
    api_call = "api_call"


class ReportTypeEnum(str, enum.Enum):
    """Types of generated reports."""
    daily_summary = "daily_summary"
    weekly_summary = "weekly_summary"
    incident_report = "incident_report"
    traffic_analysis = "traffic_analysis"
    camera_health = "camera_health"
    security_audit = "security_audit"


class ReportStatusEnum(str, enum.Enum):
    """Report lifecycle states."""
    draft = "draft"
    published = "published"
    archived = "archived"