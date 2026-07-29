"""
Anomaly Detection Service — Genesis Layer 1.
Simulates per-camera motion-baseline learning and generates anomaly alerts
when the current motion score deviates more than 2σ from the learned mean.
"""
import asyncio
import random
import math
from datetime import datetime, timezone
from config.database import AsyncSessionLocal
from models.assets import AnomalyBaseline, Camera, Detection
from sqlalchemy.future import select


THREAT_CLASSES = {
    "gun", "knife", "pistol", "rifle", "weapon",
    "person_running", "fight", "intrusion", "trespassing",
}

OBJECT_CLASSES = [
    "person", "car", "truck", "bicycle", "motorcycle",
    "gun", "knife", "pistol", "person_running", "fight",
    "intrusion", "backpack", "dog", "cat",
]

WEAPON_CLASSES = ["gun", "knife", "pistol", "rifle", "weapon", "fight"]

# In-memory store for recent anomaly alerts
_anomaly_alerts: list[dict] = []


def get_recent_anomaly_alerts(limit: int = 50) -> list[dict]:
    return _anomaly_alerts[-limit:]


async def _ensure_baselines(db) -> list[AnomalyBaseline]:
    """Create baselines for any camera that doesn't have one yet."""
    cam_result = await db.execute(select(Camera))
    cameras = cam_result.scalars().all()

    baselines = []
    for cam in cameras:
        bl_result = await db.execute(
            select(AnomalyBaseline).where(AnomalyBaseline.camera_id == cam.id)
        )
        bl = bl_result.scalar_one_or_none()
        if not bl:
            hour = datetime.now(timezone.utc).hour
            bl = AnomalyBaseline(
                camera_id=cam.id,
                avg_motion=random.uniform(0.1, 0.4),
                stddev_motion=random.uniform(0.05, 0.15),
                peak_hours=[8, 9, 12, 17, 18],
                sample_count=random.randint(50, 200),
                last_calibrated=datetime.now(timezone.utc),
            )
            db.add(bl)
        baselines.append(bl)

    await db.commit()
    return baselines


def _simulate_motion(baseline: AnomalyBaseline) -> float:
    """Return a simulated motion score (occasionally anomalous)."""
    hour = datetime.now(timezone.utc).hour
    is_peak = hour in (baseline.peak_hours or [8, 9, 17, 18])
    base = baseline.avg_motion * (1.4 if is_peak else 0.7)

    # 8% chance of a significant deviation
    if random.random() < 0.08:
        return base + random.uniform(3, 6) * baseline.stddev_motion
    return base + random.gauss(0, baseline.stddev_motion)


async def run_anomaly_engine():
    """Background task: every 15 s, simulate motion readings and flag anomalies."""
    await asyncio.sleep(5)  # small startup delay

    while True:
        try:
            async with AsyncSessionLocal() as db:
                baselines = await _ensure_baselines(db)

                for bl in baselines:
                    motion = _simulate_motion(bl)
                    sigma = (motion - bl.avg_motion) / max(bl.stddev_motion, 0.01)

                    # Update rolling baseline (exponential moving average)
                    alpha = 0.05
                    bl.avg_motion = (1 - alpha) * bl.avg_motion + alpha * motion
                    bl.sample_count = (bl.sample_count or 0) + 1

                    if sigma > 2.0:
                        alert = {
                            "id": f"anm-{random.randint(10000, 99999)}",
                            "camera_id": bl.camera_id,
                            "motion_score": round(motion, 3),
                            "sigma": round(sigma, 2),
                            "severity": "critical" if sigma > 3.5 else "high" if sigma > 2.5 else "medium",
                            "message": f"Anomalous motion detected (σ={sigma:.1f})",
                            "timestamp": datetime.now(timezone.utc).isoformat(),
                        }
                        _anomaly_alerts.append(alert)
                        if len(_anomaly_alerts) > 200:
                            _anomaly_alerts.pop(0)

                await db.commit()
        except Exception as exc:
            print(f"[anomaly_engine] error: {exc}")

        await asyncio.sleep(15)


async def simulate_weapon_detections(db, camera_ids: list[str]):
    """
    Inject random object/weapon detections for the object-alerts feed.
    Called by the attack_noise engine or run_object_alert_engine.
    """
    camera_id = random.choice(camera_ids) if camera_ids else "cam-01"
    class_name = random.choices(
        OBJECT_CLASSES,
        weights=[10, 8, 6, 4, 4, 3, 3, 3, 3, 2, 2, 5, 2, 2],
        k=1
    )[0]
    confidence = round(random.uniform(0.55, 0.99), 3)

    x1 = random.randint(50, 400)
    y1 = random.randint(50, 300)
    x2 = x1 + random.randint(40, 150)
    y2 = y1 + random.randint(40, 150)

    from models.assets import Detection
    import json
    det = Detection(
        camera_id=camera_id,
        class_name=class_name,
        confidence=confidence,
        bbox_json=json.dumps([x1, y1, x2, y2]),
        snapshot_path=None,
    )
    db.add(det)
    return det
