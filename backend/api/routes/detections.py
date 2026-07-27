from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from config.database import get_db
from models.assets import Detection, Camera
from schemas.detection import DetectionCreate, DetectionResponse
from security.auth import get_current_user

router = APIRouter()

@router.post("/", response_model=DetectionResponse, status_code=status.HTTP_201_CREATED)
async def create_detection(
    detection_in: DetectionCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Verify camera exists
    result = await db.execute(select(Camera).where(Camera.id == detection_in.camera_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Camera not found")
        
    detection = Detection(**detection_in.model_dump())
    db.add(detection)
    await db.commit()
    await db.refresh(detection)
    return detection

@router.get("/", response_model=list[DetectionResponse])
async def list_detections(
    camera_id: str | None = None,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    query = select(Detection).order_by(Detection.timestamp.desc()).limit(limit)
    if camera_id:
        query = query.where(Detection.camera_id == camera_id)
        
    result = await db.execute(query)
    return result.scalars().all()
