from fastapi import APIRouter, Depends, HTTPException
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
        raise HTTPException(status_code=404, detail="Camera not found")
    
    camera.status = payload.status
    await db.commit()
    return {"message": "Status updated", "status": camera.status}

from fastapi.responses import FileResponse
from services.streaming import stream_engine, STREAM_DIR
import os

@router.post("/{camera_id}/stream/start")
async def start_camera_stream(camera_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Camera).where(Camera.id == camera_id))
    camera = result.scalar_one_or_none()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
        
    if not camera.stream_url:
        raise HTTPException(status_code=400, detail="Camera has no stream URL configured")

    await stream_engine.start_stream(camera_id, camera.stream_url)
    return {"message": "Stream started"}

@router.post("/{camera_id}/stream/stop")
async def stop_camera_stream(camera_id: str):
    await stream_engine.stop_stream(camera_id)
    return {"message": "Stream stopped"}

@router.get("/{camera_id}/stream/{filename}")
async def get_stream_file(camera_id: str, filename: str):
    file_path = STREAM_DIR / camera_id / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Stream file not found. Ensure stream is running.")
    
    media_type = "application/vnd.apple.mpegurl" if filename.endswith(".m3u8") else "video/MP2T"
    return FileResponse(file_path, media_type=media_type)
