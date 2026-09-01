"""
VIGILORA AI — Vision AI API Endpoints
====================================
Routes for Multimodal Visual Threat Detection:
- POST /api/v1/vision/analyze
- GET  /api/v1/vision/scenarios
- GET  /api/v1/vision/incidents
- GET  /api/v1/vision/incidents/{id}
- POST /api/v1/vision/incidents
"""

import logging
import os
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc

from config.database import get_db
from models.assets import VisionIncident, Incident
from schemas.vision import (
    VisionAnalysisResponse,
    VisionIncidentCreate,
    VisionIncidentResponse,
    VisionScenario,
)
from services.vision_service import vision_service

router = APIRouter()
logger = logging.getLogger(__name__)

MAX_FILE_SIZE = 15 * 1024 * 1024  # 15MB
ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}


@router.get("/scenarios", response_model=List[VisionScenario])
async def get_vision_scenarios():
    """Returns the list of curated demo security scenarios for hackathon presentation."""
    return vision_service.get_scenarios()


@router.post("/analyze", response_model=VisionAnalysisResponse)
async def analyze_vision_frame(
    file: Optional[UploadFile] = File(None),
    scenario_id: Optional[str] = Form(None),
    camera_name: Optional[str] = Form("Camera 04 (Main Security)"),
    sector: Optional[str] = Form("Sector 7 (Perimeter)"),
):
    """
    Analyzes an uploaded CCTV / surveillance camera image frame.
    Accepts multipart/form-data image or a demo scenario ID.
    """
    # 1. If demo scenario ID is provided, analyze scenario preset
    if scenario_id:
        return await vision_service.analyze_scenario(scenario_id)

    # 2. If file is provided, validate and analyze
    if not file:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either an image file or a scenario_id must be provided."
        )

    # Validate filename extension
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{ext}'. Allowed formats: PNG, JPG, JPEG, WEBP."
        )

    # Read and validate file size
    image_bytes = await file.read()
    if len(image_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file exceeds maximum limit of 15 MB."
        )
    if len(image_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty."
        )

    try:
        result = await vision_service.analyze_image_bytes(
            image_bytes=image_bytes,
            filename=file.filename or "cctv_frame.jpg",
            camera_name=camera_name or "Camera 04",
            sector=sector or "Sector 7",
        )
        return result
    except ValueError as val_err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(val_err))
    except Exception as exc:
        logger.error(f"[VisionAPI] Analysis failed: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Vision threat analysis could not be completed. Please try again."
        )


@router.get("/incidents", response_model=List[VisionIncidentResponse])
async def get_vision_incidents(db: AsyncSession = Depends(get_db)):
    """Retrieves previous vision threat analysis incident dossiers."""
    result = await db.execute(
        select(VisionIncident).order_by(desc(VisionIncident.created_at)).limit(50)
    )
    return result.scalars().all()


@router.get("/incidents/{incident_id}", response_model=VisionIncidentResponse)
async def get_vision_incident(incident_id: str, db: AsyncSession = Depends(get_db)):
    """Retrieves a single vision incident dossier by ID."""
    result = await db.execute(select(VisionIncident).where(VisionIncident.id == incident_id))
    inc = result.scalar_one_or_none()
    if not inc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Vision incident '{incident_id}' not found.")
    return inc


@router.post("/incidents", response_model=VisionIncidentResponse, status_code=status.HTTP_201_CREATED)
async def save_vision_incident(payload: VisionIncidentCreate, db: AsyncSession = Depends(get_db)):
    """Saves a vision threat analysis as an official SOC incident dossier."""
    # Convert Pydantic submodels to serializable dicts
    detected_objects_data = [obj.model_dump() for obj in payload.detected_objects]
    threats_data = [t.model_dump() for t in payload.threats]

    inc_record = VisionIncident(
        id=payload.analysis_id or f"VIS-2026-{uuid.uuid4().hex[:6].upper()}",
        camera_name=payload.camera_name,
        sector=payload.sector,
        threat_level=payload.threat_level,
        threat_score=payload.threat_score,
        confidence=payload.confidence,
        summary=payload.summary,
        incident_title=payload.incident_title,
        incident_description=payload.incident_description,
        detected_objects_json=detected_objects_data,
        threats_json=threats_data,
        visual_observations_json=payload.visual_observations,
        recommended_actions_json=payload.recommended_actions,
        image_url=payload.image_url,
        image_metadata_json=payload.image_metadata,
        is_demo_mode=payload.is_demo_mode,
    )

    db.add(inc_record)

    # If critical or high, also link into central SOC incidents stream
    if payload.threat_level in ("CRITICAL", "HIGH"):
        soc_inc = Incident(
            type="vision_threat",
            severity="critical" if payload.threat_level == "CRITICAL" else "high",
            camera_id=payload.camera_name,
            description=f"[Vision AI] {payload.incident_title}: {payload.summary}",
            status="open",
            source="vision_ai",
            model_confidence=payload.confidence,
            justification_text=f"Vision AI Threat Score: {payload.threat_score:.1f}% | Sector: {payload.sector}",
        )
        db.add(soc_inc)

    await db.commit()
    await db.refresh(inc_record)
    return inc_record