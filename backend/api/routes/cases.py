"""Cases API — Genesis Layer 3 + SentinelVision Phase 1."""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel
from config.database import get_db
from models.assets import Case, Incident, IncidentReport, PlaybookExecution, PlaybookApproval
from security.auth import get_current_user
from services.explainability import generate_case_bundle_justification

router = APIRouter()


class CaseCreate(BaseModel):
    title: str
    severity: str = "medium"
    summary: str | None = None
    incident_ids: list[str] = []


class CaseStatusUpdate(BaseModel):
    status: str


class CaseResolutionUpdate(BaseModel):
    resolution: str  # true_positive | false_positive | undetermined


CASE_TRANSITIONS = {
    "open": {"investigating"},
    "investigating": {"closed"},
    "closed": set(),
}


def _case_to_dict(c: Case) -> dict:
    inc_count = len(c.incidents) if c.incidents else (c.correlated_alert_count or 0)
    return {
        "id": c.id,
        "title": c.title,
        "status": c.status,
        "severity": c.severity,
        "summary": c.summary,
        "notes": c.notes,
        "incident_count": inc_count,
        "bundle_confidence": c.bundle_confidence,
        "correlated_alert_count": c.correlated_alert_count or inc_count,
        "affected_zones": c.affected_zones,
        "resolution": c.resolution,
        "time_to_resolve": c.time_to_resolve,
        "assignee": c.assignee.username if c.assignee else None,
        "created_at": c.created_at.isoformat() if c.created_at else None,
        "closed_at": c.closed_at.isoformat() if c.closed_at else None,
    }


@router.get("/")
async def list_cases(
    status_filter: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    query = select(Case).order_by(Case.created_at.desc())
    if status_filter:
        query = query.where(Case.status == status_filter)
    result = await db.execute(query)
    return [_case_to_dict(c) for c in result.scalars().all()]


@router.get("/{case_id}")
async def get_case(
    case_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(select(Case).where(Case.id == case_id))
    case = result.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    inc_result = await db.execute(
        select(Incident).where(Incident.case_id == case_id).order_by(Incident.detected_at.asc())
    )
    incidents = inc_result.scalars().all()

    exec_result = await db.execute(
        select(PlaybookExecution)
        .where(PlaybookExecution.trigger_ref_id.in_([i.id for i in incidents] + [case_id]))
        .order_by(PlaybookExecution.executed_at.desc())
    )
    executions = exec_result.scalars().all()

    approval_result = await db.execute(
        select(PlaybookApproval)
        .where(PlaybookApproval.trigger_ref_id.in_([i.id for i in incidents]))
        .order_by(PlaybookApproval.created_at.desc())
    )
    approvals = approval_result.scalars().all()

    return {
        **_case_to_dict(case),
        "incidents": [
            {
                "id": i.id,
                "type": i.type,
                "severity": i.severity,
                "status": i.status,
                "zone": i.zone,
                "source": i.source,
                "justification_text": i.justification_text,
                "autonomy_tier": i.autonomy_tier,
                "approval_status": i.approval_status,
                "correlation_group": i.correlation_group,
                "camera_id": i.camera_id,
                "detected_at": i.detected_at.isoformat() if i.detected_at else None,
            }
            for i in incidents
        ],
        "playbook_executions": [
            {
                "id": ex.id,
                "playbook_id": ex.playbook_id,
                "trigger_event": ex.trigger_event,
                "actions_taken": ex.actions_taken,
                "justification_text": ex.justification_text,
                "executed_at": ex.executed_at.isoformat() if ex.executed_at else None,
            }
            for ex in executions
        ],
        "approval_history": [
            {
                "id": a.id,
                "status": a.status,
                "tier": a.tier,
                "justification_text": a.justification_text,
                "created_at": a.created_at.isoformat() if a.created_at else None,
            }
            for a in approvals
        ],
    }


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_case(
    data: CaseCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    case = Case(
        title=data.title,
        severity=data.severity,
        summary=data.summary,
        status="open",
        correlated_alert_count=len(data.incident_ids),
    )
    db.add(case)
    await db.flush()

    linked = []
    if data.incident_ids:
        for inc_id in data.incident_ids:
            inc_result = await db.execute(select(Incident).where(Incident.id == inc_id))
            inc = inc_result.scalar_one_or_none()
            if inc:
                inc.case_id = case.id
                linked.append(inc)

    if linked:
        case.notes = generate_case_bundle_justification(case, linked)
        zones = list({i.zone for i in linked if i.zone})
        case.affected_zones = ", ".join(zones)

    await db.commit()
    await db.refresh(case)
    return _case_to_dict(case)


@router.patch("/{case_id}/status")
async def update_case_status(
    case_id: str,
    data: CaseStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(select(Case).where(Case.id == case_id))
    case = result.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    allowed = CASE_TRANSITIONS.get(case.status, set())
    if data.status not in allowed and data.status != case.status:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot transition case from '{case.status}' to '{data.status}'",
        )

    case.status = data.status
    if data.status == "closed":
        case.closed_at = datetime.now(timezone.utc)
        if case.created_at:
            delta = case.closed_at - case.created_at
            case.time_to_resolve = round(delta.total_seconds() / 60, 1)

    await db.commit()
    return {"id": case.id, "status": case.status}


@router.patch("/{case_id}/resolution")
async def update_case_resolution(
    case_id: str,
    data: CaseResolutionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(select(Case).where(Case.id == case_id))
    case = result.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    case.resolution = data.resolution
    await db.commit()
    return {"id": case.id, "resolution": case.resolution}


@router.get("/{case_id}/timeline")
async def get_case_timeline(
    case_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    case_result = await db.execute(select(Case).where(Case.id == case_id))
    case = case_result.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    events = [{
        "event_type": "case_created",
        "label": f"Case Opened: {case.title}",
        "severity": case.severity,
        "timestamp": case.created_at.isoformat() if case.created_at else None,
        "source": "system",
    }]

    if case.notes:
        events.append({
            "event_type": "ai_justification",
            "label": "AI Bundle Justification",
            "severity": "info",
            "detail": case.notes,
            "timestamp": case.created_at.isoformat() if case.created_at else None,
            "source": "ai",
        })

    inc_result = await db.execute(
        select(Incident).where(Incident.case_id == case_id).order_by(Incident.detected_at.asc())
    )
    for inc in inc_result.scalars().all():
        events.append({
            "event_type": "detection",
            "label": f"{inc.type} detected",
            "severity": inc.severity,
            "incident_id": inc.id,
            "camera_id": inc.camera_id,
            "zone": inc.zone,
            "detail": inc.justification_text,
            "timestamp": inc.detected_at.isoformat() if inc.detected_at else None,
            "source": inc.source or "camera",
        })
        if inc.acknowledged_at:
            events.append({
                "event_type": "acknowledged",
                "label": "Alert acknowledged",
                "severity": "info",
                "incident_id": inc.id,
                "timestamp": inc.acknowledged_at.isoformat(),
                "source": "operator",
            })

    events.sort(key=lambda e: e.get("timestamp") or "")
    return {"case_id": case_id, "title": case.title, "events": events}


@router.get("/{case_id}/report")
async def get_or_generate_report(
    case_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    from services.report_generator import generate_report_for_case
    try:
        return await generate_report_for_case(case_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
