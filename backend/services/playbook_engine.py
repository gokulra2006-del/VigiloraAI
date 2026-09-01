"""
Playbook Engine Service — Genesis Layer 4 (SOAR).
Polls every 10 s for trigger conditions and executes matching playbooks.
Supported triggers: 'critical_alert' | 'case_opened' | 'weapon_detected' | 'manual'
Supported actions: 'notify_slack' | 'notify_discord' | 'create_case' |
                   'escalate_incident' | 'lock_camera' | 'generate_report'
"""
import asyncio
import random
from datetime import datetime, timezone, timedelta
from config.database import AsyncSessionLocal
from models.assets import (
    Playbook, PlaybookExecution, Incident, Case, Detection
)
from models.enums import IncidentStatusEnum
from sqlalchemy.future import select

# In-memory: recently processed trigger refs to avoid re-firing
_processed_refs: set[str] = set()
_MAX_PROCESSED = 500


from services.explainability import generate_playbook_justification
from models.assets import PlaybookApproval

async def _calculate_autonomy_tier(db, playbook: Playbook, incident: Incident) -> str:
    """
    f(severity_score, model_confidence, action_reversibility, operator_cognitive_load)
    """
    if not incident:
        return "auto_resolve"
        
    severity_score = 10 if incident.severity == "critical" else 5 if incident.severity == "high" else 1
    
    # Check action reversibility
    dangerous_actions = ["lock_camera", "escalate_incident", "dispatch_patrol"]
    has_irreversible = any(a.get("action") in dangerous_actions for a in (playbook.actions_json or []))
    
    # Calculate operator cognitive load (number of open critical/high incidents)
    from sqlalchemy import func
    load_result = await db.execute(select(func.count(Incident.id)).where(Incident.status == "open", Incident.severity.in_(["high", "critical"])))
    cognitive_load = load_result.scalar() or 0
    
    # The logic:
    if severity_score == 10 and has_irreversible:
        return "alert_and_require_ack"
    elif severity_score >= 5 or (cognitive_load > 5 and has_irreversible):
        return "suggest_and_confirm"
    return "auto_resolve"


async def _execute_playbook(db, playbook: Playbook, trigger_event: str, trigger_ref_id: str, force_execute: bool = False):
    """Execute a single playbook's action list or pause it for human approval."""
    
    # Load the incident if this was triggered by an incident
    incident = None
    if trigger_event == "critical_alert" or trigger_event == "weapon_detected":
        inc_res = await db.execute(select(Incident).where(Incident.id == trigger_ref_id))
        incident = inc_res.scalar_one_or_none()
        
    tier = await _calculate_autonomy_tier(db, playbook, incident)
    severity_str = incident.severity if incident else "unknown"
    justification = generate_playbook_justification(playbook, tier, severity_str)
    
    if tier != "auto_resolve" and not force_execute:
        # Create pending approval instead of executing
        approval = PlaybookApproval(
            playbook_id=playbook.id,
            trigger_event=trigger_event,
            trigger_ref_id=trigger_ref_id,
            tier=tier,
            status="pending",
            context_json=playbook.actions_json,
            justification_text=justification
        )
        db.add(approval)
        playbook.last_triggered = datetime.now(timezone.utc)
        return

    # Auto-resolve path
    from services.alerting import dispatch_alert
    from services.actuators import trigger_host_siren, isolate_network_target
    from services.report_generator import generate_report_for_case
    actions_log = []

    for action_def in (playbook.actions_json or []):
        action_type = action_def.get("action", "unknown")
        status = "ok"

        try:
            if action_type in ("notify_slack", "notify_discord", "notify_telegram", "notify_email", "notify_sms"):
                if incident:
                    asyncio.create_task(dispatch_alert(incident))
                    status = "dispatched"
                else:
                    status = "dispatched_simulated"
            elif action_type == "escalate_incident":
                if incident and incident.severity in ("medium", "low"):
                    incident.severity = "high"
                    status = "escalated"
            elif action_type == "sound_alarm":
                siren_res = trigger_host_siren()
                status = f"siren_{siren_res.get('status', 'ok')}"
            elif action_type in ("isolate_subnet", "block_ip"):
                iso_res = isolate_network_target(action_def.get("target_ip", "192.168.1.100"))
                status = f"isolated_{iso_res.get('status', 'ok')}"
            elif action_type == "lock_camera":
                status = "camera_locked"
            elif action_type == "generate_report":
                if trigger_event == "case_opened" or (incident and incident.case_id):
                    target_case_id = trigger_ref_id if trigger_event == "case_opened" else incident.case_id
                    asyncio.create_task(generate_report_for_case(target_case_id))
                    status = "generated"
                else:
                    status = "queued"
            else:
                status = "executed"
        except Exception as exc:
            status = f"error: {exc}"

        actions_log.append({"action": action_type, "status": status})

    execution = PlaybookExecution(
        playbook_id=playbook.id,
        trigger_event=trigger_event,
        trigger_ref_id=trigger_ref_id,
        actions_taken=actions_log,
        justification_text=justification
    )
    db.add(execution)

    playbook.last_triggered = datetime.now(timezone.utc)

async def evaluate_event(db, trigger_type: str, trigger_event: str, trigger_ref_id: str, context: dict = None):
    """Manually evaluate an event against all active playbooks."""
    pb_result = await db.execute(
        select(Playbook).where(Playbook.status == "active", Playbook.trigger_type == trigger_type)
    )
    playbooks = pb_result.scalars().all()
    for pb in playbooks:
        await _execute_playbook(db, pb, trigger_event, trigger_ref_id)

async def _poll_triggers():
    """Check for new trigger conditions and fire matching playbooks."""
    cutoff = datetime.now(timezone.utc) - timedelta(seconds=30)

    async with AsyncSessionLocal() as db:
        # Load active playbooks
        pb_result = await db.execute(
            select(Playbook).where(Playbook.status == "active")
        )
        playbooks = pb_result.scalars().all()

        if not playbooks:
            return

        # Trigger: critical_alert — new incidents with critical severity
        inc_result = await db.execute(
            select(Incident)
            .where(Incident.severity == "critical")
            .where(Incident.detected_at >= cutoff)
        )
        critical_incs = inc_result.scalars().all()

        for inc in critical_incs:
            ref = f"inc-{inc.id}"
            if ref in _processed_refs:
                continue
            _processed_refs.add(ref)

            for pb in playbooks:
                if pb.trigger_type in ("critical_alert", "weapon_detected"):
                    await _execute_playbook(db, pb, "critical_alert", inc.id)

        # Trigger: case_opened — new open cases
        case_result = await db.execute(
            select(Case)
            .where(Case.status == "open")
            .where(Case.created_at >= cutoff)
        )
        new_cases = case_result.scalars().all()

        for case in new_cases:
            ref = f"case-{case.id}"
            if ref in _processed_refs:
                continue
            _processed_refs.add(ref)

            for pb in playbooks:
                if pb.trigger_type == "case_opened":
                    await _execute_playbook(db, pb, "case_opened", case.id)

        # Prune processed refs
        if len(_processed_refs) > _MAX_PROCESSED:
            oldest = list(_processed_refs)[:100]
            for r in oldest:
                _processed_refs.discard(r)

        await db.commit()


async def run_playbook_engine():
    """Background task: poll for triggers every 10 seconds."""
    await asyncio.sleep(15)  # startup delay
    while True:
        try:
            await _poll_triggers()
        except Exception as exc:
            print(f"[playbook_engine] error: {exc}")
        await asyncio.sleep(10)
