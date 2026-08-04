"""SentinelVision Phase 1 — Seed pilot data.

Seeds the database with:
  - 3 cameras in Doha
  - 3 operators (soc_operator, admin, auditor)
  - Sample camera health records
  - Sample traffic events
  - Sample violations
  - Sample incidents
  - Sample alerts
  - Sample audit log entries

Usage:
    cd backend
    python -m scripts.seed_phase1
"""

import asyncio
import sys
import os
from datetime import datetime, timedelta, timezone

# Ensure the backend directory is on the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config.database import engine, Base, AsyncSessionLocal
from security.auth import get_password_hash
from models.assets import Camera, User, Incident, SecurityEvent, IncidentReport
from models.traffic import CameraHealth, TrafficEvent, Violation, LicensePlateRecord, Alert, AuditLog


NOW = datetime.now(timezone.utc)


async def seed():
    """Seed all Phase 1 pilot data."""

    # Create tables first
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:

        # ── Cameras ───────────────────────────────────────────────────────
        cameras = [
            Camera(
                id="cam-corniche-01",
                name="Al Corniche East Cam",
                location="Al Corniche Road, Doha",
                status="online",
                source_type="rtsp",
                stream_url="rtsp://10.0.1.10:554/stream1",
                fps=30,
                resolution="1080p",
                is_enabled=True,
                location_lat=25.3207,
                location_lng=51.5310,
                active_models=["YOLOv8n"],
                health_status="healthy",
                area="Doha, Al Corniche",
                installation_date=NOW - timedelta(days=90),
                last_heartbeat=NOW - timedelta(minutes=2),
            ),
            Camera(
                id="cam-pearl-01",
                name="The Pearl Roundabout Cam",
                location="The Pearl-Qatar, Roundabout",
                status="online",
                source_type="rtsp",
                stream_url="rtsp://10.0.1.11:554/stream1",
                fps=30,
                resolution="1080p",
                is_enabled=True,
                location_lat=25.3682,
                location_lng=51.5513,
                active_models=["YOLOv8n"],
                health_status="healthy",
                area="Doha, The Pearl",
                installation_date=NOW - timedelta(days=60),
                last_heartbeat=NOW - timedelta(minutes=1),
            ),
            Camera(
                id="cam-lusail-01",
                name="Lusail Expressway Junction Cam",
                location="Lusail Expressway, Junction 4",
                status="online",
                source_type="rtsp",
                stream_url="rtsp://10.0.1.12:554/stream1",
                fps=25,
                resolution="4K",
                is_enabled=True,
                location_lat=25.4300,
                location_lng=51.4900,
                active_models=["YOLOv8n"],
                health_status="degraded",
                area="Lusail, Expressway",
                installation_date=NOW - timedelta(days=45),
                last_heartbeat=NOW - timedelta(minutes=10),
            ),
        ]
        for cam in cameras:
            session.add(cam)

        # ── Operators ─────────────────────────────────────────────────────
        operators = [
            User(
                id="user-soc-01",
                username="soc_operator_1",
                hashed_password=get_password_hash("operator123"),
                role="soc_operator",
                department="Traffic Operations Center",
                badge_id="SOC-2024-001",
            ),
            User(
                id="user-auditor-01",
                username="auditor_1",
                hashed_password=get_password_hash("auditor123"),
                role="auditor",
                department="Compliance & Audit",
                badge_id="AUD-2024-001",
            ),
        ]
        for op in operators:
            session.add(op)

        # ── Camera Health Records ─────────────────────────────────────────
        health_records = [
            CameraHealth(
                camera_id="cam-corniche-01", status="healthy",
                cpu_temp=42.5, fps_actual=29.8, storage_used_pct=34.2,
                network_latency_ms=12.3, uptime_seconds=7776000,
                last_frame_hash="a1b2c3d4e5f6", notes="All systems nominal",
            ),
            CameraHealth(
                camera_id="cam-pearl-01", status="healthy",
                cpu_temp=45.1, fps_actual=30.0, storage_used_pct=28.7,
                network_latency_ms=8.1, uptime_seconds=5184000,
                last_frame_hash="f6e5d4c3b2a1", notes="All systems nominal",
            ),
            CameraHealth(
                camera_id="cam-lusail-01", status="degraded",
                cpu_temp=68.9, fps_actual=18.2, storage_used_pct=72.3,
                network_latency_ms=145.6, uptime_seconds=3888000,
                last_frame_hash="112233445566",
                notes="High latency detected — possible network congestion",
            ),
        ]
        for hr in health_records:
            session.add(hr)

        # ── Traffic Events ────────────────────────────────────────────────
        traffic_events = [
            TrafficEvent(
                camera_id="cam-corniche-01", event_type="vehicle_detected",
                confidence=0.94, location_description="Al Corniche eastbound lane 2",
                lane_number=2, direction="east", vehicle_class="car", speed_kmh=62.0,
                bbox_json="[120, 340, 280, 480]",
            ),
            TrafficEvent(
                camera_id="cam-corniche-01", event_type="vehicle_detected",
                confidence=0.88, location_description="Al Corniche eastbound lane 1",
                lane_number=1, direction="east", vehicle_class="truck", speed_kmh=45.0,
                bbox_json="[50, 300, 350, 520]",
            ),
            TrafficEvent(
                camera_id="cam-pearl-01", event_type="vehicle_detected",
                confidence=0.92, location_description="Pearl roundabout entry",
                lane_number=1, direction="north", vehicle_class="car", speed_kmh=30.0,
                bbox_json="[200, 180, 380, 360]",
            ),
            TrafficEvent(
                camera_id="cam-pearl-01", event_type="pedestrian_detected",
                confidence=0.87, location_description="Pearl crosswalk zone",
                vehicle_class="pedestrian",
                bbox_json="[410, 250, 460, 420]",
            ),
            TrafficEvent(
                camera_id="cam-lusail-01", event_type="stopped_vehicle",
                confidence=0.91, location_description="Lusail Expressway shoulder",
                lane_number=3, direction="north", vehicle_class="car", speed_kmh=0.0,
                bbox_json="[500, 400, 700, 550]",
            ),
            TrafficEvent(
                camera_id="cam-lusail-01", event_type="vehicle_detected",
                confidence=0.96, location_description="Lusail Expressway main lane",
                lane_number=1, direction="north", vehicle_class="bus", speed_kmh=80.0,
                bbox_json="[100, 200, 400, 500]",
            ),
            TrafficEvent(
                camera_id="cam-corniche-01", event_type="speed_estimated",
                confidence=0.85, location_description="Al Corniche speed zone",
                lane_number=2, direction="east", vehicle_class="car", speed_kmh=95.0,
                bbox_json="[130, 320, 290, 470]",
            ),
        ]
        for te in traffic_events:
            session.add(te)

        # ── Violations ────────────────────────────────────────────────────
        violations = [
            Violation(
                id="viol-001",
                camera_id="cam-pearl-01", violation_type="red_light",
                confidence=0.89, plate_number="QA-1234",
                vehicle_description="White Toyota Land Cruiser",
                status="pending_review",
                evidence_snapshot="snapshots/viol_001_redlight.jpg",
                audit_history=[{"action": "created", "by": "system", "at": NOW.isoformat()}],
            ),
            Violation(
                id="viol-002",
                camera_id="cam-corniche-01", violation_type="speeding",
                confidence=0.82, plate_number="QA-5678",
                vehicle_description="Black Nissan Patrol",
                status="pending_review",
                evidence_snapshot="snapshots/viol_002_speed.jpg",
                audit_history=[{"action": "created", "by": "system", "at": NOW.isoformat()}],
            ),
            Violation(
                id="viol-003",
                camera_id="cam-lusail-01", violation_type="illegal_parking",
                confidence=0.91,
                vehicle_description="Silver Honda Accord",
                status="confirmed",
                reviewing_operator_id="user-soc-01",
                reviewed_at=NOW - timedelta(hours=1),
                audit_history=[
                    {"action": "created", "by": "system", "at": (NOW - timedelta(hours=2)).isoformat()},
                    {"action": "status_change:pending_review->confirmed", "by": "soc_operator_1", "at": (NOW - timedelta(hours=1)).isoformat()},
                ],
            ),
        ]
        for v in violations:
            session.add(v)

        # ── Incidents ─────────────────────────────────────────────────────
        incidents = [
            Incident(
                id="inc-001",
                camera_id="cam-lusail-01", type="illegal_parking",
                severity="high", status="detected",
                description="Vehicle stationary on expressway shoulder for 5+ minutes. Possible illegal parking or breakdown.",
                zone="Lusail, Expressway",
                source="camera", model_confidence=0.91,
                evidence_refs=["snapshots/inc_001_frame1.jpg", "snapshots/inc_001_frame2.jpg"],
                audit_history=[{"action": "detected", "by": "system", "at": NOW.isoformat()}],
            ),
            Incident(
                id="inc-002",
                camera_id="cam-corniche-01", type="stopped_vehicle",
                severity="medium", status="acknowledged",
                description="Vehicle stopped in lane 2 for 45 seconds. Traffic slowing behind.",
                zone="Doha, Al Corniche",
                source="camera", model_confidence=0.85,
                assigned_to="user-soc-01",
                acknowledged_at=NOW - timedelta(minutes=5),
                evidence_refs=["snapshots/inc_002_frame1.jpg"],
                audit_history=[
                    {"action": "detected", "by": "system", "at": (NOW - timedelta(minutes=10)).isoformat()},
                    {"action": "acknowledged", "by": "soc_operator_1", "at": (NOW - timedelta(minutes=5)).isoformat()},
                ],
            ),
        ]
        for inc in incidents:
            session.add(inc)

        # ── Alerts ────────────────────────────────────────────────────────
        alerts = [
            Alert(
                id="alert-001",
                alert_type="camera_health_degraded", severity="high",
                source_type="camera", source_ref_id="cam-lusail-01",
                title="Camera cam-lusail-01 Health Degraded",
                message="High network latency (145ms) and reduced FPS (18.2). Storage at 72%.",
                status="active", camera_id="cam-lusail-01",
            ),
            Alert(
                id="alert-002",
                alert_type="speeding_violation", severity="medium",
                source_type="detection", source_ref_id="viol-002",
                title="Speeding Detected — Al Corniche",
                message="Vehicle QA-5678 detected at 95 km/h in 60 km/h zone.",
                status="active", camera_id="cam-corniche-01",
            ),
            Alert(
                id="alert-003",
                alert_type="red_light_violation", severity="high",
                source_type="detection", source_ref_id="viol-001",
                title="Red Light Violation — The Pearl",
                message="Vehicle QA-1234 crossed red light at Pearl roundabout.",
                status="active", camera_id="cam-pearl-01",
            ),
            Alert(
                id="alert-004",
                alert_type="illegal_parking_incident", severity="critical",
                source_type="detection", source_ref_id="inc-001",
                title="Illegal Parking — Lusail Expressway",
                message="Stopped vehicle on expressway shoulder. Potential safety hazard.",
                status="acknowledged",
                camera_id="cam-lusail-01",
                acknowledged_by="user-soc-01",
                acknowledged_at=NOW - timedelta(minutes=3),
            ),
        ]
        for a in alerts:
            session.add(a)

        # ── Security Events ──────────────────────────────────────────────
        sec_events = [
            SecurityEvent(
                event_type="unauthorized_access", source_ip="192.168.1.99",
                target_username="unknown_user",
                description="Failed login attempt from unrecognized IP",
                severity="medium", camera_id=None,
            ),
        ]
        for se in sec_events:
            session.add(se)

        # ── Audit Log Entries ─────────────────────────────────────────────
        audit_entries = [
            AuditLog(
                user_id="user-soc-01", action="login",
                resource_type="auth", details="[soc_operator_1] POST /api/v1/auth/login -> 200",
                ip_address="10.0.0.50", success=True,
            ),
            AuditLog(
                user_id="user-soc-01", action="view_record",
                resource_type="incidents", resource_id="inc-001",
                details="[soc_operator_1] GET /api/v1/incidents/inc-001 -> 200",
                ip_address="10.0.0.50", success=True,
            ),
            AuditLog(
                user_id="user-soc-01", action="update_record",
                resource_type="incidents", resource_id="inc-002",
                details="[soc_operator_1] PUT /api/v1/incidents/inc-002/transition -> 200 (acknowledged)",
                ip_address="10.0.0.50", success=True,
            ),
            AuditLog(
                user_id="user-auditor-01", action="view_record",
                resource_type="audit-logs",
                details="[auditor_1] GET /api/v1/audit-logs/ -> 200",
                ip_address="10.0.0.60", success=True,
            ),
        ]
        for al in audit_entries:
            session.add(al)

        # ── Sample Report ─────────────────────────────────────────────────
        report = IncidentReport(
            id="rpt-daily-001",
            report_type="daily_summary",
            summary_text="Daily traffic summary for Doha pilot area. 7 traffic events detected across 3 cameras. 3 violations flagged (1 confirmed, 2 pending). 2 incidents created. Camera cam-lusail-01 showing degraded health — network latency investigation recommended.",
            period_start=NOW - timedelta(hours=24),
            period_end=NOW,
            status="draft",
        )
        session.add(report)

        # ── Commit all ────────────────────────────────────────────────────
        await session.commit()
        print("✅ Phase 1 seed data committed successfully!")
        print(f"   → 3 cameras (Doha pilot area)")
        print(f"   → 2 operators + admin (already seeded)")
        print(f"   → 3 camera health records")
        print(f"   → 7 traffic events")
        print(f"   → 3 violations")
        print(f"   → 2 incidents")
        print(f"   → 4 alerts")
        print(f"   → 1 security event")
        print(f"   → 4 audit log entries")
        print(f"   → 1 daily report (draft)")


if __name__ == "__main__":
    asyncio.run(seed())
