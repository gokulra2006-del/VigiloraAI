"""API routes for License Plate Records (ANPR)."""

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc

from config.database import get_db
from models.traffic import LicensePlateRecord
from schemas.license_plate import LicensePlateCreate, LicensePlateResponse
from security.auth import get_current_user, require_role
from models.assets import User

router = APIRouter()


@router.get("/", response_model=list[LicensePlateResponse])
async def list_license_plates(
    plate_number: str | None = Query(None),
    camera_id: str | None = Query(None),
    start_time: datetime | None = Query(None),
    end_time: datetime | None = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "soc_operator", "operator"])),
):
    """Search license plate records. Restricted to SOC Operators and Admins."""
    query = select(LicensePlateRecord).order_by(desc(LicensePlateRecord.timestamp))
    if plate_number:
        query = query.where(LicensePlateRecord.plate_number.ilike(f"%{plate_number}%"))
    if camera_id:
        query = query.where(LicensePlateRecord.camera_id == camera_id)
    if start_time:
        query = query.where(LicensePlateRecord.timestamp >= start_time)
    if end_time:
        query = query.where(LicensePlateRecord.timestamp <= end_time)
    query = query.offset(offset).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{record_id}", response_model=LicensePlateResponse)
async def get_license_plate(
    record_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "soc_operator", "operator"])),
):
    """Get a single license plate record."""
    result = await db.execute(select(LicensePlateRecord).where(LicensePlateRecord.id == record_id))
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="License plate record not found")
    return record


@router.post("/", response_model=LicensePlateResponse, status_code=201)
async def create_license_plate(
    payload: LicensePlateCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new license plate record (called by ANPR pipeline)."""
    record = LicensePlateRecord(**payload.model_dump())
    db.add(record)
    await db.commit()
    await db.refresh(record)
    return record
