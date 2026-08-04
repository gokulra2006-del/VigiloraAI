"""API routes for Traffic Events."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc
from datetime import datetime

from config.database import get_db
from models.traffic import TrafficEvent
from schemas.traffic_event import TrafficEventCreate, TrafficEventResponse
from security.auth import get_current_user
from models.assets import User

router = APIRouter()


@router.get("/", response_model=list[TrafficEventResponse])
async def list_traffic_events(
    camera_id: str | None = Query(None),
    event_type: str | None = Query(None),
    min_confidence: float | None = Query(None, ge=0.0, le=1.0),
    start_time: datetime | None = Query(None),
    end_time: datetime | None = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List traffic events with optional filters."""
    query = select(TrafficEvent).order_by(desc(TrafficEvent.timestamp))
    if camera_id:
        query = query.where(TrafficEvent.camera_id == camera_id)
    if event_type:
        query = query.where(TrafficEvent.event_type == event_type)
    if min_confidence is not None:
        query = query.where(TrafficEvent.confidence >= min_confidence)
    if start_time:
        query = query.where(TrafficEvent.timestamp >= start_time)
    if end_time:
        query = query.where(TrafficEvent.timestamp <= end_time)
    query = query.offset(offset).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{event_id}", response_model=TrafficEventResponse)
async def get_traffic_event(
    event_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single traffic event by ID."""
    result = await db.execute(select(TrafficEvent).where(TrafficEvent.id == event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Traffic event not found")
    return event


@router.post("/", response_model=TrafficEventResponse, status_code=201)
async def create_traffic_event(
    payload: TrafficEventCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new traffic event (called by the detection pipeline)."""
    event = TrafficEvent(**payload.model_dump())
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return event
