"""
FastAPI Routes for SOAR Engine (Security Orchestration, Automation & Response).
"""

from typing import List, Optional
from datetime import datetime, timezone
import uuid

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc, func

from config.database import get_db
from models.assets import (
    Playbook,
    PlaybookExecution,
    PlaybookApproval,
    SOARAuditLog,
)
from schemas.soar import (
    SOARPlaybookCreate,
    SOARPlaybookUpdate,
    SOARPlaybookResponse,
    SOARSimulationRequest,
    SOARExecutionResponse,
    SOARApprovalItem,
    SOARApprovalResponse,
    SOARStatsResponse,
    SOARAuditLogItem,
)
from services.soar_engine import soar_engine

router = APIRouter()


@router.get("/stats", response_model=SOARStatsResponse)
async def get_soar_stats(db: AsyncSession = Depends(get_db)):
    """Returns aggregated real-time metrics for the SOAR Control Center."""
    return await soar_engine.get_stats(db)


@router.get("/playbooks", response_model=List[SOARPlaybookResponse])
async def list_playbooks(
    category: Optional[str] = None,
    status_filter: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """Lists all automated response playbooks."""
    await soar_engine.seed_default_playbooks(db)

    query = select(Playbook).order_by(Playbook.created_at.desc())
    if category:
        query = query.where(Playbook.category == category)
    if status_filter:
        query = query.where(Playbook.status == status_filter)

    result = await db.execute(query)
    pbs = result.scalars().all()

    response = []
    for pb in pbs:
        # Count executions for this playbook
        exec_cnt_res = await db.execute(
            select(func.count(PlaybookExecution.id)).where(PlaybookExecution.playbook_id == pb.id)
        )
        cnt = exec_cnt_res.scalar() or 0

        response.append(
            SOARPlaybookResponse(
                id=pb.id,
                name=pb.name,
                description=pb.description or "Automated defensive response playbook.",
                category=pb.category or "general",
                trigger_type=pb.trigger_type,
                conditions_json=pb.conditions_json or [],
                actions_json=pb.actions_json or [],
                execution_mode=pb.execution_mode or "automatic",
                version=pb.version or 1,
                status=pb.status or "active",
                created_at=pb.created_at,
                last_triggered=pb.last_triggered,
                execution_count=cnt,
            )
        )
    return response


@router.post("/playbooks", response_model=SOARPlaybookResponse, status_code=status.HTTP_201_CREATED)
async def create_playbook(
    data: SOARPlaybookCreate,
    db: AsyncSession = Depends(get_db),
):
    """Creates a new automated response playbook."""
    pb_id = f"pb-{uuid.uuid4().hex[:8]}"
    pb = Playbook(
        id=pb_id,
        name=data.name,
        description=data.description,
        category=data.category,
        trigger_type=data.trigger_type,
        conditions_json=[c.model_dump() for c in data.conditions],
        actions_json=[a.model_dump() for a in data.actions],
        execution_mode=data.execution_mode,
        version=1,
        status=data.status,
    )
    db.add(pb)
    await db.commit()
    await db.refresh(pb)

    # Log creation audit
    audit = SOARAuditLog(
        playbook_id=pb.id,
        user="Admin Operator",
        trigger_event="PLAYBOOK_CREATED",
        action=f"Created Playbook: {pb.name}",
        status="SUCCESS",
        details_json={"category": pb.category, "actions_count": len(data.actions)},
    )
    db.add(audit)
    await db.commit()

    return SOARPlaybookResponse(
        id=pb.id,
        name=pb.name,
        description=pb.description,
        category=pb.category,
        trigger_type=pb.trigger_type,
        conditions_json=pb.conditions_json,
        actions_json=pb.actions_json,
        execution_mode=pb.execution_mode,
        version=pb.version,
        status=pb.status,
        created_at=pb.created_at,
        last_triggered=pb.last_triggered,
        execution_count=0,
    )


@router.get("/playbooks/{playbook_id}", response_model=SOARPlaybookResponse)
async def get_playbook(playbook_id: str, db: AsyncSession = Depends(get_db)):
    """Retrieves a single playbook by ID."""
    result = await db.execute(select(Playbook).where(Playbook.id == playbook_id))
    pb = result.scalar_one_or_none()
    if not pb:
        raise HTTPException(status_code=404, detail="Playbook not found")

    exec_cnt_res = await db.execute(
        select(func.count(PlaybookExecution.id)).where(PlaybookExecution.playbook_id == pb.id)
    )
    cnt = exec_cnt_res.scalar() or 0

    return SOARPlaybookResponse(
        id=pb.id,
        name=pb.name,
        description=pb.description,
        category=pb.category or "general",
        trigger_type=pb.trigger_type,
        conditions_json=pb.conditions_json or [],
        actions_json=pb.actions_json or [],
        execution_mode=pb.execution_mode or "automatic",
        version=pb.version or 1,
        status=pb.status or "active",
        created_at=pb.created_at,
        last_triggered=pb.last_triggered,
        execution_count=cnt,
    )


@router.put("/playbooks/{playbook_id}", response_model=SOARPlaybookResponse)
async def update_playbook(
    playbook_id: str,
    data: SOARPlaybookUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Updates an existing playbook definition."""
    result = await db.execute(select(Playbook).where(Playbook.id == playbook_id))
    pb = result.scalar_one_or_none()
    if not pb:
        raise HTTPException(status_code=404, detail="Playbook not found")

    if data.name is not None:
        pb.name = data.name
    if data.description is not None:
        pb.description = data.description
    if data.category is not None:
        pb.category = data.category
    if data.trigger_type is not None:
        pb.trigger_type = data.trigger_type
    if data.conditions is not None:
        pb.conditions_json = [c.model_dump() for c in data.conditions]
    if data.actions is not None:
        pb.actions_json = [a.model_dump() for a in data.actions]
    if data.execution_mode is not None:
        pb.execution_mode = data.execution_mode
    if data.status is not None:
        pb.status = data.status

    pb.version = (pb.version or 1) + 1
    await db.commit()
    await db.refresh(pb)

    # Log update audit
    audit = SOARAuditLog(
        playbook_id=pb.id,
        user="Admin Operator",
        trigger_event="PLAYBOOK_UPDATED",
        action=f"Updated Playbook: {pb.name} (v{pb.version})",
        status="SUCCESS",
        details_json={"version": pb.version},
    )
    db.add(audit)
    await db.commit()

    return SOARPlaybookResponse(
        id=pb.id,
        name=pb.name,
        description=pb.description,
        category=pb.category,
        trigger_type=pb.trigger_type,
        conditions_json=pb.conditions_json,
        actions_json=pb.actions_json,
        execution_mode=pb.execution_mode,
        version=pb.version,
        status=pb.status,
        created_at=pb.created_at,
        last_triggered=pb.last_triggered,
        execution_count=0,
    )


@router.delete("/playbooks/{playbook_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_playbook(playbook_id: str, db: AsyncSession = Depends(get_db)):
    """Deletes a playbook."""
    result = await db.execute(select(Playbook).where(Playbook.id == playbook_id))
    pb = result.scalar_one_or_none()
    if not pb:
        raise HTTPException(status_code=404, detail="Playbook not found")

    await db.delete(pb)
    await db.commit()


@router.post("/playbooks/{playbook_id}/toggle", response_model=SOARPlaybookResponse)
async def toggle_playbook(playbook_id: str, db: AsyncSession = Depends(get_db)):
    """Toggles active / inactive status of a playbook."""
    result = await db.execute(select(Playbook).where(Playbook.id == playbook_id))
    pb = result.scalar_one_or_none()
    if not pb:
        raise HTTPException(status_code=404, detail="Playbook not found")

    pb.status = "inactive" if pb.status == "active" else "active"
    await db.commit()
    await db.refresh(pb)

    return SOARPlaybookResponse(
        id=pb.id,
        name=pb.name,
        description=pb.description,
        category=pb.category,
        trigger_type=pb.trigger_type,
        conditions_json=pb.conditions_json,
        actions_json=pb.actions_json,
        execution_mode=pb.execution_mode,
        version=pb.version,
        status=pb.status,
        created_at=pb.created_at,
        last_triggered=pb.last_triggered,
        execution_count=0,
    )


@router.post("/simulate", response_model=SOARExecutionResponse)
async def simulate_threat_response(
    req: SOARSimulationRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Executes a live simulated threat containment flow:
    - Matches playbook
    - Simulates defense actions step-by-step
    - Generates Before/After containment states
    - Logs audit records & creates incident
    """
    return await soar_engine.execute_simulation(req, db)


@router.get("/executions")
async def list_executions(limit: int = 50, db: AsyncSession = Depends(get_db)):
    """Returns recent playbook executions history."""
    result = await db.execute(
        select(PlaybookExecution).order_by(PlaybookExecution.executed_at.desc()).limit(limit)
    )
    records = result.scalars().all()
    return [
        {
            "id": rec.id,
            "playbook_id": rec.playbook_id,
            "playbook_name": rec.playbook.name if rec.playbook else "Unknown Playbook",
            "trigger_event": rec.trigger_event,
            "trigger_ref_id": rec.trigger_ref_id,
            "actions_taken": rec.actions_taken,
            "justification_text": rec.justification_text,
            "executed_at": rec.executed_at.isoformat() if rec.executed_at else None,
        }
        for rec in records
    ]


@router.get("/approvals", response_model=List[SOARApprovalItem])
async def list_pending_approvals(db: AsyncSession = Depends(get_db)):
    """Returns pending human-in-the-loop approval requests."""
    result = await db.execute(
        select(PlaybookApproval)
        .where(PlaybookApproval.status == "pending")
        .order_by(PlaybookApproval.created_at.desc())
    )
    items = result.scalars().all()
    return [
        SOARApprovalItem(
            id=item.id,
            playbook_id=item.playbook_id,
            playbook_name=item.playbook.name if item.playbook else "Unknown Playbook",
            trigger_event=item.trigger_event,
            tier=item.tier,
            status=item.status,
            action_name=item.trigger_event,
            justification_text=item.justification_text,
            created_at=item.created_at,
        )
        for item in items
    ]


@router.post("/approvals/{approval_id}/respond")
async def respond_to_approval(
    approval_id: int,
    body: SOARApprovalResponse,
    db: AsyncSession = Depends(get_db),
):
    """Approves or rejects a pending human-in-the-loop action."""
    result = await db.execute(select(PlaybookApproval).where(PlaybookApproval.id == approval_id))
    appr = result.scalar_one_or_none()
    if not appr:
        raise HTTPException(status_code=404, detail="Approval request not found")

    appr.status = "approved" if body.action == "approve" else "rejected"
    await db.commit()

    # Record Audit Log
    audit = SOARAuditLog(
        execution_id=appr.trigger_ref_id,
        playbook_id=appr.playbook_id,
        user="SOC Operator (Human ACK)",
        trigger_event=appr.trigger_event,
        action=f"Operator {body.action.upper()}: {appr.trigger_event}",
        status="APPROVED" if body.action == "approve" else "REJECTED",
        details_json={"comment": body.comment},
    )
    db.add(audit)
    await db.commit()

    return {"status": appr.status, "id": approval_id, "action": body.action}


@router.get("/audit-log", response_model=List[SOARAuditLogItem])
async def get_soar_audit_log(
    limit: int = 50,
    search: Optional[str] = None,
    status_filter: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """Retrieves filterable SOAR audit telemetry logs."""
    query = select(SOARAuditLog).order_by(SOARAuditLog.timestamp.desc()).limit(limit)
    if status_filter:
        query = query.where(SOARAuditLog.status == status_filter)

    result = await db.execute(query)
    logs = result.scalars().all()

    items = []
    for l in logs:
        if search:
            s_low = search.lower()
            if not (s_low in l.action.lower() or s_low in l.trigger_event.lower() or s_low in l.user.lower()):
                continue

        items.append(
            SOARAuditLogItem(
                id=l.id,
                execution_id=l.execution_id,
                playbook_id=l.playbook_id,
                playbook_name=l.playbook.name if l.playbook else None,
                user=l.user,
                trigger_event=l.trigger_event,
                action=l.action,
                status=l.status,
                timestamp=l.timestamp.strftime("%Y-%m-%d %H:%M:%S") if l.timestamp else "Just now",
                details=l.details_json,
            )
        )
    return items