"""API routes for Audit Logs (read-only for Admin/Auditor)."""

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc

from config.database import get_db
from models.traffic import AuditLog
from schemas.audit_log import AuditLogResponse
from security.auth import require_role
from models.assets import User

router = APIRouter()


@router.get("/", response_model=list[AuditLogResponse])
async def list_audit_logs(
    user_id: str | None = Query(None),
    action: str | None = Query(None),
    resource_type: str | None = Query(None),
    start_time: datetime | None = Query(None),
    end_time: datetime | None = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "auditor"])),
):
    """List audit log entries. Restricted to Admin and Auditor roles."""
    query = select(AuditLog).order_by(desc(AuditLog.timestamp))
    if user_id:
        query = query.where(AuditLog.user_id == user_id)
    if action:
        query = query.where(AuditLog.action == action)
    if resource_type:
        query = query.where(AuditLog.resource_type == resource_type)
    if start_time:
        query = query.where(AuditLog.timestamp >= start_time)
    if end_time:
        query = query.where(AuditLog.timestamp <= end_time)
    query = query.offset(offset).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{log_id}", response_model=AuditLogResponse)
async def get_audit_log(
    log_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "auditor"])),
):
    """Get a single audit log entry. Restricted to Admin and Auditor roles."""
    result = await db.execute(select(AuditLog).where(AuditLog.id == log_id))
    log_entry = result.scalar_one_or_none()
    if not log_entry:
        raise HTTPException(status_code=404, detail="Audit log entry not found")
    return log_entry
