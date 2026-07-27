"""
Attack Simulation REST API
============================
Provides endpoints that the SOC frontend button triggers to run
named attack scenarios with real-time WebSocket progress streaming.

POST /api/v1/simulate/attack
  { "scenario": "brute_force" | "apt" | "physical_breach" | "exfiltration" | "ransomware" | "insider_threat" | "all" }

Each scenario runs async, fires WebSocket events at each stage so the
SOC terminal log updates live, and creates real DB records.
"""

import asyncio
import logging
import random
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from config.database import get_db, AsyncSessionLocal
from models.assets import Incident, SecurityEvent, LoginAttempt
from models.enums import SecurityEventTypeEnum, SeverityEnum
from security.auth import get_current_user
from api.routes.telemetry import manager

router = APIRouter()
logger = logging.getLogger(__name__)

ATTACKER_IPS = [
    "185.220.101.47", "45.142.212.100", "91.108.4.38",
    "194.165.16.72",  "62.210.115.155", "103.78.228.43",
]
CAMERA_IDS = ["cam-1", "cam-2", "cam-3", "cam-4", "cam-5"]

VALID_SCENARIOS = {
    "brute_force", "apt", "physical_breach",
    "exfiltration", "ransomware", "insider_threat", "all"
}


# ── Schemas ───────────────────────────────────────────────────────────────────

class SimulateRequest(BaseModel):
    scenario: str = "brute_force"


class SimulateResponse(BaseModel):
    status: str
    scenario: str
    message: str


# ── Shared helpers ────────────────────────────────────────────────────────────

async def _broadcast_stage(stage: str, detail: str, severity: str = "info"):
    """Broadcast a simulation stage update over WebSocket for the SOC terminal."""
    await manager.broadcast({
        "type": "SIMULATION_STAGE",
        "data": {
            "stage": stage,
            "detail": detail,
            "severity": severity,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    })


async def _create_incident(inc_type: str, severity: str, desc: str, camera_id: str):
    async with AsyncSessionLocal() as session:
        incident = Incident(
            type=inc_type, severity=severity, description=desc,
            camera_id=camera_id, status="detected"
        )
        session.add(incident)
        await session.commit()
        await session.refresh(incident)
        await manager.broadcast({
            "type": "NEW_INCIDENT",
            "data": {"id": incident.id, "title": inc_type,
                     "severity": severity, "camera_id": camera_id}
        })
        return incident


async def _create_security_event(evt_type: SecurityEventTypeEnum, severity: SeverityEnum,
                                  mitre_id: str, mitre_name: str, desc: str,
                                  source_ip: str = None, target: str = None):
    async with AsyncSessionLocal() as session:
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
            "data": {"id": event.id, "title": mitre_name,
                     "technique": mitre_id, "severity": event.severity}
        })
        return event


async def _log_login_attempts(username: str, count: int, ip: str):
    async with AsyncSessionLocal() as session:
        for _ in range(count):
            session.add(LoginAttempt(username=username, success=False, ip_address=ip))
        await session.commit()


# ── Scenario runners ──────────────────────────────────────────────────────────

async def _run_brute_force():
    ip = random.choice(ATTACKER_IPS)
    targets = [("admin", 12), ("administrator", 7), ("root", 10), ("operator", 8)]
    total = 0

    await _broadcast_stage("RECON", f"Attacker {ip} — target acquisition complete", "warn")
    await asyncio.sleep(1)

    for username, count in targets:
        await _broadcast_stage(
            "BRUTE_FORCE",
            f"T1110 | Spraying '{username}' — {count} attempts from {ip}",
            "high"
        )
        await _log_login_attempts(username, count, ip)
        total += count
        await asyncio.sleep(0.8)

    await _create_security_event(
        SecurityEventTypeEnum.brute_force, SeverityEnum.high,
        "T1110", "Brute Force",
        f"Credential stuffing campaign: {total} failed attempts across {len(targets)} usernames from {ip}.",
        source_ip=ip, target="admin"
    )
    await _create_incident(
        "brute_force_lockout", "high",
        f"{total} failed login attempts from {ip}. Account lockout triggered.", "cam-1"
    )
    await _broadcast_stage("COMPLETE", f"Brute force scenario done — {total} attempts logged", "ok")


async def _run_apt():
    ip = random.choice(ATTACKER_IPS)
    phases = [
        ("RECON",          "T1190", "Scanning public API surface — 2,400 requests in 60s",        "medium"),
        ("INITIAL_ACCESS", "T1190", "SQL injection payload detected — authentication bypass",     "critical"),
        ("LATERAL",        "T1021", "Authenticated session accessing /users/ /cameras/ /incidents/","critical"),
        ("ESCALATION",     "T1548", "Operator token used to call admin-only endpoints",           "critical"),
        ("EXFILTRATION",   "T1020", f"{random.randint(300,800)} MB transferred to {ip}",          "critical"),
    ]
    for phase, mitre, detail, severity in phases:
        await _broadcast_stage(phase, f"{mitre} | {detail}", severity)
        await _create_incident(
            f"apt_{phase.lower()}", severity,
            f"APT Chain — {phase}: {detail}. Source: {ip}.",
            random.choice(CAMERA_IDS)
        )
        await asyncio.sleep(1.2)
    await _broadcast_stage("COMPLETE", "5-phase APT intrusion chain complete", "ok")


async def _run_physical_breach():
    events = [
        ("cam-1", "perimeter_breach",        "critical", "PERIMETER",  "Perimeter fence breach — North sector"),
        ("cam-2", "tailgating_detected",     "high",     "TAILGATING", "2 persons, 1 badge — tailgating at Gate B"),
        ("cam-3", "camera_tampering",        "critical", "TAMPERING",  "Camera feed interrupted — possible lens spray"),
        ("cam-4", "unauthorized_area_entry", "critical", "BREACH",     "Individual in Server Room — no badge swipe"),
        ("cam-5", "suspicious_package",      "high",     "OBJECT",     "Unattended object near power distribution unit"),
    ]
    for cam, inc_type, severity, stage, detail in events:
        await _broadcast_stage(stage, f"{cam.upper()} | {detail}", severity)
        await _create_incident(inc_type, severity, detail + f" Detected by {cam}.", cam)
        await asyncio.sleep(1.0)
    await _broadcast_stage("COMPLETE", "Physical breach — 5 cameras flagged", "ok")


async def _run_exfiltration():
    ip = random.choice(ATTACKER_IPS)
    stages = [
        (50,  "Credential hashes and session tokens"),
        (200, "User database dump + access logs"),
        (450, "Surveillance config + camera metadata"),
        (900, "Full incident/event database backup"),
    ]
    await _broadcast_stage("STAGING", f"Exfiltration channel to {ip} established", "warn")
    await asyncio.sleep(0.8)
    total = 0
    for mb, desc in stages:
        total += mb
        await _broadcast_stage("EXFIL", f"T1020 | {desc} — {mb} MB → {ip}", "critical")
        await _create_incident(
            "data_exfiltration_detected", "critical",
            f"{desc}. {mb} MB transferred. Running total: {total} MB.", random.choice(CAMERA_IDS)
        )
        await asyncio.sleep(1.0)
    await _broadcast_stage("COMPLETE", f"Exfiltration done — {total} MB total", "ok")


async def _run_ransomware():
    ip = random.choice(ATTACKER_IPS)
    stages = [
        ("DROPPER",    "T1486", "Encrypted payload dropper detected in memory",              "critical"),
        ("VSS_DELETE", "T1490", "'vssadmin delete shadows' intercepted — backup destruction","critical"),
        ("BACKUP_OFF", "T1489", "Backup management API accessed — automated backups disabled","critical"),
        ("SPREAD",     "T1021", f"SMB lateral spread from internal node compromised by {ip}","critical"),
        ("ENCRYPT",    "T1486", "847 files encrypted in 12 seconds — ransomware ACTIVE",     "critical"),
    ]
    for stage, mitre, detail, severity in stages:
        await _broadcast_stage(stage, f"{mitre} | {detail}", severity)
        await _create_incident(
            f"ransomware_{stage.lower()}", severity,
            detail + f" Originating from {ip}.", random.choice(CAMERA_IDS)
        )
        await asyncio.sleep(1.2)
    await _broadcast_stage("COMPLETE", "RANSOMWARE SCENARIO — 5 critical incidents created", "ok")


async def _run_insider_threat():
    events = [
        ("cam-4", "after_hours_access",    "medium", "AFTER_HOURS", "Badge swipe at Server Room — 02:34 AM"),
        ("cam-1", "mass_data_access",      "high",   "DATA_ACCESS", "User queried full DB 47 times in 3 minutes"),
        ("cam-3", "unauthorized_peripheral","high",   "USB_DEVICE",  "USB mass storage connected in restricted area"),
        ("cam-2", "anomalous_print_job",   "medium", "PRINT_JOB",   "340-page print at 03:15 AM — possible document exfil"),
        ("cam-5", "vpn_tunnel_detected",   "critical","VPN_TUNNEL",  "Unauthorised VPN tunnel to residential IP established"),
    ]
    await _broadcast_stage("PROFILE", "Insider threat timeline reconstruction initiated", "warn")
    await asyncio.sleep(0.5)
    for cam, inc_type, severity, stage, detail in events:
        await _broadcast_stage(stage, f"T1078 | {cam} — {detail}", severity)
        await _create_incident(inc_type, severity, detail, cam)
        await asyncio.sleep(1.0)
    await _broadcast_stage("COMPLETE", "Insider threat scenario — 5 incidents created", "ok")


# ── Dispatcher ────────────────────────────────────────────────────────────────

SCENARIO_MAP = {
    "brute_force":    _run_brute_force,
    "apt":            _run_apt,
    "physical_breach":_run_physical_breach,
    "exfiltration":   _run_exfiltration,
    "ransomware":     _run_ransomware,
    "insider_threat": _run_insider_threat,
}

async def _run_scenario(scenario: str):
    """Run one or all scenarios, broadcasting progress at each stage."""
    await _broadcast_stage("SIMULATION_START", f"Starting scenario: {scenario}", "info")

    if scenario == "all":
        for name, fn in SCENARIO_MAP.items():
            await _broadcast_stage("SCENARIO_BEGIN", f"--- {name.upper().replace('_',' ')} ---", "warn")
            await fn()
            await asyncio.sleep(2)
    else:
        await SCENARIO_MAP[scenario]()

    await _broadcast_stage("SIMULATION_END", f"Scenario '{scenario}' complete — refresh dashboard", "ok")


# ── Route ─────────────────────────────────────────────────────────────────────

@router.post("/attack", response_model=SimulateResponse)
async def trigger_attack_simulation(
    req: SimulateRequest,
    background_tasks: BackgroundTasks,
    current_user=Depends(get_current_user),
):
    """
    Trigger a named attack simulation scenario.
    Runs in background so HTTP response is immediate;
    progress streams via WebSocket SIMULATION_STAGE events.
    """
    if req.scenario not in VALID_SCENARIOS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid scenario. Choose from: {', '.join(sorted(VALID_SCENARIOS))}"
        )

    background_tasks.add_task(_run_scenario, req.scenario)

    return SimulateResponse(
        status="started",
        scenario=req.scenario,
        message=f"Attack simulation '{req.scenario}' started. Watch the SOC terminal for live stages."
    )


@router.get("/scenarios")
async def list_scenarios(current_user=Depends(get_current_user)):
    """List all available simulation scenarios."""
    return {
        "scenarios": [
            {"id": "brute_force",     "name": "Brute Force / Credential Stuffing", "severity": "high",     "mitre": ["T1110", "T1110.003"]},
            {"id": "apt",             "name": "APT Intrusion Chain (5-Phase)",      "severity": "critical", "mitre": ["T1190", "T1078", "T1021", "T1055", "T1020"]},
            {"id": "physical_breach", "name": "Physical Security Breach",           "severity": "critical", "mitre": ["Physical"]},
            {"id": "exfiltration",    "name": "Data Exfiltration Operation",        "severity": "critical", "mitre": ["T1020", "T1567", "T1048"]},
            {"id": "ransomware",      "name": "Ransomware Precursor Activity",      "severity": "critical", "mitre": ["T1486", "T1490", "T1489"]},
            {"id": "insider_threat",  "name": "Insider Threat Detection",           "severity": "high",     "mitre": ["T1078", "T1213", "T1020"]},
            {"id": "all",             "name": "Run All Scenarios",                  "severity": "critical", "mitre": ["Full coverage"]},
        ]
    }
