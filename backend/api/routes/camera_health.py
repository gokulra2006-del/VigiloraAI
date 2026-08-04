"""API routes for Camera Health monitoring."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc

from config.database import get_db
from models.traffic import CameraHealth
from models.assets import Camera
from schemas.camera_health import CameraHealthCreate, CameraHealthResponse
from security.auth import get_current_user
from models.assets import User
from datetime import datetime, timezone

router = APIRouter()


@router.get("/", response_model=list[CameraHealthResponse])
async def list_camera_health(
    camera_id: str | None = Query(None),
    status: str | None = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List camera health records, optionally filtered by camera_id or status."""
    query = select(CameraHealth).order_by(desc(CameraHealth.checked_at))
    if camera_id:
        query = query.where(CameraHealth.camera_id == camera_id)
    if status:
        query = query.where(CameraHealth.status == status)
    query = query.offset(offset).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{camera_id}/latest", response_model=CameraHealthResponse | None)
async def get_latest_camera_health(
    camera_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the most recent health record for a specific camera."""
    query = (
        select(CameraHealth)
        .where(CameraHealth.camera_id == camera_id)
        .order_by(desc(CameraHealth.checked_at))
        .limit(1)
    )
    result = await db.execute(query)
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail=f"No health records for camera {camera_id}")
    return record


@router.post("/", response_model=CameraHealthResponse, status_code=201)
async def create_camera_health(
    payload: CameraHealthCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Record a new camera health check. Also updates the camera's last_heartbeat and health_status."""
    # Verify camera exists
    cam_result = await db.execute(select(Camera).where(Camera.id == payload.camera_id))
    camera = cam_result.scalar_one_or_none()
    if not camera:
        raise HTTPException(status_code=404, detail=f"Camera {payload.camera_id} not found")

    record = CameraHealth(**payload.model_dump())
    db.add(record)

    # Update camera's health fields
    camera.last_heartbeat = datetime.now(timezone.utc)
    camera.health_status = payload.status

    await db.commit()
    await db.refresh(record)
    return record
