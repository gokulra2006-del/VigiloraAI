import asyncio
import logging
from datetime import datetime, timezone, timedelta
from sqlalchemy.future import select
from sqlalchemy import func
from config.database import AsyncSessionLocal
from models.assets import Incident, Case

logger = logging.getLogger(__name__)

async def _generate_digest():
    now = datetime.now(timezone.utc)
    day_ago = now - timedelta(hours=24)

    async with AsyncSessionLocal() as db:
        # Get metrics
        incidents_result = await db.execute(select(Incident).where(Incident.detected_at >= day_ago))
        incidents = incidents_result.scalars().all()
        
        cases_result = await db.execute(select(Case).where(Case.created_at >= day_ago))
        cases = cases_result.scalars().all()
        
        critical_alerts = sum(1 for i in incidents if i.severity == 'critical')
        auto_resolved = sum(1 for i in incidents if i.autonomy_tier == 'auto_resolve')
        
        report = f"""
Daily Digest - {now.strftime('%Y-%m-%d')}
=========================================
Total Incidents (24h): {len(incidents)}
Critical Alerts: {critical_alerts}
Auto-Resolved Alerts: {auto_resolved}
Cases Created: {len(cases)}
"""
        # Typically we would email or store this report.
        # For now, we just log it as a system report.
        logger.info(f'[daily_digest] \n{report}')

async def run_daily_digest():
    await asyncio.sleep(60) # startup delay
    while True:
        try:
            await _generate_digest()
        except Exception as exc:
            logger.error(f'[daily_digest] error: {exc}')
        await asyncio.sleep(86400) # 24 hours
