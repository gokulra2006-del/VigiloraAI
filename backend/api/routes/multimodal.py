"""Multimodal & Audio Event API Routes."""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc

from config.database import get_db
from models.audio import AudioEvent
from models.assets import Incident, Camera
from schemas.audio import (
    AudioEventCreate,
    AudioEventResponse,
    AudioSimulateRequest,
    MultimodalCorrelationResponse,
)
from security.auth import get_current_user
from services.multimodal_correlation import correlate_audio_event

router = APIRouter()


@router.post("/audio-events", response_model=AudioEventResponse, status_code=status.HTTP_201_CREATED)
async def create_audio_event(
    event_in: AudioEventCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Ingest an acoustic event from hardware microphone or audio detection pipeline.
    Automatically evaluates multimodal cross-correlation against visual detections.
    """
    audio_event = AudioEvent(
        camera_id=event_in.camera_id,
        event_type=event_in.event_type,
        confidence=event_in.confidence,
        decibel_level=event_in.decibel_level,
        duration=event_in.duration,
        source=event_in.source,
        is_simulated=event_in.is_simulated,
        metadata_json=event_in.metadata_json,
    )
    db.add(audio_event)
    await db.commit()
    await db.refresh(audio_event)

    # Run multimodal fusion
    await correlate_audio_event(audio_event)
    return audio_event


@router.get("/audio-events", response_model=list[AudioEventResponse])
async def list_audio_events(
    camera_id: str | None = None,
    event_type: str | None = None,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """List recent acoustic detection events."""
    query = select(AudioEvent).order_by(desc(AudioEvent.timestamp)).limit(limit)
    if camera_id:
        query = query.where(AudioEvent.camera_id == camera_id)
    if event_type:
        query = query.where(AudioEvent.event_type == event_type)

    result = await db.execute(query)
    return result.scalars().all()


@router.post("/simulate-audio", status_code=status.HTTP_201_CREATED)
async def simulate_audio_event(
    req: AudioSimulateRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Demonstration trigger: Injects a simulated acoustic event (Glass Break, Scream, Impact, Siren)
    and tests live real-time multimodal fusion with active camera detections.
    """
    audio_event = AudioEvent(
        camera_id=req.camera_id,
        event_type=req.event_type,
        confidence=req.confidence,
        duration=req.duration,
        source="audio",
        is_simulated=True,
        metadata_json={"simulation_mode": "interactive_demo", "trigger": "user_ui_button"},
    )
    db.add(audio_event)
    await db.commit()
    await db.refresh(audio_event)

    correlation_res = await correlate_audio_event(audio_event)
    incident = correlation_res.get("incident")

    return {
        "status": "success",
        "audio_event_id": audio_event.id,
        "event_type": audio_event.event_type,
        "confidence": audio_event.confidence,
        "is_correlated": correlation_res.get("is_correlated", False),
        "visual_match": correlation_res.get("visual_match"),
        "combined_confidence": correlation_res.get("combined_confidence"),
        "incident_id": incident.id if incident else None,
        "incident_type": incident.type if incident else None,
        "severity": incident.severity if incident else None,
        "justification": incident.justification_text if incident else None,
    }


@router.get("/correlations")
async def list_multimodal_correlations(
    limit: int = 30,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Fetch recent multimodal correlated security incidents."""
    query = (
        select(Incident)
        .where(Incident.source.in_(["multimodal", "audio"]))
        .order_by(desc(Incident.detected_at))
        .limit(limit)
    )
    result = await db.execute(query)
    incidents = result.scalars().all()

    correlations = []
    for inc in incidents:
        audio_type = "unknown"
        audio_conf = inc.model_confidence or 0.8
        visual_type = None
        visual_conf = None

        if inc.evidence_refs and isinstance(inc.evidence_refs, list):
            for ev in inc.evidence_refs:
                if isinstance(ev, dict):
                    if ev.get("type") == "audio":
                        audio_type = ev.get("event_type", "acoustic_event")
                        audio_conf = ev.get("confidence", audio_conf)
                    elif ev.get("type") == "visual":
                        visual_type = ev.get("class_name")
                        visual_conf = ev.get("confidence")

        correlations.append({
            "id": inc.id,
            "incident_type": inc.type,
            "severity": inc.severity,
            "camera_id": inc.camera_id,
            "zone": inc.zone,
            "source": inc.source,
            "audio_event_type": audio_type,
            "audio_confidence": audio_conf,
            "visual_event_type": visual_type,
            "visual_confidence": visual_conf,
            "combined_confidence": inc.model_confidence or 0.85,
            "justification": inc.justification_text,
            "status": inc.status,
            "timestamp": inc.detected_at.isoformat() if inc.detected_at else None,
        })

    return correlations