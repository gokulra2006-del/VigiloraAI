import asyncio
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from config.database import get_db
from models.assets import Incident, Camera, Case
from models.enums import INCIDENT_TRANSITIONS, IncidentStatusEnum
from schemas.incident import IncidentCreate, IncidentResponse, IncidentTransition
from security.auth import get_current_user
from api.routes.telemetry import manager
from services.alerting import dispatch_alert
from services.alert_pipeline import process_new_incident

router = APIRouter()


@router.post("/", response_model=IncidentResponse, status_code=status.HTTP_201_CREATED)
async def create_incident(
    incident_in: IncidentCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
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
        zone=incident_in.zone,
        source=incident_in.source.value if incident_in.source else "camera",
        model_confidence=incident_in.model_confidence,
        status=IncidentStatusEnum.detected,
    )
    db.add(incident)
    await db.commit()
    await db.refresh(incident)

    asyncio.create_task(process_new_incident(incident.id))

    await manager.broadcast({
        "type": "NEW_INCIDENT",
        "data": {
            "id": incident.id,
            "title": incident.type,
            "severity": incident.severity.value if hasattr(incident.severity, "value") else incident.severity,
            "zone": incident.zone,
        },
    })
    asyncio.create_task(dispatch_alert(incident))

    return incident


@router.get("/", response_model=list[IncidentResponse])
async def list_incidents(
    limit: int = 100,
    severity: str | None = None,
    status_filter: str | None = Query(None, alias="status"),
    zone: str | None = None,
    camera_id: str | None = None,
    source: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    query = select(Incident).order_by(Incident.detected_at.desc()).limit(limit)
    if severity:
        query = query.where(Incident.severity == severity)
    if status_filter:
        query = query.where(Incident.status == status_filter)
    if zone:
        query = query.where(Incident.zone == zone)
    if camera_id:
        query = query.where(Incident.camera_id == camera_id)
    if source:
        query = query.where(Incident.source == source)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{incident_id}", response_model=IncidentResponse)
async def get_incident(
    incident_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(select(Incident).where(Incident.id == incident_id))
    incident = result.scalar_one_or_none()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident


@router.patch("/{incident_id}/transition", response_model=IncidentResponse)
async def transition_incident(
    incident_id: str,
    transition: IncidentTransition,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
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
            detail=f"Invalid transition from {current_status.value} to {new_status.value}",
        )

    incident.status = new_status.value
    now = datetime.now(timezone.utc)

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


@router.post("/{incident_id}/assign")
async def assign_incident(
    incident_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(select(Incident).where(Incident.id == incident_id))
    incident = result.scalar_one_or_none()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    incident.assigned_to = current_user.id
    await db.commit()
    return {"id": incident.id, "assigned_to": current_user.id}


@router.post("/{incident_id}/create-case")
async def create_case_from_incident(
    incident_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(select(Incident).where(Incident.id == incident_id))
    incident = result.scalar_one_or_none()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    case = Case(
        title=f"Case: {incident.type}",
        status="open",
        severity=incident.severity,
        correlated_alert_count=1,
        affected_zones=incident.zone,
        summary=f"Manual case created from alert {incident.id}.",
    )
    db.add(case)
    await db.flush()
    incident.case_id = case.id
    await db.commit()
    return {"case_id": case.id, "incident_id": incident.id}
