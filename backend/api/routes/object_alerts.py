"""Object Alerts API — Genesis Layer 1. Serves weapon/threat class detections."""
import random
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from config.database import get_db
from models.assets import Detection, Camera
from security.auth import get_current_user
from services.anomaly import THREAT_CLASSES, WEAPON_CLASSES

router = APIRouter()

THREAT_SET = THREAT_CLASSES | set(WEAPON_CLASSES)


@router.get("/")
async def list_object_alerts(
    threat_only: bool = False,
    camera_id: str | None = None,
    min_confidence: float = 0.0,
    limit: int = Query(default=50, le=200),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Return recent object detections, optionally filtered to threat/weapon classes."""
    query = select(Detection).order_by(Detection.timestamp.desc()).limit(limit)
    if camera_id:
        query = query.where(Detection.camera_id == camera_id)
    if threat_only:
        from sqlalchemy import or_
        query = query.where(
            Detection.class_name.in_(THREAT_SET)
        )
    if min_confidence > 0:
        query = query.where(Detection.confidence >= min_confidence)

    result = await db.execute(query)
    detections = result.scalars().all()

    out = []
    for det in detections:
        import json as _json
        bbox = None
        try:
            bbox = _json.loads(det.bbox_json) if det.bbox_json else None
        except Exception:
            pass

        out.append({
            "id": det.id,
            "camera_id": det.camera_id,
            "class_name": det.class_name,
            "confidence": det.confidence,
            "confidence_pct": round(det.confidence * 100, 1),
            "bbox": bbox,
            "is_threat": det.class_name in THREAT_SET,
            "is_weapon": det.class_name in set(WEAPON_CLASSES),
            "snapshot_path": det.snapshot_path,
            "timestamp": det.timestamp.isoformat() if det.timestamp else None,
        })

    return out


@router.post("/inject")
async def inject_detection(
    camera_id: str | None = None,
    class_name: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Inject a simulated detection for testing."""
    from services.anomaly import OBJECT_CLASSES, simulate_weapon_detections
    from sqlalchemy.future import select

    # Pick camera
    if camera_id:
        cam_result = await db.execute(select(Camera).where(Camera.id == camera_id))
        cam = cam_result.scalar_one_or_none()
        if not cam:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Camera not found")
        cam_ids = [camera_id]
    else:
        cam_result = await db.execute(select(Camera))
        cams = cam_result.scalars().all()
        cam_ids = [c.id for c in cams] or ["cam-01"]

    det = await simulate_weapon_detections(db, cam_ids)
    if class_name:
        det.class_name = class_name
    await db.commit()
    await db.refresh(det)

    return {"status": "injected", "detection_id": det.id, "class_name": det.class_name, "confidence": det.confidence}
