"""
Case Bundler Service — Genesis Layer 3 / SentinelVision Phase 1.
Periodic sweep: bundles uncased incidents in the same zone within 120 seconds.
Primary bundling runs inline via alert_pipeline on incident creation.
"""
import asyncio
import uuid
from datetime import datetime, timezone, timedelta

from config.database import AsyncSessionLocal
from models.assets import Incident, Case
from sqlalchemy.future import select
from services.explainability import generate_case_bundle_justification

BUNDLE_WINDOW_SECONDS = 120


async def _bundle_uncased_incidents():
    cutoff = datetime.now(timezone.utc) - timedelta(seconds=BUNDLE_WINDOW_SECONDS)

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Incident)
            .where(Incident.case_id.is_(None))
            .where(Incident.status == "detected")
            .where(Incident.detected_at >= cutoff)
            .order_by(Incident.zone.asc(), Incident.detected_at.asc())
        )
        incidents = result.scalars().all()
        if not incidents:
            return

        by_zone: dict[str, list] = {}
        for inc in incidents:
            zone = inc.zone or "Unknown Zone"
            by_zone.setdefault(zone, []).append(inc)

        for zone, group in by_zone.items():
            if len(group) < 2:
                continue

            group_id = uuid.uuid4().hex[:12]
            severity_order = ["critical", "high", "medium", "low"]
            severities = [inc.severity for inc in group]
            top_sev = min(severities, key=lambda s: severity_order.index(s) if s in severity_order else 99)
            types = list({inc.type for inc in group})
            avg_conf = sum((inc.model_confidence or 0.7) for inc in group) / len(group)

            case = Case(
                title=f"Auto-Case: {', '.join(types[:2])}" + (" +more" if len(types) > 2 else ""),
                status="open",
                severity=top_sev,
                correlated_alert_count=len(group),
                bundle_confidence=round(avg_conf * 100, 1),
                affected_zones=zone,
                summary=f"Automatically bundled {len(group)} related alert(s) in {zone}.",
            )
            db.add(case)
            await db.flush()

            for inc in group:
                inc.correlation_group = group_id
                inc.case_id = case.id

            case.notes = generate_case_bundle_justification(case, group)

        await db.commit()


async def run_case_bundler():
    await asyncio.sleep(20)
    while True:
        try:
            await _bundle_uncased_incidents()
        except Exception as exc:
            print(f"[case_bundler] error: {exc}")
        await asyncio.sleep(60)
