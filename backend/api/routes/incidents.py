import asyncio
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from config.database import get_db
from models.assets import Incident, Camera
from models.enums import INCIDENT_TRANSITIONS, IncidentStatusEnum
from schemas.incident import IncidentCreate, IncidentResponse, IncidentTransition
from security.auth import get_current_user
from api.routes.telemetry import manager
from services.alerting import dispatch_alert

router = APIRouter()

@router.post("/", response_model=IncidentResponse, status_code=status.HTTP_201_CREATED)
async def create_incident(
    incident_in: IncidentCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    if incident_in.camera_id:
        cam_result = await db.execute(select(Camera).where(Camera.id == incident_in.camera_id))
        if not cam_result.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Camera not found")

    incident = Incident(
        type=incident_in.type,
        severity=incident_in.severity,
        description=incident_in.description,
        camera_id=incident_in.camera_id,
        status=IncidentStatusEnum.detected
    )
    db.add(incident)
    await db.commit()
    await db.refresh(incident)
    
    # Broadcast to websocket
    await manager.broadcast({
        "type": "NEW_INCIDENT", 
        "data": {"id": incident.id, "title": incident.type, "severity": incident.severity.value}
    })

    # Fire-and-forget: dispatch notifications to all configured alert channels
    asyncio.create_task(dispatch_alert(incident))

    return incident

@router.get("/", response_model=list[IncidentResponse])
async def list_incidents(
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    result = await db.execute(select(Incident).order_by(Incident.detected_at.desc()).limit(limit))
    return result.scalars().all()

@router.patch("/{incident_id}/transition", response_model=IncidentResponse)
async def transition_incident(
    incident_id: str,
    transition: IncidentTransition,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    result = await db.execute(select(Incident).where(Incident.id == incident_id))
    incident = result.scalar_one_or_none()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
        
    current_status = IncidentStatusEnum(incident.status)
    new_status = transition.status
    
    if new_status not in INCIDENT_TRANSITIONS.get(current_status, set()):
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid transition from {current_status.value} to {new_status.value}"
        )
        
    incident.status = new_status.value
    now = datetime.now(timezone.utc)
    
    # Update audit timestamps
    if new_status == IncidentStatusEnum.acknowledged:
        incident.acknowledged_at = now
        incident.assigned_to = current_user.id
    elif new_status == IncidentStatusEnum.in_progress:
        incident.in_progress_at = now
    elif new_status == IncidentStatusEnum.resolved:
        incident.resolved_at = now
    elif new_status == IncidentStatusEnum.closed:
        incident.closed_at = now
        
    await db.commit()
    await db.refresh(incident)
    return incident
