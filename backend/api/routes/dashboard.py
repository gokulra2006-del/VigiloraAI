from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from config.database import get_db
from models.assets import Camera, Incident, SecurityEvent, Case, PlaybookApproval, Zone
from security.auth import get_current_user

router = APIRouter()


@router.get("/stats")
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    cameras = (await db.execute(select(Camera))).scalars().all()
    cameras_online = sum(1 for c in cameras if c.status == "online")
    cameras_offline = sum(1 for c in cameras if c.status == "offline")

    active_incidents_result = await db.execute(
        select(func.count(Incident.id)).where(Incident.status.notin_(["closed", "resolved"]))
    )
    active_incidents = active_incidents_result.scalar_one()

    pending_approvals_result = await db.execute(
        select(func.count(PlaybookApproval.id)).where(PlaybookApproval.status == "pending")
    )
    pending_approvals = pending_approvals_result.scalar_one()

    open_cases_result = await db.execute(
        select(func.count(Case.id)).where(Case.status.in_(["open", "investigating"]))
    )
    open_cases = open_cases_result.scalar_one()

    active_security_result = await db.execute(
        select(func.count(SecurityEvent.id)).where(SecurityEvent.is_resolved == False)
    )
    active_security = active_security_result.scalar_one()

    recent_alerts_result = await db.execute(
        select(Incident).order_by(Incident.detected_at.desc()).limit(10)
    )
    recent_alerts = recent_alerts_result.scalars().all()

    return {
        "activeIncidents": active_incidents,
        "activeSecurityEvents": active_security,
        "camerasOnline": cameras_online,
        "camerasOffline": cameras_offline,
        "camerasTotal": len(cameras),
        "pendingApprovals": pending_approvals,
        "openCases": open_cases,
        "modelsRunning": 1,
        "systemHealth": "99.9%",
        "threatLevel": (
            "High" if active_security > 0 or active_incidents > 5
            else "Medium" if active_incidents > 0 else "Low"
        ),
        "recentAlerts": [
            {
                "id": alert.id,
                "title": alert.type,
                "time": alert.detected_at.strftime("%H:%M:%S") if alert.detected_at else "",
                "severity": alert.severity,
                "zone": alert.zone,
                "justification": alert.justification_text,
                "autonomy_tier": alert.autonomy_tier,
                "approval_status": alert.approval_status,
                "camera_id": alert.camera_id,
                "source": alert.source,
            }
            for alert in recent_alerts
        ],
        "cameras": [
            {
                "id": c.id,
                "name": c.name,
                "status": c.status,
                "lat": c.location_lat,
                "lng": c.location_lng,
                "zone_id": c.zone_id,
            }
            for c in cameras
        ],
    }


@router.get("/metrics")
async def get_live_metrics(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Key metrics for the live dashboard metrics bar."""
    total_today = await db.execute(
        select(func.count(Incident.id)).where(
            Incident.detected_at >= func.datetime("now", "-1 day")
        )
    )
    auto_resolved = await db.execute(
        select(func.count(Incident.id)).where(Incident.autonomy_tier == "auto_resolve")
    )
    pending = await db.execute(
        select(func.count(PlaybookApproval.id)).where(PlaybookApproval.status == "pending")
    )
    return {
        "alertsToday": total_today.scalar_one() or 0,
        "autoResolved": auto_resolved.scalar_one() or 0,
        "pendingApprovals": pending.scalar_one() or 0,
        "avgBundleConfidence": 78.5,
    }


@router.get("/timeseries")
async def get_dashboard_timeseries(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Timeseries data for the dashboard chart over the last 2 hours, grouped by 10-minute intervals."""
    from datetime import datetime, timezone, timedelta
    
    now = datetime.now(timezone.utc)
    # Generate 12 intervals of 10 minutes each for the last 2 hours
    intervals = []
    for i in range(12, -1, -1):
        intervals.append(now - timedelta(minutes=i*10))
        
    timeseries_data = []
    
    # Query incidents in the last 2 hours
    start_time = intervals[0]
    result = await db.execute(
        select(Incident).where(Incident.detected_at >= start_time).order_by(Incident.detected_at.asc())
    )
    incidents = result.scalars().all()
    
    # Group by 10 minute buckets
    for i in range(len(intervals) - 1):
        bucket_start = intervals[i]
        bucket_end = intervals[i+1]
        
        # Count incidents in this bucket
        count = sum(1 for inc in incidents if inc.detected_at and bucket_start <= inc.detected_at.replace(tzinfo=timezone.utc) < bucket_end)
        
        timeseries_data.append({
            "time": bucket_start.strftime("%H:%M"),
            "threats": count
        })
        
    return timeseries_data
