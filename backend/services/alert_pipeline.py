"""
SentinelVision Alert Pipeline — Phase 1 automation flows.

Runs on incident creation:
  1. Justification Generator
  2. Autonomy Tier Classifier
  3. Alert Bundler (zone-based, 120s window)
  4. Playbook Executor / Approval Requestor (via autonomy tier)
"""
import uuid
from datetime import datetime, timezone, timedelta

from sqlalchemy.future import select
from sqlalchemy import func

from config.database import AsyncSessionLocal
from models.assets import Incident, Case, Camera, Zone, Playbook, PlaybookApproval, PlaybookExecution
from services.explainability import (
    generate_incident_justification,
    generate_case_bundle_justification,
    generate_playbook_justification,
)

BUNDLE_WINDOW_SECONDS = 120
IRREVERSIBLE_ACTIONS = {"lock_camera", "escalate_incident", "dispatch_patrol"}


def _severity_score(severity: str) -> int:
    return {"critical": 10, "high": 7, "medium": 4, "low": 1}.get(severity, 1)


def classify_autonomy_tier(incident: Incident, playbook_actions: list | None = None) -> str:
    """Evaluate severity × model confidence × action reversibility."""
    sev = _severity_score(incident.severity or "medium")
    confidence = incident.model_confidence or 0.75
    has_irreversible = any(
        a.get("action") in IRREVERSIBLE_ACTIONS for a in (playbook_actions or [])
    )

    if sev >= 10 and (confidence >= 0.85 or has_irreversible):
        return "require_ack"
    if sev >= 7 or (has_irreversible and confidence >= 0.6):
        return "suggest_confirm"
    return "auto_resolve"


async def _resolve_zone(db, incident: Incident) -> str:
    """Derive zone name from incident.zone, camera zone, or default."""
    if incident.zone:
        return incident.zone
    if incident.camera_id:
        cam = (await db.execute(select(Camera).where(Camera.id == incident.camera_id))).scalar_one_or_none()
        if cam and cam.zone_id:
            zone = (await db.execute(select(Zone).where(Zone.id == cam.zone_id))).scalar_one_or_none()
            if zone:
                return zone.name
        if cam and cam.name:
            return f"Zone-{cam.name.split()[0]}"
    return "Unknown Zone"


async def run_justification_generator(db, incident: Incident) -> None:
    zone = await _resolve_zone(db, incident)
    incident.zone = zone
    incident.justification_text = generate_incident_justification(incident, zone, incident.model_confidence)


async def run_autonomy_classifier(db, incident: Incident) -> str:
    pb_result = await db.execute(select(Playbook).where(Playbook.status == "active"))
    playbooks = pb_result.scalars().all()
    actions = []
    for pb in playbooks:
        if pb.trigger_type in ("critical_alert", "weapon_detected", "case_opened"):
            actions.extend(pb.actions_json or [])
    tier = classify_autonomy_tier(incident, actions)
    incident.autonomy_tier = tier
    if tier in ("suggest_confirm", "require_ack"):
        incident.approval_status = "pending"
    return tier


async def run_alert_bundler(db, incident: Incident) -> Case | None:
    """Bundle related alerts in the same zone within a 120-second window."""
    zone = incident.zone or await _resolve_zone(db, incident)
    incident.zone = zone
    cutoff = datetime.now(timezone.utc) - timedelta(seconds=BUNDLE_WINDOW_SECONDS)

    result = await db.execute(
        select(Incident)
        .where(Incident.zone == zone)
        .where(Incident.detected_at >= cutoff)
        .where(Incident.id != incident.id)
        .order_by(Incident.detected_at.asc())
    )
    related = result.scalars().all()

    group_id = None
    existing_case = None

    for rel in related:
        if rel.correlation_group:
            group_id = rel.correlation_group
            if rel.case_id:
                existing_case = (await db.execute(select(Case).where(Case.id == rel.case_id))).scalar_one_or_none()
            break

    if not group_id:
        group_id = uuid.uuid4().hex[:12]

    incident.correlation_group = group_id
    bundle = [incident] + [r for r in related if not r.correlation_group or r.correlation_group == group_id]

    for inc in bundle:
        inc.correlation_group = group_id

    if len(bundle) < 2 and not existing_case:
        return None

    if existing_case:
        case = existing_case
        if incident.case_id != case.id:
            incident.case_id = case.id
        case.correlated_alert_count = len(case.incidents) + (0 if incident in case.incidents else 1)
    else:
        severity_order = ["critical", "high", "medium", "low"]
        severities = [inc.severity for inc in bundle]
        top_sev = min(severities, key=lambda s: severity_order.index(s) if s in severity_order else 99)
        types = list({inc.type for inc in bundle})
        zones = list({inc.zone for inc in bundle if inc.zone})

        avg_conf = sum((inc.model_confidence or 0.7) for inc in bundle) / len(bundle)
        bundle_confidence = round(avg_conf * 100, 1)

        case = Case(
            title=f"Bundle: {', '.join(types[:2])}" + (" +more" if len(types) > 2 else ""),
            status="open",
            severity=top_sev,
            correlated_alert_count=len(bundle),
            bundle_confidence=bundle_confidence,
            affected_zones=", ".join(zones),
            summary=f"Auto-bundled {len(bundle)} correlated alert(s) in {zone} within {BUNDLE_WINDOW_SECONDS}s.",
        )
        db.add(case)
        await db.flush()

        for inc in bundle:
            inc.case_id = case.id

    case.notes = generate_case_bundle_justification(case, bundle)
    await db.flush()
    return case


async def run_playbook_for_tier(db, incident: Incident, tier: str) -> None:
    """Playbook Executor or Approval Requestor based on autonomy tier."""
    pb_result = await db.execute(
        select(Playbook).where(Playbook.status == "active").where(
            Playbook.trigger_type.in_(["critical_alert", "weapon_detected"])
        )
    )
    playbooks = pb_result.scalars().all()
    if not playbooks:
        return

    for pb in playbooks:
        if tier == "auto_resolve":
            await _execute_playbook_actions(db, pb, incident, force=True)
            incident.approval_status = "approved"
        else:
            approval = PlaybookApproval(
                playbook_id=pb.id,
                trigger_event="autonomy_tier",
                trigger_ref_id=incident.id,
                tier="alert_and_require_ack" if tier == "require_ack" else "suggest_and_confirm",
                status="pending",
                context_json=pb.actions_json,
                justification_text=generate_playbook_justification(
                    pb, tier, incident.severity or "unknown"
                ),
            )
            db.add(approval)
            incident.approval_status = "pending"


async def _execute_playbook_actions(db, playbook: Playbook, incident: Incident, force: bool = False) -> None:
    actions_log = []
    for action_def in playbook.actions_json or []:
        action_type = action_def.get("action", "unknown")
        status = "ok"
        try:
            if action_type == "escalate_incident" and incident.severity == "medium":
                incident.severity = "high"
                status = "escalated"
            elif action_type in ("notify_slack", "notify_discord", "lock_camera", "generate_report"):
                status = "simulated"
            else:
                status = "unknown_action"
        except Exception as exc:
            status = f"error: {exc}"
        actions_log.append({"action": action_type, "status": status})

    execution = PlaybookExecution(
        playbook_id=playbook.id,
        trigger_event="autonomy_tier",
        trigger_ref_id=incident.id,
        actions_taken=actions_log,
        justification_text=generate_playbook_justification(
            playbook, incident.autonomy_tier or "auto_resolve", incident.severity or "unknown"
        ),
    )
    db.add(execution)
    playbook.last_triggered = datetime.now(timezone.utc)


async def process_new_incident(incident_id: str) -> None:
    """Main entry: run all Phase 1 flows for a newly created incident."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Incident).where(Incident.id == incident_id))
        incident = result.scalar_one_or_none()
        if not incident:
            return

        await run_justification_generator(db, incident)
        tier = await run_autonomy_classifier(db, incident)
        await run_alert_bundler(db, incident)
        await run_playbook_for_tier(db, incident, tier)
        await db.commit()
        
        # Nova hook: synchronous call to assess and notify if tier implies human review
        if tier in ("suggest_confirm", "require_ack"):
            from services.nova_agent import handle_incident
            await handle_incident(incident)



async def resolve_approval(approval_id: int, approved: bool) -> None:
    """Approval Resolver — execute playbook or escalate on rejection."""
    async with AsyncSessionLocal() as db:
        approval = (
            await db.execute(select(PlaybookApproval).where(PlaybookApproval.id == approval_id))
        ).scalar_one_or_none()
        if not approval:
            return

        incident = None
        if approval.trigger_ref_id:
            incident = (
                await db.execute(select(Incident).where(Incident.id == approval.trigger_ref_id))
            ).scalar_one_or_none()

        if approved:
            approval.status = "approved"
            if incident:
                incident.approval_status = "approved"
            pb = (
                await db.execute(select(Playbook).where(Playbook.id == approval.playbook_id))
            ).scalar_one_or_none()
            if pb and incident:
                await _execute_playbook_actions(db, pb, incident, force=True)
        else:
            approval.status = "rejected"
            if incident:
                incident.approval_status = "rejected"
                if incident.case_id:
                    case = (
                        await db.execute(select(Case).where(Case.id == incident.case_id))
                    ).scalar_one_or_none()
                    if case and case.severity != "critical":
                        severity_order = ["critical", "high", "medium", "low"]
                        idx = severity_order.index(case.severity) if case.severity in severity_order else 2
                        if idx > 0:
                            case.severity = severity_order[idx - 1]
                        case.summary = (case.summary or "") + " [Escalated: approval rejected]"

        await db.commit()
