from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from config.database import get_db
from models.assets import Camera, Incident, SecurityEvent
from security.auth import get_current_user

router = APIRouter()

@router.get("/stats")
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Cameras
    cameras = (await db.execute(select(Camera))).scalars().all()
    cameras_online = sum(1 for c in cameras if c.status == "online")
    cameras_offline = sum(1 for c in cameras if c.status == "offline")
    
    # Incidents (active = not closed)
    active_incidents_result = await db.execute(select(func.count(Incident.id)).where(Incident.status != "closed"))
    active_incidents = active_incidents_result.scalar_one()

    # Security Events
    active_security_result = await db.execute(select(func.count(SecurityEvent.id)).where(SecurityEvent.is_resolved == False))
    active_security = active_security_result.scalar_one()

    # Recent Alerts (Incidents)
    recent_alerts_result = await db.execute(select(Incident).order_by(Incident.detected_at.desc()).limit(3))
    recent_alerts = recent_alerts_result.scalars().all()

    return {
        "activeIncidents": active_incidents,
        "activeSecurityEvents": active_security,
        "camerasOnline": cameras_online,
        "camerasOffline": cameras_offline,
        "modelsRunning": 1,  # YOLOv8
        "systemHealth": "99.9%",
        "threatLevel": "High" if active_security > 0 or active_incidents > 5 else "Medium" if active_incidents > 0 else "Low",
        "recentAlerts": [
            {
                "id": alert.id,
                "title": alert.type,
                "time": alert.detected_at.strftime("%H:%M:%S") if alert.detected_at else "",
                "severity": alert.severity
            } for alert in recent_alerts
        ]
    }
