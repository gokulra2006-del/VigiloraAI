import asyncio
import logging
from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func

from config.database import AsyncSessionLocal
from models.assets import LoginAttempt, SecurityEvent
from models.enums import SecurityEventTypeEnum, SeverityEnum
from api.routes.telemetry import manager

logger = logging.getLogger(__name__)

async def detect_brute_force():
    """
    Background task: every 30 seconds, checks if any username had >= 5 
    failed login attempts in the last 10 minutes without a success.
    Triggers a SecurityEvent if true.
    """
    logger.info("Starting brute-force SOC detection service...")
    
    while True:
        try:
            await asyncio.sleep(30)
            now = datetime.now(timezone.utc)
            ten_mins_ago = now - timedelta(minutes=10)
            
            async with AsyncSessionLocal() as session:
                # Find usernames with >= 5 failed attempts in last 10 mins
                query = (
                    select(LoginAttempt.username, func.count(LoginAttempt.id).label("failures"))
                    .where(LoginAttempt.timestamp >= ten_mins_ago)
                    .where(LoginAttempt.success == False)
                    .group_by(LoginAttempt.username)
                    .having(func.count(LoginAttempt.id) >= 5)
                )
                result = await session.execute(query)
                suspicious_users = result.fetchall()
                
                for row in suspicious_users:
                    username = row.username
                    failures = row.failures
                    
                    # Check if an event was already created for this user in the last 10 mins to avoid spam
                    existing = await session.execute(
                        select(SecurityEvent).where(
                            SecurityEvent.target_username == username,
                            SecurityEvent.event_type == SecurityEventTypeEnum.brute_force.value,
                            SecurityEvent.timestamp >= ten_mins_ago
                        )
                    )
                    if not existing.scalar_one_or_none():
                        # Create Security Event
                        event = SecurityEvent(
                            event_type=SecurityEventTypeEnum.brute_force.value,
                            target_username=username,
                            description=f"Detected {failures} failed login attempts in 10 minutes.",
                            mitre_technique_id="T1110",
                            mitre_technique_name="Brute Force",
                            severity=SeverityEnum.high.value
                        )
                        session.add(event)
                        await session.commit()
                        await session.refresh(event)
                        
                        logger.warning(f"SOC ALERT: Brute force detected for {username}")
                        
                        # Broadcast via WebSocket
                        await manager.broadcast({
                            "type": "NEW_SECURITY_EVENT", 
                            "data": {
                                "id": event.id,
                                "title": "Brute Force Detected", 
                                "technique": "T1110",
                                "severity": event.severity
                            }
                        })
                        
        except Exception as e:
            logger.error(f"Brute force detection service error: {e}")
            await asyncio.sleep(5)
