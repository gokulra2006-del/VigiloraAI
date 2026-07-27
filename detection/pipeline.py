"""
Sentinel-ai Detection Pipeline
===============================
Runs YOLOv8 inference on a video file or webcam and posts detections
to the backend API. Tracks objects across frames and creates incidents
for stationary vehicles (possible illegal parking).

Usage:
    python pipeline.py --source sample_traffic.mp4 --camera-id cam-1
    python pipeline.py --source 0 --camera-id cam-1        # webcam
    python pipeline.py --source sample.mp4 --camera-id cam-1 --once  # no loop
"""

import argparse
import asyncio
import json
import math
import os
import sys
import time
from datetime import datetime, timezone

import cv2
import httpx
from ultralytics import YOLO

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000/api/v1")

# COCO class IDs we care about
PERSON_CLASS = 0
CAR_CLASS = 2
# We also accept motorcycle(3), bus(5), truck(7) as "vehicle"
VEHICLE_CLASSES = {2, 3, 5, 7}
TARGET_CLASSES = [0, 2, 3, 5, 7]  # person + vehicles

# Stationary‑vehicle thresholds
STATIONARY_THRESHOLD_SECONDS = 30
MOVEMENT_TOLERANCE_PX = 20

# How often (seconds) to log a detection to the backend to avoid spam
DETECTION_LOG_INTERVAL = 5.0


# ---------------------------------------------------------------------------
# Tracking state
# ---------------------------------------------------------------------------
tracked_objects: dict[int, dict] = {}
# track_id → {
#     "first_seen": float,
#     "last_pos": (cx, cy),
#     "last_logged": float,
#     "stationary_start": float,
#     "incident_created": bool,
#     "class_name": str,
# }


# ---------------------------------------------------------------------------
# Backend API helpers (synchronous wrapper around httpx)
# ---------------------------------------------------------------------------

def _get_auth_token() -> str | None:
    """Obtain a JWT from the backend using env-var credentials."""
    username = os.getenv("DETECTION_API_USER", "admin")
    password = os.getenv("DETECTION_API_PASS", "admin123")
    try:
        resp = httpx.post(
            f"{API_BASE_URL}/auth/login",
            data={"username": username, "password": password},
            timeout=5.0,
        )
        if resp.status_code == 200:
            return resp.json().get("access_token")
    except Exception as exc:
        print(f"⚠  Auth failed ({exc}). Running without token.")
    return None


_token: str | None = None


def _headers() -> dict[str, str]:
    global _token
    if _token is None:
        _token = _get_auth_token()
    if _token:
        return {"Authorization": f"Bearer {_token}"}
    return {}


def post_detection(
    camera_id: str,
    class_name: str,
    confidence: float,
    bbox: list[float],
    snapshot_path: str | None = None,
) -> dict | None:
    """POST a detection record to the backend."""
    payload = {
        "camera_id": camera_id,
        "class_name": class_name,
        "confidence": round(confidence, 4),
        "bbox_json": json.dumps([round(v, 1) for v in bbox]),
        "snapshot_path": snapshot_path,
    }
    try:
        resp = httpx.post(
            f"{API_BASE_URL}/detections/",
            json=payload,
            headers=_headers(),
            timeout=5.0,
        )
        if resp.status_code in (200, 201):
            return resp.json()
        else:
            print(f"⚠  Detection POST {resp.status_code}: {resp.text[:120]}")
    except Exception as exc:
        print(f"⚠  Detection POST failed: {exc}")
    return None


def post_incident(
    camera_id: str,
    incident_type: str,
    severity: str,
    description: str,
) -> dict | None:
    """POST an incident to the backend."""
    payload = {
        "camera_id": camera_id,
        "type": incident_type,
        "severity": severity,
        "description": description,
    }
    try:
        resp = httpx.post(
            f"{API_BASE_URL}/incidents/",
            json=payload,
            headers=_headers(),
            timeout=5.0,
        )
        if resp.status_code in (200, 201):
            data = resp.json()
            print(f"🚨 INCIDENT CREATED: {incident_type} (id={data.get('id', '?')})")
            return data
        else:
            print(f"⚠  Incident POST {resp.status_code}: {resp.text[:120]}")
    except Exception as exc:
        print(f"⚠  Incident POST failed: {exc}")
    return None

def post_camera_status(camera_id: str, status: str) -> None:
    """POST camera status (e.g. online, offline, degraded) to the backend."""
    try:
        resp = httpx.put(
            f"{API_BASE_URL}/cameras/{camera_id}/status",
            json={"status": status},
            headers=_headers(),
            timeout=5.0,
        )
        if resp.status_code not in (200, 201):
            print(f"⚠  Camera Status PUT {resp.status_code}: {resp.text[:120]}")
    except Exception as exc:
        print(f"⚠  Camera Status PUT failed: {exc}")


# ---------------------------------------------------------------------------
# Core processing loop
# ---------------------------------------------------------------------------

def process_video(video_source: str | int, camera_id: str, *, loop: bool = True, is_rtsp: bool = False):
    """
    Main inference loop.

    Parameters
    ----------
    video_source : str or int
        Path to a video file, or ``0`` for the default webcam, or an RTSP url.
    camera_id : str
        Camera identifier sent with every detection/incident.
    loop : bool
        If True, loop the video when it ends. If False, stop.
    is_rtsp : bool
        If True, applies resilient reconnect logic for IP cameras.
    """
    model = YOLO("yolov8n.pt")
    
    def open_camera():
        src = int(video_source) if str(video_source).isdigit() else video_source
        c = cv2.VideoCapture(src)
        return c

    cap = open_camera()

    if not cap.isOpened() and not is_rtsp:
        print(f"❌ Could not open video source: {video_source}")
        sys.exit(1)

    os.makedirs("snapshots", exist_ok=True)
    frame_count = 0
    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    if fps <= 0 or math.isnan(fps) or math.isinf(fps):
        fps = 30
    process_every = max(1, int(fps // 10))  # ~10 inferences per second

    print(f"▶  Detection pipeline started — source={video_source}, camera={camera_id}")
    print(f"   Model: YOLOv8n | FPS: {fps:.0f} | Processing every {process_every} frames")
    print(f"   API: {API_BASE_URL}")
    
    post_camera_status(camera_id, "online")

    try:
        while True:
            if not cap.isOpened():
                if is_rtsp:
                    print(f"⚠  Connection lost. Retrying in 5 seconds...")
                    post_camera_status(camera_id, "degraded")
                    time.sleep(5)
                    cap = open_camera()
                    if cap.isOpened():
                        print(f"✅ Reconnected to RTSP stream.")
                        post_camera_status(camera_id, "online")
                    continue
                else:
                    break
                    
            ret, frame = cap.read()
            if not ret:
                if is_rtsp:
                    cap.release()
                    continue
                elif loop:
                    cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                    continue
                else:
                    print("✅ Video ended.")
                    break

            frame_count += 1
            if frame_count % process_every != 0:
                continue

            current_time = time.time()

            # Run YOLO with tracking
            results = model.track(
                frame,
                persist=True,
                classes=TARGET_CLASSES,
                verbose=False,
            )

            if results[0].boxes.id is None:
                continue

            boxes = results[0].boxes.xyxy.cpu().numpy()
            track_ids = results[0].boxes.id.int().cpu().tolist()
            confidences = results[0].boxes.conf.cpu().tolist()
            class_ids = results[0].boxes.cls.int().cpu().tolist()

            for box, track_id, conf, cls_id in zip(boxes, track_ids, confidences, class_ids):
                x1, y1, x2, y2 = box
                cx, cy = (x1 + x2) / 2, (y1 + y2) / 2
                class_name = model.names[cls_id]
                is_vehicle = cls_id in VEHICLE_CLASSES

                # --- Initialise tracking entry ---
                if track_id not in tracked_objects:
                    tracked_objects[track_id] = {
                        "first_seen": current_time,
                        "last_pos": (cx, cy),
                        "last_logged": 0.0,
                        "stationary_start": current_time,
                        "incident_created": False,
                        "class_name": class_name,
                    }

                obj = tracked_objects[track_id]

                # --- Log detection periodically ---
                if current_time - obj["last_logged"] >= DETECTION_LOG_INTERVAL:
                    post_detection(
                        camera_id=camera_id,
                        class_name=class_name,
                        confidence=conf,
                        bbox=[float(x1), float(y1), float(x2), float(y2)],
                    )
                    obj["last_logged"] = current_time

                # --- Stationary-vehicle logic (illegal parking) ---
                if is_vehicle:
                    prev_cx, prev_cy = obj["last_pos"]
                    dist = math.hypot(cx - prev_cx, cy - prev_cy)

                    if dist > MOVEMENT_TOLERANCE_PX:
                        obj["stationary_start"] = current_time
                        obj["last_pos"] = (cx, cy)
                    else:
                        duration = current_time - obj["stationary_start"]
                        if duration > STATIONARY_THRESHOLD_SECONDS and not obj["incident_created"]:
                            # Save snapshot
                            snap = f"snapshots/illegal_parking_{camera_id}_{track_id}_{int(current_time)}.jpg"
                            cv2.imwrite(snap, frame)

                            # Log the detection that triggered the incident
                            post_detection(
                                camera_id=camera_id,
                                class_name="stationary_vehicle",
                                confidence=conf,
                                bbox=[float(x1), float(y1), float(x2), float(y2)],
                                snapshot_path=snap,
                            )

                            # Create incident
                            post_incident(
                                camera_id=camera_id,
                                incident_type="illegal_parking",
                                severity="high",
                                description=(
                                    f"Vehicle (track {track_id}, class '{class_name}') "
                                    f"stationary for {duration:.0f}s on {camera_id}."
                                ),
                            )
                            obj["incident_created"] = True

                # Update position
                obj["last_pos"] = (cx, cy)

            # --- Garbage-collect stale tracks ---
            stale_ids = [
                tid for tid, o in tracked_objects.items()
                if current_time - o["first_seen"] > 300  # 5 minutes
            ]
            for tid in stale_ids:
                del tracked_objects[tid]

    except KeyboardInterrupt:
        print("\n⏹  Pipeline stopped by user.")
    finally:
        cap.release()


# ---------------------------------------------------------------------------
# CLI entry-point
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Sentinel-ai YOLOv8 Detection Pipeline",
    )
    parser.add_argument(
        "--source",
        default="0",
        help="Video file path, '0' for webcam, or 'rtsp' (default: 0)",
    )
    parser.add_argument(
        "--url",
        default=None,
        help="RTSP url (e.g. rtsp://192.168.1.100:8080/h264_ulaw.sdp), required if --source=rtsp",
    )
    parser.add_argument(
        "--camera-id",
        default="cam-1",
        help="Camera identifier sent with detections (default: cam-1)",
    )
    parser.add_argument(
        "--once",
        action="store_true",
        help="Run through the video once without looping",
    )
    parser.add_argument(
        "--api-url",
        default=None,
        help="Backend API base URL (overrides API_BASE_URL env var)",
    )
    args = parser.parse_args()

    if args.api_url:
        global API_BASE_URL
        API_BASE_URL = args.api_url

    is_rtsp = (args.source == "rtsp")
    video_source = args.url if is_rtsp else args.source
    
    if is_rtsp and not video_source:
        print("❌ Error: --url is required when --source is rtsp")
        sys.exit(1)

    process_video(
        video_source=video_source,
        camera_id=args.camera_id,
        loop=not args.once,
        is_rtsp=is_rtsp,
    )


if __name__ == "__main__":
    main()
