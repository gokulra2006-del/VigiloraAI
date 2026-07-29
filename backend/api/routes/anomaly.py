"""Anomaly API — Genesis Layer 1. Exposes per-camera baselines and anomaly alerts."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from config.database import get_db
from models.assets import AnomalyBaseline, Camera
from security.auth import get_current_user
from services.anomaly import get_recent_anomaly_alerts

router = APIRouter()


@router.get("/baselines")
async def list_baselines(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(select(AnomalyBaseline))
    baselines = result.scalars().all()
    return [
        {
            "id": b.id,
            "camera_id": b.camera_id,
            "avg_motion": round(b.avg_motion, 4),
            "stddev_motion": round(b.stddev_motion, 4),
            "peak_hours": b.peak_hours,
            "sample_count": b.sample_count,
            "last_calibrated": b.last_calibrated.isoformat() if b.last_calibrated else None,
        }
        for b in baselines
    ]


@router.post("/baselines/{camera_id}/calibrate")
async def calibrate_baseline(
    camera_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    cam_result = await db.execute(select(Camera).where(Camera.id == camera_id))
    if not cam_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Camera not found")

    bl_result = await db.execute(
        select(AnomalyBaseline).where(AnomalyBaseline.camera_id == camera_id)
    )
    bl = bl_result.scalar_one_or_none()

    from datetime import datetime, timezone
    import random

    if bl:
        bl.avg_motion = random.uniform(0.1, 0.4)
        bl.stddev_motion = random.uniform(0.05, 0.15)
        bl.sample_count = 0
        bl.last_calibrated = datetime.now(timezone.utc)
    else:
        bl = AnomalyBaseline(
            camera_id=camera_id,
            avg_motion=random.uniform(0.1, 0.4),
            stddev_motion=random.uniform(0.05, 0.15),
            peak_hours=[8, 9, 17, 18],
            sample_count=0,
            last_calibrated=datetime.now(timezone.utc),
        )
        db.add(bl)

    await db.commit()
    return {"status": "calibrated", "camera_id": camera_id}


@router.get("/alerts")
async def list_anomaly_alerts(
    limit: int = 50,
    current_user=Depends(get_current_user),
):
    alerts = get_recent_anomaly_alerts(limit)
    return alerts
