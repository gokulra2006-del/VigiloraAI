"""Watchlist API — Genesis Layer 1. CRUD for persons of interest + match log."""
import random
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel
from config.database import get_db
from models.assets import Watchlist, WatchlistMatch, Camera
from security.auth import get_current_user

router = APIRouter()


class WatchlistCreate(BaseModel):
    name: str
    category: str = "POI"   # POI | Suspect | Missing | VIP
    notes: str | None = None
    photo_url: str | None = None


class WatchlistUpdate(BaseModel):
    name: str | None = None
    category: str | None = None
    notes: str | None = None
    photo_url: str | None = None
    status: str | None = None


@router.get("/")
async def list_watchlist(
    category: str | None = None,
    status_filter: str | None = Query(default=None, alias="status"),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    query = select(Watchlist).order_by(Watchlist.added_at.desc())
    if category:
        query = query.where(Watchlist.category == category)
    if status_filter:
        query = query.where(Watchlist.status == status_filter)
    result = await db.execute(query)
    entries = result.scalars().all()
    return [
        {
            "id": e.id,
            "name": e.name,
            "category": e.category,
            "status": e.status,
            "photo_url": e.photo_url,
            "notes": e.notes,
            "added_at": e.added_at.isoformat() if e.added_at else None,
            "last_match": e.last_match.isoformat() if e.last_match else None,
        }
        for e in entries
    ]


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_watchlist_entry(
    data: WatchlistCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    entry = Watchlist(
        name=data.name,
        category=data.category,
        notes=data.notes,
        photo_url=data.photo_url,
        status="active",
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return {"id": entry.id, "name": entry.name, "category": entry.category, "status": entry.status}


@router.patch("/{entry_id}")
async def update_watchlist_entry(
    entry_id: str,
    data: WatchlistUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(select(Watchlist).where(Watchlist.id == entry_id))
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Watchlist entry not found")
    for field, val in data.model_dump(exclude_none=True).items():
        setattr(entry, field, val)
    await db.commit()
    await db.refresh(entry)
    return {"id": entry.id, "status": entry.status, "name": entry.name}


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_watchlist_entry(
    entry_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(select(Watchlist).where(Watchlist.id == entry_id))
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Watchlist entry not found")
    await db.delete(entry)
    await db.commit()


@router.get("/matches")
async def list_matches(
    limit: int = Query(default=50, le=200),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(
        select(WatchlistMatch).order_by(WatchlistMatch.timestamp.desc()).limit(limit)
    )
    matches = result.scalars().all()
    return [
        {
            "id": m.id,
            "watchlist_id": m.watchlist_id,
            "watchlist_name": m.watchlist_entry.name if m.watchlist_entry else None,
            "watchlist_category": m.watchlist_entry.category if m.watchlist_entry else None,
            "camera_id": m.camera_id,
            "confidence": m.confidence,
            "confidence_pct": round(m.confidence * 100, 1),
            "frame_path": m.frame_path,
            "timestamp": m.timestamp.isoformat() if m.timestamp else None,
        }
        for m in matches
    ]


@router.post("/simulate-match")
async def simulate_match(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Inject a simulated face-match event for testing."""
    wl_result = await db.execute(select(Watchlist).where(Watchlist.status == "active"))
    entries = wl_result.scalars().all()
    if not entries:
        raise HTTPException(status_code=400, detail="No active watchlist entries to match against")

    cam_result = await db.execute(select(Camera))
    cameras = cam_result.scalars().all()
    camera_id = cameras[0].id if cameras else "cam-sim"

    entry = random.choice(entries)
    confidence = round(random.uniform(0.72, 0.99), 3)

    match = WatchlistMatch(
        watchlist_id=entry.id,
        camera_id=camera_id,
        confidence=confidence,
    )
    db.add(match)
    entry.last_match = datetime.now(timezone.utc)
    await db.commit()

    return {
        "status": "match_injected",
        "watchlist_name": entry.name,
        "camera_id": camera_id,
        "confidence": confidence,
        "confidence_pct": round(confidence * 100, 1),
    }
