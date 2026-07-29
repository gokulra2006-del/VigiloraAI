"""Playbooks API — Genesis Layer 4 (SOAR). CRUD for playbooks + execution log."""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel
from config.database import get_db
from models.assets import Playbook, PlaybookExecution
from security.auth import get_current_user

router = APIRouter()


class PlaybookCreate(BaseModel):
    name: str
    trigger_type: str   # critical_alert | case_opened | weapon_detected | manual
    actions_json: list[dict]  # [{action: str, ...params}]


class PlaybookUpdate(BaseModel):
    name: str | None = None
    trigger_type: str | None = None
    actions_json: list[dict] | None = None
    status: str | None = None


@router.get("/")
async def list_playbooks(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(select(Playbook).order_by(Playbook.created_at.desc()))
    pbs = result.scalars().all()
    return [
        {
            "id": pb.id,
            "name": pb.name,
            "trigger_type": pb.trigger_type,
            "actions": pb.actions_json,
            "status": pb.status,
            "created_at": pb.created_at.isoformat() if pb.created_at else None,
            "last_triggered": pb.last_triggered.isoformat() if pb.last_triggered else None,
        }
        for pb in pbs
    ]


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_playbook(
    data: PlaybookCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    pb = Playbook(
        name=data.name,
        trigger_type=data.trigger_type,
        actions_json=data.actions_json,
        status="active",
    )
    db.add(pb)
    await db.commit()
    await db.refresh(pb)
    return {"id": pb.id, "name": pb.name, "trigger_type": pb.trigger_type, "status": pb.status}


@router.patch("/{playbook_id}")
async def update_playbook(
    playbook_id: str,
    data: PlaybookUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(select(Playbook).where(Playbook.id == playbook_id))
    pb = result.scalar_one_or_none()
    if not pb:
        raise HTTPException(status_code=404, detail="Playbook not found")
    for field, val in data.model_dump(exclude_none=True).items():
        setattr(pb, field, val)
    await db.commit()
    return {"id": pb.id, "name": pb.name, "status": pb.status}


@router.delete("/{playbook_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_playbook(
    playbook_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(select(Playbook).where(Playbook.id == playbook_id))
    pb = result.scalar_one_or_none()
    if not pb:
        raise HTTPException(status_code=404, detail="Playbook not found")
    await db.delete(pb)
    await db.commit()


@router.post("/{playbook_id}/execute")
async def execute_playbook(
    playbook_id: str,
    trigger_ref_id: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Manually trigger playbook execution."""
    result = await db.execute(select(Playbook).where(Playbook.id == playbook_id))
    pb = result.scalar_one_or_none()
    if not pb:
        raise HTTPException(status_code=404, detail="Playbook not found")

    from services.playbook_engine import _execute_playbook
    await _execute_playbook(db, pb, "manual", trigger_ref_id or "")
    await db.commit()
    return {"status": "executed", "playbook_id": playbook_id, "actions": pb.actions_json}


@router.get("/executions")
async def list_executions(
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(
        select(PlaybookExecution).order_by(PlaybookExecution.executed_at.desc()).limit(limit)
    )
    execs = result.scalars().all()
    return [
        {
            "id": ex.id,
            "playbook_id": ex.playbook_id,
            "playbook_name": ex.playbook.name if ex.playbook else None,
            "trigger_event": ex.trigger_event,
            "trigger_ref_id": ex.trigger_ref_id,
            "actions_taken": ex.actions_taken,
            "executed_at": ex.executed_at.isoformat() if ex.executed_at else None,
        }
        for ex in execs
    ]


@router.get("/approvals")
async def list_approvals(
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    from models.assets import PlaybookApproval
    result = await db.execute(
        select(PlaybookApproval).where(PlaybookApproval.status == "pending").order_by(PlaybookApproval.created_at.desc()).limit(limit)
    )
    approvals = result.scalars().all()
    return [
        {
            "id": a.id,
            "playbook_id": a.playbook_id,
            "playbook_name": a.playbook.name if a.playbook else None,
            "trigger_event": a.trigger_event,
            "tier": a.tier,
            "status": a.status,
            "actions": a.context_json,
            "justification_text": a.justification_text,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        }
        for a in approvals
    ]


@router.post("/approvals/{approval_id}/approve")
async def approve_playbook_action(
    approval_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    from models.assets import PlaybookApproval
    from services.alert_pipeline import resolve_approval
    result = await db.execute(select(PlaybookApproval).where(PlaybookApproval.id == approval_id))
    approval = result.scalar_one_or_none()
    if not approval or approval.status != "pending":
        raise HTTPException(status_code=404, detail="Pending approval not found")

    await resolve_approval(approval_id, approved=True)
    return {"status": "approved_and_executed"}


@router.post("/approvals/{approval_id}/reject")
async def reject_playbook_action(
    approval_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    from models.assets import PlaybookApproval
    from services.alert_pipeline import resolve_approval
    result = await db.execute(select(PlaybookApproval).where(PlaybookApproval.id == approval_id))
    approval = result.scalar_one_or_none()
    if not approval or approval.status != "pending":
        raise HTTPException(status_code=404, detail="Pending approval not found")

    await resolve_approval(approval_id, approved=False)
    return {"status": "rejected"}
