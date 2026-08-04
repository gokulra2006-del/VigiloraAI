"""API routes for Violations."""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc

from config.database import get_db
from models.traffic import Violation
from schemas.violation import ViolationCreate, ViolationResponse, ViolationStatusUpdate
from security.auth import get_current_user, require_role
from models.assets import User

router = APIRouter()


@router.get("/", response_model=list[ViolationResponse])
async def list_violations(
    camera_id: str | None = Query(None),
    violation_type: str | None = Query(None),
    status: str | None = Query(None),
    start_time: datetime | None = Query(None),
    end_time: datetime | None = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List violations with optional filters."""
    query = select(Violation).order_by(desc(Violation.created_at))
    if camera_id:
        query = query.where(Violation.camera_id == camera_id)
    if violation_type:
        query = query.where(Violation.violation_type == violation_type)
    if status:
        query = query.where(Violation.status == status)
    if start_time:
        query = query.where(Violation.created_at >= start_time)
    if end_time:
        query = query.where(Violation.created_at <= end_time)
    query = query.offset(offset).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{violation_id}", response_model=ViolationResponse)
async def get_violation(
    violation_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single violation by ID."""
    result = await db.execute(select(Violation).where(Violation.id == violation_id))
    violation = result.scalar_one_or_none()
    if not violation:
        raise HTTPException(status_code=404, detail="Violation not found")
    return violation


@router.post("/", response_model=ViolationResponse, status_code=201)
async def create_violation(
    payload: ViolationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new violation record."""
    violation = Violation(**payload.model_dump())
    db.add(violation)
    await db.commit()
    await db.refresh(violation)
    return violation


@router.put("/{violation_id}/status", response_model=ViolationResponse)
async def update_violation_status(
    violation_id: str,
    payload: ViolationStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "soc_operator", "operator"])),
):
    """Update a violation's status (confirm, dismiss, appeal). Requires SOC/Admin role."""
    result = await db.execute(select(Violation).where(Violation.id == violation_id))
    violation = result.scalar_one_or_none()
    if not violation:
        raise HTTPException(status_code=404, detail="Violation not found")

    old_status = violation.status
    violation.status = payload.status
    violation.reviewing_operator_id = current_user.id
    violation.reviewed_at = datetime.now(timezone.utc)

    # Append to audit history
    history = violation.audit_history or []
    history.append({
        "action": f"status_change:{old_status}->{payload.status}",
        "by": current_user.username,
        "at": datetime.now(timezone.utc).isoformat(),
        "justification": payload.justification,
    })
    violation.audit_history = history

    await db.commit()
    await db.refresh(violation)
    return violation
