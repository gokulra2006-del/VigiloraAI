import asyncio
import sys
import os

# Add backend to path so imports work
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from services.nova_notifications import nova_notifier
from config.database import engine, Base
from models.nova import NotificationConfig
from config.database import AsyncSessionLocal

async def setup_test_config():
    # Ensure tables exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    async with AsyncSessionLocal() as db:
        # Create a test config for 'critical' if it doesn't exist
        result = await db.execute(
            NotificationConfig.__table__.select().where(NotificationConfig.severity == 'critical')
        )
        if not result.fetchone():
            # For testing, we'll try to trigger all channels, 
            # though without real keys in .env, they will just safely log and skip.
            new_config = NotificationConfig(
                severity="critical",
                channels=["in_app", "push", "sms", "email"]
            )
            db.add(new_config)
            await db.commit()

async def main():
    print("Setting up test config...")
    await setup_test_config()
    
    print("Dispatching fake CRITICAL incident assessment...")
    fake_assessment = {
        "severity": "critical",
        "summary": "Unauthorized vehicle breached south gate during after-hours.",
        "recommended_actions": [
            "Dispatch security patrol to sector 4 immediately.",
            "Lock all perimeter doors."
        ],
        "related_case_ids": [47],
        "requires_human_approval": True,
        "auto_actions_taken": []
    }
    
    await nova_notifier.dispatch(fake_assessment)
    print("Dispatch completed. Check logs for channel results.")

if __name__ == "__main__":
    asyncio.run(main())
