"""Camera management and live streaming API routes."""

import asyncio
import io
import logging
import os
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path

import cv2
import numpy as np
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy import desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from pydantic import BaseModel
from config.database import get_db
from models.assets import Camera
from schemas.camera import CameraCreate, CameraResponse, CameraUpdate
from services.streaming import STREAM_DIR, stream_engine

router = APIRouter()
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Camera Discovery & Listing
# ---------------------------------------------------------------------------
@router.get("/", response_model=list[CameraResponse])
async def get_cameras(db: AsyncSession = Depends(get_db)):
    """Fetch all registered cameras."""
    result = await db.execute(select(Camera).order_by(Camera.id))
    return result.scalars().all()


@router.get("/discover/devices")
async def discover_local_cameras():
    """
    Probes local hardware USB / integrated webcams.
    Returns list of discovered available camera device indices.
    """
    devices = []
    # Probe indices 0..3
    for idx in range(3):
      cap = None
      try:
        backend_flag = cv2.CAP_DSHOW if os.name == "nt" else cv2.CAP_ANY
        cap = cv2.VideoCapture(idx, backend_flag)
        if cap.isOpened():
          ret, frame = cap.read()
          if ret and frame is not None:
            h, w = frame.shape[:2]
            devices.append({
                "device_index": idx,
                "name": f"Integrated / USB Webcam (Device {idx})",
                "resolution": f"{w}x{h}",
                "fps": int(cap.get(cv2.CAP_PROP_FPS) or 30),
                "source_type": "webcam",
                "stream_url": str(idx),
            })
      except Exception as exc:
        logger.debug(f"Device probe index {idx} error: {exc}")
      finally:
        if cap:
          cap.release()

    return {
        "count": len(devices),
        "devices": devices,
        "supported_sources": [
            {
                "type": "webcam",
                "label": "Integrated / USB Webcam",
                "description": "Directly streams from your laptop or USB-connected camera",
                "example_url": "0",
            },
            {
                "type": "rtsp_phone",
                "label": "Smartphone IP Webcam",
                "description": "Stream from free mobile apps like IP Webcam (Android/iOS)",
                "example_url": "http://192.168.1.100:8080/video",
            },
            {
                "type": "real_hardware",
                "label": "IP Camera / CCTV (RTSP)",
                "description": "Standard RTSP surveillance camera stream",
                "example_url": "rtsp://admin:pass@192.168.1.50:554/stream1",
            },
            {
                "type": "video_file",
                "label": "Recorded Surveillance Video",
                "description": "Looping video file for testing & forensic replay",
                "example_url": "sample_traffic.mp4",
            },
        ],
    }


# ---------------------------------------------------------------------------
# Camera CRUD
# ---------------------------------------------------------------------------
@router.post("/", response_model=CameraResponse, status_code=status.HTTP_201_CREATED)
async def create_camera(payload: CameraCreate, db: AsyncSession = Depends(get_db)):
    """Register a new real or simulated camera into the registry."""
    cam_id = payload.id or f"cam-{uuid.uuid4().hex[:6]}"
    
    # Check duplicate
    existing = await db.execute(select(Camera).where(Camera.id == cam_id))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"Camera ID '{cam_id}' already exists")

    camera = Camera(
        id=cam_id,
        name=payload.name,
        status=payload.status or "online",
        source_type=payload.source_type or "webcam",
        location=payload.location or "Primary Sector",
        fps=payload.fps or 30,
        resolution=payload.resolution or "1080p",
        active_models=payload.active_models or ["YOLOv8"],
        stream_url=payload.stream_url or "0",
        location_lat=payload.location_lat,
        location_lng=payload.location_lng,
        area=payload.area,
        installation_date=payload.installation_date or datetime.now(timezone.utc),
    )
    db.add(camera)
    await db.commit()
    await db.refresh(camera)
    return camera


@router.get("/{camera_id}", response_model=CameraResponse)
async def get_camera_by_id(camera_id: str, db: AsyncSession = Depends(get_db)):
    """Get camera details by ID."""
    result = await db.execute(select(Camera).where(Camera.id == camera_id))
    camera = result.scalar_one_or_none()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    return camera


@router.put("/{camera_id}", response_model=CameraResponse)
async def update_camera(camera_id: str, payload: CameraUpdate, db: AsyncSession = Depends(get_db)):
    """Update camera configuration (name, location, source, stream URL)."""
    result = await db.execute(select(Camera).where(Camera.id == camera_id))
    camera = result.scalar_one_or_none()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")

    if payload.name is not None:
        camera.name = payload.name
    if payload.status is not None:
        camera.status = payload.status
    if payload.source_type is not None:
        camera.source_type = payload.source_type
    if payload.location is not None:
        camera.location = payload.location
    if payload.fps is not None:
        camera.fps = payload.fps
    if payload.resolution is not None:
        camera.resolution = payload.resolution
    if payload.active_models is not None:
        camera.active_models = payload.active_models
    if payload.stream_url is not None:
        camera.stream_url = payload.stream_url
    if payload.location_lat is not None:
        camera.location_lat = payload.location_lat
    if payload.location_lng is not None:
        camera.location_lng = payload.location_lng
    if payload.area is not None:
        camera.area = payload.area

    await db.commit()
    await db.refresh(camera)
    return camera


@router.delete("/{camera_id}", status_code=status.HTTP_200_OK)
async def delete_camera(camera_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a camera from the system."""
    result = await db.execute(select(Camera).where(Camera.id == camera_id))
    camera = result.scalar_one_or_none()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")

    await db.delete(camera)
    await db.commit()
    return {"message": f"Camera '{camera_id}' removed successfully", "id": camera_id}


# ---------------------------------------------------------------------------
# Direct Live MJPEG Video Streaming
# ---------------------------------------------------------------------------
def _generate_synthetic_hud_frame(cam_name: str, cam_id: str, status_msg: str) -> bytes:
    """Generates an aesthetic, dark SOC HUD camera frame when hardware stream is initializing."""
    img = np.zeros((480, 640, 3), dtype=np.uint8)
    img[:] = (15, 15, 20)  # dark background

    # Grid overlay
    for y in range(0, 480, 40):
        cv2.line(img, (0, y), (640, y), (25, 25, 35), 1)
    for x in range(0, 640, 40):
        cv2.line(img, (x, 0), (x, 480), (25, 25, 35), 1)

    # Crosshair
    cx, cy = 320, 240
    cv2.drawMarker(img, (cx, cy), (0, 180, 255), cv2.MARKER_CROSS, 30, 1)

    # Text overlays
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cv2.putText(img, f"VIGILORA AI // {cam_name.upper()}", (20, 35), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 1)
    cv2.putText(img, f"NODE ID: {cam_id} | {now_str}", (20, 65), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (160, 160, 160), 1)
    cv2.putText(img, f"[STATUS: {status_msg.upper()}]", (20, 450), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 220, 120), 1)

    _, jpeg = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 75])
    return jpeg.tobytes()


CAMERA_PTZ_STATE: dict[str, dict] = {}

class PTZCommand(BaseModel):
    action: str  # up, down, left, right, zoom_in, zoom_out, reset


@router.post("/{camera_id}/ptz")
async def execute_ptz_command(camera_id: str, payload: PTZCommand, db: AsyncSession = Depends(get_db)):
    """Executes a digital Pan-Tilt-Zoom command for a camera stream."""
    ptz = CAMERA_PTZ_STATE.setdefault(camera_id, {"zoom": 1.0, "pan_x": 0.0, "tilt_y": 0.0})
    action = payload.action.lower()

    if action == "zoom_in":
        ptz["zoom"] = min(4.0, round(ptz["zoom"] + 0.25, 2))
    elif action == "zoom_out":
        ptz["zoom"] = max(1.0, round(ptz["zoom"] - 0.25, 2))
    elif action == "up":
        ptz["tilt_y"] = max(-1.0, round(ptz["tilt_y"] - 0.15, 2))
    elif action == "down":
        ptz["tilt_y"] = min(1.0, round(ptz["tilt_y"] + 0.15, 2))
    elif action == "left":
        ptz["pan_x"] = max(-1.0, round(ptz["pan_x"] - 0.15, 2))
    elif action == "right":
        ptz["pan_x"] = min(1.0, round(ptz["pan_x"] + 0.15, 2))
    elif action == "reset":
        ptz["zoom"] = 1.0
        ptz["pan_x"] = 0.0
        ptz["tilt_y"] = 0.0

    return {
        "status": "success",
        "camera_id": camera_id,
        "action": action,
        "ptz_state": ptz,
    }


async def _mjpeg_streamer(source_val: str, cam_name: str, cam_id: str):
    """Asynchronous generator yielding live JPEG frames as MJPEG multipart stream with digital PTZ."""
    cap = None
    try:
        # Path where the pipeline saves the annotated live frame
        live_frame_path = os.path.join(os.getcwd(), "..", "detection", "snapshots", f"live_{cam_id}.jpg")

        # Determine capture source
        if source_val.isdigit():
            # For the demo, if the pipeline is running, it locks the camera and saves frames to disk.
            # We read those frames instead of failing to open the camera again.
            if os.path.exists(live_frame_path):
                while True:
                    if os.path.exists(live_frame_path):
                        try:
                            with open(live_frame_path, "rb") as f:
                                frame_bytes = f.read()
                            yield (b"--frame\r\n"
                                   b"Content-Type: image/jpeg\r\n\r\n" + frame_bytes + b"\r\n")
                        except Exception:
                            pass
                    await asyncio.sleep(0.05) # roughly 20fps
            else:
                backend_flag = cv2.CAP_DSHOW if os.name == "nt" else cv2.CAP_ANY
                cap = cv2.VideoCapture(int(source_val), backend_flag)
        else:
            cap = cv2.VideoCapture(source_val)

        while True:
            if cap and cap.isOpened():
                ret, frame = cap.read()
                if ret and frame is not None:
                    # Apply digital PTZ crop & zoom if active
                    ptz = CAMERA_PTZ_STATE.get(cam_id)
                    if ptz and (ptz.get("zoom", 1.0) > 1.0 or ptz.get("pan_x") or ptz.get("tilt_y")):
                        h, w = frame.shape[:2]
                        z = ptz["zoom"]
                        new_h = max(1, int(h / z))
                        new_w = max(1, int(w / z))
                        cx = int(w / 2 + ptz["pan_x"] * (w / 4))
                        cy = int(h / 2 + ptz["tilt_y"] * (h / 4))
                        x1 = max(0, min(w - new_w, cx - new_w // 2))
                        y1 = max(0, min(h - new_h, cy - new_h // 2))
                        cropped = frame[y1 : y1 + new_h, x1 : x1 + new_w]
                        if cropped.size > 0:
                            frame = cv2.resize(cropped, (w, h), interpolation=cv2.INTER_LINEAR)

                    # Overlay timestamp, node tag, and PTZ status
                    ts = datetime.now().strftime("%H:%M:%S.%f")[:-4]
                    ptz_info = f" | PTZ: {ptz['zoom']}x" if ptz and ptz.get("zoom", 1.0) > 1.0 else ""
                    cv2.putText(frame, f"VIGILORA AI: {cam_id}{ptz_info} | {ts}", (12, 24), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 1)
                    _, jpeg = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
                    frame_bytes = jpeg.tobytes()
                else:
                    # If video file reached end, loop it back
                    if not source_val.isdigit() and os.path.exists(source_val):
                        cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                    frame_bytes = _generate_synthetic_hud_frame(cam_name, cam_id, "Reconnecting source...")
            else:
                frame_bytes = _generate_synthetic_hud_frame(cam_name, cam_id, "Source Offline / Ready")

            yield (b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + frame_bytes + b"\r\n")
            await asyncio.sleep(0.033)  # ~30 FPS

    except asyncio.CancelledError:
        pass
    finally:
        if cap:
            cap.release()


@router.get("/{camera_id}/live-stream")
async def get_camera_live_mjpeg(camera_id: str, db: AsyncSession = Depends(get_db)):
    """
    Direct zero-latency live MJPEG video stream for any camera with real-time digital PTZ support.
    Renders directly in any HTML <img> or React video preview.
    """
    result = await db.execute(select(Camera).where(Camera.id == camera_id))
    camera = result.scalar_one_or_none()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")

    source_val = camera.stream_url or ("0" if camera.source_type == "webcam" else "")
    return StreamingResponse(
        _mjpeg_streamer(source_val, camera.name, camera.id),
        media_type="multipart/x-mixed-replace; boundary=frame",
    )


# ---------------------------------------------------------------------------
# Legacy HLS / File Stream endpoints (100% Backward Compatible)
# ---------------------------------------------------------------------------
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