"""
Attack Noise Engine
====================
A continuous background service that generates realistic, low-level
attack noise — failed logins, anomalous traffic patterns, occasional
intrusion detections — so every dashboard page always shows live data.

All events write directly to the DB and broadcast over WebSocket.
This runs as a background asyncio task (started in main.py startup).

Attack patterns simulated:
  - Credential stuffing / brute force (real LoginAttempt rows)
  - Port scanning / anomalous network probes → SecurityEvent
  - Lateral movement attempts → SecurityEvent
  - Data exfiltration mimicry → SecurityEvent + Incident
  - Camera-level intrusion detections → Incident
  - Privilege escalation probes → SecurityEvent
"""

import asyncio
import logging
import random
from datetime import datetime, timezone

from config.database import AsyncSessionLocal
from models.assets import Incident, LoginAttempt, SecurityEvent
from models.enums import SecurityEventTypeEnum, SeverityEnum
from api.routes.telemetry import manager

logger = logging.getLogger(__name__)

# ── Realistic data pools ──────────────────────────────────────────────────────

ATTACKER_IPS = [
    "185.220.101.47", "185.220.102.8", "45.142.212.100",
    "194.165.16.72",  "91.108.4.38",   "167.99.204.59",
    "103.78.228.43",  "51.77.153.155", "62.210.115.155",
    "118.25.6.39",    "198.98.56.9",   "163.172.67.180",
]

TARGET_USERNAMES = ["admin", "administrator", "root", "operator", "user", "guest",
                    "sysadmin", "superuser", "security", "monitor"]

CAMERA_IDS = ["cam-1", "cam-2", "cam-3", "cam-4", "cam-5"]

MITRE_TECHNIQUES = [
    ("T1110", "Brute Force"),
    ("T1110.001", "Password Guessing"),
    ("T1110.003", "Password Spraying"),
    ("T1046", "Network Service Scanning"),
    ("T1021", "Remote Services"),
    ("T1078", "Valid Accounts"),
    ("T1020", "Automated Exfiltration"),
    ("T1567", "Exfiltration Over Web Service"),
    ("T1548", "Abuse Elevation Control Mechanism"),
    ("T1055", "Process Injection"),
    ("T1190", "Exploit Public-Facing Application"),
    ("T1059", "Command and Scripting Interpreter"),
]

INCIDENT_TYPES = [
    ("intrusion_detected",      "high",     "Motion detected in restricted area during off-hours."),
    ("tailgating_detected",     "high",     "Multiple persons detected entering through single-access gate."),
    ("loitering_detected",      "medium",   "Individual loitering near server room entrance for >5 minutes."),
    ("camera_tampering",        "critical", "Camera feed obstruction detected — possible physical tampering."),
    ("unauthorized_area_entry", "high",     "Personnel detected in unauthorized zone without badge swipe."),
    ("perimeter_breach",        "critical", "Perimeter fence breach detected at North sector."),
    ("object_left_behind",      "medium",   "Unattended object detected near main entrance."),
]

SECURITY_EVENT_TYPES = [
    (SecurityEventTypeEnum.anomalous_traffic,    SeverityEnum.medium,   "T1046", "Network Service Scanning",        "Rapid sequential port probes from external IP."),
    (SecurityEventTypeEnum.unauthorized_access,  SeverityEnum.high,     "T1078", "Valid Accounts",                  "Authenticated session from unrecognized geolocation."),
    (SecurityEventTypeEnum.data_exfiltration,    SeverityEnum.critical, "T1020", "Automated Exfiltration",          "Abnormally high data transfer volume detected on egress."),
    (SecurityEventTypeEnum.privilege_escalation, SeverityEnum.high,     "T1548", "Abuse Elevation Control",         "Repeated attempts to access admin-restricted API endpoints."),
    (SecurityEventTypeEnum.brute_force,          SeverityEnum.high,     "T1110", "Brute Force",                     "Credential stuffing attack — rotating usernames from blocklist."),
    (SecurityEventTypeEnum.anomalous_traffic,    SeverityEnum.medium,   "T1059", "Command and Scripting Interpreter","Unusual scripted API request pattern from internal host."),
]


# ── Helper writers ────────────────────────────────────────────────────────────

async def _write_login_attempts(session, username: str, ip: str, count: int):
    """Write `count` failed login attempts for a username (real brute-force fodder)."""
    for _ in range(count):
        session.add(LoginAttempt(
            username=username,
            success=False,
            ip_address=ip,
        ))
    await session.commit()
    logger.debug(f"[Noise] Logged {count} failed login attempts for '{username}' from {ip}")


async def _write_security_event(session, evt_type, severity, mitre_id, mitre_name, desc, source_ip=None, target=None):
    """Write a SecurityEvent and broadcast via WebSocket."""
    event = SecurityEvent(
        event_type=evt_type.value,
        source_ip=source_ip or random.choice(ATTACKER_IPS),
        target_username=target,
        description=desc,
        mitre_technique_id=mitre_id,
        mitre_technique_name=mitre_name,
        severity=severity.value,
        is_resolved=False,
    )
    session.add(event)
    await session.commit()
    await session.refresh(event)

    await manager.broadcast({
        "type": "NEW_SECURITY_EVENT",
        "data": {
            "id": event.id,
            "title": mitre_name,
            "technique": mitre_id,
            "severity": event.severity,
            "source_ip": event.source_ip,
        }
    })
    logger.info(f"[Noise] SecurityEvent: {evt_type.value} | {mitre_id} | {severity.value}")
    return event


async def _write_incident(session, inc_type: str, severity: str, desc: str, camera_id: str):
    """Write a physical security Incident and broadcast via WebSocket."""
    incident = Incident(
        type=inc_type,
        severity=severity,
        description=desc,
        camera_id=camera_id,
        status="detected",
    )
    from services.explainability import generate_incident_justification
    incident.justification_text = generate_incident_justification(incident)
    session.add(incident)
    await session.commit()
    await session.refresh(incident)

    await manager.broadcast({
        "type": "NEW_INCIDENT",
        "data": {
            "id": incident.id,
            "title": inc_type,
            "severity": severity,
            "camera_id": camera_id,
        }
    })
    logger.info(f"[Noise] Incident: {inc_type} | {severity} | {camera_id}")
    return incident


# ── Individual attack pattern functions ──────────────────────────────────────

async def _simulate_credential_stuffing():
    """Simulate a real brute-force / credential stuffing burst."""
    ip = random.choice(ATTACKER_IPS)
    username = random.choice(TARGET_USERNAMES)
    count = random.randint(5, 15)
    async with AsyncSessionLocal() as session:
        await _write_login_attempts(session, username, ip, count)
        # Also write the SecurityEvent directly (brute_force.py may catch it later too)
        await _write_security_event(
            session,
            SecurityEventTypeEnum.brute_force,
            SeverityEnum.high,
            "T1110",
            "Brute Force",
            f"Credential stuffing burst: {count} failed attempts for '{username}' from {ip}.",
            source_ip=ip,
            target=username,
        )


async def _simulate_network_anomaly():
    """Simulate port scanning / lateral movement."""
    choice = random.choice(SECURITY_EVENT_TYPES)
    evt_type, severity, mitre_id, mitre_name, desc = choice
    ip = random.choice(ATTACKER_IPS)
    async with AsyncSessionLocal() as session:
        await _write_security_event(session, evt_type, severity, mitre_id, mitre_name, desc, source_ip=ip)


async def _simulate_physical_intrusion():
    """Simulate a camera-detected physical security incident."""
    inc_type, severity, desc = random.choice(INCIDENT_TYPES)
    camera_id = random.choice(CAMERA_IDS)
    async with AsyncSessionLocal() as session:
        await _write_incident(session, inc_type, severity, desc, camera_id)


async def _simulate_data_exfiltration():
    """Simulate a high-severity data exfiltration attempt."""
    ip = random.choice(ATTACKER_IPS)
    async with AsyncSessionLocal() as session:
        await _write_security_event(
            session,
            SecurityEventTypeEnum.data_exfiltration,
            SeverityEnum.critical,
            "T1567",
            "Exfiltration Over Web Service",
            f"Sustained high-volume data transfer to external host {ip}. "
            f"~{random.randint(150, 900)} MB transferred in {random.randint(2, 8)} minutes.",
            source_ip=ip,
        )
        # High exfiltration also creates an incident
        await _write_incident(
            session,
            "data_exfiltration_attempt",
            "critical",
            f"Automated data exfiltration behaviour detected from internal node to {ip}.",
            random.choice(CAMERA_IDS),
        )


# ── Main noise loop ───────────────────────────────────────────────────────────

# Weighted event pool: (function, relative_weight)
_EVENT_POOL = [
    (_simulate_credential_stuffing,  35),   # most common
    (_simulate_network_anomaly,      30),
    (_simulate_physical_intrusion,   25),
    (_simulate_data_exfiltration,    10),   # rarest / highest severity
]

_FUNCTIONS, _WEIGHTS = zip(*_EVENT_POOL)


async def run_attack_noise_engine():
    """
    Main background loop. Fires a random attack event every 20-60 seconds.
    Weights are tuned so the SOC feed always has fresh data without overwhelming.
    """
    logger.info("[Noise Engine] Starting realistic attack noise engine...")

    # Initial burst: seed 8-12 events spread over first 2 minutes so the
    # dashboard looks alive immediately on first launch.
    await asyncio.sleep(5)
    initial_count = random.randint(8, 12)
    for _ in range(initial_count):
        try:
            fn = random.choices(_FUNCTIONS, weights=_WEIGHTS, k=1)[0]
            await fn()
            await asyncio.sleep(random.uniform(3, 10))
        except Exception as e:
            logger.error(f"[Noise Engine] Initial seed error: {e}")

    logger.info(f"[Noise Engine] Seeded {initial_count} initial events. Entering steady-state loop.")

    while True:
        try:
            sleep_secs = random.uniform(20, 60)
            await asyncio.sleep(sleep_secs)

            fn = random.choices(_FUNCTIONS, weights=_WEIGHTS, k=1)[0]
            await fn()

        except Exception as e:
            logger.error(f"[Noise Engine] Steady-state error: {e}")
            await asyncio.sleep(10)
