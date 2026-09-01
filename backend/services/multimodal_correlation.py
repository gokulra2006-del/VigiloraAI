"""
Multimodal Correlation Engine — Audio + Video Event Fusion Subsystem.

Combines visual computer-vision detections (YOLO) with acoustic event detections
within a configurable temporal window (MULTIMODAL_CORRELATION_WINDOW_SECONDS).

Fusion Rules:
  - person / intrusion + glass_break        -> forced_entry (Critical)
  - person / crowd     + scream_aggression  -> physical_altercation (Critical)
  - vehicle / car      + loud_impact        -> vehicle_collision (High)
  - stationary/person  + alarm_siren        -> security_alarm_breach (High)
  - standalone audio   + high confidence    -> acoustic_threat_alert (High/Medium)

Combined Confidence Model:
  C_combined = min(1.0, 1.0 - (1.0 - C_visual) * (1.0 - C_audio) + synergy_bonus)
  where synergy_bonus = 0.05 (for cross-modal reinforcement).
"""

import asyncio
import logging
import uuid
from datetime import datetime, timezone, timedelta

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc

from config.settings import settings
from config.database import AsyncSessionLocal
from models.assets import Incident, Camera, Detection, Zone
from models.audio import AudioEvent
from models.enums import IncidentStatusEnum
from api.routes.telemetry import manager
from services.alert_pipeline import process_new_incident

logger = logging.getLogger(__name__)

# Correlation Rules Mapping: (audio_type, set(visual_classes)) -> (incident_type, severity, description)
CORRELATION_RULES = {
    "glass_break": {
        "visual_matches": {"person", "stationary_vehicle", "intrusion", "trespassing", "weapon", "car"},
        "incident_type": "forced_entry",
        "severity": "critical",
        "title": "Forced Entry / Glass Breach Detected",
        "description_template": "Acoustic glass break signature confirmed alongside visual presence of '{visual_class}' on {camera_id}.",
    },
    "scream_aggression": {
        "visual_matches": {"person", "fight", "crowd", "weapon"},
        "incident_type": "physical_altercation",
        "severity": "critical",
        "title": "Physical Altercation / Distress Detected",
        "description_template": "Human acoustic distress vocalization correlated with visual detection of '{visual_class}' on {camera_id}.",
    },
    "loud_impact": {
        "visual_matches": {"car", "truck", "bus", "motorcycle", "vehicle", "stationary_vehicle"},
        "incident_type": "vehicle_collision",
        "severity": "high",
        "title": "Vehicle Collision / Kinetic Impact",
        "description_template": "Acoustic concussive impact burst correlated with visual vehicle '{visual_class}' on {camera_id}.",
    },
    "alarm_siren": {
        "visual_matches": {"person", "car", "truck", "stationary_vehicle", "motorcycle"},
        "incident_type": "security_alarm_breach",
        "severity": "high",
        "title": "Perimeter Alarm & Activity Breach",
        "description_template": "Audible alarm siren tone correlated with visual activity '{visual_class}' on {camera_id}.",
    },
}


def calculate_multimodal_confidence(visual_conf: float | None, audio_conf: float) -> float:
    """
    Computes explainable cross-modal synergy confidence.
    If visual detection is present, independent probabilistic fusion with 5% synergy bonus:
      C_combined = min(1.0, 1.0 - (1.0 - C_v) * (1.0 - C_a) + 0.05)
    If audio-only: returns audio_conf.
    """
    if visual_conf is None:
        return round(float(audio_conf), 4)
    
    c_v = max(0.0, min(1.0, float(visual_conf)))
    c_a = max(0.0, min(1.0, float(audio_conf)))
    
    synergy_bonus = 0.05
    combined = 1.0 - ((1.0 - c_v) * (1.0 - c_a)) + synergy_bonus
    return round(min(1.0, max(0.0, combined)), 4)


async def correlate_audio_event(audio_event: AudioEvent) -> dict:
    """
    Evaluates incoming audio event against recent visual detections on the same camera/zone.
    Creates an enriched Incident if correlated, persists audio record, and broadcasts updates.
    """
    window_seconds = settings.MULTIMODAL_CORRELATION_WINDOW_SECONDS
    cutoff = datetime.now(timezone.utc) - timedelta(seconds=window_seconds)

    async with AsyncSessionLocal() as db:
        # 1. Resolve camera & zone
        cam_result = await db.execute(select(Camera).where(Camera.id == audio_event.camera_id))
        camera = cam_result.scalar_one_or_none()
        zone_name = None
        if camera:
            if camera.zone_id:
                z_res = await db.execute(select(Zone).where(Zone.id == camera.zone_id))
                z = z_res.scalar_one_or_none()
                if z:
                    zone_name = z.name
            if not zone_name and camera.location:
                zone_name = camera.location

        # 2. Query recent visual detections on this camera
        det_query = (
            select(Detection)
            .where(Detection.camera_id == audio_event.camera_id)
            .where(Detection.timestamp >= cutoff)
            .order_by(desc(Detection.timestamp))
            .limit(10)
        )
        det_result = await db.execute(det_query)
        recent_detections = det_result.scalars().all()

        matched_detection: Detection | None = None
        rule_config = CORRELATION_RULES.get(audio_event.event_type)

        if rule_config:
            allowed_visuals = rule_config["visual_matches"]
            for det in recent_detections:
                if det.class_name.lower() in allowed_visuals or any(v in det.class_name.lower() for v in allowed_visuals):
                    matched_detection = det
                    break

        # If no specific detection matched but recent visual detections exist, pick the most recent
        if not matched_detection and recent_detections:
            matched_detection = recent_detections[0]

        # 3. Determine incident attributes
        is_correlated = matched_detection is not None
        correlation_group_id = uuid.uuid4().hex[:12]

        if is_correlated and rule_config:
            inc_type = rule_config["incident_type"]
            severity = rule_config["severity"]
            desc_text = rule_config["description_template"].format(
                visual_class=matched_detection.class_name,
                camera_id=audio_event.camera_id or "cam-1"
            )
            v_conf = matched_detection.confidence
        elif rule_config:
            # Standalone audio threat
            inc_type = f"acoustic_{audio_event.event_type}"
            severity = "high" if audio_event.event_type in ("glass_break", "scream_aggression") else "medium"
            desc_text = f"Unconfirmed acoustic event '{audio_event.event_type}' detected on {audio_event.camera_id} (no concurrent visual subject in frame)."
            v_conf = None
        else:
            inc_type = f"audio_{audio_event.event_type}"
            severity = "medium"
            desc_text = f"Acoustic event '{audio_event.event_type}' detected on {audio_event.camera_id}."
            v_conf = None

        combined_conf = calculate_multimodal_confidence(v_conf, audio_event.confidence)

        # Build justification text
        if is_correlated:
            justification = (
                f"Multimodal Cross-Correlation: Acoustic event '{audio_event.event_type}' "
                f"(confidence: {audio_event.confidence * 100:.1f}%) fused with visual detection "
                f"'{matched_detection.class_name}' (confidence: {matched_detection.confidence * 100:.1f}%) "
                f"on {audio_event.camera_id} within {window_seconds}s window. "
                f"Combined multimodal synergy confidence: {combined_conf * 100:.1f}%."
            )
        else:
            justification = (
                f"Audio-Only Event: Acoustic event '{audio_event.event_type}' "
                f"(confidence: {audio_event.confidence * 100:.1f}%) captured on {audio_event.camera_id}."
            )

        evidence = [
            {
                "type": "audio",
                "audio_event_id": audio_event.id,
                "event_type": audio_event.event_type,
                "confidence": audio_event.confidence,
                "decibel_level": audio_event.decibel_level,
                "duration": audio_event.duration,
                "is_simulated": audio_event.is_simulated,
            }
        ]
        if is_correlated and matched_detection:
            evidence.append({
                "type": "visual",
                "detection_id": matched_detection.id,
                "class_name": matched_detection.class_name,
                "confidence": matched_detection.confidence,
                "bbox": matched_detection.bbox_json,
                "snapshot_path": matched_detection.snapshot_path,
            })

        # 4. Create Incident
        incident = Incident(
            type=inc_type,
            severity=severity,
            status=IncidentStatusEnum.detected.value,
            description=desc_text,
            camera_id=audio_event.camera_id,
            zone=zone_name or "Sector 4, Entry Point",
            source="multimodal" if is_correlated else "audio",
            model_confidence=combined_conf,
            justification_text=justification,
            correlation_group=correlation_group_id,
            evidence_refs=evidence,
        )
        db.add(incident)
        await db.commit()
        await db.refresh(incident)

        # 5. Trigger existing Alert Pipeline & Nova assessment
        asyncio.create_task(process_new_incident(incident.id))

        # 6. Broadcast multimodal telemetry payload via WebSocket
        multimodal_payload = {
            "type": "MULTIMODAL_EVENT",
            "data": {
                "id": audio_event.id,
                "incident_id": incident.id,
                "incident_type": incident.type,
                "severity": incident.severity,
                "camera_id": audio_event.camera_id,
                "audio_event_type": audio_event.event_type,
                "audio_confidence": audio_event.confidence,
                "visual_event_type": matched_detection.class_name if matched_detection else None,
                "visual_confidence": matched_detection.confidence if matched_detection else None,
                "combined_confidence": combined_conf,
                "is_correlated": is_correlated,
                "is_simulated": audio_event.is_simulated,
                "justification": justification,
                "timestamp": incident.detected_at.isoformat() if incident.detected_at else datetime.now(timezone.utc).isoformat(),
            }
        }
        await manager.broadcast(multimodal_payload)

        # Also emit standard NEW_INCIDENT to ensure all existing UI pages update
        await manager.broadcast({
            "type": "NEW_INCIDENT",
            "data": {
                "id": incident.id,
                "title": incident.type,
                "severity": incident.severity,
                "zone": incident.zone,
                "camera_id": incident.camera_id,
                "source": incident.source,
            }
        })

        return {
            "audio_event": audio_event,
            "incident": incident,
            "is_correlated": is_correlated,
            "visual_match": matched_detection.class_name if matched_detection else None,
            "combined_confidence": combined_conf,
        }