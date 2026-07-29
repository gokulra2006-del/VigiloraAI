"""Enumeration types used across models."""
import enum


class RoleEnum(str, enum.Enum):
    """User role for authorization."""
    operator = "operator"
    admin = "admin"


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