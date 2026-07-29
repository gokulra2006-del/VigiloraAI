import asyncio
import logging
from datetime import datetime, timezone, timedelta
from sqlalchemy.future import select
from sqlalchemy import func
from config.database import AsyncSessionLocal
from models.assets import Incident, Case
from models.nova import NovaTask
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from pytz import timezone as pytz_timezone
from services.nova_agent import handle_chat
from services.nova_notifications import nova_notifier

logger = logging.getLogger(__name__)

async def generate_daily_briefing():
    now = datetime.now(timezone.utc)
    day_ago = now - timedelta(hours=24)

    async with AsyncSessionLocal() as db:
        # Get incidents
        incidents_result = await db.execute(select(Incident).where(Incident.detected_at >= day_ago))
        incidents = incidents_result.scalars().all()
        
        # Get tasks
        tasks_result = await db.execute(select(NovaTask).where(NovaTask.created_at >= day_ago))
        tasks = tasks_result.scalars().all()
        
        critical_alerts = sum(1 for i in incidents if i.severity == 'critical')
        auto_resolved = sum(1 for i in incidents if i.autonomy_tier == 'auto_resolve')
        completed_tasks = sum(1 for t in tasks if t.status == 'done')
        
        raw_data = f"""
        Daily Digest Data - {now.strftime('%Y-%m-%d')}
        Total Incidents (24h): {len(incidents)}
        Critical Alerts: {critical_alerts}
        Auto-Resolved Alerts: {auto_resolved}
        Total Tasks Logged: {len(tasks)}
        Completed Tasks: {completed_tasks}
        
        Incident Breakdown:
        {chr(10).join([f"- {i.type} in {i.zone} (Severity: {i.severity})" for i in incidents[:10]])}
        
        Task Breakdown:
        {chr(10).join([f"- {t.title} (Status: {t.status})" for t in tasks[:10]])}
        """

        logger.info(f'[daily_digest] Generated raw data, sending to OG...')
        
        # Ask OG to generate the briefing
        prompt = f"You are OG. Generate a concise, professional daily ops briefing based on this data:\n{raw_data}"
        
        # We simulate a fake context here just to get the response
        try:
            briefing = await handle_chat(prompt, [], {"open_incidents": len(incidents), "critical_incidents": critical_alerts, "online_cameras": 0, "total_cameras": 0, "active_threats": 0})
            
            logger.info(f'[daily_digest] OG Briefing:\n{briefing}')
            # In a real app we might email this. For now, dispatch via websockets as an announcement.
            await nova_notifier.dispatch({"type": "daily_briefing", "message": briefing})
            
        except Exception as e:
            logger.error(f"[daily_digest] Error generating AI briefing: {e}")

# We create a global scheduler
scheduler = AsyncIOScheduler(timezone=pytz_timezone('Asia/Kolkata'))

async def run_daily_digest():
    """Starts the APScheduler for the daily briefing."""
    scheduler.add_job(generate_daily_briefing, 'cron', hour=9, minute=0)
    scheduler.start()
    logger.info("[daily_digest] APScheduler started. Daily Briefing scheduled for 9:00 AM Asia/Kolkata.")

