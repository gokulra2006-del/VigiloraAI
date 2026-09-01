"""Watchlist API — Genesis Layer 1. CRUD for persons of interest + match log + review."""
import random
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from typing import Optional
from config.database import get_db
from models.assets import Watchlist, WatchlistMatch, Camera, Incident
from security.auth import get_current_user

router = APIRouter()

class WatchlistCreate(BaseModel):
    name: str
    category: str = "POI"   # POI | Suspect | Missing | VIP
    priority: str = "MEDIUM"
    notes: str | None = None
    photo_url: str | None = None

class WatchlistUpdate(BaseModel):
    name: str | None = None
    category: str | None = None
    priority: str | None = None
    notes: str | None = None
    photo_url: str | None = None
    status: str | None = None

class ReviewRequest(BaseModel):
    decision: str  # 'CONFIRM' or 'REJECT'
    notes: str | None = None

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
            "priority": e.priority,
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
        priority=data.priority,
        notes=data.notes,
        photo_url=data.photo_url,
        status="active",
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return {"id": entry.id, "name": entry.name, "category": entry.category, "status": entry.status, "priority": entry.priority}

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
    query = (
        select(WatchlistMatch)
        .options(selectinload(WatchlistMatch.watchlist_entry), selectinload(WatchlistMatch.reviewer))
        .order_by(WatchlistMatch.timestamp.desc())
        .limit(limit)
    )
    result = await db.execute(query)
    matches = result.scalars().all()
    return [
        {
            "id": m.id,
            "watchlist_id": m.watchlist_id,
            "watchlist_name": m.watchlist_entry.name if m.watchlist_entry else None,
            "watchlist_category": m.watchlist_entry.category if m.watchlist_entry else None,
            "watchlist_photo_url": m.watchlist_entry.photo_url if m.watchlist_entry else None,
            "camera_id": m.camera_id,
            "confidence": m.confidence,
            "confidence_pct": round(m.confidence * 100, 1),
            "frame_path": m.frame_path,
            "timestamp": m.timestamp.isoformat() if m.timestamp else None,
            "status": m.status,
            "reviewed_by": m.reviewed_by,
            "reviewer_name": m.reviewer.username if m.reviewer else None,
            "review_notes": m.review_notes,
            "reviewed_at": m.reviewed_at.isoformat() if m.reviewed_at else None,
        }
        for m in matches
    ]

@router.post("/simulate-match")
async def simulate_match(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Legacy injection method."""
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
        status="PENDING_REVIEW"
    )
    db.add(match)
    entry.last_match = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(match)
    
    return {
        "id": match.id,
        "status": match.status,
        "watchlist_name": entry.name,
        "camera_id": camera_id,
        "confidence": confidence,
        "confidence_pct": round(confidence * 100, 1),
    }

@router.post("/demo")
async def run_watchlist_demo(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Trigger the live demo matching sequence. Returns a high-confidence potential match."""
    wl_result = await db.execute(select(Watchlist).where(Watchlist.status == "active").order_by(Watchlist.added_at.desc()))
    entries = wl_result.scalars().all()
    if not entries:
        demo_entry = Watchlist(
            name="Demo Subject 01", 
            category="Restricted Access Demo", 
            priority="HIGH", 
            photo_url="https://images.unsplash.com/photo-1568602471122-7832951cc4c5?auto=format&fit=crop&w=400&q=80", 
            status="active", 
            notes="Demo created for Watchlist presentation."
        )
        db.add(demo_entry)
        await db.commit()
        await db.refresh(demo_entry)
        entry = demo_entry
    else:
        entry = entries[0]
        
    cam_result = await db.execute(select(Camera))
    cameras = cam_result.scalars().all()
    camera_id = cameras[0].id if cameras else "Camera 04"

    confidence = round(random.uniform(0.91, 0.98), 3)

    match = WatchlistMatch(
        watchlist_id=entry.id,
        camera_id=camera_id,
        confidence=confidence,
        status="PENDING_REVIEW",
        frame_path="https://images.unsplash.com/photo-1568602471122-7832951cc4c5?auto=format&fit=crop&w=600&q=80"
    )
    db.add(match)
    entry.last_match = datetime.now(timezone.utc)
    
    from services.playbook_engine import evaluate_event
    await db.flush()
    await evaluate_event(db, "watchlist_match", "Potential Watchlist Match Detected", str(match.id), {"similarity": confidence})
    
    await db.commit()
    await db.refresh(match)
    
    return {
        "id": match.id,
        "status": match.status,
        "watchlist_name": entry.name,
        "watchlist_photo_url": entry.photo_url,
        "camera_id": camera_id,
        "confidence": confidence,
        "confidence_pct": round(confidence * 100, 1),
        "frame_path": match.frame_path
    }

@router.post("/matches/{match_id}/review")
async def review_match(
    match_id: int,
    request: ReviewRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    query = select(WatchlistMatch).options(selectinload(WatchlistMatch.watchlist_entry)).where(WatchlistMatch.id == match_id)
    result = await db.execute(query)
    match = result.scalar_one_or_none()
    
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
        
    if match.status != "PENDING_REVIEW":
        raise HTTPException(status_code=400, detail=f"Match already reviewed. Status: {match.status}")
        
    match.reviewed_by = current_user.id
    match.review_notes = request.notes
    match.reviewed_at = datetime.now(timezone.utc)
    
    if request.decision == "CONFIRM":
        match.status = "VERIFIED"
        
        incident = Incident(
            camera_id=match.camera_id,
            type="Verified Watchlist Match",
            severity="high" if match.watchlist_entry.priority == "HIGH" else "medium",
            status="detected",
            description=f"Verified match for {match.watchlist_entry.name} ({match.watchlist_entry.category}). Operator notes: {request.notes or 'None'}",
            model_confidence=match.confidence,
            source="vision_ai"
        )
        db.add(incident)
        
        from services.playbook_engine import evaluate_event
        await db.flush()
        await evaluate_event(db, "incident", "WATCHLIST-POTENTIAL-MATCH", incident.id, {"similarity": match.confidence})
        
    elif request.decision == "REJECT":
        match.status = "REJECTED"
    else:
        raise HTTPException(status_code=400, detail="Decision must be CONFIRM or REJECT")
        
    await db.commit()
    await db.refresh(match)
    
    return {"status": match.status, "incident_created": request.decision == "CONFIRM"}
