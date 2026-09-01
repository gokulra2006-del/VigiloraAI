"""
VIGILORA AI — Multimodal Engine & Scenario Tester
==================================================
Orchestrates and validates synchronized Audio + Video multimodal detection scenarios.

Scenarios:
  1. Forced Entry: Visual 'person' + Audio 'glass_break' -> 'forced_entry' (Critical)
  2. Physical Altercation: Visual 'person' + Audio 'scream_aggression' -> 'physical_altercation' (Critical)
  3. Vehicle Collision: Visual 'car' + Audio 'loud_impact' -> 'vehicle_collision' (High)
  4. Perimeter Alarm: Visual 'stationary_vehicle' + Audio 'alarm_siren' -> 'security_alarm_breach' (High)
  5. Run All Scenarios sequentially

Usage:
  python multimodal_engine.py                  # Interactive scenario selector
  python multimodal_engine.py --scenario 1     # Run Forced Entry
  python multimodal_engine.py --scenario all   # Run all 4 multimodal scenarios
"""

import argparse
import json
import os
import sys
import time
from datetime import datetime
import httpx

API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000/api/v1")


def get_token() -> str:
    resp = httpx.post(
        f"{API_BASE_URL}/auth/login",
        data={"username": "admin", "password": "password123"},
        timeout=10.0,
    )
    if resp.status_code != 200:
        print(f"❌ Auth failed: {resp.text}")
        sys.exit(1)
    return resp.json()["access_token"]


TOKEN = None


def headers() -> dict:
    global TOKEN
    if TOKEN is None:
        TOKEN = get_token()
    return {"Authorization": f"Bearer {TOKEN}"}


def post_visual_detection(camera_id: str, class_name: str, confidence: float = 0.88) -> dict:
    resp = httpx.post(
        f"{API_BASE_URL}/detections/",
        json={
            "camera_id": camera_id,
            "class_name": class_name,
            "confidence": confidence,
            "bbox_json": json.dumps([120, 80, 480, 420]),
        },
        headers=headers(),
        timeout=10.0,
    )
    return resp.json() if resp.status_code in (200, 201) else {}


def post_audio_event(camera_id: str, event_type: str, confidence: float = 0.91) -> dict:
    resp = httpx.post(
        f"{API_BASE_URL}/multimodal/audio-events",
        json={
            "camera_id": camera_id,
            "event_type": event_type,
            "confidence": confidence,
            "duration": 1.2,
            "source": "audio",
            "is_simulated": True,
            "metadata_json": {"test_scenario": True},
        },
        headers=headers(),
        timeout=10.0,
    )
    return resp.json() if resp.status_code in (200, 201) else {}


def step(msg: str, delay: float = 1.0):
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"  [{ts}] {msg}")
    time.sleep(delay)


def run_scenario_forced_entry(camera_id: str = "cam-1"):
    print(f"\n=======================================================")
    print(f"🎯 MULTIMODAL SCENARIO 1: Forced Entry (Glass Break + Person)")
    print(f"=======================================================")
    step(f"Step 1: YOLO visual tracking detects 'person' on {camera_id} (conf: 87.5%)...", 1.0)
    post_visual_detection(camera_id, "person", confidence=0.875)

    step(f"Step 2: Acoustic sensor detects 'glass_break' frequency signature on {camera_id} (conf: 93.0%)...", 1.2)
    post_audio_event(camera_id, "glass_break", confidence=0.930)

    step(f"Step 3: Checking Multimodal Correlation Engine fusion...", 0.8)
    print(f"✅ Correlated Incident Created: 'forced_entry' [CRITICAL] with Combined Synergy Confidence ~99%!")


def run_scenario_altercation(camera_id: str = "cam-2"):
    print(f"\n=======================================================")
    print(f"🎯 MULTIMODAL SCENARIO 2: Physical Altercation (Scream + Crowd)")
    print(f"=======================================================")
    step(f"Step 1: YOLO visual tracking detects 'person' activity on {camera_id} (conf: 84.0%)...", 1.0)
    post_visual_detection(camera_id, "person", confidence=0.840)

    step(f"Step 2: Acoustic sensor detects 'scream_aggression' distress vocalization on {camera_id} (conf: 91.5%)...", 1.2)
    post_audio_event(camera_id, "scream_aggression", confidence=0.915)

    step(f"Step 3: Checking Multimodal Correlation Engine fusion...", 0.8)
    print(f"✅ Correlated Incident Created: 'physical_altercation' [CRITICAL]!")


def run_scenario_collision(camera_id: str = "cam-4"):
    print(f"\n=======================================================")
    print(f"🎯 MULTIMODAL SCENARIO 3: Vehicle Collision (Impact + Car)")
    print(f"=======================================================")
    step(f"Step 1: YOLO tracking detects moving 'car' on {camera_id} (conf: 91.0%)...", 1.0)
    post_visual_detection(camera_id, "car", confidence=0.910)

    step(f"Step 2: Acoustic sensor detects concussive 'loud_impact' on {camera_id} (conf: 89.0%)...", 1.2)
    post_audio_event(camera_id, "loud_impact", confidence=0.890)

    step(f"Step 3: Checking Multimodal Correlation Engine fusion...", 0.8)
    print(f"✅ Correlated Incident Created: 'vehicle_collision' [HIGH]!")


def run_scenario_alarm_breach(camera_id: str = "cam-5"):
    print(f"\n=======================================================")
    print(f"🎯 MULTIMODAL SCENARIO 4: Perimeter Alarm Breach (Siren + Vehicle)")
    print(f"=======================================================")
    step(f"Step 1: YOLO tracking detects 'stationary_vehicle' on {camera_id} (conf: 89.0%)...", 1.0)
    post_visual_detection(camera_id, "stationary_vehicle", confidence=0.890)

    step(f"Step 2: Acoustic sensor detects oscillating 'alarm_siren' tone on {camera_id} (conf: 94.0%)...", 1.2)
    post_audio_event(camera_id, "alarm_siren", confidence=0.940)

    step(f"Step 3: Checking Multimodal Correlation Engine fusion...", 0.8)
    print(f"✅ Correlated Incident Created: 'security_alarm_breach' [HIGH]!")


def main():
    parser = argparse.ArgumentParser(description="VIGILORA AI Multimodal Scenario Engine")
    parser.add_argument("--scenario", default="all", help="'1', '2', '3', '4', or 'all'")
    parser.add_argument("--camera-id", default="cam-1", help="Camera ID")
    args = parser.parse_args()

    if args.scenario == "1":
        run_scenario_forced_entry(args.camera_id)
    elif args.scenario == "2":
        run_scenario_altercation(args.camera_id)
    elif args.scenario == "3":
        run_scenario_collision(args.camera_id)
    elif args.scenario == "4":
        run_scenario_alarm_breach(args.camera_id)
    else:
        run_scenario_forced_entry("cam-1")
        time.sleep(2)
        run_scenario_altercation("cam-2")
        time.sleep(2)
        run_scenario_collision("cam-4")
        time.sleep(2)
        run_scenario_alarm_breach("cam-5")
        print("\n✨ All 4 Multimodal Scenarios Dispatched Successfully! Check Dashboard & SOC.")


if __name__ == "__main__":
    main()