"""Geofence API — Genesis Layer 2. Full CRUD for Zone geofence definitions."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel
from typing import Any
from config.database import get_db
from models.assets import Zone
from security.auth import get_current_user

router = APIRouter()


class ZoneCreate(BaseModel):
    name: str
    polygon_coords: list[list[float]]  # [[lat, lng], ...]
    rule: str | None = None
    color: str = "#ef4444"
    time_start: str | None = None   # e.g. "22:00"
    time_end: str | None = None     # e.g. "06:00"
    trigger_severity: str | None = "high"


class ZoneUpdate(BaseModel):
    name: str | None = None
    polygon_coords: list[list[float]] | None = None
    rule: str | None = None
    color: str | None = None
    status: str | None = None
    time_start: str | None = None
    time_end: str | None = None
    trigger_severity: str | None = None


@router.get("/")
async def list_zones(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(select(Zone).order_by(Zone.created_at.desc()))
    zones = result.scalars().all()
    return [
        {
            "id": z.id,
            "name": z.name,
            "polygon_coords": z.polygon_coords,
            "rule": z.rule,
            "status": z.status,
            "color": z.color,
            "created_at": z.created_at.isoformat() if z.created_at else None,
        }
        for z in zones
    ]


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_zone(
    data: ZoneCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    # Encode time window into rule string if provided
    rule = data.rule
    if data.time_start and data.time_end and not rule:
        rule = f"active_{data.time_start}_to_{data.time_end}"

    zone = Zone(
        name=data.name,
        polygon_coords=data.polygon_coords,
        rule=rule,
        color=data.color,
        status="active",
    )
    db.add(zone)
    await db.commit()
    await db.refresh(zone)
    return {"id": zone.id, "name": zone.name, "status": zone.status}


@router.patch("/{zone_id}")
async def update_zone(
    zone_id: str,
    data: ZoneUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(select(Zone).where(Zone.id == zone_id))
    zone = result.scalar_one_or_none()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    for field, val in data.model_dump(exclude_none=True).items():
        if hasattr(zone, field):
            setattr(zone, field, val)
    await db.commit()
    return {"id": zone.id, "name": zone.name, "status": zone.status}


@router.delete("/{zone_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_zone(
    zone_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(select(Zone).where(Zone.id == zone_id))
    zone = result.scalar_one_or_none()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    await db.delete(zone)
    await db.commit()


@router.post("/{zone_id}/evaluate")
async def evaluate_zone(
    zone_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Evaluate recent detections against this zone's rules (simulated)."""
    result = await db.execute(select(Zone).where(Zone.id == zone_id))
    zone = result.scalar_one_or_none()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")

    import random
    violations = random.randint(0, 3)
    return {
        "zone_id": zone_id,
        "zone_name": zone.name,
        "rule": zone.rule,
        "violations_found": violations,
        "status": "violations_detected" if violations > 0 else "clear",
    }
