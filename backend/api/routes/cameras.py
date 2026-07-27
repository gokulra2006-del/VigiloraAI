from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from config.database import get_db
from models.assets import Camera

router = APIRouter()

@router.get("/")
async def get_cameras(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Camera))
    return result.scalars().all()

from pydantic import BaseModel
class CameraStatusUpdate(BaseModel):
    status: str

@router.put("/{camera_id}/status")
async def update_camera_status(camera_id: str, payload: CameraStatusUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Camera).where(Camera.id == camera_id))
    camera = result.scalar_one_or_none()
    if not camera:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Camera not found")
    
    camera.status = payload.status
    await db.commit()
    return {"message": "Status updated", "status": camera.status}
